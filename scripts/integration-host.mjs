import { assertPrivateDatabase } from "../src/integration/database-readiness.mjs";
import {
  openSync,
  closeSync,
  readFileSync,
  fstatSync,
  constants,
} from "node:fs";
import { isAbsolute } from "node:path";
import { connectPostgres } from "../src/integration/postgres.mjs";
import { IntegrationStore, exact } from "../src/integration/store.mjs";
import { IntegrationService } from "../src/integration/service.mjs";
import { makeIntegrationServer } from "../src/integration/http.mjs";

// Only an absolute private configuration path is supplied, never credentials.
function privateConfiguration(path) {
  if (!isAbsolute(path)) throw Error("Private absolute configuration required");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (
      !stat.isFile() ||
      (stat.mode & 0o077) !== 0 ||
      stat.uid !== process.getuid() ||
      stat.size > 65536
    )
      throw Error("Private owned file required");
    const config = JSON.parse(readFileSync(fd, "utf8"));
    exact(config, ["version", "postgres", "policy", "paymentPolicy", "port"]);
    if (
      config.version !== 1 ||
      !Number.isSafeInteger(config.port) ||
      config.port < 1024 ||
      config.port > 65535
    )
      throw Error("Invalid private configuration");
    return config;
  } finally {
    closeSync(fd);
  }
}
let pool, server;
try {
  if (process.argv.length !== 3)
    throw Error("Pass the private configuration path");
  const config = privateConfiguration(process.argv[2]);
  // Validate enrollment before contacting a database. Keys come from host environment.
  const model = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.MEW_EVAL_MODEL,
    approved: process.env.MEW_APPROVE_MODEL_USAGE === "yes",
    maxRuns: 1,
  };
  new IntegrationService({ store: {}, policy: config.policy, model });
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
