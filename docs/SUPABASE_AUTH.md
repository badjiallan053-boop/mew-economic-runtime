# Optional Supabase cookie authentication

MEW remains a Node HTTP application with static browser pages. The requested `@supabase/supabase-js` 2.117.3 and `@supabase/ssr` 0.12.7 packages are exact dependencies installed with lifecycle scripts disabled. No Next.js runtime, new tables, login/signup email, OAuth consent, logout call or model/payment execution was added by these helpers.

## Configuration and boundary

`publicSupabaseConfiguration({url,publishableKey})` accepts only `https://ndorfchuhciidfcltbzf.supabase.co` and an `sb_publishable_` public key. Other project URLs, legacy JWT keys, secret/service-role keys and partial configuration are rejected. Missing both values disables the integration without network calls. Root host setup owns optional env wiring; `npm start` loads the ignored `.env.local` when present using Node's built-in env-file support. Existing environment values take precedence. A publishable key is public configuration, not a database password or MEW operator credential.

`createMEWServerClient({request,response,config,fetchImpl,secureCookies})` creates a new actual Supabase SSR client for the request. `authenticateMEWSession` invokes `auth.getUser()` for a fresh Auth-server user lookup after any SDK refresh. It returns configured/authenticated flags and an internal subject only; the host's public status route must omit subject and any user/session data. privateDatabaseAccess and economicAuthority are always false. No Supabase Auth identity is mapped automatically to a private `mew_runtime` principal, an operator bearer token, a payment mandate or delivery authority.

`createMEWBrowserClient({config,fetchImpl})` is an optional SDK helper for a future bundled browser entry point. Static pages currently do not import bare Node package modules. The helper disables automatic refresh timers and URL session detection; it is not a completed sign-in UI. Its fetch boundary permits only GET `/auth/v1/user` and POST `/auth/v1/token?grant_type=refresh_token` at the fixed project origin. Login/signup/logout and Data API calls are outside this helper's allowed fetch boundary.

## Cookies, failures and caching

Request cookies are bounded to 16 KiB and 64 entries; individual values are at most 8 KiB. Duplicate names, malformed session encoding, noncontiguous chunks, unexpected chunk indices and ambiguous whole/chunked sessions are rejected before the SDK. Parsed cookie user fields are untrusted. Tests use a forged cookie user and show the authenticated subject comes from the Auth response instead.

SSR `setAll` preserves existing response cookies, writes all rotated/cleared chunks, updates its request-local cookie jar and rejects late writes after headers are sent. Session cookies are host-only at `/`, SameSite=Lax, Secure by default and intentionally readable by JavaScript to support the Supabase SSR browser client. Set secureCookies=false only for an explicitly reviewed loopback HTTP development host; a published host needs HTTPS. Cookie lifetime does not establish session validity.

Responses use private/no-store headers. Auth fetches reject redirects and set no-store. Server refresh and user lookup share an eight-second budget and at most two real Auth requests. Successful response bodies are bounded to 64 KiB inside that deadline. The SDK may emit generic error diagnostics; upstream error text and transport errors are sanitized first, and helpers never return or log session tokens, refresh tokens, cookie values or keys.

Bad credentials fail closed and may clear invalid session cookies. Transport/deadline errors, rate limits, provider 5xx and malformed/oversized response bodies fail closed while preserving existing browser cookies; they cannot authenticate a request from its embedded cookie user. These failures never contact a payment service or release economic capacity.

## Tested and unverified

`node --test tests/supabase-auth.test.mjs` uses the installed real SDK with a controlled fetch boundary. It exercises disabled configuration, secret-key rejection, server-confirmed identity, forged/malformed sessions, refresh-cookie rotation, rejected refresh, transient failures and error-text sanitization. No user account was created, real session exercised or project login performed by these tests. Hosted identity verification still requires an existing authorized user's valid session and the deployed helper configuration.

Official references: [SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [advanced cookie/caching guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide). The docs distinguish server lookup from reading an unverified local session. `getClaims` supports efficient signature verification, but local claims alone do not provide a fresh Auth-server user lookup; this helper deliberately uses getUser.

## MEW host and public connectivity observation

The optional GET `/api/auth/session` route verifies an existing session and returns
only configured/authenticated flags. Cross-site refresh and non-GET calls are
rejected, it remains no-store, and existing operator bearer authorization is
unchanged. Authenticated users receive no private or economic authority here.

The supplied public key successfully reached the selected project Auth settings
API through `npm run supabase:auth-preflight`. This read-only request neither
signed in a user nor connected as mew_runtime. That preflight can be repeated
without creating an account or accessing customer records.

Nine SDK regressions include rejection of redirected/foreign response URLs and
malformed HTTP 200 responses without retrying or deleting browser cookies. Empty
response URLs are supported for explicitly injected local fixture transports;
native fetch must report the exact approved response target.
