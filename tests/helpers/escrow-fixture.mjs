import { bech32 } from "@scure/base";
import { readFileSync } from "node:fs";
export const addr = (key) =>
  bech32.encode(
    "addr_test",
    bech32.toWords(Uint8Array.from([0x60, ...Array(28).fill(key)])),
    200,
  );
export const parameters = JSON.parse(
  readFileSync(
    new URL(
      "../../research/cardano/preprod-parameter-fixture.json",
      import.meta.url,
    ),
  ),
).parameters;
export const intent = () => ({
  network: "cardano:preprod",
  objectiveId: "o",
  effectId: "e",
  semanticKey: "one-report",
  principalAddress: addr(1),
  providerAddress: addr(2),
  artifactSha256: "a".repeat(64),
  nonceHex: "b".repeat(64),
  amountLovelace: 3000000,
  fundingFeeBudgetLovelace: 350000,
  closingFeeBudgetLovelace: 2000000,
  collateralExposureLovelace: 3000000,
  maxExposureLovelace: 9000000,
  minimumOutputLovelace: 2000000,
});
export const keyInput = (hash = "c", key = 1, lovelace = 10000000) => ({
  txHash: hash.repeat(64),
  index: 0,
  address: addr(key),
  lovelace,
});
export const fundingArgs = () => ({
  intent: intent(),
  action: "fund",
  inputs: [keyInput()],
  feeAddress: addr(1),
  collateral: [],
  escrowInput: null,
  parameters: structuredClone(parameters),
  executionUnits: null,
});
