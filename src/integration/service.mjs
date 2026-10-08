import {
  enrolledDeliveryKeys,
  deliveryKey,
  deliveryKeyFingerprint,
} from "./delivery.mjs";
import { timingSafeEqual } from "node:crypto";
import { operatorTokenDigest } from "../server/operator-service.mjs";
import { checkCardanoConnection } from "../adapters/cardano-connection.mjs";
import { runModelEvaluation } from "./model.mjs";
import { checkMasumiConnection } from "./masumi.mjs";
import { exact, identifier } from "./store.mjs";
const actions = [
  "read",
  "create-objective",
  "prepare-payment",
  "reconcile-payment",
  "prepare-closing",
  "reconcile-closing",
  "evaluate-model",
  "enroll-delivery",
  "accept-delivery",
];

export class IntegrationService {
  constructor({
    store,
    policy,
    model = {},
    blockfrost = {},
    masumi = {},
    clock = Date.now,
    providerKeys = [],
  } = {}) {
    if (
      !store ||
      !Array.isArray(policy) ||
      !policy.length ||
      policy.length > 100 ||
      typeof clock !== "function"
    )
      throw Error("Private service configuration required");
    const seen = new Set();
    this.policy = policy.map((p) => {
      exact(p, [
        "principal",
        "tokenDigest",
        "expiresAtMs",
        "revoked",
        "actions",
      ]);
      identifier(p.principal);
      if (
        !/^[a-f0-9]{64}$/.test(p.tokenDigest) ||
        seen.has(p.tokenDigest) ||
        !Number.isSafeInteger(p.expiresAtMs) ||
        p.expiresAtMs < 1 ||
        typeof p.revoked !== "boolean" ||
        !Array.isArray(p.actions) ||
        !p.actions.length ||
        p.actions.some((a) => !actions.includes(a)) ||
        new Set(p.actions).size !== p.actions.length
      )
        throw Error("Invalid enrollment");
      seen.add(p.tokenDigest);
      return structuredClone(p);
    });
    this.store = store;
    this.model = { ...model };
    this.blockfrost = { ...blockfrost };
    this.masumi = { ...masumi };
    this.clock = clock;
    Object.defineProperty(this, "providerKeys", {
      value: enrolledDeliveryKeys(providerKeys),
    });
  }
  principal(token, action) {
    const digest = operatorTokenDigest(token),
      now = this.clock();
    let matched;
    if (!Number.isSafeInteger(now) || now < 0 || !actions.includes(action))
      throw Error("Authorization denied");
    for (const p of this.policy)
      if (
        timingSafeEqual(
          Buffer.from(digest, "hex"),
          Buffer.from(p.tokenDigest, "hex"),
        )
      )
        matched = p;
    if (
      !matched ||
      matched.revoked ||
      now >= matched.expiresAtMs ||
      !matched.actions.includes(action)
    )
      throw Error("Authorization denied");
    return matched.principal;
  }
  async status(token) {
    this.principal(token, "read");
    return {
      database: "postgres-private",
      model: {
        configured: Boolean(this.model.apiKey && this.model.model),
        evaluationApproved: this.model.approved === true,
        productionActivated: false,
      },
      cardano: await checkCardanoConnection(this.blockfrost),
      masumi: await checkMasumiConnection(this.masumi),
      paymentsEnabled: false,
      signingEnabled: false,
      automaticDispatch: false,
      limitations: [
        "Database connection is not a production readiness certificate",
        "Evaluation uses synthetic fixtures; customer and semantic review remain required",
        "External wallet, fresh inputs, funded preprod lifecycle and independent contract audit remain pending",
      ],
    };
  }
  createObjective(token, body) {
    const principal = this.principal(token, "create-objective");
    return this.store.createObjective(principal, body);
  }
  position(token, objectiveId) {
    return this.store.position(this.principal(token, "read"), objectiveId);
  }
  payment(token, id) {
    return this.store.operation(this.principal(token, "read"), id);
  }
  preparePayment(token, body) {
    exact(body, ["operationId", "providerId", "args"]);
    return this.store.prepareFunding(
      this.principal(token, "prepare-payment"),
      body,
    );
  }
  markUnknown(token, body) {
    exact(body, ["operationId"]);
    return this.store.markFundingUnknown(
      this.principal(token, "prepare-payment"),
      body.operationId,
    );
  }
  reconcilePayment(token, body) {
    exact(body, ["operationId"]);
    return this.store.reconcileFunding(
      this.principal(token, "reconcile-payment"),
      body.operationId,
      this.blockfrost,
    );
  }
  prepareClosing(token, body) {
    return this.store.prepareClosing(this.principal(token, "prepare-closing"), body);
  }
  markClosingUnknown(token, body) {
    return this.store.markClosingUnknown(this.principal(token, "prepare-closing"), body);
  }
  reconcileClosing(token, body) {
    return this.store.reconcileClosing(this.principal(token, "reconcile-closing"), body, this.blockfrost);
  }
  enrollDelivery(token, body) {
    exact(body, [
      "keyId",
      "objectiveId",
      "effectId",
      "provider",
      "jobId",
      "artifactSha256",
    ]);
    const principal = this.principal(token, "enroll-delivery");
    const publicKey = deliveryKey(
      this.providerKeys,
      body.provider,
      body.keyId,
      this.clock(),
    );
    return this.store.enrollDelivery(principal, {
      ...body,
      principal,
      keyFingerprint: deliveryKeyFingerprint(publicKey),
    });
  }
  acceptDelivery(token, body) {
    exact(body, ["effectId", "envelope", "artifactBase64"]);
    const principal = this.principal(token, "accept-delivery");
    if (
      typeof body.artifactBase64 !== "string" ||
      body.artifactBase64.length > 174764 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        body.artifactBase64,
      )
    )
      throw Error("Invalid artifact encoding");
    const artifactBytes = Buffer.from(body.artifactBase64, "base64");
    if (
      artifactBytes.length > 131072 ||
      artifactBytes.toString("base64") !== body.artifactBase64
    )
      throw Error("Bounded artifact required");
    return this.store.acceptDelivery(principal, {
      effectId: body.effectId,
      envelope: body.envelope,
      artifactBytes,
      keys: this.providerKeys,
      nowMs: this.clock(),
    });
  }
  evaluateModel(token, body) {
    exact(body, ["id"]);
    return runModelEvaluation({
      store: this.store,
      principal: this.principal(token, "evaluate-model"),
      id: body.id,
      ...this.model,
    });
  }
}
