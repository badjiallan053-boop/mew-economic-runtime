import test from "node:test";
import assert from "node:assert/strict";
import { makeServer } from "../src/server/server.mjs";
async function fixture(t, options = {}) {
  let calls = 0;
  const server = makeServer({
    dbPath: ":memory:",
    supabaseAuth: null,
    authFetch: async () => {
      calls++;
      throw Error("SECRET-CREDENTIAL-MUST-NOT-LEAK");
    },
    ...options,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    calls: () => calls,
  };
}
test("unconfigured session endpoint makes no Auth call and has no ledger authority", async (t) => {
  const f = await fixture(t);
  const response = await fetch(f.url + "/api/auth/session");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    configured: false,
    authenticated: false,
    privateDatabaseAccess: false,
    economicAuthority: false,
  });
  assert.equal(f.calls(), 0);
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("cross-site session requests cannot refresh browser cookies and non-GET calls fail", async (t) => {
  const f = await fixture(t);
  for (const headers of [
    { Origin: "https://attacker.invalid" },
    { "Sec-Fetch-Site": "cross-site" },
  ])
    assert.equal(
      (await fetch(f.url + "/api/auth/session", { headers })).status,
      403,
    );
  assert.equal(
    (await fetch(f.url + "/api/auth/session", { method: "POST" })).status,
    405,
  );
  assert.equal(f.calls(), 0);
});
test("malformed Auth configuration is sanitized and does not broaden private live API", async (t) => {
  const f = await fixture(t, {
    demo: false,
    token: "a".repeat(32),
    supabaseAuth: {
      url: "https://attacker.invalid",
      publishableKey: "sb_publishable_not-real",
    },
  });
  const r = await fetch(f.url + "/api/auth/session");
  assert.equal(r.status, 503);
  assert.equal(JSON.stringify(await r.json()).includes("SECRET"), false);
  assert.equal(f.calls(), 0);
  assert.equal((await fetch(f.url + "/api/state")).status, 401);
});
