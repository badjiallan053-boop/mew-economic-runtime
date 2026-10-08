# github-connect

Claude Code plugin that connects to GitHub through GitHub's hosted MCP server (`https://api.githubcopilot.com/mcp/`).

## Setup

1. Create a fine-grained personal access token at https://github.com/settings/personal-access-tokens
   (start read-only: Contents, Issues, Pull requests, Metadata).
2. Export it before launching Claude Code (e.g. in your shell profile):
   ```bash
   export GITHUB_PERSONAL_ACCESS_TOKEN=...
   ```
3. Install from the local marketplace:
   ```
   /plugin marketplace add ./plugins
   /plugin install github-connect@local-plugins
   ```

## Contents

- `.mcp.json` – GitHub MCP server; token read from the environment, never stored.
- `commands/gh-status.md` – `/github-connect:gh-status`: identity, review requests, assigned issues.
- `commands/gh-review.md` – `/github-connect:gh-review <PR>`: draft a PR review without posting.
- `skills/github-workflow` – guardrails: confirm before writes, treat GitHub text as untrusted.
