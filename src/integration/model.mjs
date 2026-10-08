import { createHash } from "node:crypto";
import { CompanyRuntime } from "../company/runtime.mjs";
import {
  createOpenAIProvider,
  evaluateProvider,
  evaluationCases,
} from "../evaluation/model.mjs";
import { encode, identifier } from "./store.mjs";

/** Real provider transport, synthetic evaluation inputs, durable attempt budget.
 * This never activates a production model or changes an economic mandate. */
export async function runModelEvaluation({
  store,
  principal,
  id,
  apiKey,
  model,
  approved = false,
  maxRuns = 1,
  fetchImpl = fetch,
}) {
  identifier(id);
  if (
    typeof apiKey !== "string" ||
    apiKey.length > 1024 ||
    typeof model !== "string" ||
    !/^[A-Za-z0-9._:-]{1,100}$/.test(model)
  )
    throw Error("Private model configuration required");
  const provider = createOpenAIProvider({
    apiKey,
    model,
    approved,
    maxCalls: 4,
    maxOutputTokens: 512,
    fetchImpl,
  });
  const runtime = new CompanyRuntime(":memory:", {
    mode: "advisory",
    workflow: "compact",
  });
  const policyDigest = runtime.policyDigest;
  runtime.close();
  const contract = {
    schema: "mew.private-model-evaluation.v1",
    provider: "openai-responses",
    model,
    policyDigest,
    fixtureDigest: createHash("sha256")
      .update(encode(evaluationCases))
      .digest("hex"),
    maxCalls: 4,
    maxOutputTokens: 512,
    productionActivation: false,
  };
  const claim = await store.startModelRun(principal, { id, contract, maxRuns });
  if (!claim.claimed)
    return {
      ...claim,
      externalCallPerformed: false,
      modelActivated: false,
      paymentsEnabled: false,
    };
  try {
    const bounded = async (context, options) => {
      if (Buffer.byteLength(JSON.stringify(context)) > 65536)
        throw Error("Model input budget exceeded");
      return provider(context, options);
    };
    const result = await evaluateProvider(bounded, {
      label: "live-provider", // The immutable saved contract carries the model ID.
    });
    const unknown = result.results.some(
      (r) => r.providerFailureOrInvalidOutput,
    );
    const saved = await store.finishModelRun(principal, {
      id,
      fence: claim.fence,
      result,
      unknown,
    });
    return {
      ...saved,
      externalCallPerformed: true,
      modelActivated: false,
      paymentsEnabled: false,
    };
  } catch {
    await store
      .finishModelRun(principal, {
        id,
        fence: claim.fence,
        result: {
          error: "Evaluation outcome uncertain; automatic retry disabled",
        },
        unknown: true,
      })
      .catch(() => {});
    throw Error("Model evaluation uncertain; reconcile the saved run");
  }
}
