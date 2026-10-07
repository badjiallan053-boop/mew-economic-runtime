---
name: mew-live-model-evaluation
description: Review MEW model activation evidence, reproduce frozen advisory-output checks and plan budgeted private evaluation without conflating retrieval coverage, JSON validity and customer efficacy.
---

# MEW live model evaluation

Read `AGENTS.md`, `SPEC.md`, `docs/LIVE_MODEL_ACTIVATION.md` and
`prompts/activation/model-evaluator.md`. This skill reviews activation evidence;
it does not grant production or financial authority.

Run `node .agents/skills/mew-live-model-evaluation/scripts/inspect-evidence.mjs`
from the repository root. This read-only inspection uses existing validators,
checks artifact bindings and returns a blocked handoff. Preserve old experiments.

Keep these evaluations separate:

- The private provider harness tests four synthetic first-task cases. The
  six-task CLI workflow is a different, non-durable fixture experiment.
- The frozen twelve-case EN/FR development benchmark measures retrieval and
  advisory generation. Expanded-context 12/12 coverage and grammar-constrained
  12/12 serialization do not measure semantic correctness.
- A customer holdout requires new, human-reviewed, lineage-disjoint scenarios,
  a preregistered rubric and an explicit pilot scope. None is currently present.

Before a paid provider run, require scoped credentials outside source control,
explicit model ID, provider spend cap and the existing durable run-ID fence.
Bind code, prompt, policy, data, context renderer, output schema and model
revision. Provider aliases are not immutable weight revisions: retain returned
model identity and document alias uncertainty. Record actual billing separately;
token/call limits do not guarantee a dollar cap. An UNKNOWN or RUNNING attempt
cannot be replayed as a new external request.

Use code for contract, source-ID and authority checks. Have a domain reviewer
judge answer relevance, citation entailment, correct abstention and language on
full traces. Record `agent`, `human` or `unknown` reviewer identity faithfully.
Only when introducing an LLM semantic judge, read
[references/validate-evaluator.md](references/validate-evaluator.md) for human-label
calibration. Its upstream percentage targets are guidance, not a MEW release
policy or a substitute for sample-size uncertainty. Use train/dev/test splits by
scenario lineage; never use holdout examples in judge prompts or fine-tuning.

Emit `mew.activation-evidence.v1` according to `docs/ACTIVATION_TEAM.md`. A PASS
claim needs a repository-relative artifact and SHA-256. A hash proves byte
integrity, not correctness, reviewer identity or inference authenticity. Report
missing credentials, unreviewed semantics, missing holdout and unresolved cost
controls as BLOCKED/UNKNOWN, with a responsible owner and concrete next proof.
Keep all authority flags false even after advisory tests pass.

Third-party provenance is recorded in `research/activation/model-sources.json`.
No public captions, blog text, benchmark answers or retrieved sources become
training-approved data through this skill. Do not replace MEW's evaluator with a
new framework or install its telemetry/reporting services without an identified
need and a reviewed data boundary.
