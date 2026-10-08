import { resolve, dirname } from "node:path";
import { realpath, mkdir, writeFile } from "node:fs/promises";
import { readBoundedRegularFile } from "./model-semantic-review.mjs";
import { assembleEscrowWitnesses } from "../src/adapters/escrow-witness-assembly.mjs";
try {
  if (process.argv.length !== 5) throw Error("Expected operator args, witness-set JSON and fresh output directory");
  const args = JSON.parse(await readBoundedRegularFile(resolve(process.argv[2]), 65536));
  const sets = JSON.parse(await readBoundedRegularFile(resolve(process.argv[3]), 131072));
  const result = assembleEscrowWitnesses(args, sets);
  const out = resolve(process.argv[4]);
  if ((await realpath(dirname(out))) !== dirname(out)) throw Error("Real output parent required");
  await mkdir(out, { mode: 0o700 });
  await writeFile(resolve(out, "transaction.cbor.hex"), result.cbor + "\n", { flag: "wx", mode: 0o600 });
  const { cbor, ...report } = result;
  await writeFile(resolve(out, "assembly.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
} catch {
  console.error("Witness assembly rejected. Check bounded operator arguments, original transaction signatures and a fresh output directory. No submission occurred.");
  process.exitCode = 1;
}
