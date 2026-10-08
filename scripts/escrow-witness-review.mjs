import { resolve, isAbsolute } from "node:path";
import { readBoundedRegularFile } from "./model-semantic-review.mjs";
import { reviewEscrowWitnesses } from "../src/adapters/escrow-witness-review.mjs";
const [argsPath, transactionPath] = process.argv.slice(2);
if (
  process.argv.length !== 4 ||
  !isAbsolute(argsPath ?? "") ||
  !isAbsolute(transactionPath ?? "")
)
  throw Error(
    "Usage: node scripts/escrow-witness-review.mjs /absolute/operator-args.json /absolute/transaction.cbor.hex",
  );
const args = JSON.parse(
  await readBoundedRegularFile(resolve(argsPath), 262144),
);
const cbor = (await readBoundedRegularFile(resolve(transactionPath), 262145))
  .toString()
  .trim();
console.log(JSON.stringify(reviewEscrowWitnesses(args, cbor), null, 2));
