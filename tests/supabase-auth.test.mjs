import test from "node:test";
import assert from "node:assert/strict";
import {
  MEW_SUPABASE_URL,
  publicSupabaseConfiguration,
  createMEWBrowserClient,
  createMEWServerClient,
  authenticateMEWSession,
} from "../src/auth/supabase.mjs";
const config = {
  url: MEW_SUPABASE_URL,
  publishableKey: "sb_publishable_" + "a".repeat(32),
};
const subject = "11111111-1111-4111-8111-111111111111";
const jwt = (exp) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({ sub: subject, aud: "authenticated", exp }),
    ).toString("base64url"),
    "fixture-signature",
  ].join(".");
function session(exp = Math.floor(Date.now() / 1000) + 3600) {
  return {
    access_token: jwt(exp),
    refresh_token: "fixture-refresh",
    expires_at: exp,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: subject },
  };
}
const cookie = (value) =>
  "sb-ndorfchuhciidfcltbzf-auth-token=base64-" +
  Buffer.from(JSON.stringify(value)).toString("base64url");
function response() {
  const headers = new Map([["set-cookie", ["pre-existing=value; Path=/"]]]);
  return {
    setHeader(k, v) {
      headers.set(k.toLowerCase(), v);
    },
    getHeader(k) {
      return headers.get(k.toLowerCase());
    },
    headers,
  };
}
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
test("unset optional auth never creates client or calls network and private keys are rejected", async () => {
  let calls = 0;
  assert.equal(createMEWBrowserClient(), null);
  assert.equal(createMEWServerClient(), null);
  assert.equal(
    (await authenticateMEWSession({ fetchImpl: () => calls++ })).configured,
    false,
  );
  assert.equal(calls, 0);
  for (const c of [
    { url: "https://other.supabase.co", publishableKey: config.publishableKey },
    { url: MEW_SUPABASE_URL, publishableKey: "sb_secret_fake" },
    { url: MEW_SUPABASE_URL, publishableKey: "eyJ.legacy.service-role" },
  ])
    assert.throws(() => publicSupabaseConfiguration(c), /public publishable/);
});
test("actual SDK getUser validates identity against fixed Auth origin, never cookie user alone", async () => {
  let calls = 0;
  const res = response();
  const result = await authenticateMEWSession({
    request: {
      headers: { cookie: cookie({ ...session(), user: { id: "forged" } }) },
    },
    response: res,
    config,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, MEW_SUPABASE_URL + "/auth/v1/user");
      assert.equal(options.redirect, "error");
      assert.equal(options.cache, "no-store");
      assert.ok(options.signal);
      return json({ id: subject, aud: "authenticated" });
    },
  });
  assert.equal(result.authenticated, true);
  assert.equal(result.subject, subject);
  assert.equal(result.economicAuthority, false);
  assert.equal(result.privateDatabaseAccess, false);
  assert.equal(calls, 1);
  assert.equal(res.getHeader("Cache-Control"), "private, no-store, max-age=0");
});
test("forged cookie rejected by Auth response and malformed/duplicate cookies do not reach SDK", async () => {
  let calls = 0;
  const options = {
    request: { headers: { cookie: cookie(session()) } },
    response: response(),
    config,
    fetchImpl: async () => {
      calls++;
      return json({ msg: "Invalid JWT", code: "bad_jwt" }, 401);
    },
  };
  assert.equal((await authenticateMEWSession(options)).authenticated, false);
  assert.equal(calls, 1);
  for (const header of [
    "sb-ndorfchuhciidfcltbzf-auth-token=base64-bad",
    "a=1; a=2",
    "sb-ndorfchuhciidfcltbzf-auth-token.1=base64-bad",
    "x=" + "a".repeat(16385),
    "sb-ndorfchuhciidfcltbzf-auth-token.8=a",
  ]) {
    assert.equal(
      (
        await authenticateMEWSession({
          ...options,
          request: { headers: { cookie: header } },
        })
      ).authenticated,
      false,
    );
  }
  assert.equal(calls, 1);
});
test("actual SDK refresh rotates cookies, preserves existing headers and rechecks user", async () => {
  const urls = [];
  const res = response();
  const refreshed = session();
  const result = await authenticateMEWSession({
    request: {
      headers: {
        cookie: cookie(session(Math.floor(Date.now() / 1000) - 3600)),
      },
    },
    response: res,
    config,
    fetchImpl: async (url, options) => {
      urls.push(url);
      if (url.includes("/token?")) {
        assert.equal(options.method, "POST");
        return json(refreshed);
      }
      return json({ id: subject, aud: "authenticated" });
    },
  });
  assert.equal(result.authenticated, true);
  assert.ok(
    urls.includes(MEW_SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token"),
  );
  assert.ok(urls.includes(MEW_SUPABASE_URL + "/auth/v1/user"));
  const written = res.getHeader("Set-Cookie");
  assert.equal(written[0], "pre-existing=value; Path=/");
  assert.ok(
    written.some((s) => s.startsWith("sb-ndorfchuhciidfcltbzf-auth-token=")),
  );
  assert.ok(
    written
      .slice(1)
      .every(
        (s) =>
          s.includes("Secure") &&
          s.includes("SameSite=Lax") &&
          !s.includes("Domain="),
      ),
  );
  assert.equal(JSON.stringify(result).includes("fixture-refresh"), false);
});
test("rejected refresh fails closed and clears old cookie rather than trusting embedded user", async () => {
  const res = response();
  let calls = 0;
  const result = await authenticateMEWSession({
    request: { headers: { cookie: cookie(session(1)) } },
    response: res,
    config,
    fetchImpl: async () => {
      calls++;
      return json(
        { error: "invalid_grant", error_code: "refresh_token_not_found" },
        400,
      );
    },
  });
  assert.equal(result.authenticated, false);
  assert.equal(calls, 1);
  assert.ok(res.getHeader("Set-Cookie").some((s) => s.includes("Max-Age=0")));
});
test("provider error text and thrown transport errors cannot enter SDK diagnostics or result", async () => {
  const logs = [];
  const original = console.error;
  console.error = (...args) =>
    logs.push(args.map((v) => v?.message ?? String(v)).join(" "));
  const secret = "provider-fixture-private-token";
  try {
    for (const fetchImpl of [
      async () => json({ error: secret, error_code: secret }, 400),
      async () => {
        throw Error(secret);
      },
    ]) {
      const result = await authenticateMEWSession({
        request: { headers: { cookie: cookie(session(1)) } },
        response: response(),
        config,
        fetchImpl,
      });
      assert.equal(result.authenticated, false);
      assert.equal(JSON.stringify(result).includes(secret), false);
    }
    assert.equal(logs.join(" ").includes(secret), false);
  } finally {
    console.error = original;
  }
});
test("transient refresh failures and oversized Auth responses preserve browser cookies and cannot authenticate", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    for (const fetchImpl of [
      async () => json({ error: "private-provider-text" }, 503),
      async () => json({ error: "private-provider-text" }, 429),
      async () => {
        throw Error("private-provider-text");
      },
      async () =>
        json({ id: subject, user_metadata: { text: "x".repeat(65536) } }),
    ]) {
      const res = response();
      const r = await authenticateMEWSession({
        request: { headers: { cookie: cookie(session(1)) } },
        response: res,
        config,
        fetchImpl,
      });
      assert.equal(r.authenticated, false);
      assert.deepEqual(res.getHeader("Set-Cookie"), [
        "pre-existing=value; Path=/",
      ]);
    }
  } finally {
    console.error = original;
  }
});
test("redirected or foreign successful responses cannot authenticate the session", async () => {
  for (const metadata of [
    { redirected: true },
    { url: "https://foreign.invalid/auth/v1/user" },
  ]) {
    const result = await authenticateMEWSession({
      request: { headers: { cookie: cookie(session()) } },
      response: response(),
      config,
      fetchImpl: async () => {
        const r = json({ id: subject, aud: "authenticated" });
        for (const [key, value] of Object.entries(metadata))
          Object.defineProperty(r, key, { value });
        return r;
      },
    });
    assert.equal(result.authenticated, false);
  }
});
test("malformed successful refresh response is not retried and retains browser cookies", async () => {
  const res = response();
  let calls = 0;
  const original = console.error;
  console.error = () => {};
  try {
    const result = await authenticateMEWSession({
      request: { headers: { cookie: cookie(session(1)) } },
      response: res,
      config,
      fetchImpl: async () => {
        calls++;
        return new Response("{invalid-json", { status: 200 });
      },
    });
    assert.equal(result.authenticated, false);
    assert.equal(calls, 1);
    assert.deepEqual(res.getHeader("Set-Cookie"), [
      "pre-existing=value; Path=/",
    ]);
  } finally {
    console.error = original;
  }
});
