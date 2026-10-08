# Installation and verified state

Checked 7 October 2026. All project-local downloads are in ignored `.local/`; no global system configuration was changed.

| Component | Local state | Next gate |
| --- | --- | --- |
| Node | Bundled Node 24.19.0 executed tests/server | Put Node 24 on PATH in a normal shell |
| MEW / SQLite | Running locally; built-in `node:sqlite`; no install needed | Persistent volume for hosting |
| Sokosumi | 1.0.4 installed and version checked | `auth whoami` returns `AUTH_REQUIRED`; user login pending |
| pnpm for MPS | 10.30.2 installed and version checked | Use pinned executable below |
| MPS | Official source d569a338ca54d5be7441564770d75ebf89b71f12 downloaded; frozen-lockfile dependencies installed; Prisma client generated | Dedicated PostgreSQL, private configuration, credentials; not running/migrated/seeded |
| Cardano Dev Skills | Full source/docs downloaded at 8c8005aff19260383de24191bddbe476c670b410; skill links added | Consult relevant skill before chain changes |
| Masumi TOKEN2049 skill | Reviewed and installed in `.agents/skills/token2049-paid-agent` | Follow prerequisites, retain private checkpoint record |
| skills.sh TDD skill | Reviewed snapshot installed in `.agents/skills/test-driven-development` | Read applicable references from upstream if needed |
| CLI skills | Installed CLI bundles Sokosumi, Coworker, Tasks, Jobs, Agents, Watch; local links added | Runtime grant checks after login |
| PostgreSQL / Docker | Neither server nor Docker installed; neither is needed for this local demo | Install one supported PostgreSQL route before MPS migration; do not migrate a guessed database |
| Eve/model | Not installed or connected; existing deterministic fixtures preserved | Optional separate agent project after provider choice/access |

The downloaded MPS is a separate service, not MEW's runtime dependency. Wallet creation, seeding, migrations and payments were not run. No model inference, Coworker record or seller receipt was produced.

## Reproduce tooling installation

With Node 24 and pnpm available:

```sh
mkdir -p .local/tooling
cp tooling/package.json tooling/pnpm-lock.yaml .local/tooling/
pnpm --dir .local/tooling install --frozen-lockfile
node scripts/tools.mjs sokosumi --version
node scripts/tools.mjs pnpm --version
node scripts/tools.mjs sokosumi --preprod auth whoami --json
```

The CLI is run through the actual Node executable, avoiding a global binary install. For later interactive user sign-in: `node scripts/tools.mjs sokosumi --preprod auth login`.

## Reproduce source preparation

Use a fresh destination; on resume inspect existing checkout rather than clone over it.

```sh
git clone https://github.com/cardano-foundation/cardano-dev-skills .local/cardano-dev-skills
git -C .local/cardano-dev-skills checkout 8c8005aff19260383de24191bddbe476c670b410
git clone https://github.com/masumi-network/masumi-payment-service .local/masumi-payment-service
git -C .local/masumi-payment-service checkout d569a338ca54d5be7441564770d75ebf89b71f12
cd .local/masumi-payment-service
../tooling/node_modules/.bin/pnpm install --frozen-lockfile
```

Node 24 must be on PATH for dependency scripts. MPS install preserves upstream Mesh SDK version isolation and does not edit its lockfile. Its install-time Prisma generation does not migrate a database. Follow the operating SOP before generating private settings or funding wallets.

Skill links are local convenience links, ignored in Git. They point into the downloaded repositories/package directories so bundled relative references are retained. A fresh clone must recreate links or access the SKILL.md files directly; no broken machine-specific link is published. MEW's own engineering skill is preserved.

## Start and verify the local demo

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/rehearsal.mjs
PORT=3037 node src/server/server.mjs
```

Open `http://127.0.0.1:3037/rehearsal.html`. Static Pages includes the page but cannot run its SQLite rehearsal API. Use the Node server for this demo. See OPERATING_SOP.md for live prerequisites and paid checkpoints.
