import { readFile } from "node:fs/promises";
import { buildEscrowDraft } from "../src/adapters/escrow-transaction.mjs";
const path = process.argv[2];
if (!path || process.argv.length !== 3)
  throw Error(
    "Usage: npm run escrow:build -- /absolute/path/transaction-inputs.json",
  );
const raw = await readFile(path);
if (raw.byteLength > 256 * 1024)
  throw Error("Transaction input file too large");
console.log(JSON.stringify(buildEscrowDraft(JSON.parse(raw)), null, 2));
