import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { buildEscrowDraft } from "../src/adapters/escrow-transaction.mjs";
import { planApprovalEscrow } from "../src/adapters/approval-escrow-plan.mjs";
import {
  fundingArgs,
  parameters,
  intent,
  addr,
  keyInput,
} from "../tests/helpers/escrow-fixture.mjs";

const target =
  process.platform === "darwin" && process.arch === "arm64"
    ? "aiken-aarch64-apple-darwin"
    : process.platform === "linux" && process.arch === "x64"
      ? "aiken-x86_64-unknown-linux-musl"
      : null;
if (!target) throw Error("Unsupported pinned simulator platform");
const binary = resolve(".local/aiken", target, "aiken");
if (
  !execFileSync(binary, ["--version"], { encoding: "utf8" }).includes(
    "v1.1.23+8949565",
  )
)
  throw Error("Pinned Aiken required");
const temp = mkdtempSync(join(tmpdir(), "mew-uplc-")),
  sha = (v) => createHash("sha256").update(v).digest("hex");
function simulate(cbor, args) {
  const tx = CSL.Transaction.from_hex(cbor),
    outputs = CSL.TransactionOutputs.new();
  // Vec<TransactionInput> expects an untagged array; CSL encodes Conway sets with tag 258.
  const inputs = tx.body().inputs(),
    raw = inputs.to_hex();
  for (let i = 0; i < inputs.len(); i++) {
    const ref = inputs.get(i),
      u = [...args.inputs, args.escrowInput].find(
        (u) =>
          u.txHash === ref.transaction_id().to_hex() && u.index === ref.index(),
      );
    if (!u) throw Error("Fixture input resolution missing");
    const out = CSL.TransactionOutput.new(
      CSL.Address.from_bech32(u.address),
      CSL.Value.new(CSL.BigNum.from_str(String(u.lovelace))),
    );
    if (u.datumCbor) out.set_plutus_data(CSL.PlutusData.from_hex(u.datumCbor));
    outputs.add(out);
  }
  const files = ["transaction.hex", "inputs.hex", "resolved-outputs.hex"].map(
    (f) => join(temp, f),
  );
  [
    cbor,
    raw.startsWith("d90102") ? raw.slice(6) : raw,
    outputs.to_hex(),
  ].forEach((v, i) => writeFileSync(files[i], v, { mode: 0o600 }));
  const result = spawnSync(
    binary,
    [
      "tx",
      "simulate",
      ...files,
      "--zero-time",
      "1654041600000",
      "--zero-slot",
      "0",
      "--slot-length",
      "1000",
      "--blueprint",
      resolve("contracts/approval-escrow/plutus.json"),
    ],
    { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  if (result.error) throw result.error;
  return {
    status: result.status,
    units: result.status === 0 ? JSON.parse(result.stdout) : null,
  };
}
const cases = [];
try {
  const f = buildEscrowDraft(fundingArgs(), { nowMs: parameters.observedAtMs });
  for (const action of ["accept", "cancel"])
    for (const feeHash of ["0", "f"]) {
      const args = {
        ...fundingArgs(),
        action,
        feeAddress: addr(3),
        inputs: [keyInput(feeHash, 3, 5000000)],
        collateral: [keyInput("d", 3, 3000000)],
        escrowInput: {
          txHash: f.txHash,
          index: 0,
          address: planApprovalEscrow(intent()).protocol.scriptAddress,
          lovelace: intent().amountLovelace,
          datumCbor: f.datumCbor,
        },
        executionUnits: { memory: 1000000, steps: 200000000 },
      };
      const probe = simulate(
        buildEscrowDraft(args, { nowMs: parameters.observedAtMs }).cbor,
        args,
      );
      if (probe.status !== 0 || probe.units.length !== 1)
        throw Error("Fixture script failed");
      args.executionUnits = {
        memory: Math.ceil(probe.units[0].mem * 1.1),
        steps: Math.ceil(probe.units[0].cpu * 1.1),
      };
      const draft = buildEscrowDraft(args, { nowMs: parameters.observedAtMs }),
        final = simulate(draft.cbor, args);
      if (
        final.status !== 0 ||
        final.units.length !== 1 ||
        final.units[0].mem > args.executionUnits.memory ||
        final.units[0].cpu > args.executionUnits.steps
      )
        throw Error("Rebuilt fixture budget insufficient");
      const tx = CSL.Transaction.from_hex(draft.cbor),
        redeemer = tx.witness_set().redeemers().get(0);
      cases.push({
        caseId: action + "-fee-" + feeHash,
        scriptPassed: true,
        txHash: draft.txHash,
        transactionCborSha256: sha(Buffer.from(draft.cbor, "hex")),
        redeemerIndex: redeemer.index().to_str(),
        declaredExecutionUnits: args.executionUnits,
        measuredExecutionUnits: {
          memory: final.units[0].mem,
          steps: final.units[0].cpu,
        },
        feeLovelace: draft.feeLovelace,
      });
      // Altering required-signers preserves otherwise-real transaction structure.
      // Phase two must reject missing approval even without doing signature validation.
      const body = tx.body(),
        keys = CSL.Ed25519KeyHashes.new();
      body.set_required_signers(keys);
      const altered = CSL.Transaction.new(
        body,
        tx.witness_set(),
        tx.auxiliary_data(),
      ).to_hex();
      if (simulate(altered, args).status !== 1)
        throw Error("Missing approval was not rejected");
      cases.push({
        caseId: action + "-fee-" + feeHash + "-missing-approval",
        scriptRejected: true,
      });
    }
  const report = {
    schema: "mew.escrow-uplc-fixture-evaluation.v1",
    aikenVersion: "v1.1.23+8949565",
    scriptSha256: sha(readFileSync("scripts/evaluate-escrow-fixtures.mjs")),
    blueprintSha256: sha(readFileSync("contracts/approval-escrow/plutus.json")),
    parameterFixtureSha256: sha(
      readFileSync("research/cardano/preprod-parameter-fixture.json"),
    ),
    cases,
    synthetic: true,
    signingAllowed: false,
    dispatchAllowed: false,
    limitations: [
      "Compiled phase-two evaluation of synthetic resolved UTxOs only, not node ledger acceptance.",
      "Aiken CLI uses its built-in cost model: fresh preprod provider evaluation must bind the exact final transaction and current parameters.",
      "No UTxO existence, signatures, collateral consumption, funded wallet or broadcast was verified.",
      "Preprod slot origin uses the official Shelley genesis systemStart, magic 1 and one-second slots.",
    ],
  };
  writeFileSync(
    "research/cardano/escrow-uplc-evaluation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      validTransactions: cases.filter((c) => c.scriptPassed).length,
      rejectedMissingApprovals: cases.filter((c) => c.scriptRejected).length,
      signingAllowed: false,
      dispatchAllowed: false,
    }),
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
