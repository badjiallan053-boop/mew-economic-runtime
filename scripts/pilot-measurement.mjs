import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { createPublicKey } from "node:crypto";
import { importPilotMeasurement } from "../src/integration/pilot-measurement.mjs";
async function bounded(path, max) {
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > max)
      throw Error("Bounded regular file required");
    const b = Buffer.alloc(before.size + 1);
    let n = 0;
    while (n < b.length) {
      const r = await file.read(b, n, b.length - n, null);
      if (!r.bytesRead) break;
      n += r.bytesRead;
    }
    const after = await file.stat();
    if (
      n !== before.size ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs
    )
      throw Error("Changed input");
    return b.subarray(0, n);
  } finally {
    await file.close();
  }
}
try {
  const [
    contractPath,
    evidencePath,
    receiptPath,
    manifestPath,
    keyPath,
    measurementsPath,
    ...clipPaths
  ] = process.argv.slice(2);
  if (!measurementsPath || clipPaths.length < 1 || clipPaths.length > 100)
    throw Error("Six input files followed by explicit clip paths required");
  const json = async (p) =>
    JSON.parse((await bounded(p, 65536)).toString("utf8"));
  const manifestBytes = await bounded(manifestPath, 65536),
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    !Array.isArray(manifest.clips) ||
    manifest.clips.length !== clipPaths.length
  )
    throw Error("Clip paths must match manifest order");
  const pem = (await bounded(keyPath, 16384)).toString("utf8");
  if (
    !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\s*$/.test(
      pem,
    )
  )
    throw Error("Public PEM only");
  let bytes = 0;
  const artifacts = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const buffer = await bounded(
      clipPaths[i],
      Math.min(8388608, 33554432 - bytes),
    );
    bytes += buffer.length;
    artifacts.push({ id: manifest.clips[i].id, bytes: buffer });
  }
  const report = importPilotMeasurement({
    contract: await json(contractPath),
    evidence: await json(evidencePath),
    envelope: await json(receiptPath),
    manifestBytes,
    artifacts,
    measurements: await json(measurementsPath),
    trustedPublicKey: createPublicKey(pem),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exitCode = report.status === "BLOCKED" ? 1 : 0;
} catch {
  process.stderr.write(
    "Pilot measurement rejected. Supply six bounded regular local evidence files and explicit clip paths; no customer data or keys were written.\n",
  );
  process.exitCode = 2;
}
