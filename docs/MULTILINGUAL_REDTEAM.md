# Independent multilingual and review-interface audit

Reviewed 7 October 2026 by the multilingual red-team subagent. Scope: the committed frozen development benchmark, multilingual ranking inputs and resulting ONNX retrieval report, and the offline model-review generator. This is an agent review, not an authenticated human approval or customer efficacy study.

## Evidence and promotion decision

Both evaluated retrievers use the same 58 paragraph chunks and top-three retrieval depth in the current artifacts. BM25 finds the expected source for 8/12 questions; multilingual MiniLM finds it for 10/12. Exact supporting-passage coverage remains 4/12. English exact passage coverage falls from 3/6 to 2/6 while French rises from 1/6 to 2/6. This experiment therefore demonstrates better French source selection, not an overall improvement in supporting evidence coverage. Keep replacement and deployment blocked pending a stronger result and end-to-end grounded-answer evaluation.

Fourteen chunks exceed the publisher's 128-token limit. The report correctly records truncation and distinguishes complete returned-context coverage from evidence visible to the encoder. All four successful exact-span matches are also encoder-visible in this run. A tail returned to an answer model can be useful even when it did not influence the embedding; these are different claims.

## Verified hardening resolution

The original Python evaluator validated 58 unique chunk IDs, source hashes and source slices without enforcing the canonical BM25 chunk list. This gap is now resolved: before model metadata requests, downloads or inference, Python invokes the Node frozen-benchmark verifier and paragraph chunker, then compares the entire regenerated ranking-input structure. The canonical replay records this check and preserves the original metrics and case results.

An independent failure-path exercise reordered two valid chunks in a temporary 58-chunk input. The evaluator rejected the input before network or inference. This verifies order and identity binding in addition to count and source-slice validity. The verifier and local repository code remain trusted; recorded hashes detect changes but do not authenticate a reviewer or software publisher.

## Checked boundaries

- Ranking query objects contain only ID, language and question. Gold passages are used after ranking, not supplied as embedding inputs. Development questions and related lineages remain excluded from training.
- Python explicitly converts JavaScript UTF-16 offsets before slicing source text. The current artifacts preserve exact source slices and distinguish code-point tokenizer offsets from UTF-16 source offsets.
- Masked mean pooling excludes padding; vectors are normalized before cosine scoring. Quantized output shape and finite values are checked. The pinned publisher revision and downloaded file hashes are recorded. No remote Python model code is executed. Downloading publisher metadata and weights uses the network; encoding itself is local.
- Review-page data escapes HTML script delimiters. Model output, source passages and labels are rendered through `textContent`; no attacker-controlled HTML rendering or remote script execution was found.
- Review exports declare the reviewer name unauthenticated, carry trace hashes and do not grant training or deployment authority. Browser storage is untrusted and can be edited by the local user or other same-origin scripts. Keep it as convenient development notes, never a trusted approval channel. Shared-browser users should clear those notes after exporting.
- Base and prompt-v2 traces are reconstructed from actual supplied source prefixes with context hashes. The interface correctly discloses that prompt-v2 changed multiple settings, so its result cannot isolate one prompt improvement.

## Remaining verification

The personalization planner rejects authority-changing profile fields, frozen case IDs, known lineage groups, exact frozen questions, missing declared human review and missing per-source training consent. It retains `trainingAuthorized: false` and `fineTuningReady: false` even when all three declared data splits exist. Model revision, receipt and benchmark identities are bound in the plan. No material authority bypass was found in this planning-only module.

These are planning checks, not authenticated consent verification. Paraphrased benchmark scenarios with renamed lineage groups cannot be detected by exact string and identifier checks; manual semantic lineage review remains necessary. The model receipt is declarative and must be checked against actual local files before a future training run. Correct output structure, citation entailment, masking and memory suitability still require separate verification before execution.

Targeted tests: 13/13 passed across personalization, multilingual contexts and model review. The additional canonical-input tamper exercise also passed. This audit did not invoke a new model, deploy a service, authenticate a reviewer or submit a hosted training job. Before retrieval replacement, obtain a larger independently reviewed bilingual holdout, test unanswerable and contradictory evidence, and measure answer entailment separately from source identity and JSON validity. Personalized training must use separate permission-approved examples and must not ingest frozen evaluation lineages.
