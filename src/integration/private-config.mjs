import { openSync, closeSync, readSync, fstatSync, constants } from "node:fs";
import { isAbsolute } from "node:path";
import { createPublicKey } from "node:crypto";
import { exact } from "./store.mjs";
import { enrolledDeliveryKeys } from "./delivery.mjs";
/** An explicit owner-only local configuration. Never enumerates credential files. */
export function loadPrivateIntegrationConfiguration(path) {
  if (typeof path !== "string" || !isAbsolute(path))
    throw Error("Private absolute configuration required");
  const fd = openSync(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const before = fstatSync(fd);
    if (
      !before.isFile() ||
      (before.mode & 0o077) !== 0 ||
      before.uid !== process.getuid() ||
      before.size > 65536
    )
      throw Error("Private owned bounded file required");
    const bytes = Buffer.alloc(65537);
    let n = 0,
      count;
    while (
      n < bytes.length &&
      (count = readSync(fd, bytes, n, bytes.length - n, null)) > 0
    )
      n += count;
    const after = fstatSync(fd);
    if (
      n !== before.size ||
      n > 65536 ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs
    )
      throw Error("Configuration changed or exceeded bounds");
    const config = JSON.parse(bytes.subarray(0, n).toString("utf8"));
    const keys = ["version", "postgres", "policy", "paymentPolicy", "port"];
    if (Object.hasOwn(config, "providerKeys")) keys.push("providerKeys");
    exact(config, keys);
    if (
      config.version !== 1 ||
      !Number.isSafeInteger(config.port) ||
      config.port < 1024 ||
      config.port > 65535
    )
      throw Error("Invalid private configuration");
    const rows = config.providerKeys ?? [];
    if (!Array.isArray(rows) || rows.length > 100)
      throw Error("Invalid public key enrollment");
    config.providerKeys = enrolledDeliveryKeys(
      rows.map((r) => {
        exact(r, [
          "provider",
          "keyId",
          "publicKeyPem",
          "notBeforeMs",
          "expiresAtMs",
          "revoked",
        ]);
        if (
          typeof r.publicKeyPem !== "string" ||
          r.publicKeyPem.length > 16384 ||
          !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PUBLIC KEY-----\r?\n?$/.test(
            r.publicKeyPem,
          )
        )
          throw Error("Only a public SPKI key is accepted");
        const { publicKeyPem, ...row } = r;
        return { ...row, publicKey: createPublicKey(publicKeyPem) };
      }),
    );
    return config;
  } finally {
    closeSync(fd);
  }
}
