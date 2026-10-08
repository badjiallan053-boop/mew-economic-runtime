import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { createPublicKey } from "node:crypto";
import { evaluatePilotReadiness } from "../src/integration/pilot-readiness.mjs";
// Explicit operator-owned local regular files only; no network or signing.
async function bounded(path, max) {
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > max)
      throw Error("Bounded regular file required");
    const buffer = Buffer.alloc(before.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const result = await file.read(buffer, size, buffer.length - size, null);
      if (!result.bytesRead) break;
      size += result.bytesRead;
    }
    const after = await file.stat();
    if (
      !after.isFile() ||
      size !== before.size ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs
    )
      throw Error("Input changed during read");
    return buffer.subarray(0, size);
  } finally {
    await file.close();
  }
}
try {
  const [contractPath, evidencePath, receiptPath, artifactPath, keyPath] =
    process.argv.slice(2);
  if (process.argv.length !== 7) throw Error("Five explicit paths required");
  const json = async (path) =>
    JSON.parse((await bounded(path, 65536)).toString("utf8"));
  const pem = (await bounded(keyPath, 16384)).toString("utf8");
  if (
    !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\s*$/.test(
      pem,
    )
  )
    throw Error("Public-key-only PEM required");
  const report = evaluatePilotReadiness({
    contract: await json(contractPath),
    evidence: await json(evidencePath),
    envelope: await json(receiptPath),
    artifactBytes: await bounded(artifactPath, 16 * 1024 * 1024),
    trustedPublicKey: createPublicKey(pem),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exitCode = report.status === "BLOCKED" ? 1 : 0;
} catch {
  process.stderr.write(
    "Pilot check failed: provide five bounded regular local files matching docs/CUSTOMER_NEXT_RELEASE.md. No evidence or keys were written.\n",
  );
  process.exitCode = 2;
}
