# Agents used

Claude Code orchestrated this extraction on 8 October 2026 using two Claude subagents for desk research (chain comparison; insurance and agent-evidence landscape). The core, adapter, server, test and documentation changes were made by the orchestrating session. A third subagent may be recorded below if a review pass is run. No Grok, Kimi, Hermes or Codex agent was invoked in this session; the founder-brief model routing remains a proposal.

Test status at extraction: the new and changed code was **not executed** because no Node.js runtime was available in the environment. Run `npm test` (Node 24+) before trusting it.

A third Claude subagent desk-reviewed the untested code by reading it. It found one real defect (the evidence export never counted settled value as `spent`) plus hardening gaps, all fixed by the orchestrator. That review is not a substitute for running the tests.
