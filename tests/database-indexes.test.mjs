import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("covering foreign-key indexes preserve the private permission and RLS contracts", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;",
    );
    for (const name of [
      "supabase-bootstrap.sql",
      "supabase-delivery.sql",
      "supabase-private-indexes.sql",
    ])
      await db.exec(
        await readFile(new URL("../deploy/" + name, import.meta.url), "utf8"),
      );
    const { rows } = await db.query(
      "SELECT tablename,indexdef FROM pg_indexes WHERE schemaname='mew_private' AND indexname IN ('delivery_receipts_principal_job_idx','input_locks_principal_operation_idx') ORDER BY indexname",
    );
    assert.equal(rows.length, 2);
    assert.match(rows[0].indexdef, /\(principal, provider, job_id\)/);
    assert.match(rows[1].indexdef, /\(principal, operation_id\)/);
    await db.exec("ALTER ROLE mew_runtime LOGIN; SET ROLE mew_runtime;");
    const { assertPrivateDatabase } = await import(
      "../src/integration/database-readiness.mjs"
    );
    assert.equal(
      (await assertPrivateDatabase(db)).applicationConnectionReady,
      true,
    );
  } finally {
    await db.close();
  }
});
