import { randomUUID } from "node:crypto";
import { loadPrivateIntegrationConfiguration } from "../src/integration/private-config.mjs";
import { connectPostgres } from "../src/integration/postgres.mjs";
import { assertPrivateDatabase } from "../src/integration/database-readiness.mjs";
import {
  runDatabaseProbe,
  verifyDatabaseProbeRecovery,
} from "../src/integration/database-probe.mjs";
let pool;
let report = {
  schema: "mew.database-probe.v1",
  status: "BLOCKED",
  hostedChecksVerified: false,
  modelActivated: false,
  paymentsEnabled: false,
  reason:
    "Explicit private config and --write-probe required; synthetic rows will be retained.",
};
try {
  if (process.argv.length !== 4 || process.argv[3] !== "--write-probe")
    throw Error("configuration missing");
  const config = loadPrivateIntegrationConfiguration(process.argv[2]);
  pool = await connectPostgres(config.postgres);
  await assertPrivateDatabase(pool);
  const id = `probe-${randomUUID()}`;
  report = {
    ...report,
    probeId: id,
    reason: "Probe started; inspect retained state before any retry.",
  };
  const checks = await runDatabaseProbe(pool, id);
  await pool.end();
  pool = undefined;
  pool = await connectPostgres(config.postgres);
  await assertPrivateDatabase(pool);
  const recovery = await verifyDatabaseProbeRecovery(pool, id);
  report = { ...checks, ...recovery, hostedChecksVerified: true };
} catch {
  process.exitCode = 1;
} finally {
  await pool?.end().catch(() => {});
}
console.log(JSON.stringify(report, null, 2));
