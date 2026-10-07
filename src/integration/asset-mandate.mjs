/** Separate, in-memory asset accounting prototype. Never dispatches, authenticates
 * a mandate, signs or emits verified financial evidence. Host persistence is pending.
 * Every decimal amount is in that asset's atomic units; ADA overhead is lovelace.
 */
const clone = (v) => structuredClone(v);
const encode = (v) =>
  JSON.stringify(Array.isArray(v) ? v.map(canonical) : canonical(v));
function canonical(v) {
  return Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
}
const exact = (v, keys) => {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Reflect.ownKeys(v).length !== keys.length ||
    keys.some(
      (k) =>
        !Object.hasOwn(v, k) ||
        !Object.getOwnPropertyDescriptor(v, k)?.hasOwnProperty("value"),
    )
  )
    throw Error("Invalid asset contract fields");
};
const id = (v) => {
  if (typeof v !== "string" || !/^[A-Za-z0-9._:@/-]{1,200}$/.test(v))
    throw Error("Invalid asset contract identity");
  return v;
};
const atomic = (v, positive = false) => {
  if (
    typeof v !== "string" ||
    !/^(0|[1-9][0-9]{0,29})$/.test(v) ||
    (positive && v === "0")
  )
    throw Error("Canonical bounded atomic decimal string required");
  return BigInt(v);
};
export function assetUnit(asset) {
  const kind = asset && Object.getOwnPropertyDescriptor(asset, "kind")?.value;
  if (kind === "lovelace") {
    exact(asset, ["kind"]);
    return "lovelace";
  }
  exact(asset, ["kind", "policyId", "assetNameHex"]);
  if (
    kind !== "native" ||
    typeof asset.policyId !== "string" ||
    !/^[a-f0-9]{56}$/.test(asset.policyId) ||
    typeof asset.assetNameHex !== "string" ||
    !/^(?:[a-f0-9]{2}){0,32}$/.test(asset.assetNameHex)
  )
    throw Error("Full lowercase native policy and hex asset name required");
  return asset.policyId + asset.assetNameHex;
}
const requestFields = [
  "id",
  "principal",
  "objectiveId",
  "semanticKey",
  "providerId",
  "network",
  "asset",
  "amountAtomic",
  "adaOverheadAtomic",
];
function validateRequest(r) {
  exact(r, requestFields);
  for (const k of [
    "id",
    "principal",
    "objectiveId",
    "semanticKey",
    "providerId",
  ])
    id(r[k]);
  if (typeof r.network !== "string" || r.network.length > 40)
    throw Error("Explicit payment network required");
  assetUnit(r.asset);
  atomic(r.amountAtomic, true);
  atomic(r.adaOverheadAtomic);
  return clone(r);
}
function debits(r) {
  const result = new Map([["lovelace", atomic(r.adaOverheadAtomic)]]),
    unit = assetUnit(r.asset);
  result.set(unit, (result.get(unit) || 0n) + atomic(r.amountAtomic, true));
  return result;
}

