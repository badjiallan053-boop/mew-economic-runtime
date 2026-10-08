---
description: Show your GitHub identity and open work (PRs awaiting review, assigned issues)
---

Using the GitHub MCP tools from this plugin:

1. Get the authenticated user and report the login. If the call fails with an auth error, tell the user to set `GITHUB_PERSONAL_ACCESS_TOKEN` and restart Claude Code; do not ask them to paste the token.
2. List open pull requests that request their review.
3. List open issues assigned to them.
4. Present a short table per list (repo, number, title, updated). Read-only: do not comment, merge, or edit anything.
