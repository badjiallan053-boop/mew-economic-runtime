import test from "node:test";
import assert from "node:assert/strict";
import { AssetMandate } from "../src/integration/asset-mandate.mjs";
const ada = { kind: "lovelace" },
  token = {
    kind: "native",
    policyId: "a".repeat(56),
    assetNameHex: "745553444d",
  },
  other = { ...token, policyId: "b".repeat(56) };
const mandate = () => ({
  schema: "mew.asset-mandate.v1",
  network: "cardano:preprod",
  principal: "payer",
  objectiveId: "o",
  semanticKey: "one-report",
  quantity: 2,
  maxAdaOverheadAtomic: "6000000",
  caps: [
    { asset: ada, maxAtomic: "10000000" },
    { asset: token, maxAtomic: "2000000" },
  ],
});
const request = (patch = {}) => ({
  id: "a",
  principal: "payer",
  objectiveId: "o",
  semanticKey: "one-report",
  providerId: "vendor",
  network: "cardano:preprod",
  asset: token,
  amountAtomic: "1000000",
  adaOverheadAtomic: "3000000",
  ...patch,
});
test("native principal and ADA overhead reserve independent exact atomic caps", () => {
  const ledger = new AssetMandate(mandate());
  const r = ledger.reserve(request());
  assert.equal(r.decision, "ALLOW");
  assert.equal(r.dispatchAllowed, false);
  const p = ledger.position();
  assert.equal(
    p.assets.find((a) => a.unit === "lovelace").exposureAtomic,
    "3000000",
  );
  assert.equal(
    p.assets.find((a) => a.unit === token.policyId + token.assetNameHex)
      .exposureAtomic,
    "1000000",
  );
});
test("unused ADA cannot pay a native-token cap and unused tokens cannot fund ADA overhead", () => {
  for (const patch of [
    { amountAtomic: "2000001" },
    { adaOverheadAtomic: "6000001" },
  ]) {
    const ledger = new AssetMandate(mandate());
    assert.equal(ledger.reserve(request(patch)).decision, "DENY");
    assert.equal(ledger.position().reservedQuantity, 0);
  }
});
test("ADA principal adds to ADA overhead without conversion or hidden fee exemption", () => {
  const ledger = new AssetMandate(mandate());
  assert.equal(
    ledger.reserve(
      request({
        asset: ada,
        amountAtomic: "8000000",
        adaOverheadAtomic: "3000000",
      }),
    ).decision,
    "DENY",
  );
  assert.equal(
    ledger.reserve(
      request({
        asset: ada,
        amountAtomic: "7000000",
        adaOverheadAtomic: "3000000",
      }),
    ).decision,
    "ALLOW",
  );
  assert.equal(
    ledger.position().assets.find((a) => a.unit === "lovelace").exposureAtomic,
    "10000000",
  );
});
test("exact retry defers; changed immutable identity or amount denies", () => {
  const ledger = new AssetMandate(mandate());
  ledger.reserve(request());
  assert.equal(ledger.reserve(request()).decision, "DEFER");
  for (const patch of [
    { providerId: "other" },
    { amountAtomic: "1" },
    { principal: "other" },
    { network: "cardano:mainnet" },
    { asset: other },
  ])
    assert.equal(ledger.reserve(request(patch)).decision, "DENY");
  assert.equal(ledger.position().reservedQuantity, 1);
});
test("UNKNOWN and restored snapshots retain both asset exposure and quantity", () => {
  const m = mandate();
  m.quantity = 1;
  const ledger = new AssetMandate(m);
  ledger.reserve(request());
  ledger.markUnknown("a");
  const restored = AssetMandate.restore(ledger.snapshot());
  assert.deepEqual(restored.position(), ledger.position());
  assert.equal(restored.reserve(request({ id: "b" })).decision, "DEFER");
  assert.equal(restored.reserve(request()).decision, "DEFER");
});
test("wrong policy or hex asset name cannot inherit an enrolled token cap", () => {
  for (const asset of [other, { ...token, assetNameHex: "745553444e" }])
    assert.equal(
      new AssetMandate(mandate()).reserve(request({ asset })).decision,
      "DENY",
    );
});
test("large atomic strings stay exact above Number.MAX_SAFE_INTEGER", () => {
  const m = mandate();
  m.caps[1].maxAtomic = "900719925474099312345";
  const ledger = new AssetMandate(m);
  ledger.reserve(request({ amountAtomic: "900719925474099312344" }));
  assert.equal(
    ledger
      .position()
      .assets.find((a) => a.unit === token.policyId + token.assetNameHex)
      .remainingAtomic,
    "1",
  );
});
test("numeric, fractional, signed, padded and oversized amounts are rejected", () => {
  for (const value of [
    1,
    1n,
    "1.1",
    "-1",
    "+1",
    "01",
    "1e6",
    "9".repeat(31),
    "0",
  ])
    assert.throws(() =>
      new AssetMandate(mandate()).reserve(request({ amountAtomic: value })),
    );
  for (const asset of [
    { kind: "native", policyId: "a".repeat(55), assetNameHex: "" },
    { kind: "native", policyId: "a".repeat(56), assetNameHex: "f" },
    { kind: "native", policyId: "A".repeat(56), assetNameHex: "" },
    { kind: "native", policyId: "a".repeat(56), assetNameHex: "f".repeat(66) },
  ])
    assert.throws(() =>
      new AssetMandate(mandate()).reserve(request({ asset })),
    );
});
test("mandate and snapshot outputs cannot mutate accounting; forged over-cap or released snapshot fails", () => {
  const m = mandate(),
    ledger = new AssetMandate(m);
  ledger.reserve(request());
  m.caps[1].maxAtomic = "1";
  const snapshot = ledger.snapshot();
  snapshot.reservations[0].request.amountAtomic = "1";
  assert.equal(
    ledger
      .position()
      .assets.find((a) => a.unit === token.policyId + token.assetNameHex)
      .exposureAtomic,
    "1000000",
  );
  for (const patch of [
    (s) => (s.reservations[0].status = "RELEASED"),
    (s) => s.reservations.push(structuredClone(s.reservations[0])),
    (s) => (s.reservations[0].request.amountAtomic = "2000001"),
  ]) {
    const s = ledger.snapshot();
    patch(s);
    assert.throws(() => AssetMandate.restore(s));
  }
});
test("duplicate caps, missing ADA overhead rail and mainnet mandates are rejected", () => {
  for (const patch of [
    (m) => m.caps.push(structuredClone(m.caps[0])),
    (m) => (m.caps = m.caps.slice(1)),
    (m) => (m.network = "cardano:mainnet"),
  ]) {
    const m = mandate();
    patch(m);
    assert.throws(() => new AssetMandate(m));
  }
});
test("three enrolled assets stay independently capped across reservations", () => {
  const m = mandate();
  m.quantity = 3;
  m.caps.push({ asset: other, maxAtomic: "10" });
  const ledger = new AssetMandate(m);
  assert.equal(ledger.reserve(request()).decision, "ALLOW");
  assert.equal(
    ledger.reserve(
      request({
        id: "b",
        asset: other,
        amountAtomic: "5",
        adaOverheadAtomic: "0",
      }),
    ).decision,
    "ALLOW",
  );
  assert.equal(
    ledger.reserve(
      request({ id: "c", amountAtomic: "1000001", adaOverheadAtomic: "0" }),
    ).decision,
    "DENY",
  );
  assert.equal(
    ledger
      .position()
      .assets.find((a) => a.unit === other.policyId + other.assetNameHex)
      .remainingAtomic,
    "5",
  );
});
test("empty native asset name is valid only under its complete enrolled policy", () => {
  const m = mandate(),
    empty = { kind: "native", policyId: token.policyId, assetNameHex: "" };
  m.caps[1].asset = empty;
  assert.equal(
    new AssetMandate(m).reserve(request({ asset: empty })).decision,
    "ALLOW",
  );
});
