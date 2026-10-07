import test from "node:test";
import assert from "node:assert/strict";
import { checkMasumiConnection } from "../src/integration/masumi.mjs";
test("Masumi checks fixed read-only preprod endpoints and keeps purchase contents private", async () => {
  const calls = [];
  const r = await checkMasumiConnection({
    apiBase: "https://mps-fixture.up.railway.app/api/v1/",
    apiToken: "t".repeat(32),
    fetchImpl: async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, "error");
      assert.ok(!options.method || options.method === "GET");
      return new Response(
        JSON.stringify(
          url.endsWith("/health/")
            ? { status: "ok" }
            : {
                status: "success",
                data: { Purchases: [] },
                privateFixture: "not returned",
              },
        ),
      );
    },
  });
  assert.equal(r.authenticatedReadVerified, true);
  assert.equal(r.paymentsEnabled, false);
  assert.equal(r.nativeTokenLedgerImplemented, false);
  assert.deepEqual(calls, [
    "https://mps-fixture.up.railway.app/api/v1/health/",
    "https://mps-fixture.up.railway.app/api/v1/purchase/?network=Preprod&limit=1",
  ]);
  assert.ok(!JSON.stringify(r).includes("privateFixture"));
});
test("Masumi rejects redirects, oversize responses and unenrolled origins without leaking provider errors", async () => {
  for (const apiBase of [
    "http://localhost:3000/api/v1/",
    "https://unknown.example/api/v1/",
    "https://mps-fixture.up.railway.app/api/v1/?token=secret",
  ]) {
    const r = await checkMasumiConnection({
      apiBase,
      fetchImpl: () => {
        throw Error("Must not fetch");
      },
    });
    assert.equal(r.healthVerified, false);
  }
  for (const response of [
    new Response("secret fixture", { status: 401 }),
    new Response("x".repeat(131073)),
  ]) {
    const r = await checkMasumiConnection({
      apiBase: "https://mps-fixture.up.railway.app/api/v1/",
      fetchImpl: async () => response,
    });
    assert.equal(r.healthVerified, false);
    assert.ok(!JSON.stringify(r).includes("secret fixture"));
  }
  assert.equal((await checkMasumiConnection()).reason, "NOT_CONFIGURED");
});
