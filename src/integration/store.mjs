import { enrollPostgresDelivery, acceptPostgresDelivery } from "./delivery.mjs";
import { preparePostgresClosing, markPostgresClosingUnknown, reconcilePostgresClosing } from "./escrow-closing.mjs";
import { createHash, randomUUID } from "node:crypto";
import { MEW } from "../core/mew.mjs";
import {
  planApprovalEscrow,
  decodeEscrowAddress,
} from "../adapters/approval-escrow-plan.mjs";
import { buildEscrowDraft } from "../adapters/escrow-transaction.mjs";
import { observeDraftTransaction } from "../adapters/cardano-first-observation.mjs";
import { revalidateCardanoObservation } from "../adapters/cardano-observation.mjs";
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export const encode = (v) => JSON.stringify(canonical(v));
const hash = (v) => createHash("sha256").update(v).digest("hex");
export function identifier(v) {
  if (typeof v !== "string" || !/^[A-Za-z0-9._:@/-]{1,200}$/.test(v))
    throw Error("Invalid private identifier");
  return v;
}
export function exact(v, keys) {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid private contract");
}
function parties(rows) {
  if (!Array.isArray(rows) || rows.length > 100)
    throw Error("Invalid enrollment");
  const ids = new Set();
  return rows.map((r) => {
    exact(r, ["id", "address"]);
    identifier(r.id);
    decodeEscrowAddress(r.address);
    if (ids.has(r.id)) throw Error("Duplicate enrollment");
    ids.add(r.id);
    return { ...r };
  });
}

/** Async PostgreSQL ledger, separate from the public SQLite fixture store.
 * Every mutation uses one checked-out connection and one principal row lock.
 * No signer, broadcast, exposure release or model-controlled economic action. */
