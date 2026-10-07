import { createHash } from "node:crypto";
import { Store } from "./store.mjs";
import {
  planApprovalEscrow,
  decodeEscrowAddress,
} from "../adapters/approval-escrow-plan.mjs";
import { buildEscrowDraft } from "../adapters/escrow-transaction.mjs";
import { observeDraftTransaction } from "../adapters/cardano-first-observation.mjs";
import { revalidateCardanoObservation } from "../adapters/cardano-observation.mjs";
const sha = (v) => createHash("sha256").update(v).digest("hex"),
  canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          )
        : v,
  encoded = (v) => JSON.stringify(canonical(v));
const id = (v) => {
  if (typeof v !== "string" || !/^[A-Za-z0-9._:@/-]{1,200}$/.test(v))
    throw Error("Invalid escrow identifier");
};
const exact = (v, keys) => {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid escrow operation");
};
/** Private coordinator library only. Pre-enrolled public addresses, no custody,
 * signer/dispatch endpoint or automatic settlement/refund exposure release. */
export class EscrowStore extends Store {
  #principals;
  #providers;
  constructor(path, { principals, providers, ...options } = {}) {
    const enroll = (rows) => {
      if (!Array.isArray(rows) || !rows.length || rows.length > 100)
        throw Error("Bounded pre-enrolled parties required");
      const seen = new Set();
      return rows
        .map((r) => {
          exact(r, ["id", "address"]);
          id(r.id);
          decodeEscrowAddress(r.address);
          if (seen.has(r.id)) throw Error("Duplicate enrolled party");
          seen.add(r.id);
          return structuredClone(r);
        })
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    };
    const principalPolicy = enroll(principals),
      providerPolicy = enroll(providers);
    super(path, options);
    this.#principals = principalPolicy;
    this.#providers = providerPolicy;
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS escrow_policy(id INTEGER PRIMARY KEY CHECK(id=1),digest TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS escrow_operations(id TEXT PRIMARY KEY,effect_id TEXT UNIQUE NOT NULL,record TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS escrow_drafts(tx_hash TEXT PRIMARY KEY,operation_id TEXT NOT NULL,action TEXT NOT NULL,record TEXT NOT NULL,UNIQUE(operation_id,action));
   CREATE TABLE IF NOT EXISTS escrow_input_locks(output_reference TEXT PRIMARY KEY,operation_id TEXT NOT NULL,action TEXT NOT NULL);`);
    try {
      this.transact(() => {
        const digest = sha(encoded([principalPolicy, providerPolicy])),
          old = this.db
            .prepare("SELECT digest FROM escrow_policy WHERE id=1")
            .get();
        if (old && old.digest !== digest)
          throw Error("Enrolled escrow policy changed");
        this.db
          .prepare("INSERT OR IGNORE INTO escrow_policy VALUES(1,?)")
          .run(digest);
      });
    } catch (e) {
      this.close();
      throw e;
    }
  }
  operation(operationId) {
    id(operationId);
    const row = this.db
      .prepare("SELECT record FROM escrow_operations WHERE id=?")
      .get(operationId);
    return row ? JSON.parse(row.record) : null;
  }
  draft(operationId, action) {
    const row = this.db
      .prepare(
        "SELECT record FROM escrow_drafts WHERE operation_id=? AND action=?",
      )
      .get(operationId, action);
    return row ? JSON.parse(row.record) : null;
  }
  #save(r) {
    const raw = this.serialize(r);
    this.db
      .prepare("UPDATE escrow_operations SET record=? WHERE id=?")
      .run(raw, r.id);
    this.#budget();
    return structuredClone(r);
  }
  #budget() {
    const n = this.db
      .prepare(
        "SELECT (SELECT COALESCE(SUM(length(CAST(record AS BLOB))),0) FROM escrow_operations)+(SELECT COALESCE(SUM(length(CAST(record AS BLOB))),0) FROM escrow_drafts)+(SELECT COALESCE(SUM(length(output_reference)),0) FROM escrow_input_locks) AS n",
      )
      .get().n;
    if (n > this.maxSnapshotBytes)
      throw Error("Escrow storage budget exceeded");
  }
  reserveEscrow(input) {
    input = structuredClone(input);
    exact(input, ["operationId", "principal", "provider", "agent", "intent"]);
    for (const key of ["operationId", "principal", "provider", "agent"])
      id(input[key]);
    const plan = planApprovalEscrow(input.intent);
    if (
      this.#principals.find((p) => p.id === input.principal)?.address !==
        input.intent.principalAddress ||
      this.#providers.find((p) => p.id === input.provider)?.address !==
        input.intent.providerAddress
    )
      throw Error("Unenrolled principal/provider address");
    return this.transact((k) => {
      const objective = k.objective(input.intent.objectiveId);
      if (
        objective.principal !== input.principal ||
        objective.semanticKey !== input.intent.semanticKey ||
        objective.maxExposure !== input.intent.maxExposureLovelace
      )
        throw Error("Escrow mandate mismatch");
      const old = this.operation(input.operationId),
        effectOld = this.db
          .prepare("SELECT record FROM escrow_operations WHERE effect_id=?")
          .get(input.intent.effectId);
      if (old || effectOld) {
        const saved = old ?? JSON.parse(effectOld.record);
        if (encoded(saved.contract) !== encoded(input))
          throw Error("Immutable escrow identity conflict");
        return { decision: "DEFER", operation: saved, dispatchAllowed: false };
      }
      const effect = {
        id: input.intent.effectId,
        semanticKey: input.intent.semanticKey,
        provider: input.provider,
        type: "escrow",
        amount: plan.funding.totalExposureLovelace,
        agent: input.agent,
        recipientAddress: plan.protocol.scriptAddress,
      };
      const result = k.evaluate({
        objectiveId: input.intent.objectiveId,
        proposedEffect: effect,
      });
      if (result.decision !== "ALLOW")
        return { ...result, dispatchAllowed: false };
      const record = {
        id: input.operationId,
        contract: input,
        intentSha256: plan.intentSha256,
        totalExposureLovelace: plan.funding.totalExposureLovelace,
        status: "RESERVED",
        revision: 0,
        observations: {},
        fundingReference: null,
      };
      this.db
        .prepare("INSERT INTO escrow_operations VALUES(?,?,?)")
        .run(record.id, input.intent.effectId, this.serialize(record));
      this.#budget();
      return { ...result, operation: record, dispatchAllowed: false };
    });
  }
  prepareDraft(operationId, args, options) {
    args = structuredClone(args);
    const draft = buildEscrowDraft(args, options);
    return this.transact((k) => {
      const r = this.operation(operationId);
      if (!r || draft.intentSha256 !== r.intentSha256)
        throw Error("Draft/mandate mismatch");
      const old = this.draft(operationId, draft.action);
      if (old) {
        if (encoded(old) !== encoded(draft))
          throw Error("Prepared transaction cannot be replaced");
        return { ...old, idempotent: true };
      }
      const effect = k
        .snapshot()
        .effects.find((e) => e.id === r.contract.intent.effectId);
      if (
        !effect ||
        effect.type !== "escrow" ||
        effect.amount !== r.totalExposureLovelace ||
        effect.objectiveId !== r.contract.intent.objectiveId ||
        effect.status !== (draft.action === "fund" ? "reserved" : "committed")
      )
        throw Error("Economic reservation no longer matches");
      if (
        draft.action === "fund"
          ? r.status !== "RESERVED"
          : r.status !== "FUNDED"
      )
        throw Error("Escrow phase cannot prepare another transaction");
      if (
        draft.action !== "fund" &&
        (args.escrowInput.txHash !== r.fundingReference.txHash ||
          args.escrowInput.index !== r.fundingReference.index)
      )
        throw Error("Closing input is not the attested funded output");
      for (const ref of draft.inputReferences)
        this.db
          .prepare("INSERT INTO escrow_input_locks VALUES(?,?,?)")
          .run(ref, operationId, draft.action);
      this.db
        .prepare("INSERT INTO escrow_drafts VALUES(?,?,?,?)")
        .run(draft.txHash, operationId, draft.action, this.serialize(draft));
      r.status = draft.action.toUpperCase() + "_PREPARED";
      r.revision++;
      this.#save(r);
      return { ...draft, idempotent: false };
    });
  }
  markSubmissionUnknown(operationId, action) {
    return this.transact((k) => {
      const r = this.operation(operationId);
      if (
        !r ||
        !this.draft(operationId, action) ||
        ![
          action.toUpperCase() + "_PREPARED",
          action.toUpperCase() + "_UNKNOWN",
        ].includes(r.status)
      )
        throw Error("No pending prepared transaction");
      if (r.status.endsWith("_UNKNOWN")) return r;
      r.status = action.toUpperCase() + "_UNKNOWN";
      r.revision++;
      k.observe({
        claimId: `escrow-unknown:${operationId}:${action}`,
        effectId: r.contract.intent.effectId,
        source: "host",
        type: "unknown",
        evidence: { simulated: this.mode === "demo" },
      });
      return this.#save(r);
    });
  }
  async observeDraft(operationId, action, provider = {}) {
    if (
      !provider ||
      Object.getPrototypeOf(provider) !== Object.prototype ||
      Object.keys(provider).some(
        (k) => !["projectId", "fetchImpl", "minConfirmations"].includes(k),
      )
    )
      throw Error("Invalid trusted observer configuration");
    provider = { ...provider };
    const before = this.operation(operationId),
      draft = this.draft(operationId, action);
    if (!before || !draft || !["fund", "accept", "cancel"].includes(action))
      throw Error("Prepared draft required");
    const previous = before.observations[action];
    const result = previous
      ? await revalidateCardanoObservation({
          observation: {
            network: "cardano:preprod",
            txHash: draft.txHash,
            blockHash: previous.blockHash,
            blockHeight: previous.blockHeight,
          },
          ...provider,
        })
      : await observeDraftTransaction({ txHash: draft.txHash, ...provider });
    return this.transact((k) => {
      const r = this.operation(operationId);
      if (r.revision !== before.revision)
        throw Error("Stale asynchronous escrow observation");
      if (r.status === "REVIEW_REQUIRED")
        return {
          operation: r,
          observation: result,
          automaticDispatchBlocked: true,
          dispatchAllowed: false,
          exposureReleaseAllowed: false,
          settlementClaimProduced: false,
        };
      const effect = k
        .snapshot()
        .effects.find((e) => e.id === r.contract.intent.effectId);
      if (
        !effect ||
        effect.type !== "escrow" ||
        effect.amount !== r.totalExposureLovelace ||
        !["reserved", "committed"].includes(effect.status)
      )
        throw Error("Economic reservation no longer matches observation");
      if (result.status === "STILL_OBSERVED") {
        if (
          this.db
            .prepare("SELECT id FROM cardano_operations WHERE tx_hash=?")
            .get(draft.txHash)
        )
          throw Error("Transaction already attributed to another rail");
        if (!previous)
          r.observations[action] = {
            txHash: draft.txHash,
            blockHash: result.blockHash,
            blockHeight: result.blockHeight,
          };
        if (action === "fund") {
          // Rechecking old funding must not regress an already prepared closing action.
          if (["FUND_PREPARED", "FUND_UNKNOWN"].includes(r.status)) {
            r.status = "FUNDED";
            r.fundingReference = {
              txHash: draft.txHash,
              index: draft.scriptOutputIndex,
            };
            k.observe({
              claimId: `escrow-funded:${operationId}`,
              effectId: r.contract.intent.effectId,
              source: "cardano",
              type: "committed",
              amount: r.totalExposureLovelace,
              evidence: {
                verified: true,
                simulated: this.mode === "demo",
                txHash: draft.txHash,
                blockHash: result.blockHash,
              },
            });
          }
        } else if (
          [
            action.toUpperCase() + "_PREPARED",
            action.toUpperCase() + "_UNKNOWN",
          ].includes(r.status)
        )
          r.status = action.toUpperCase() + "_OBSERVED";
      } else if (result.status === "REVIEW_REQUIRED" || previous)
        r.status = "REVIEW_REQUIRED";
      else r.status = action.toUpperCase() + "_UNKNOWN";
      r.revision++;
      this.#save(r);
      return {
        operation: r,
        observation: result,
        dispatchAllowed: false,
        exposureReleaseAllowed: false,
        settlementClaimProduced: false,
      };
    });
  }
  reset() {
    throw Error("Escrow journal cannot reset");
  }
}
