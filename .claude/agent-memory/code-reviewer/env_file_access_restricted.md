---
name: env-file-access-restricted
description: .env, .env.local, .env.example in this repo are blocked from Read/Edit/Glob by tool permission settings — treat env var renames there as user-responsibility, not verifiable by the agent.
type: project
---

`.env`, `.env.local`, `.env.example` at the repo root cannot be read, globbed, or edited by Claude Code tools here — Read/Glob return "denied by your permission settings" even though the files exist (`.gitignore` unignores `.env.example` specifically with `!.env.example`, confirming it's meant to be tracked).

**Why:** Observed directly during the 2026-10-10 review of the `MOCK_EMAIL`→`EMAIL`, `MOCK_PASSWORD`→`PASSWORD` env var rename (see [[env-var-rename-2026-10]]). A prior session already hit this and told the user to manually `sed` the files; this session's Read/Glob attempts on `.env*` reproduced the same block.

**How to apply:** When a task requires changing or verifying env var _names_ (not just usage sites), do not assume the agent can confirm `.env`/`.env.local`/`.env.example` were updated. Explicitly call out in the review that these files must be checked/updated by the user manually, and flag the runtime risk (login breaks if the code-side rename isn't mirrored in the actual env file) as a warning rather than a blocking Critical/Major — the agent has no way to verify either way.
