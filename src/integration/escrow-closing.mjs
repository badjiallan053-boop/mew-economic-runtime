import { createHash } from "node:crypto";
import { exact, identifier, encode } from "./store.mjs";
import { planApprovalEscrow, decodeEscrowAddress } from "../adapters/approval-escrow-plan.mjs";
import { buildEscrowDraft } from "../adapters/escrow-transaction.mjs";
import { observeDraftTransaction } from "../adapters/cardano-first-observation.mjs";
import { revalidateCardanoObservation } from "../adapters/cardano-observation.mjs";
const digest = (v) => createHash("sha256").update(encode(v)).digest("hex");
const disabled = {
  signingAllowed: false,
  dispatchAllowed: false,
  paymentsEnabled: false,
  exposureReleaseAllowed: false,
  settlementClaimProduced: false,
  refundClaimProduced: false,
};
async function load(client, principal, id) {
  const { rows } = await client.query(
    "SELECT record FROM mew_private.escrow_operations WHERE principal=$1 AND id=$2",
    [principal, id],
  );
  if (!rows[0]) throw Error("Unknown payment operation");
  return rows[0].record;
}
async function save(client, principal, id, record) {
  record.revision++;
  await client.query(
    "UPDATE mew_private.escrow_operations SET record=$3::jsonb WHERE principal=$1 AND id=$2",
    [principal, id, encode(record)],
  );
}

/** One immutable unsigned close for the exact funding output. Preparing never
 * implies current unspentness, script evaluation, wallet approval or dispatch. */
export async function preparePostgresClosing(store, principal, input) {
  input = structuredClone(input);
  exact(input, ["operationId", "closingId", "action", "inputs", "feeAddress", "collateral", "parameters", "executionUnits"]);
  identifier(input.operationId);
  identifier(input.closingId);
  if (!["accept", "cancel"].includes(input.action)) throw Error("Accept or cancel required");
  const requestDigest = digest(input);
  return store.transaction(principal, async (c, k) => {
    const record = await load(c, principal, input.operationId);
    if (record.closing) {
      if (record.closing.id !== input.closingId || record.closing.requestDigest !== requestDigest)
        throw Error("Immutable closing conflict; reconcile original close");
      return { decision: "DEFER", operation: record, ...disabled };
    }
    if (record.status !== "FUNDED_OBSERVED" || !record.observation ||
        record.observation.txHash !== record.draft.txHash)
      throw Error("Confirmed original funding required; reconcile first");
    const intent = record.contract.intent;
    const effect = k.snapshot().effects.find((e) => e.id === intent.effectId);
    if (!effect || effect.status !== "committed") throw Error("Original commitment required");
    const payer = store.policy.principals.find((r) => r.id === principal);
    if (!payer || payer.address !== intent.principalAddress ||
        decodeEscrowAddress(input.feeAddress).paymentKeyHash !==
        decodeEscrowAddress(payer.address).paymentKeyHash)
      throw Error("Closing fees and collateral require enrolled principal key");
    if (input.action === "accept") {
      const { rows } = await c.query(
        "SELECT contract FROM mew_private.delivery_contracts WHERE principal=$1 AND effect_id=$2",
        [principal, intent.effectId],
      );
      if (!effect.deliveryVerified || rows[0]?.contract.artifactSha256 !== intent.artifactSha256)
        throw Error("Acceptance requires authenticated delivery of the committed artifact");
    }
    const plan = planApprovalEscrow(intent);
    const args = {
      intent, action: input.action, inputs: input.inputs, feeAddress: input.feeAddress,
      collateral: input.collateral, parameters: input.parameters, executionUnits: input.executionUnits,
      escrowInput: {
        txHash: record.draft.txHash, index: record.draft.scriptOutputIndex,
        address: plan.protocol.scriptAddress, lovelace: intent.amountLovelace,
        datumCbor: record.draft.datumCbor,
      },
    };
    const draft = buildEscrowDraft(args, { nowMs: store.clock() });
    if (draft.synthetic) throw Error("Fixture closing cannot enter private payment ledger");
    for (const ref of draft.inputReferences)
      await c.query(
        "INSERT INTO mew_private.input_locks(reference,principal,operation_id) VALUES($1,$2,$3)",
        [ref, principal, input.operationId],
      );
    record.closing = {
      id: input.closingId, requestDigest, args, draft,
      status: "CLOSE_PREPARED", observation: null, outcome: null, ...disabled,
    };
    record.status = "CLOSE_PREPARED";
    await save(c, principal, input.operationId, record);
    return { decision: "PREPARED", operation: record, position: k.position(intent.objectiveId), ...disabled };
  });
}

