import test from "node:test";
import assert from "node:assert/strict";
import { makeIntegrationServer } from "../src/integration/http.mjs";
test("private integration HTTP rejects browsers, missing auth, caller ownership and oversized bodies before execution", async () => {
  let calls = 0;
  const token = "a".repeat(40);
  const service = {
    principal(t) {
      if (t !== token) throw Error("fixture denied");
      return "payer";
    },
    async status(t) {
      this.principal(t);
      return { paymentsEnabled: false };
    },
    async evaluateModel(t, body) {
      this.principal(t);
      if (Object.keys(body).join(",") !== "id") throw Error("fixture invalid");
      calls++;
      return { modelActivated: false };
    },
  };
  const server = makeIntegrationServer({ service, requestLimit: 10 });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  try {
    assert.equal((await fetch(origin + "/integration/status")).status, 401);
    assert.equal(
      (
        await fetch(origin + "/integration/status", {
          headers: { ...headers, Origin: "http://localhost" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(origin + "/integration/model/evaluate", {
          method: "POST",
          headers: { ...headers, Authorization: `Bearer ${"b".repeat(40)}` },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(origin + "/integration/model/evaluate", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "run", principal: "victim" }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(origin + "/integration/model/evaluate", {
          method: "POST",
          headers,
          body: "x".repeat(262145),
        })
      ).status,
      413,
    );
    assert.equal(
      (
        await fetch(origin + "/integration/model/evaluate", {
          method: "POST",
          headers,
          body: '{"id":"run"}',
        })
      ).status,
      200,
    );
    assert.equal(calls, 1);
    const status = await fetch(origin + "/integration/status", { headers });
    assert.equal(status.headers.get("cache-control"), "no-store");
    assert.equal((await status.json()).paymentsEnabled, false);
    assert.equal(
      (
        await fetch(origin + "/integration/payment/submit", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      404,
    );
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
});
