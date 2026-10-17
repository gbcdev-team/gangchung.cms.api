---
name: signup-role-self-escalation
description: RESOLVED 2026-10-17 — /sign/up self-select role is now capped at 초원지기/목자 both in UI and (load-bearing) in the DB trigger itself. Kept as a pattern reminder.
type: project
---

**Status as of 2026-10-17 (uncommitted, re-reviewed): FIXED.** Migration `supabase/migrations/20261017050000_lock_signup_role_to_self_service.sql` does `create or replace function handle_new_gangchung_profile()` and whitelists `raw_user_meta_data->>'role'` to only `'초원지기'`/`'목자'` — anything else (including '목사'/'전도사', or a direct `supabase.auth.signUp()` call bypassing the UI entirely) is forced to `'목자'`. This is the correct fix per the original finding's own guidance below: the trust boundary is the SQL trigger, not the UI, and the trigger itself was changed (not just the `<Select>` in `src/app/sign/up/page.tsx`, which was also narrowed to `SELF_SERVICE_ROLES = ['초원지기','목자']` from `src/libs/member-roles.ts`). Migration confirmed already applied to the live Supabase project by the user (not just written).

Below is the original finding, kept for context on why this mattered.

`src/app/sign/up/page.tsx` renders a `<Select>` over `PROFILE_ROLES` (초원지기/목자/목사/전도사, from `src/libs/member-roles.ts`) and lets the signing-up user pick any of them. `signUpWithEmail` (`src/libs/supabase/queries/auth.ts`) passes that role straight into `supabase.auth.signUp({ options: { data: { role, full_name } } })` — i.e. into `auth.users.raw_user_meta_data`, fully client-controlled.

The migration `supabase/migrations/20261017020000_add_profiles_role_and_member_link.sql` creates `handle_new_gangchung_profile()`, a trigger on `auth.users` insert, which does:

```sql
insert into public.gangchung_profiles (id, email, role, full_name, ...)
values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', '목자'), ...)
```

No validation, no allowlist, no approval step. Combined with `src/libs/permissions.ts` granting `role === '목사' || role === '전도사'` unconditional full CRUD over every member (`canCreateMember`/`canUpdateMember`/`canDeleteMember`/`canReplaceAllMembers` all short-circuit `true`), this means: anyone who can reach `/sign/up` (no auth required — not in `middleware.ts`'s `ADMIN_PATHS`, and deliberately so per project convention, see [[self-signup-path-is-intentional]] if that memory exists) can grant themselves top-level admin by just picking "목사" in a dropdown. This works even via a direct `supabase.auth.signUp()` REST call bypassing the UI entirely, since the trust boundary is the DB trigger, not the form.

**Why this matters:** This is privilege escalation via self-service signup with zero approval/review step — the single most severe finding in the 2026-10-17 mock-auth → real-Supabase-Auth + RBAC migration changeset. It is NOT the same as "self-signup route is public" (that part is intentional per project convention) — the bug is that role is _client-influenced at all_ for a brand-new, unapproved account.

**How to apply:** When reviewing any future change to `/sign/up`, `signUpWithEmail`, or the `handle_new_gangchung_profile` trigger, verify role assignment is no longer client-influenced — e.g. trigger should hardcode a safe default (lowest-privilege, like '목자' with `member_id = null` which `ownTreeIds` fail-safes to empty permissions) regardless of `raw_user_meta_data`, and any elevation to 초원지기/목사/전도사 or `member_id` linkage should require a separate authenticated admin action (a 목사/전도사-only "assign role" Server Action), not be settable at signup time. If a future diff removes the role `<Select>` from the signup form but the trigger still reads `raw_user_meta_data->>'role'`, the vulnerability is NOT fixed — flag it again, since the real trust boundary is the SQL trigger, not the UI.
