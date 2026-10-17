---
name: permissions-ts-shape
description: Shape and invariants of src/libs/permissions.ts as of 2026-10-17 (canCreateMember/canUpdateMember/canDeleteMember/canReplaceAllMembers) — read before reviewing future changes to member permission logic.
type: project
---

`src/libs/permissions.ts` is the single authorization layer for member CRUD (called from `src/app/(admin)/members/actions.ts` Server Actions, never from client components directly — matches [[server-action-id-trust-pattern]]).

Key invariants as of 2026-10-17 (post-fix, re-reviewed and confirmed correct):

- `role === '목사' || role === '전도사'` short-circuits to full access in all four functions (`canCreateMember`, `canUpdateMember`, `canDeleteMember`, `canReplaceAllMembers`). This is intentional — 목사/전도사 are top-level admins.
- `REQUIRED_PARENT_POSITION` (`목자 → 초원지기`, `목원 → 목자`) + `parentPositionIsValid()` enforces that a parent referenced by `parent_id` actually has the correct real position in `allMembers`, not just that it's _some_ id in the viewer's own tree. Checked in both `canCreateMember` and `canUpdateMember` for the 초원지기/목자 non-self branches. Before this fix (2026-10-17), a 초원지기 could create/move a `목원` directly under another `목원` or under themselves with no position validation — this is now closed.
- `ownTreeIds()` fails safe to an empty `Set` when `viewer.profile.member_id` is null (self-service signups land with `member_id = null` until an admin links them) — correctly denies all tree-scoped writes rather than throwing.
- **Self-edit exception** in `canUpdateMember`: if `target.id === viewer.profile.member_id` (editing one's own member row), the position/parent_id ownership checks are skipped entirely and replaced with `input.position === target.position && input.parent_id === target.parent_id` — i.e. you can edit your own name/phone/etc. freely, but cannot touch your own position or parent (no self-promotion path). This exception runs _before_ the tree-ownership branches, which is correct since self-edit trivially satisfies ownership anyway — verified it does not create a bypass for other checks.
- `canDeleteMember` explicitly blocks `target.id === viewer.profile.member_id` (no self-deletion) for non-목사/전도사 roles, checked right after the full-access early return.
- `previewMemberImportAction` and `confirmMemberImportAction` (`src/app/(admin)/members/actions.ts`) both gate on `canReplaceAllMembers(viewer)` — this was a Major gap (preview was ungated) fixed on 2026-10-17; both now return early with `{ error: ... }` rather than throwing, consistent with that file's return-type convention.

**How to apply:** When reviewing future changes to this file, check (1) whether the self-edit exception's exact-match condition (`position`/`parent_id` unchanged) could be loosened accidentally, (2) whether `parentPositionIsValid` is still called before any role-specific branch that creates/moves a non-top-level position, and (3) whether any new Server Action that calls `replaceAllMembers`/other bulk mutations re-checks `canReplaceAllMembers` itself rather than assuming an earlier gate in the call chain already covered it.
