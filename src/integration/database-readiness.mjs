/** Read-only startup guard. Catalog integrity does not establish lock/restart proof. */
export const privateDatabaseCatalogQuery = `
SELECT jsonb_build_object(
  'currentRole', current_user,
  'role', (SELECT jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,
    'bypassRls',rolbypassrls,'createRole',rolcreaterole,'createDatabase',rolcreatedb,
    'enrolled',pg_has_role('mew_runtime','mew_backend','member'))
    FROM pg_roles WHERE rolname='mew_runtime'),
  'runtimeSchemaUsage',has_schema_privilege('mew_runtime','mew_private','USAGE'),
  'runtimeSchemaCreate',has_schema_privilege('mew_runtime','mew_private','CREATE'),
  'tables', (SELECT coalesce(jsonb_agg(jsonb_build_object(
    'name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
    'select',has_table_privilege('mew_runtime',c.oid,'SELECT'),
    'insert',has_table_privilege('mew_runtime',c.oid,'INSERT'),
    'update',has_table_privilege('mew_runtime',c.oid,'UPDATE'),
    'delete',has_table_privilege('mew_runtime',c.oid,'DELETE'),
    'truncate',has_table_privilege('mew_runtime',c.oid,'TRUNCATE'),
    'references',has_table_privilege('mew_runtime',c.oid,'REFERENCES'),
    'trigger',has_table_privilege('mew_runtime',c.oid,'TRIGGER'),
    'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,
      'command',p.polcmd,'permissive',p.polpermissive,
      'roles',p.polroles::oid[], 'using',pg_get_expr(p.polqual,p.polrelid),
      'check',pg_get_expr(p.polwithcheck,p.polrelid))), '[]'::jsonb)
      FROM pg_policy p WHERE p.polrelid=c.oid)) ORDER BY c.relname),'[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='mew_private' AND c.relkind IN ('r','p')),
  'backendOid',(SELECT oid FROM pg_roles WHERE rolname='mew_backend'),
  'backendSafe',(SELECT NOT (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb) FROM pg_roles WHERE rolname='mew_backend'),
  'browserRoles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,
    'schemaUsage',has_schema_privilege(r.oid,'mew_private','USAGE'),
    'schemaCreate',has_schema_privilege(r.oid,'mew_private','CREATE'),
    'tableAccess',EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='mew_private' AND c.relkind IN ('r','p') AND
      has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
    ) ORDER BY r.rolname),'[]'::jsonb)
    FROM pg_roles r WHERE r.rolname IN ('anon','authenticated'))
) AS catalog`;
const row = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const names = [
  "delivery_contracts",
  "delivery_receipts",
  "escrow_operations",
  "input_locks",
  "ledgers",
  "model_runs",
];
const principalExpression =
  "(principal = current_setting('mew.principal'::text, true))";

export function reviewDatabaseCatalog(catalog) {
  const issues = [];
  const role = catalog?.role;
  if (catalog?.backendSafe !== true) issues.push("backend-role-boundary");
  if (
    !role ||
    role.enrolled !== true ||
    ["superuser", "bypassRls", "createRole", "createDatabase"].some(
      (k) => role[k] !== false,
    )
  )
    issues.push("runtime-role-boundary");
  if (
    catalog?.runtimeSchemaUsage !== true ||
    catalog?.runtimeSchemaCreate !== false
  )
    issues.push("runtime-schema-grants");
  const tables = catalog?.tables;
  if (
    !Array.isArray(tables) ||
    tables.length !== names.length ||
    !tables.every(row) ||
    [...tables.map((t) => t.name)].sort().join(",") !== names.join(",")
  )
    issues.push("private-table-set");
  else
    for (const table of tables) {
      if (table.rls !== true || table.forced !== true)
        issues.push(`${table.name}:forced-rls`);
      if (
        table.select !== true ||
        table.insert !== true ||
        table.update !==
          !["input_locks", "delivery_contracts", "delivery_receipts"].includes(
            table.name,
          ) ||
        ["delete", "truncate", "references", "trigger"].some(
          (k) => table[k] !== false,
        )
      )
        issues.push(`${table.name}:runtime-grants`);
      const policies = table.policies;
      if (
        !Array.isArray(policies) ||
        policies.length !== 1 ||
        !row(policies[0]) ||
        policies[0].name !== "principal_boundary" ||
        policies[0].command !== "*" ||
        policies[0].permissive !== true ||
        policies[0].roles?.length !== 1 ||
        policies[0].roles[0] !== catalog.backendOid ||
        policies[0].using !== principalExpression ||
        policies[0].check !== principalExpression
      )
        issues.push(`${table.name}:principal-policy`);
    }
  const browser = catalog?.browserRoles;
  if (
    !Array.isArray(browser) ||
    browser.length !== 2 ||
    !browser.every(row) ||
    browser
      .map((r) => r.name)
      .sort()
      .join(",") !== "anon,authenticated" ||
    browser.some(
      (r) =>
        r.schemaUsage !== false ||
        r.schemaCreate !== false ||
        r.tableAccess !== false,
    )
  )
    issues.push("browser-role-denial");
  const schemaBoundariesValid = issues.length === 0;
  if (role?.login !== true) issues.push("runtime-login-disabled");
  if (catalog?.currentRole !== "mew_runtime")
    issues.push("application-role-not-observed");
  return {
    schema: "mew.database-readiness.v2",
    requiredMigration: "mew_authenticated_delivery",
    schemaBoundariesValid,
    applicationConnectionReady: issues.length === 0,
    issues,
    modelActivated: false,
    paymentsEnabled: false,
    limitations: [
      "Read-only catalog check; not independent-client contention, restart recovery or provider/payment execution proof.",
      "Exact policy expression is deliberately fail-closed; a reviewed equivalent migration requires updating this guard.",
    ],
  };
}
export async function inspectPrivateDatabase(pool) {
  if (!pool || typeof pool.query !== "function")
    throw Error("Database query interface required");
  const { rows } = await pool.query(privateDatabaseCatalogQuery);
  if (rows.length !== 1) throw Error("Private database catalog unavailable");
  return reviewDatabaseCatalog(rows[0].catalog);
}
export async function assertPrivateDatabase(pool) {
  const report = await inspectPrivateDatabase(pool);
  if (!report.applicationConnectionReady)
    throw Error("Private database startup boundary rejected");
  return report;
}
