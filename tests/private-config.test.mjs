import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { loadPrivateIntegrationConfiguration } from "../src/integration/private-config.mjs";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "mew-private-config-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "config.json");
  const config = {
    version: 1,
    postgres: {},
    policy: [],
    paymentPolicy: { principals: [], providers: [] },
    port: 3046,
  };
  return {
    dir,
    path,
    config,
    save(c = config) {
      writeFileSync(path, JSON.stringify(c), { mode: 0o600 });
      chmodSync(path, 0o600);
      return path;
    },
  };
}
test("private config supports old enrollment and explicitly scoped Ed25519 public keys", (t) => {
  const f = fixture(t);
  assert.deepEqual(
    loadPrivateIntegrationConfiguration(f.save()).providerKeys,
    [],
  );
  const key = generateKeyPairSync("ed25519");
  f.config.providerKeys = [
    {
      provider: "vendor",
      keyId: "key-1",
      publicKeyPem: key.publicKey.export({ type: "spki", format: "pem" }),
      notBeforeMs: 1,
      expiresAtMs: 1000,
      revoked: false,
    },
  ];
  const read = loadPrivateIntegrationConfiguration(f.save());
  assert.equal(read.providerKeys[0].publicKey.asymmetricKeyType, "ed25519");
  assert.equal(read.providerKeys[0].publicKey.type, "public");
});
test("private config rejects private keys, unsupported keys, loose files and symlinks", (t) => {
  const f = fixture(t);
  for (const kind of ["ed25519", "rsa"]) {
    const k = generateKeyPairSync(
      kind,
      kind === "rsa" ? { modulusLength: 2048 } : {},
    );
    f.config.providerKeys = [
      {
        provider: "vendor",
        keyId: "k",
        publicKeyPem:
          kind === "rsa"
            ? k.publicKey.export({ type: "spki", format: "pem" })
            : k.privateKey.export({ type: "pkcs8", format: "pem" }),
        notBeforeMs: 1,
        expiresAtMs: 1000,
        revoked: false,
      },
    ];
    assert.throws(() => loadPrivateIntegrationConfiguration(f.save()));
  }
  delete f.config.providerKeys;
  f.save();
  chmodSync(f.path, 0o644);
  assert.throws(() => loadPrivateIntegrationConfiguration(f.path));
  f.save();
  const link = join(f.dir, "link");
  symlinkSync(f.path, link);
  assert.throws(() => loadPrivateIntegrationConfiguration(link));
  assert.throws(() => loadPrivateIntegrationConfiguration("relative"));
});
test("malformed, oversized and duplicate key enrollments fail before database contact", (t) => {
  const f = fixture(t);
  assert.throws(() =>
    loadPrivateIntegrationConfiguration(
      f.save({ ...f.config, unexpected: true }),
    ),
  );
  writeFileSync(f.path, "x".repeat(65537), { mode: 0o600 });
  assert.throws(() => loadPrivateIntegrationConfiguration(f.path));
  const k = generateKeyPairSync("ed25519").publicKey.export({
    type: "spki",
    format: "pem",
  });
  const row = {
    provider: "vendor",
    keyId: "k",
    publicKeyPem: k,
    notBeforeMs: 1,
    expiresAtMs: 1000,
    revoked: false,
  };
  assert.throws(() =>
    loadPrivateIntegrationConfiguration(
      f.save({ ...f.config, providerKeys: [row, row] }),
    ),
  );
  assert.throws(() => loadPrivateIntegrationConfiguration(f.dir));
});
