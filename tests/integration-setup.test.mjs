import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  readFileSync,
  statSync,
  chmodSync,
  mkdirSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { preparePrivateIntegration } from "../scripts/integration-setup.mjs";
import { IntegrationService } from "../src/integration/service.mjs";

function fixture(t) {
  const parent = mkdtempSync(
    join(realpathSync(tmpdir()), "mew-private-setup-"),
  );
  chmodSync(parent, 0o700);
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  return parent;
}

test("private scaffold keeps token separate, owner-only and valid with bounded non-payment enrollment", (t) => {
  const parent = fixture(t),
    directory = join(parent, "operator");
  const now = 1800000000000;
  const result = preparePrivateIntegration(directory, { now });
  const config = JSON.parse(readFileSync(result.configPath, "utf8"));
  const token = readFileSync(result.tokenPath, "utf8").trim();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(
    config.policy[0].tokenDigest,
    createHash("sha256").update(token).digest("hex"),
  );
  assert.equal(config.policy[0].expiresAtMs, now + 86400000);
  assert.equal(JSON.stringify(config).includes(token), false);
  assert.equal(JSON.stringify(result).includes(token), false);
  assert.equal(statSync(directory).mode & 0o777, 0o700);
  for (const path of [result.tokenPath, result.configPath])
    assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(
    config.postgres.connectionString.includes("PRIVATE_RUNTIME_PASSWORD"),
    true,
  );
  assert.deepEqual(config.paymentPolicy, { principals: [], providers: [] });
  const service = new IntegrationService({
    store: {},
    policy: config.policy,
    clock: () => now,
  });
  assert.equal(service.principal(token, "evaluate-model"), "founder");
  assert.throws(() => service.principal(token, "prepare-payment"), /denied/);
  const expired = new IntegrationService({
    store: {},
    policy: config.policy,
    clock: () => now + 86400000,
  });
  assert.throws(() => expired.principal(token, "read"), /denied/);
  const saved = readFileSync(result.configPath, "utf8");
  assert.throws(() => preparePrivateIntegration(directory, { now }));
  assert.equal(readFileSync(result.configPath, "utf8"), saved);
});

test("setup rejects shared parents, links, relative paths and repository destinations", (t) => {
  const parent = fixture(t);
  assert.throws(() => preparePrivateIntegration("relative"));
  assert.throws(
    () => preparePrivateIntegration(resolve(".local/private-test")),
    /outside/,
  );
  assert.throws(() =>
    preparePrivateIntegration(join(parent, "x"), {
      now: Number.MAX_SAFE_INTEGER,
    }),
  );
  chmodSync(parent, 0o755);
  assert.throws(
    () => preparePrivateIntegration(join(parent, "shared")),
    /0700/,
  );
  chmodSync(parent, 0o700);
  const target = join(parent, "real");
  mkdirSync(target, { mode: 0o700 });
  const linked = join(parent, "linked");
  symlinkSync(target, linked, "dir");
  assert.throws(
    () => preparePrivateIntegration(join(linked, "child")),
    /ancestry/,
  );
  const destination = join(parent, "existing-link");
  symlinkSync(target, destination, "dir");
  assert.throws(() => preparePrivateIntegration(destination));
  const repoLink = join(parent, "repo-link");
  symlinkSync(resolve("."), repoLink, "dir");
  assert.throws(
    () => preparePrivateIntegration(join(repoLink, "child")),
    /ancestry/,
  );
  mkdirSync(join(target, ".git"));
  assert.throws(
    () => preparePrivateIntegration(join(target, "other-repo-secret")),
    /outside Git/,
  );
});

test("CLI reports paths and gates while keeping token out of stdout and stderr", (t) => {
  const parent = fixture(t),
    directory = join(parent, "cli");
  const run = spawnSync(
    process.execPath,
    ["scripts/integration-setup.mjs", directory],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0);
  const result = JSON.parse(run.stdout);
  const token = readFileSync(result.tokenPath, "utf8").trim();
  assert.equal(run.stdout.includes(token), false);
  assert.equal(run.stderr.includes(token), false);
  assert.equal(result.databaseConfigured, false);
  assert.equal(result.modelsActivated, false);
  assert.equal(result.paymentsEnabled, false);
  const rejected = spawnSync(
    process.execPath,
    ["scripts/integration-setup.mjs", directory],
    { encoding: "utf8" },
  );
  assert.equal(rejected.status, 1);
  assert.equal(rejected.stderr.includes(token), false);
});
