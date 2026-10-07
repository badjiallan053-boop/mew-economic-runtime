import { MASUMI_SPEC_PIN } from "../adapters/masumi-contract.mjs";

/** Pinned MPS GET interfaces only. No purchase/withdrawal write or token ledger. */
export async function checkMasumiConnection({
  apiBase,
  apiToken,
  fetchImpl = fetch,
} = {}) {
  const base = {
    configured: Boolean(apiBase),
    healthVerified: false,
    authenticatedReadVerified: false,
    network: "Preprod",
    specPin: MASUMI_SPEC_PIN,
    paymentsEnabled: false,
    nativeTokenLedgerImplemented: false,
  };
  if (!apiBase) return { ...base, reason: "NOT_CONFIGURED" };
  try {
    const url = new URL(apiBase);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/api/v1/" ||
      !url.hostname.endsWith(".up.railway.app")
    )
      throw Error("Enrolled Railway MPS API required");
    if (
      apiToken !== undefined &&
      (typeof apiToken !== "string" || !/^[^\s]{16,1024}$/.test(apiToken))
    )
      throw Error("Invalid MPS credential");
    async function get(path, authenticated = false) {
      const response = await fetchImpl(new URL(path, url).href, {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: authenticated ? { token: apiToken } : {},
      });
      if (!response.ok) throw Error("MPS read unavailable");
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 131072) throw Error("MPS response exceeds budget");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    if ((await get("health/"))?.status !== "ok")
      throw Error("Invalid MPS health");
    base.healthVerified = true;
    if (!apiToken) return { ...base, reason: "HEALTH_ONLY_AUTH_REQUIRED" };
    const response = await get("purchase/?network=Preprod&limit=1", true);
    // Do not return private purchase bodies or assume server version from health.
    if (
      response?.status !== "success" ||
      !Array.isArray(response?.data?.Purchases) ||
      response.data.Purchases.length > 1
    )
      throw Error("Unexpected MPS read envelope");
    return {
      ...base,
      authenticatedReadVerified: true,
      reason: "READ_ONLY_CONNECTED_VERSION_AND_ASSET_REVIEW_PENDING",
    };
  } catch {
    return { ...base, reason: "MPS_UNAVAILABLE_OR_CONFIGURATION_REJECTED" };
  }
}
