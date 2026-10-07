import { inspectPrivateDatabase } from "../src/integration/database-readiness.mjs";
import {
  postgresOptions,
  connectPostgres,
} from "../src/integration/postgres.mjs";
const projectRef =
  process.env.MEW_SUPABASE_PROJECT_REF || "ndorfchuhciidfcltbzf";
const configured = Boolean(process.env.MEW_SUPABASE_DATABASE_URL);
let database = "NOT_CONFIGURED",
  pool,
  databaseReview;
if (configured)
  try {
    const options = {
      connectionString: process.env.MEW_SUPABASE_DATABASE_URL,
      projectRef,
    };
    postgresOptions(options);
    pool = await connectPostgres(options);
    databaseReview = await inspectPrivateDatabase(pool);
    if (!databaseReview.applicationConnectionReady)
      throw Error("Private schema boundary rejected");
    database = "PRIVATE_ROLE_CONNECTION_VERIFIED";
  } catch {
    database = "CONNECTION_OR_POLICY_REJECTED";
  } finally {
    await pool?.end();
  }
console.log(
  JSON.stringify(
    {
      schema: "mew.integration-preflight.v1",
      projectRef,
      database,
      databaseReview: databaseReview ?? null,
      modelCredentialConfigured: Boolean(process.env.OPENAI_API_KEY),
      modelConfigured: Boolean(process.env.MEW_EVAL_MODEL),
      modelUsageApproved: process.env.MEW_APPROVE_MODEL_USAGE === "yes",
      blockfrostConfigured: Boolean(process.env.BLOCKFROST_PROJECT_ID),
      masumiConfigured: Boolean(
        process.env.MPS_API_BASE && process.env.MPS_API_TOKEN,
      ),
      modelActivated: false,
      paymentsEnabled: false,
      signingEnabled: false,
      limitations: [
        "Connection checks are not successful model inference or payment proof",
        "Private operator enrollment, budget and funded audited preprod lifecycle remain separate gates",
      ],
    },
    null,
    2,
  ),
);
if (database !== "PRIVATE_ROLE_CONNECTION_VERIFIED") process.exitCode = 1;
