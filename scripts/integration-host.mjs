import { assertPrivateDatabase } from "../src/integration/database-readiness.mjs";
import { loadPrivateIntegrationConfiguration } from "../src/integration/private-config.mjs";
import { connectPostgres } from "../src/integration/postgres.mjs";
import { IntegrationStore } from "../src/integration/store.mjs";
import { IntegrationService } from "../src/integration/service.mjs";
import { makeIntegrationServer } from "../src/integration/http.mjs";

let pool, server;
try {
  if (process.argv.length !== 3)
    throw Error("Pass the private configuration path");
  const config = loadPrivateIntegrationConfiguration(process.argv[2]);
  // Validate enrollment before contacting a database. Keys come from host environment.
  const model = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.MEW_EVAL_MODEL,
    approved: process.env.MEW_APPROVE_MODEL_USAGE === "yes",
    maxRuns: 1,
  };
  new IntegrationService({
    store: {},
    policy: config.policy,
    model,
    providerKeys: config.providerKeys,
  });
  pool = await connectPostgres(config.postgres);
  await assertPrivateDatabase(pool);
  const store = new IntegrationStore({
    pool,
    paymentPolicy: config.paymentPolicy,
  });
  const service = new IntegrationService({
    store,
    policy: config.policy,
    model,
    providerKeys: config.providerKeys,
    blockfrost: { projectId: process.env.BLOCKFROST_PROJECT_ID },
    masumi: {
      apiBase: process.env.MPS_API_BASE,
      apiToken: process.env.MPS_API_TOKEN,
    },
  });
  server = makeIntegrationServer({ service });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, "127.0.0.1", resolve);
  });
  console.log(
    `Private Supabase integration listening on 127.0.0.1:${config.port}; production models and payment signing disabled`,
  );
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      if (closing) return;
      closing = true;
      server.close(async () => {
        await pool.end();
        process.exitCode = 0;
      });
      server.closeAllConnections();
    });
} catch {
  server?.close();
  await pool?.end().catch(() => {});
  console.error(
    "Private integration startup rejected; check selected project, least-privilege DB role and private configuration. No credentials are logged.",
  );
  process.exitCode = 1;
}
