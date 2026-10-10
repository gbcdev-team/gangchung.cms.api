---
name: no-bash-tool
description: This environment has no Bash/shell execution tool available — git diff/status and command-line verification must be done via Read/Grep/Glob instead.
type: project
---

Attempts to find a `Bash` tool via `ToolSearch` (`select:Bash`, keyword searches) returned no matches in this session. There is no way to literally run `git diff`, `git status`, `sed`, etc.

**Why:** Discovered 2026-10-10 while trying to verify a working-tree diff for the `EMAIL`/`PASSWORD` env var rename ([[env-var-rename-2026-10]]) — had to fall back to `Grep`/`Glob`/`Read` to reconstruct what changed (grepping for old names repo-wide, reading each changed file directly) instead of `git diff`.

**How to apply:** When asked to review "git diff" or "uncommitted changes" in this repo/environment, don't assume a Bash tool exists. Reconstruct the diff via targeted `Grep` (old symbol names, old env var names, etc.) across the repo and `Read` on the specific files named in the task description. State this limitation explicitly if asked to confirm something only `git diff`/`git log` could show with full certainty (e.g., exact line-level diff, whether a file is staged vs. unstaged).
