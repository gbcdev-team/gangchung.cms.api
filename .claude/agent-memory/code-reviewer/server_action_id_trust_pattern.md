---
name: server-action-id-trust-pattern
description: RESOLVED 2026-10-17 — profile/actions.ts now derives id from the real Supabase session, not a client-supplied argument; storage.ts has server-side MIME/size checks. Kept as a pattern reminder for future Server Actions.
type: project
---

Historical issue (found 2026-10-10, during mock-auth era): `updateProfileAction` took a client-supplied `id` and passed it unchecked into admin-client queries — a latent IDOR once real multi-user auth landed.

**Status as of 2026-10-17 real-auth migration review:** Fixed. `src/app/(admin)/profile/actions.ts`'s `updateProfileAction(fullName, avatarForm, removeAvatar)` no longer takes an `id` param at all — it calls `createClient()` (session-bound server client), does `supabase.auth.getUser()`, and uses `user.id` server-side. Client can no longer pass an arbitrary row id. Also `src/libs/supabase/queries/storage.ts`'s `uploadAvatar` now validates `ALLOWED_TYPES` (MIME allowlist) and `MAX_SIZE` (5MB) server-side before upload, independent of client-side checks.

**Why this memory still exists:** Not to re-flag this specific instance, but as a **pattern to keep checking** — any new Server Action that mutates a row "owned by the current user" must derive the owner id from `getViewer()`/`supabase.auth.getUser()` server-side, never from a client-passed argument or from `useAuth()`/`useUser()` cache data forwarded back up to the server.

**How to apply:** When reviewing new/changed Server Actions, check whether any id used to scope a mutation (profile id, member id ownership checks, etc.) comes from a trusted server-side session lookup vs. a client-passed argument. Member CRUD (`src/app/(admin)/members/actions.ts`) does this correctly too — it resolves `viewer` via `getViewer()` and checks `src/libs/permissions.ts` before using the client-passed member `id`/`input` only as the _target_, not as an identity claim.
