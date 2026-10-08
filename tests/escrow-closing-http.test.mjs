import test from "node:test";
import assert from "node:assert/strict";
import { makeIntegrationServer } from "../src/integration/http.mjs";
import { IntegrationService } from "../src/integration/service.mjs";
import { operatorTokenDigest } from "../src/server/operator-service.mjs";
import { privatePaymentFixture } from "./helpers/private-payment-fixture.mjs";
test("private closing routes require separate scopes, bind owner and keep submission unavailable", async () => {
  const f = await privatePaymentFixture();
  const limited = "l".repeat(40);
  f.service.policy.push({ principal: "payer", tokenDigest: operatorTokenDigest(limited),
    revoked: false, expiresAtMs: f.now + 600000,
    actions: ["read", "prepare-payment", "reconcile-payment"] });
  const server = makeIntegrationServer({ service: f.service });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, token = f.token, extra = {}) => fetch(base + path, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
  try {
    await f.fund();
    const path = "/integration/payment/closing/prepare";
    assert.equal((await post(path, f.closing(), limited)).status, 403);
    assert.equal((await post(path, f.closing(), f.token, { Origin: "http://localhost" })).status, 403);
    assert.equal((await post(path, { ...f.closing(), principal: "victim" })).status, 403);
    const prepared = await post(path, f.closing());
    assert.equal(prepared.status, 200);
    assert.equal((await prepared.json()).dispatchAllowed, false);
    const id = { operationId: "operation", closingId: "close" };
    assert.equal((await post("/integration/payment/closing/unknown", id)).status, 200);
    const reconciled = await post("/integration/payment/closing/reconcile", id);
    assert.equal(reconciled.status, 200);
    const result = await reconciled.json();
    assert.equal(result.operation.status, "CLOSE_UNKNOWN");
    assert.equal(result.exposureReleaseAllowed, false);
    assert.equal((await post("/integration/payment/submit", id)).status, 404);
    assert.equal(prepared.headers.get("cache-control"), "no-store");
  } finally {
    await new Promise((r) => { server.close(r); server.closeAllConnections(); });
    await f.close();
  }
});
test("old payment scopes cannot invoke closing methods even outside HTTP", () => {
  let calls = 0;
  const token = "a".repeat(40);
  const service = new IntegrationService({ store: { prepareClosing: () => calls++ },
    clock: () => 1000,
    policy: [{ principal: "payer", tokenDigest: operatorTokenDigest(token),
      expiresAtMs: 2000, revoked: false, actions: ["prepare-payment", "reconcile-payment"] }],
  });
  assert.throws(() => service.prepareClosing(token, {}), /Authorization/);
  assert.throws(() => service.markClosingUnknown(token, {}), /Authorization/);
  assert.throws(() => service.reconcileClosing(token, {}), /Authorization/);
  assert.equal(calls, 0);
});