export class IntegrationStore {
  constructor({
    pool,
    paymentPolicy = { principals: [], providers: [] },
    clock = Date.now,
  } = {}) {
    if (
      !pool ||
      typeof pool.connect !== "function" ||
      typeof clock !== "function"
    )
      throw Error("Private transaction pool required");
    exact(paymentPolicy, ["principals", "providers"]);
    this.pool = pool;
    this.clock = clock;
    const policy = {
      principals: parties(paymentPolicy.principals),
      providers: parties(paymentPolicy.providers),
    };
    for (const rows of Object.values(policy)) {
      rows.forEach(Object.freeze);
      Object.freeze(rows);
    }
    Object.defineProperty(this, "policy", {
      value: Object.freeze(policy),
      enumerable: true,
    });
    Object.defineProperty(this, "policyDigest", {
      value: hash(encode(policy)),
      enumerable: true,
    });
  }
  async transaction(principal, fn) {
    identifier(principal);
    const client = await this.pool.connect();
    let begun = false,
      commitAttempted = false,
      destroyClient = false;
    try {
      await client.query("BEGIN");
      begun = true;
      await client.query("SELECT set_config('mew.principal',$1,true)", [
        principal,
      ]);
      await client.query(
        `INSERT INTO mew_private.ledgers(principal,policy_digest,snapshot) VALUES($1,$2,$3::jsonb) ON CONFLICT(principal) DO NOTHING`,
        [principal, this.policyDigest, encode(new MEW().snapshot())],
      );
      const { rows } = await client.query(
        "SELECT snapshot,policy_digest FROM mew_private.ledgers WHERE principal=$1 FOR UPDATE",
        [principal],
      );
      if (rows.length !== 1 || rows[0].policy_digest !== this.policyDigest)
        throw Error("Ledger policy changed");
      const kernel = new MEW(rows[0].snapshot),
        result = await fn(client, kernel);
      const snapshot = encode(kernel.snapshot());
      if (Buffer.byteLength(snapshot) > 1048576)
        throw Error("Private ledger budget exceeded");
      await client.query(
        "UPDATE mew_private.ledgers SET snapshot=$2::jsonb,revision=revision+1 WHERE principal=$1",
        [principal, snapshot],
      );
      commitAttempted = true;
      await client.query("COMMIT");
      begun = false;
      return result;
    } catch (error) {
      // A lost BEGIN/COMMIT acknowledgement or failed rollback leaves this
      // connection's state uncertain. Do not pool a potentially open transaction
      // carrying transaction-local principal context. Never retry the mutation:
      // a failed COMMIT response can mean its durable effects already committed.
      destroyClient = !begun || commitAttempted;
      if (begun) {
        try {
          await client.query("ROLLBACK");
        } catch {
          destroyClient = true;
        }
      }
      throw error;
    } finally {
      client.release(destroyClient);
    }
  }
  async createObjective(principal, input) {
    exact(input, [
      "id",
      "semanticKey",
      "quantity",
      "maxExposure",
      "description",
    ]);
    identifier(input.id);
    identifier(input.semanticKey);
    if (
      typeof input.description !== "string" ||
      input.description.length > 2000
    )
      throw Error("Invalid objective description");
    return this.transaction(principal, async (_, k) =>
      k.createObjective({ ...input, principal }),
    );
  }
  async position(principal, objectiveId) {
    identifier(objectiveId);
    return this.transaction(principal, async (_, k) => k.position(objectiveId));
  }
  async operation(principal, id) {
    identifier(id);
    return this.transaction(principal, async (c) => {
      const { rows } = await c.query(
        "SELECT record FROM mew_private.escrow_operations WHERE principal=$1 AND id=$2",
        [principal, id],
      );
      return rows[0]?.record ?? null;
    });
  }
  async prepareFunding(principal, { operationId, providerId, args }) {
    identifier(operationId);
    identifier(providerId);
    args = structuredClone(args);
    const payer = this.policy.principals.find((r) => r.id === principal),
      seller = this.policy.providers.find((r) => r.id === providerId);
    if (
      !payer ||
      !seller ||
      args?.intent?.principalAddress !== payer.address ||
      args.intent.providerAddress !== seller.address ||
      args.action !== "fund"
    )
      throw Error("Pre-enrolled payer and provider required");
    const plan = planApprovalEscrow(args.intent),
      draft = buildEscrowDraft(args, { nowMs: this.clock() });
    if (draft.synthetic)
      throw Error("Fixture parameters cannot enter the private payment ledger");
    const contract = {
        operationId,
        principal,
        providerId,
        intent: args.intent,
      },
      digest = hash(encode(contract));
    return this.transaction(principal, async (c, k) => {
      const objective = k.objective(args.intent.objectiveId);
      if (
        objective.semanticKey !== args.intent.semanticKey ||
        args.intent.maxExposureLovelace > objective.maxExposure
      )
        throw Error("Escrow exceeds immutable mandate");
      const { rows } = await c.query(
        "SELECT record,contract_digest FROM mew_private.escrow_operations WHERE principal=$1 AND (id=$2 OR effect_id=$3)",
        [principal, operationId, args.intent.effectId],
      );
      if (rows.length) {
        if (
          rows.length !== 1 ||
          rows[0].contract_digest !== digest ||
          rows[0].record.draft.txHash !== draft.txHash
        )
          throw Error("Immutable payment conflict");
        return {
          decision: "DEFER",
          operation: rows[0].record,
          dispatchAllowed: false,
        };
      }
      const n = await c.query(
        "SELECT count(*)::int AS n FROM mew_private.escrow_operations WHERE principal=$1",
        [principal],
      );
      if (n.rows[0].n >= 100) throw Error("Payment journal budget exceeded");
      const decision = k.evaluate({
        objectiveId: objective.id,
        proposedEffect: {
          id: args.intent.effectId,
          semanticKey: objective.semanticKey,
          provider: providerId,
          type: "approval-escrow",
          amount: plan.funding.totalExposureLovelace,
          recipientAddress: plan.protocol.scriptAddress,
        },
      });
      if (decision.decision !== "ALLOW")
        return { ...decision, dispatchAllowed: false };
      const record = {
        contract,
        draft,
        status: "FUND_PREPARED",
        observation: null,
        revision: 0,
        dispatchAllowed: false,
        exposureReleaseAllowed: false,
      };
      await c.query(
        "INSERT INTO mew_private.escrow_operations(principal,id,effect_id,tx_hash,contract_digest,record) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
        [
          principal,
          operationId,
          args.intent.effectId,
          draft.txHash,
          digest,
          encode(record),
        ],
      );
      for (const ref of draft.inputReferences)
        await c.query(
          "INSERT INTO mew_private.input_locks(reference,principal,operation_id) VALUES($1,$2,$3)",
          [ref, principal, operationId],
        );
      return { ...decision, operation: record, dispatchAllowed: false };
    });
  }
  async markFundingUnknown(principal, id) {
    identifier(id);
    return this.transaction(principal, async (c, k) => {
      const { rows } = await c.query(
        "SELECT record FROM mew_private.escrow_operations WHERE principal=$1 AND id=$2",
        [principal, id],
      );
      const record = rows[0]?.record;
      if (!record) throw Error("Unknown payment");
      if (!["FUND_PREPARED", "FUND_UNKNOWN"].includes(record.status))
        throw Error("Payment requires reconciliation");
      k.observe({
        claimId: `supabase-funding-unknown:${id}`,
        effectId: record.contract.intent.effectId,
        source: "host",
        type: "unknown",
        evidence: { externalSignerOutcome: "unknown" },
      });
      record.status = "FUND_UNKNOWN";
      record.revision++;
      await c.query(
        "UPDATE mew_private.escrow_operations SET record=$3::jsonb WHERE principal=$1 AND id=$2",
        [principal, id, encode(record)],
      );
      return record;
    });
  }
  async reconcileFunding(
    principal,
    id,
    { projectId, fetchImpl = fetch, minConfirmations = 3 } = {},
  ) {
    const before = await this.operation(principal, id);
    if (!before) throw Error("Unknown funding operation");
    if (before.closing) throw Error("Reconcile original closing; funding stage is immutable");
    const observed = before.observation
      ? await revalidateCardanoObservation({
          observation: before.observation,
          projectId,
          fetchImpl,
          minConfirmations,
        })
      : await observeDraftTransaction({
          txHash: before.draft.txHash,
          projectId,
          fetchImpl,
          minConfirmations,
        });
    return this.transaction(principal, async (c, k) => {
      const { rows } = await c.query(
        "SELECT record FROM mew_private.escrow_operations WHERE principal=$1 AND id=$2",
        [principal, id],
      );
      const record = rows[0]?.record;
      if (!record || record.revision !== before.revision)
        throw Error("Stale reconciliation fence");
      if (observed.status === "STILL_OBSERVED") {
        const binding = {
          network: "cardano:preprod",
          txHash: record.draft.txHash,
          blockHash: observed.blockHash,
          blockHeight: observed.blockHeight,
        };
        if (!record.observation) {
          k.observe({
            claimId: `supabase-funded:${id}`,
            effectId: record.contract.intent.effectId,
            source: "cardano",
            type: "committed",
            amount: planApprovalEscrow(record.contract.intent).funding
              .totalExposureLovelace,
            evidence: {
              verified: true,
              ...binding,
              verifier: "blockfrost-draft-hash-observer",
            },
          });
          record.observation = binding;
        }
        if (record.status !== "REVIEW_REQUIRED")
          record.status = "FUNDED_OBSERVED";
      } else
        record.status =
          record.observation || observed.status === "REVIEW_REQUIRED"
            ? "REVIEW_REQUIRED"
            : "FUND_UNKNOWN";
      record.revision++;
      await c.query(
        "UPDATE mew_private.escrow_operations SET record=$3::jsonb WHERE principal=$1 AND id=$2",
        [principal, id, encode(record)],
      );
      return {
        operation: record,
        observation: observed,
        position: k.position(record.contract.intent.objectiveId),
        dispatchAllowed: false,
        exposureReleaseAllowed: false,
        settlementClaimProduced: false,
      };
    });
  }
  enrollDelivery(principal, expected) {
    return enrollPostgresDelivery(this, principal, expected);
  }
  acceptDelivery(principal, input) {
    return acceptPostgresDelivery(this, principal, input);
  }
  prepareClosing(principal, input) {
    return preparePostgresClosing(this, principal, input);
  }
  markClosingUnknown(principal, input) {
    return markPostgresClosingUnknown(this, principal, input);
  }
  reconcileClosing(principal, input, options) {
    return reconcilePostgresClosing(this, principal, input, options);
  }
  async startModelRun(principal, { id, contract, maxRuns = 1 }) {
    identifier(id);
    if (
      !Number.isSafeInteger(maxRuns) ||
      maxRuns < 1 ||
      maxRuns > 10 ||
      Buffer.byteLength(encode(contract)) > 32768
    )
      throw Error("Invalid model run budget");
    return this.transaction(principal, async (c) => {
      const old = await c.query(
        "SELECT * FROM mew_private.model_runs WHERE principal=$1 AND id=$2",
        [principal, id],
      );
      if (old.rows.length) {
        if (encode(old.rows[0].contract) !== encode(contract))
          throw Error("Immutable model run conflict");
        return {
          claimed: false,
          status: old.rows[0].status,
          result: old.rows[0].result,
        };
      }
      const count = await c.query(
        "SELECT count(*)::int AS n FROM mew_private.model_runs WHERE principal=$1",
        [principal],
      );
      if (count.rows[0].n >= maxRuns)
        throw Error("Durable model run limit reached");
      const fence = randomUUID();
      await c.query(
        "INSERT INTO mew_private.model_runs(principal,id,contract,status,fence) VALUES($1,$2,$3::jsonb,'RUNNING',$4)",
        [principal, id, encode(contract), fence],
      );
      return { claimed: true, fence, status: "RUNNING" };
    });
  }
  async finishModelRun(principal, { id, fence, result, unknown = false }) {
    identifier(id);
    if (Buffer.byteLength(encode(result)) > 65536)
      throw Error("Model result exceeds budget");
    return this.transaction(principal, async (c) => {
      const r = await c.query(
        "UPDATE mew_private.model_runs SET status=$4,result=$5::jsonb WHERE principal=$1 AND id=$2 AND fence=$3 AND status='RUNNING' RETURNING status",
        [
          principal,
          id,
          fence,
          unknown ? "UNKNOWN" : "COMPLETE",
          encode(result),
        ],
      );
      if (r.rows.length !== 1) throw Error("Model completion fence rejected");
      return { status: r.rows[0].status, result };
    });
  }
}
