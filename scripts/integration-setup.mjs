import {
  constants,
  openSync,
  closeSync,
  writeFileSync,
  fsyncSync,
  fstatSync,
  lstatSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  rmdirSync,
  readFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// This helper generates only a local bearer token. It never obtains credentials,
// changes a database role, contacts a provider or enables payment permissions.
export function preparePrivateIntegration(
  directory,
  { now = Date.now() } = {},
) {
  if (
    typeof directory !== "string" ||
    !isAbsolute(directory) ||
    directory !== resolve(directory) ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(now + 86400000)
  )
    throw Error("A normalized absolute private directory is required");
  const inside = relative(root, directory);
  if (
    !inside ||
    (inside !== ".." && !inside.startsWith(`..${sep}`) && !isAbsolute(inside))
  )
    throw Error("Private configuration must stay outside the repository");
  // Reject symlinked ancestors, including a linked parent leading back into Git.
  let ancestor = dirname(directory);
  for (;;) {
    const stat = lstatSync(ancestor);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw Error("Real directory ancestry is required");
    if (existsSync(join(ancestor, ".git")))
      throw Error("Private configuration must stay outside Git repositories");
    if (ancestor === dirname(ancestor)) break;
    ancestor = dirname(ancestor);
  }
  const parent = lstatSync(dirname(directory));
  if (parent.uid !== process.getuid() || (parent.mode & 0o077) !== 0)
    throw Error("Create an owned mode-0700 parent directory first");
  const config = JSON.parse(
    readFileSync(join(root, "deploy/integration-config.example.json"), "utf8"),
  );
  const token = randomBytes(32).toString("hex");
  const expiresAtMs = now + 86400000;
  config.policy = [
    {
      principal: "founder",
      tokenDigest: createHash("sha256").update(token).digest("hex"),
      expiresAtMs,
      revoked: false,
      actions: ["read", "create-objective", "evaluate-model"],
    },
  ];
  config.paymentPolicy = { principals: [], providers: [] };
  // No recursive mkdir and no overwrite: an existing path is always an error.
  mkdirSync(directory, { mode: 0o700 });
  const written = [];
  try {
    const created = lstatSync(directory);
    if (
      !created.isDirectory() ||
      created.uid !== process.getuid() ||
      (created.mode & 0o077) !== 0
    )
      throw Error("Unsafe generated directory");
    for (const [name, content] of [
      ["operator-token.txt", `${token}\n`],
      ["integration-config.json", `${JSON.stringify(config, null, 2)}\n`],
    ]) {
      const path = join(directory, name);
      const fd = openSync(
        path,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      written.push(path);
      try {
        const stat = fstatSync(fd);
        if (
          !stat.isFile() ||
          stat.uid !== process.getuid() ||
          (stat.mode & 0o077) !== 0
        )
          throw Error("Unsafe generated file");
        writeFileSync(fd, content, "utf8");
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    }
  } catch (error) {
    for (const path of written.reverse()) {
      try {
        unlinkSync(path);
      } catch {}
    }
    try {
      rmdirSync(directory);
    } catch {}
    throw error;
  }
  return {
    configPath: join(directory, "integration-config.json"),
    tokenPath: join(directory, "operator-token.txt"),
    expiresAtMs,
    databaseConfigured: false,
    modelsActivated: false,
    paymentsEnabled: false,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 3) throw Error("Private directory required");
    console.log(
      JSON.stringify(preparePrivateIntegration(process.argv[2]), null, 2),
    );
  } catch {
    console.error(
      "Private scaffolding rejected. Use a new absolute directory outside Git under an owned mode-0700 parent, with no symlinks. Existing files are never overwritten; no secrets are logged.",
    );
    process.exitCode = 1;
  }
}
