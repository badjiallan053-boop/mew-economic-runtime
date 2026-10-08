import { revalidateCardanoObservation } from "./cardano-observation.mjs";
import { readPreprodJson } from "./cardano-read.mjs";
/** First trusted provider lookup for a locally computed transaction hash. */
export async function observeDraftTransaction({
  txHash,
  projectId = process.env.BLOCKFROST_PROJECT_ID,
  fetchImpl = globalThis.fetch,
  minConfirmations = 3,
} = {}) {
  if (typeof txHash !== "string" || !/^[a-f0-9]{64}$/.test(txHash))
    throw Error("Bound transaction hash required");
  const denied = {
    network: "cardano:preprod",
    txHash,
    status: "UNKNOWN",
    automaticDispatchBlocked: true,
    exposureReleaseAllowed: false,
    automaticRetryAllowed: false,
    paymentsEnabled: false,
    settlementClaimProduced: false,
  };
  if (typeof projectId !== "string" || !projectId)
    return { ...denied, reason: "NOT_CONFIGURED" };
  try {
    const tx = await readPreprodJson("/txs/" + txHash, { projectId, fetchImpl });
    if (
      tx.hash !== txHash ||
      typeof tx.block !== "string" ||
      !/^[a-f0-9]{64}$/.test(tx.block) ||
      !Number.isSafeInteger(tx.block_height) ||
      tx.block_height < 0 ||
      tx.valid_contract !== true
    )
      throw Error("Invalid initial binding");
    return await revalidateCardanoObservation({
      observation: {
        network: "cardano:preprod",
        txHash,
        blockHash: tx.block,
        blockHeight: tx.block_height,
      },
      projectId,
      fetchImpl,
      minConfirmations,
    });
  } catch {
    return { ...denied, reason: "PROVIDER_UNAVAILABLE_OR_INVALID" };
  }
}
