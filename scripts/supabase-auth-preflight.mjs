import { publicSupabaseConfiguration } from "../src/auth/supabase.mjs";
let report = {
  schema: "mew.supabase-auth-preflight.v1",
  publicApiConnected: false,
  privateDatabaseConnected: false,
  userAuthenticated: false,
  economicAuthority: false,
  modelActivated: false,
  paymentsEnabled: false,
  status: "NOT_CONFIGURED",
};
try {
  const config = publicSupabaseConfiguration({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (config) {
    report.status = "PUBLIC_API_REJECTED";
    const signal = AbortSignal.timeout(8000);
    const response = await fetch(config.url + "/auth/v1/settings", {
      headers: { apikey: config.publishableKey },
      redirect: "error",
      cache: "no-store",
      signal,
    });
    let size = 0,
      raw = "";
    for await (const part of response.body) {
      size += part.byteLength;
      if (size > 65536) throw Error("Public settings response exceeded bounds");
      raw += Buffer.from(part).toString("utf8");
    }
    const body = JSON.parse(raw);
    if (
      response.ok &&
      body &&
      typeof body.external === "object" &&
      body.external !== null
    ) {
      report.publicApiConnected = true;
      report.status = "PUBLIC_AUTH_SETTINGS_VERIFIED";
    }
  }
} catch {
  report.status = "CONFIGURATION_OR_PUBLIC_API_REJECTED";
}
console.log(JSON.stringify(report, null, 2));
if (!report.publicApiConnected) process.exitCode = 1;
