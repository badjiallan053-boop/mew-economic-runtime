import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EscrowStore } from "../src/server/escrow-store.mjs";
import { createBackup, restoreDrill } from "../src/server/backup.mjs";
import {
  addr,
  intent,
  fundingArgs,
  parameters,
} from "../tests/helpers/escrow-fixture.mjs";

const dir = mkdtempSync(join(tmpdir(), "mew-escrow-rehearsal-"));
const policy = {
  mode: "demo",
  principals: [{ id: "principal", address: addr(1) }],
  providers: [{ id: "provider", address: addr(2) }],
};
let store;
try {
  store = new EscrowStore(join(dir, "journal.sqlite"), policy);
  store.transact((k) =>
    k.createObjective({
      id: "o",
      principal: "principal",
      semanticKey: "one-report",
      quantity: 1,
      maxExposure: 9000000,
    }),
  );
  store.reserveEscrow({
    operationId: "rehearsal",
    principal: "principal",
    provider: "provider",
    agent: "coordinator",
    intent: intent(),
  });
  const draft = store.prepareDraft("rehearsal", fundingArgs(), {
    nowMs: parameters.observedAtMs,
  });
  // This is an uncertainty drill. No wallet or submission exists.
  store.markSubmissionUnknown("rehearsal", "fund");
  store.close();
  store = new EscrowStore(join(dir, "journal.sqlite"), policy);
  const receipt = await createBackup(store.db, join(dir, "backup.sqlite"));
  const restored = await restoreDrill(join(dir, "backup.sqlite"), {
    expectedDigest: receipt.sha256,
  });
  console.log(
    JSON.stringify(
      {
        synthetic: true,
        walletUsed: false,
        transactionSigned: false,
        transactionBroadcast: false,
        preparedTxHash: draft.txHash,
        restartedStatus: store.operation("rehearsal").status,
        retainedExposureLovelace: store.read().position("o").exposure,
        escrowRestoreVerified:
          restored.escrowOperations[0].status === "FUND_UNKNOWN",
        signingAllowed: false,
        dispatchAllowed: false,
        activationAllowed: false,
      },
      null,
      2,
    ),
  );
} finally {
  store?.close();
  rmSync(dir, { recursive: true, force: true });
}
