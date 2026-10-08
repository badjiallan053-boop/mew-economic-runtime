import { privatePaymentFixture } from "../tests/helpers/private-payment-fixture.mjs";
// Local developer tool: real SQL/CBOR and synthetic chain responses, no wallet.
const scenarios = [];
for (const action of ["accept", "cancel"]) {
  const f = await privatePaymentFixture();
  try {
    const fundingHash = await f.fund();
    if (action === "accept") await f.deliver();
    f.service.blockfrost = { projectId: "synthetic-fixture", fetchImpl: f.chain(fundingHash) };
    const prepared = await f.service.prepareClosing(f.token, f.closing(action));
    await f.service.markClosingUnknown(f.token, { operationId: "operation", closingId: "close" });
    const observed = await f.service.reconcileClosing(f.token, { operationId: "operation", closingId: "close" });
    const replay = await f.service.prepareClosing(f.token, f.closing(action));
    scenarios.push({
      action, preparedStatus: prepared.operation.status,
      syntheticObservedStatus: observed.operation.status,
      replayDecision: replay.decision,
      unsignedFundingHash: fundingHash,
      unsignedClosingHash: observed.operation.closing.draft.txHash,
      escrowLovelace: observed.operation.closing.outcome.escrowLovelace,
      retainedExposureLovelace: observed.position.exposure,
      authenticatedFixtureDelivery: observed.position.satisfied === 1,
      settlementClaimProduced: observed.settlementClaimProduced,
      refundClaimProduced: observed.refundClaimProduced,
      exposureReleaseAllowed: false,
    });
  } finally { await f.close(); }
}
console.log(JSON.stringify({
  schema: "mew.payment-lifecycle-rehearsal.v1",
  synthetic: true, database: "local-pglite", provider: "mock-only",
  liveChainObservationPerformed: false, walletInvoked: false,
  transactionSigned: false, transactionBroadcast: false,
  modelInvoked: false, paymentsEnabled: false, scenarios,
}, null, 2));
