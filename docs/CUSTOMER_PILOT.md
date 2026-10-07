# Five-clip pilot protocol

The new src/pilot/record.mjs tracks operator-recorded pilot observations independently of the economic ledger. This does not identify a real customer, generate videos, send messages, authorize procurement or legally verify content rights.

Start with one consenting agency or creator and five clips from owned material. Privately record customerConsentRef and rightsEvidenceRef against supporting documents; references alone are attestations, not authentication. Precommit the objective/effect identifiers, revision limit and five-deliverable acceptance rubric. Use the existing MEW ledger separately for any financial reservations.

Submit each exact artifact SHA-256 with sequential revision and submission time. Reviews bind the exact submitted revision and hash. A new revision invalidates the old revision's acceptance for completion metrics; stale reviews and conflicting identities fail closed. Collect acceptance, revision count and approval latency. Cost is explicitly operator-reported integer lovelace; cost per accepted deliverable is stored as a rational numerator/denominator, with denominator zero meaning unavailable rather than zero cost. No conversion or marketing attribution is inferred.

`npm run pilot:rehearse` creates a labeled five-outline synthetic example in ignored .local/evidence. It proves the record workflow, not customer participation or video production. Persist snapshots in a private authenticated host journal before a real pilot; the pure module accepts trusted local snapshots only and is not a public API or secure import validator.

Roles remain compact: coordinator owns consent and acceptance rubric; knowledge owns brief/source provenance; engineering owns artifact bindings; risk owns rights uncertainties; red team challenges stale versions and unsupported success claims. Each receives only its necessary input. Reviewers never gain payment, outreach or publication authority.

Acceptance for a real pilot requires a consenting customer, reviewed content rights, actual artifact bytes, an authorized reviewer and cost evidence. Compare customer-only briefs against licensed audience-service briefs on matched assignments before claiming product improvement.

Implementation reference: the Node built-in crypto hash API (https://nodejs.org/api/crypto.html) supplies SHA-256; no third-party code or media service was copied. The official Sokosumi-MCP repository (https://github.com/masumi-network/Sokosumi-MCP) is a future service transport reference, not an active pilot integration.
