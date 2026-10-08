import pg from "pg";

/** Trusted backend only. A publishable/service API key is not a DB password. */
export function postgresOptions({ connectionString, projectRef, ca } = {}) {
  if (typeof projectRef !== "string" || !/^[a-z]{20}$/.test(projectRef))
    throw Error("Selected Supabase project required");
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw Error("Private Postgres connection required");
  }
  const direct = url.hostname === `db.${projectRef}.supabase.co`;
  const pooled = url.hostname.endsWith(".pooler.supabase.com");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    (!direct && !pooled) ||
    !["", "5432", "6543"].includes(url.port) ||
    !url.password ||
    url.pathname !== "/postgres" ||
    url.hash ||
    decodeURIComponent(url.username) !==
      (direct ? "mew_runtime" : `mew_runtime.${projectRef}`)
  )
    throw Error("Dedicated MEW runtime connection required");
  for (const [key, value] of url.searchParams)
    if (key !== "sslmode" || !["require", "verify-full"].includes(value))
      throw Error("Unsafe connection options");
  url.search = ""; // URI SSL options must not override certificate verification.
  if (
    ca !== undefined &&
    (typeof ca !== "string" ||
      ca.length > 65536 ||
      !ca.includes("-----BEGIN CERTIFICATE-----"))
  )
    throw Error("Invalid trusted certificate");
  return {
    connectionString: url.href,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    statement_timeout: 10000,
    query_timeout: 12000,
    application_name: "mew-private-integration",
  };
}
export async function connectPostgres(options) {
  const pool = new pg.Pool(postgresOptions(options));
  pool.on("error", () => {}); // Credential-bearing provider error text is never logged.
  try {
    const { rows } =
      await pool.query(`select r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolcreatedb,
      pg_has_role(current_user,'mew_backend','member') as enrolled
      from pg_roles r where r.rolname=current_user`);
    if (
      rows.length !== 1 ||
      !rows[0].enrolled ||
      ["rolsuper", "rolbypassrls", "rolcreaterole", "rolcreatedb"].some(
        (k) => rows[0][k],
      )
    )
      throw Error("Role exceeds private runtime boundary");
    return pool;
  } catch {
    await pool.end();
    throw Error("Supabase connection or least-privilege role check failed");
  }
}
