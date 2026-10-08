const origin = "https://cardano-preprod.blockfrost.io/api/v0";
/** Fixed-origin bounded GET transport. Never logs provider content or credentials. */
export async function readPreprodJson(path, { projectId, fetchImpl = fetch }) {
  const expected = origin + path;
  const response = await fetchImpl(expected, {
    method: "GET", headers: { project_id: projectId }, redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !response.body || response.redirected === true ||
      (response.url && response.url !== expected))
    throw Error("Preprod observation unavailable");
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) throw Error("Provider response exceeds budget");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