export class AssetMandate {
  #mandate;
  #reservations = [];
  constructor(mandate) {
    exact(mandate, [
      "schema",
      "network",
      "principal",
      "objectiveId",
      "semanticKey",
      "quantity",
      "maxAdaOverheadAtomic",
      "caps",
    ]);
    if (
      mandate.schema !== "mew.asset-mandate.v1" ||
      mandate.network !== "cardano:preprod" ||
      !Number.isSafeInteger(mandate.quantity) ||
      mandate.quantity < 1 ||
      mandate.quantity > 100 ||
      !Array.isArray(mandate.caps) ||
      mandate.caps.length < 1 ||
      mandate.caps.length > 8
    )
      throw Error("Bounded explicit preprod mandate required");
    for (const k of ["principal", "objectiveId", "semanticKey"]) id(mandate[k]);
    const overhead = atomic(mandate.maxAdaOverheadAtomic),
      seen = new Set();
    let ada;
    for (const cap of mandate.caps) {
      exact(cap, ["asset", "maxAtomic"]);
      const unit = assetUnit(cap.asset);
      if (seen.has(unit)) throw Error("Duplicate asset cap");
      seen.add(unit);
      const amount = atomic(cap.maxAtomic, true);
      if (unit === "lovelace") ada = amount;
    }
    if (ada === undefined || overhead > ada)
      throw Error("ADA cap must bound the separate ADA overhead allowance");
    this.#mandate = clone(mandate);
    this.#mandate.caps.sort((a, b) =>
      assetUnit(a.asset).localeCompare(assetUnit(b.asset)),
    );
  }
  position() {
    const exposure = new Map();
    let overhead = 0n;
    for (const row of this.#reservations) {
      overhead += atomic(row.request.adaOverheadAtomic);
      for (const [unit, amount] of debits(row.request))
        exposure.set(unit, (exposure.get(unit) || 0n) + amount);
    }
    return {
      schema: "mew.asset-position.v1",
      network: this.#mandate.network,
      principal: this.#mandate.principal,
      objectiveId: this.#mandate.objectiveId,
      reservedQuantity: this.#reservations.length,
      remainingQuantity: this.#mandate.quantity - this.#reservations.length,
      adaOverhead: {
        maxAtomic: this.#mandate.maxAdaOverheadAtomic,
        exposureAtomic: overhead.toString(),
        remainingAtomic: (
          atomic(this.#mandate.maxAdaOverheadAtomic) - overhead
        ).toString(),
      },
      assets: this.#mandate.caps.map((cap) => {
        const unit = assetUnit(cap.asset),
          used = exposure.get(unit) || 0n;
        return {
          asset: clone(cap.asset),
          unit,
          maxAtomic: cap.maxAtomic,
          exposureAtomic: used.toString(),
          remainingAtomic: (atomic(cap.maxAtomic) - used).toString(),
        };
      }),
      dispatchAllowed: false,
    };
  }
  reserve(input) {
    const request = validateRequest(input),
      position = this.position();
    const finish = (decision, reason) => ({
      decision,
      reason,
      position: this.position(),
      dispatchAllowed: false,
    });
    if (
      request.network !== this.#mandate.network ||
      request.principal !== this.#mandate.principal ||
      request.objectiveId !== this.#mandate.objectiveId ||
      request.semanticKey !== this.#mandate.semanticKey
    )
      return finish("DENY", "Mandate identity or network differs");
    const previous = this.#reservations.find(
      (r) => r.request.id === request.id,
    );
    if (previous)
      return finish(
        encode(previous.request) === encode(request) ? "DEFER" : "DENY",
        "Existing reservation must be reconciled; never redispatch",
      );
    if (position.remainingQuantity < 1)
      return finish("DEFER", "Equivalent quantity remains reserved");
    for (const [unit, amount] of debits(request)) {
      const cap = position.assets.find((a) => a.unit === unit);
      if (!cap || amount > BigInt(cap.remainingAtomic))
        return finish(
          "DENY",
          "Independent asset cap would be exceeded or asset is not enrolled",
        );
    }
    if (
      atomic(request.adaOverheadAtomic) >
      BigInt(position.adaOverhead.remainingAtomic)
    )
      return finish("DENY", "Separate ADA overhead budget would be exceeded");
    this.#reservations.push({ request, status: "RESERVED" });
    return finish(
      "ALLOW",
      "Accounting reservation only; no durable or dispatch authority",
    );
  }
  markUnknown(operationId) {
    id(operationId);
    const row = this.#reservations.find((r) => r.request.id === operationId);
    if (!row) throw Error("Unknown asset reservation");
    row.status = "UNKNOWN";
    return clone(row);
  }
  snapshot() {
    return {
      schema: "mew.asset-reservations.v1",
      mandate: clone(this.#mandate),
      reservations: clone(this.#reservations),
    };
  }
  static restore(snapshot) {
    exact(snapshot, ["schema", "mandate", "reservations"]);
    if (
      snapshot.schema !== "mew.asset-reservations.v1" ||
      !Array.isArray(snapshot.reservations) ||
      snapshot.reservations.length > 100
    )
      throw Error("Invalid asset snapshot");
    const ledger = new AssetMandate(snapshot.mandate);
    for (const row of snapshot.reservations) {
      exact(row, ["request", "status"]);
      if (
        !["RESERVED", "UNKNOWN"].includes(row.status) ||
        ledger.reserve(row.request).decision !== "ALLOW"
      )
        throw Error("Asset snapshot violates reservation invariants");
      if (row.status === "UNKNOWN") ledger.markUnknown(row.request.id);
    }
    return ledger;
  }
}
