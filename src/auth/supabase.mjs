import {
  createBrowserClient,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
export const MEW_SUPABASE_URL = "https://ndorfchuhciidfcltbzf.supabase.co";
const prefix = "sb-ndorfchuhciidfcltbzf-auth-token";
const sessionName = new RegExp(`^${prefix}(?:\\.[0-7])?$`);
export function publicSupabaseConfiguration(config = {}) {
  if (config.url === undefined && config.publishableKey === undefined)
    return null;
  if (
    config.url !== MEW_SUPABASE_URL ||
    typeof config.publishableKey !== "string" ||
    !/^sb_publishable_[A-Za-z0-9_-]{16,500}$/.test(config.publishableKey)
  )
    throw Error("Fixed project and public publishable key required");
  return Object.freeze({
    url: config.url,
    publishableKey: config.publishableKey,
  });
}
function authFetch(config, fetchImpl, state) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url),
      method = (init.method || "GET").toUpperCase();
    if (
      url.origin !== config.url ||
      url.username ||
      url.password ||
      url.hash ||
      !(
        (url.pathname === "/auth/v1/user" && method === "GET" && !url.search) ||
        (url.pathname === "/auth/v1/token" &&
          method === "POST" &&
          url.search === "?grant_type=refresh_token")
      )
    )
      throw Error("Auth request outside fixed boundary");
    const failure = () =>
      new Response(JSON.stringify({ msg: "Auth request unavailable" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    const remaining = state ? Math.max(1, state.deadline - Date.now()) : 8000;
    if (state && (++state.calls > 2 || Date.now() >= state.deadline)) {
      state.unavailable = true;
      return failure();
    }
    const signal = init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(remaining)])
      : AbortSignal.timeout(remaining);
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetchImpl(url.toString(), {
            ...init,
            redirect: "error",
            cache: "no-store",
            signal,
          });
          if (
            response.redirected ||
            (response.url && response.url !== url.toString())
          )
            throw Error("Auth response origin or target changed");
          if (!response.ok) {
            if (response.status === 429 || response.status >= 500) {
              if (state) state.unavailable = true;
              return failure();
            }
            return new Response(
              JSON.stringify({
                msg: "Auth request rejected",
                error_code:
                  method === "POST" ? "refresh_token_not_found" : "bad_jwt",
              }),
              {
                status:
                  response.status >= 400 && response.status < 500
                    ? response.status
                    : 400,
                headers: { "content-type": "application/json" },
              },
            );
          }
          const reader = response.body?.getReader();
          if (!reader) throw Error("Missing Auth response");
          const parts = [];
          let bytes = 0;
          try {
            for (;;) {
              const item = await reader.read();
              if (item.done) break;
              bytes += item.value.byteLength;
              if (bytes > 65536) throw Error("Auth response exceeds bound");
              parts.push(item.value);
            }
          } finally {
            await reader.cancel().catch(() => {});
          }
          const buffer = new Uint8Array(bytes);
          let offset = 0;
          for (const part of parts) {
            buffer.set(part, offset);
            offset += part.length;
          }
          const payload = JSON.parse(new TextDecoder().decode(buffer));
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("Auth deadline")), remaining);
        }),
      ]);
    } catch {
      if (state) state.unavailable = true;
      return failure();
    } finally {
      clearTimeout(timer);
    }
  };
}
function cookieJar(header) {
  if (header === undefined) return [];
  if (
    typeof header !== "string" ||
    header.length > 16384 ||
    /[\r\n\0]/.test(header)
  )
    throw Error("Bounded cookie header required");
  const rawNames = new Set();
  for (const part of header.split(";")) {
    if (!part.trim()) continue;
    const split = part.indexOf("=");
    const name = part.slice(0, split).trim();
    if (split < 1 || rawNames.has(name))
      throw Error("Ambiguous request cookies");
    rawNames.add(name);
  }
  const cookies = parseCookieHeader(header);
  if (cookies.length > 64) throw Error("Cookie count exceeded");
  const seen = new Set();
  for (const c of cookies) {
    if (
      seen.has(c.name) ||
      !/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,127}$/.test(c.name) ||
      c.value.length > 8192 ||
      /[\r\n\0]/.test(c.value)
    )
      throw Error("Invalid request cookies");
    seen.add(c.name);
  }
  if (
    cookies.some((c) => c.name.startsWith(prefix) && !sessionName.test(c.name))
  )
    throw Error("Unsupported session cookie");
  const sessions = cookies.filter((c) => sessionName.test(c.name));
  if (sessions.length) {
    const single = sessions.find((c) => c.name === prefix),
      chunks = sessions
        .filter((c) => c.name !== prefix)
        .sort((a, b) => a.name.localeCompare(b.name));
    if (single && chunks.length) throw Error("Ambiguous session cookies");
    if (chunks.some((c, i) => c.name !== `${prefix}.${i}`))
      throw Error("Incomplete session chunks");
    const value = single ? single.value : chunks.map((c) => c.value).join("");
    if (!/^base64-[A-Za-z0-9_-]+$/.test(value) || value.length > 16384)
      throw Error("Malformed session encoding");
    const raw = value.slice(7),
      decoded = Buffer.from(raw, "base64url");
    if (decoded.toString("base64url") !== raw)
      throw Error("Noncanonical session encoding");
    const session = JSON.parse(decoded.toString("utf8"));
    if (
      !session ||
      typeof session.access_token !== "string" ||
      !session.access_token ||
      session.access_token.length > 8192 ||
      typeof session.refresh_token !== "string" ||
      !session.refresh_token ||
      session.refresh_token.length > 2048 ||
      !Number.isSafeInteger(session.expires_at) ||
      session.expires_at < 0
    )
      throw Error("Malformed session record");
  }
  return cookies;
}
export function createMEWServerClient({
  request,
  response,
  config = {},
  fetchImpl = fetch,
  secureCookies = true,
} = {}) {
  const validated = publicSupabaseConfiguration(config);
  if (!validated) return null;
  if (
    !request?.headers ||
    typeof response?.setHeader !== "function" ||
    typeof response?.getHeader !== "function" ||
    typeof fetchImpl !== "function" ||
    typeof secureCookies !== "boolean"
  )
    throw Error("Request response cookie bridge required");
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  const jar = cookieJar(request.headers.cookie),
    state = { deadline: Date.now() + 8000, calls: 0, unavailable: false };
  return createServerClient(validated.url, validated.publishableKey, {
    global: { fetch: authFetch(validated, fetchImpl, state) },
    cookies: {
      getAll: () => jar.map((c) => ({ ...c })),
      setAll: (updates) => {
        if (state.unavailable) return;
        if (
          !Array.isArray(updates) ||
          updates.length > 16 ||
          response.headersSent
        )
          throw Error("Cookie response unavailable");
        const serialized = updates.map(({ name, value, options }) => {
          if (
            !sessionName.test(name) ||
            typeof value !== "string" ||
            value.length > 8192 ||
            /[\r\n\0]/.test(value)
          )
            throw Error("Invalid session cookie write");
          return serializeCookieHeader(name, value, {
            ...options,
            domain: undefined,
            path: "/",
            secure: secureCookies,
            sameSite: "lax",
            httpOnly: false,
          });
        });
        if (serialized.reduce((n, s) => n + s.length, 0) > 32768)
          throw Error("Cookie write budget exceeded");
        const old = response.getHeader("Set-Cookie"),
          existing = old === undefined ? [] : Array.isArray(old) ? old : [old];
        if (existing.some((v) => typeof v !== "string" || /[\r\n\0]/.test(v)))
          throw Error("Invalid existing cookie response");
        response.setHeader("Set-Cookie", [...existing, ...serialized]);
        for (const c of updates) {
          const index = jar.findIndex((v) => v.name === c.name);
          if (index >= 0) jar.splice(index, 1);
          if (c.value) jar.push({ name: c.name, value: c.value });
        }
      },
    },
  });
}
export function createMEWBrowserClient({
  config = {},
  fetchImpl = fetch,
} = {}) {
  const validated = publicSupabaseConfiguration(config);
  if (!validated) return null;
  if (typeof fetchImpl !== "function") throw Error("Auth fetch required");
  return createBrowserClient(validated.url, validated.publishableKey, {
    isSingleton: false,
    global: { fetch: authFetch(validated, fetchImpl) },
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
  });
}
export async function authenticateMEWSession(options = {}) {
  const base = {
    configured: false,
    authenticated: false,
    subject: null,
    privateDatabaseAccess: false,
    economicAuthority: false,
  };
  try {
    const client = createMEWServerClient(options);
    if (!client) return base;
    const { data, error } = await client.auth.getUser();
    const subject = data?.user?.id;
    if (
      error ||
      typeof subject !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        subject,
      )
    )
      return { ...base, configured: true };
    return { ...base, configured: true, authenticated: true, subject };
  } catch {
    return {
      ...base,
      configured: publicSupabaseConfiguration(options.config || {}) !== null,
    };
  }
}