export async function markPostgresClosingUnknown(store, principal, input) {
  input = structuredClone(input);
  exact(input, ["operationId", "closingId"]);
  identifier(input.operationId); identifier(input.closingId);
  return store.transaction(principal, async (c, k) => {
    const record = await load(c, principal, input.operationId);
    if (!record.closing || record.closing.id !== input.closingId ||
        !["CLOSE_PREPARED", "CLOSE_UNKNOWN"].includes(record.status))
      throw Error("Original closing requires reconciliation");
    k.observe({
      claimId: `supabase-close-unknown:${input.operationId}:${input.closingId}`,
      effectId: record.contract.intent.effectId, source: "host", type: "unknown",
      evidence: { externalSignerOutcome: "unknown" },
    });
    record.status = record.closing.status = "CLOSE_UNKNOWN";
    await save(c, principal, input.operationId, record);
    return { operation: record, position: k.position(record.contract.intent.objectiveId), ...disabled };
  });
}

/** Fixed-hash indexer observations are advisory lifecycle evidence. Escrow payout
 * is not a full economic refund: already paid fees and collateral caps stay held. */
export async function reconcilePostgresClosing(store, principal, input, options = {}) {
  input = structuredClone(input);
  exact(input, ["operationId", "closingId"]);
  identifier(input.operationId); identifier(input.closingId);
  const before = await store.operation(principal, input.operationId);
  if (!before?.closing || before.closing.id !== input.closingId)
    throw Error("Unknown original closing");
  const [funding, observed] = await Promise.all([
    revalidateCardanoObservation({ ...options, observation: before.observation }),
    before.closing.observation
      ? revalidateCardanoObservation({ ...options, observation: before.closing.observation })
      : observeDraftTransaction({ ...options, txHash: before.closing.draft.txHash }),
  ]);
  return store.transaction(principal, async (c, k) => {
    const record = await load(c, principal, input.operationId);
    if (record.revision !== before.revision || record.closing.id !== input.closingId)
      throw Error("Stale closing reconciliation fence");
    if (record.status === "REVIEW_REQUIRED" || funding.status === "REVIEW_REQUIRED" ||
        observed.status === "REVIEW_REQUIRED" ||
        (observed.status === "STILL_OBSERVED" && observed.blockHeight < before.observation.blockHeight)) {
      record.status = record.closing.status = "REVIEW_REQUIRED";
    } else if (funding.status === "STILL_OBSERVED" && observed.status === "STILL_OBSERVED") {
      record.closing.observation ??= {
        network: "cardano:preprod", txHash: record.closing.draft.txHash,
        blockHash: observed.blockHash, blockHeight: observed.blockHeight,
      };
      const action = record.closing.draft.action;
      record.status = record.closing.status = action === "accept" ? "ACCEPT_OBSERVED" : "CANCEL_OBSERVED";
      record.closing.outcome = {
        action,
        recipientAddress: action === "accept" ? record.contract.intent.providerAddress : record.contract.intent.principalAddress,
        escrowLovelace: record.contract.intent.amountLovelace,
        fundingFeeLovelace: record.draft.feeLovelace,
        closingFeeLovelace: record.closing.draft.feeLovelace,
        reservedExposureLovelace: planApprovalEscrow(record.contract.intent).funding.totalExposureLovelace,
        overheadAccountingVerified: false,
        deliveryProvenByPayment: false,
      };
    } else {
      record.status = record.closing.status = record.closing.observation ? "REVIEW_REQUIRED" : "CLOSE_UNKNOWN";
    }
    await save(c, principal, input.operationId, record);
    return { operation: record, fundingObservation: funding, closingObservation: observed,
      position: k.position(record.contract.intent.objectiveId), ...disabled };
  });
}
