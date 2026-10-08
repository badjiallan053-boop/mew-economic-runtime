# Repository publication boundary

Checked 8 October 2026 against the working tree and reachable Git history. The repository is currently **public**. This policy does not change GitHub repository visibility or replace customer/data-owner consent.

| Public repository or demo | Keep private and out of Git | Review before adding or redistributing |
| --- | --- | --- |
| Project source, tests, architecture docs, synthetic fixtures, API examples and demo-only website | `.env.local`, API/session tokens, provider credentials, signing keys, seed phrases and wallet exports | Customer/pilot records, consent forms, source media, reports and acceptance artifacts |
| Public research metadata with source, rights and date labels | `data/`, `.local/`, model weights, local training/evaluation outputs, SQLite/Postgres dumps, logs and backups | Datasets, model responses, benchmark packs and YouTube/social material: verify rights, consent, retention and split leakage |
| `.env.example` with empty placeholders and safe local setup instructions | Insurer/broker correspondence, pricing/coverage material, private incident reports and identifiable customer data | Fonts, art, images, vendored skills and any template-derived material; preserve their own licenses and creator permissions |

The current `.gitignore` excludes `.env` and `.env.*` (with `.env.example` allowed), `.local/`, `data/`, SQLite/DB dumps, logs, private-data directories, model files, private-key bundles, `dist/` and the private founder brief. `.env.local` is ignored and untracked. The tracked `.env.example` contains empty secret fields. A pattern-based scan across 85 reachable commits found one match: an intentionally malformed private-key header in `tests/operator-host.test.mjs`; no credential value was found by those patterns. This is a bounded manual check, not a full secret scanner or proof that no secret was ever exposed.

If a real credential is ever committed, revoke it first. Removing the file in a later commit does not make the secret private; assess the full Git history and PRs, then coordinate history rewrite and repo visibility with all collaborators. If customer or regulated records were published, follow the applicable incident/notification process.

## Publication gaps to close

- Confirm the copyright holder in the root MIT license and confirm rights to the two bundled MEW image assets before relying on an open-source grant for them.
- Add a machine-generated dependency license report to releases; `package-lock.json` has declared license identifiers, but it is not a substitute for reviewing exact upstream license texts.
- Enable GitHub private vulnerability reporting; [`SECURITY.md`](../SECURITY.md) now explains the disclosure route, but the repository setting was not verified here.
- Pin GitHub Actions to reviewed commit SHAs, add least-privilege workflow permissions, and enable dependency/security alerts.
- Verify branch protection and required CI checks on `main`; repository metadata access in this review did not expose those settings.
- Keep the public demo in simulation mode. Never put customer acceptance, private pilot/model corpora, signer material or live payment logs in the public research tree.
