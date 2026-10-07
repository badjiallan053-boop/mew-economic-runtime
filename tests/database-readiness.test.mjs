import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  inspectPrivateDatabase,
  assertPrivateDatabase,
  reviewDatabaseCatalog,
} from "../src/integration/database-readiness.mjs";
async function fixture() {
  const db = new PGlite();
  await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
  await db.exec(
    await readFile(
      new URL("../deploy/supabase-bootstrap.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../deploy/supabase-delivery.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec("ALTER ROLE mew_runtime LOGIN; SET ROLE mew_runtime;");
  return db;
}

test("actual PostgreSQL catalog recognizes the exact private schema without mutating records", async () => {
  const db = await fixture();
  try {
    const before = await db.query("SELECT count(*) FROM mew_private.ledgers");
    const report = await assertPrivateDatabase(db);
    assert.equal(report.applicationConnectionReady, true);
    assert.equal(report.schemaBoundariesValid, true);
    assert.equal(report.paymentsEnabled, false);
    assert.deepEqual(
      (await db.query("SELECT count(*) FROM mew_private.ledgers")).rows,
      before.rows,
    );
  } finally {
    await db.close();
  }
});
for (const [title, sql, issue] of [
  [
    "disabled forced RLS",
    "ALTER TABLE mew_private.ledgers NO FORCE ROW LEVEL SECURITY",
    "ledgers:forced-rls",
  ],
  [
    "browser grants",
    "GRANT SELECT ON mew_private.ledgers TO anon",
    "browser-role-denial",
  ],
  [
    "runtime deletion grant",
    "GRANT DELETE ON mew_private.ledgers TO mew_runtime",
    "ledgers:runtime-grants",
  ],
  [
    "unexpected permissive policy",
    "CREATE POLICY bypass ON mew_private.ledgers TO mew_backend USING (true)",
    "ledgers:principal-policy",
  ],
  [
    "altered principal boundary",
    "ALTER POLICY principal_boundary ON mew_private.ledgers USING (true)",
    "ledgers:principal-policy",
  ],
  [
    "extra private table",
    "CREATE TABLE mew_private.extra(id int)",
    "private-table-set",
  ],
  [
    "privileged backend role",
    "ALTER ROLE mew_backend BYPASSRLS",
    "backend-role-boundary",
  ],
  [
    "disabled application login",
    "ALTER ROLE mew_runtime NOLOGIN",
    "runtime-login-disabled",
  ],
]) {
  test(`startup fails closed for ${title}`, async () => {
    const db = await fixture();
    try {
      await db.exec(`RESET ROLE; ${sql}; SET ROLE mew_runtime;`);
      const report = await inspectPrivateDatabase(db);
      assert.equal(report.applicationConnectionReady, false);
      assert.ok(report.issues.includes(issue));
      await assert.rejects(() => assertPrivateDatabase(db), /startup boundary/);
    } finally {
      await db.close();
    }
  });
}
test("management connection never stands in for the actual application role", async () => {
  const db = await fixture();
  try {
    await db.exec("RESET ROLE;");
    const report = await inspectPrivateDatabase(db);
    assert.equal(report.schemaBoundariesValid, true);
    assert.equal(report.applicationConnectionReady, false);
    assert.ok(report.issues.includes("application-role-not-observed"));
  } finally {
    await db.close();
  }
});
test("missing/malformed evidence cannot pass catalog review", () => {
  for (const input of [null, {}, { tables: [], browserRoles: [] }])
    assert.equal(
      reviewDatabaseCatalog(input).applicationConnectionReady,
      false,
    );
});

test("malformed catalog rows yield a blocked report rather than incidental TypeErrors", async () => {
  const db = await fixture();
  try {
    const { privateDatabaseCatalogQuery } = await import(
      "../src/integration/database-readiness.mjs"
    );
    const valid = (await db.query(privateDatabaseCatalogQuery)).rows[0].catalog;
    for (const field of ["tables", "browserRoles"]) {
      const changed = structuredClone(valid);
      changed[field][0] = null;
      assert.equal(
        reviewDatabaseCatalog(changed).applicationConnectionReady,
        false,
      );
    }
    const changed = structuredClone(valid);
    changed.tables[0].policies = [null];
    assert.equal(
      reviewDatabaseCatalog(changed).applicationConnectionReady,
      false,
    );
  } finally {
    await db.close();
  }
});

test("delivery migration is required and immutable delivery rows cannot gain UPDATE", async () => {
  const db = await fixture();
  try {
    await db.exec(
      "RESET ROLE; GRANT UPDATE ON mew_private.delivery_receipts TO mew_runtime; SET ROLE mew_runtime;",
    );
    assert.ok(
      (await inspectPrivateDatabase(db)).issues.includes(
        "delivery_receipts:runtime-grants",
      ),
    );
    await db.exec(
      "RESET ROLE; DROP TABLE mew_private.delivery_receipts; DROP TABLE mew_private.delivery_contracts; SET ROLE mew_runtime;",
    );
    assert.ok(
      (await inspectPrivateDatabase(db)).issues.includes("private-table-set"),
    );
  } finally {
    await db.close();
  }
});
