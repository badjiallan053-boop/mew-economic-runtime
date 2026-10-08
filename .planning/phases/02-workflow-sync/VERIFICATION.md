# 02 — Verification record

Scope changed: public presentation context, navigation, evidence descriptions,
pilot selection, marketing/company handoffs, and decision-studio presentation.
Backend APIs, payment policy, company registry, and core accounting contracts
were not changed.

Observed outcomes:

- Full `node --test tests/*.test.mjs`: 410 passed, 0 failed.
- `node scripts/build.mjs`, changed JavaScript parse checks, and `git diff --check`
  passed.
- Report and clipping routes were checked against actual local HTML anchors. UI
  amounts and objective limits match the report and campaign rehearsal fixtures.
- Browser verified marketing → clipping rehearsal → matching clipping evidence
  → clipping pilot. The research example is separately selectable.
- Changing pilot deliverable updates route context and clears the prepared draft.
  Only the public `workflow=report|clips` enum travels in a link; customer text
  does not enter the URL.
- Browser advanced the persisted report fixture through evidence review, 1.50 ADA
  reservation, simulated settlement with delivery timeout, and duplicate request.
  The drawn states matched saved state: 1.50 ADA exposure and DEFER. This was
  isolated local demo data, not a hosted update or payment.
- Desktop inspection used a 1280px browser viewport with no horizontal overflow.
  A narrow layout breakpoint and 44px controls are defined in CSS. A separate
  mobile capture was unavailable in this browser session, so no accessibility
  certification is claimed.
- JavaScript logs were clear after a syntax issue discovered during development
  was corrected.
- No model inference, media work, ad account, signer, transaction, customer data,
  or live backend access was used.

Deployment status belongs in release evidence after source and hosted checks.
