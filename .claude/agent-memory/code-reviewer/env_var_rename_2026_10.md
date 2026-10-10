---
name: env-var-rename-2026-10
description: Mock-auth env vars were renamed MOCK_EMAIL/MOCK_PASSWORD -> EMAIL/PASSWORD on 2026-10-10 across code and docs; .env files themselves could not be verified by the agent.
type: project
---

On 2026-10-10 the mock-login env var names were renamed from `MOCK_EMAIL`/`MOCK_PASSWORD` to `EMAIL`/`PASSWORD` across: `src/app/sign/in/actions.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/debug-env/route.ts`, `CLAUDE.md`, `.claude/agents/code-reviewer.md`, `docs/guides/forms-react-hook-form.md`. Verified via repo-wide grep that no `MOCK_EMAIL`/`MOCK_PASSWORD` references remain in tracked, readable files, and that all 6 changed files consistently use the new names.

**Why:** User-driven rename; reason not specified beyond simplifying the names. `.env`/`.env.local`/`.env.example` were not (and could not be, by the agent — see [[env-file-access-restricted]]) updated or verified as part of this change, so there's a real risk mock login breaks at runtime until the user manually updates those files.

**How to apply:** If a future session sees login failures or `EMAIL`/`PASSWORD` env vars reported as unset, check first whether the user's actual `.env.local` still has the old `MOCK_EMAIL`/`MOCK_PASSWORD` keys instead of assuming a code bug. Also note `EMAIL`/`PASSWORD` are generic names that risk colliding with other tooling's env vars (e.g. CI secrets, mail services) — this was already flagged to the user once; no need to repeat unless a concrete new collision is found.
