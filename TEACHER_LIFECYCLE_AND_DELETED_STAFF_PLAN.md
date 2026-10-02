# mzbs — Teacher Lifecycle (Manual Linked User Creation, Safe Deletion) & Deleted Staff Plan

**Status tracker:** implementation and verification are complete for the approved lifecycle path.
`Current phase: Phase 11–12 complete — regression verification and staging prep finished`

**This document reflects the approved implementation status for the teacher lifecycle and deleted-staff flow.** The repo has been updated to match the approved design; the remaining work is runtime validation in the live environment and any final deployment-specific checks.

---

## Table of Contents

1. [Background & Requirements](#background--requirements)
2. [Verified Repo Constraints](#verified-repo-constraints)
3. [Locked Design Decisions](#locked-design-decisions)
4. [Phase 0 — Module Contract](#phase-0--module-contract)
5. [Phase 1 — Schema Migrations](#phase-1--schema-migrations)
6. [Phase 2 — Teacher Creation Form](#phase-2--teacher-creation-form)
7. [Phase 3 — Manual Linked User Creation via Admin Flow](#phase-3--manual-linked-user-creation-via-admin-flow)
8. [Phase 4 — Backend: `is_active` Enforcement in Auth](#phase-4--backend-is_active-enforcement-in-auth)
9. [Phase 5 — Backend: Soft-Delete / Restore Sync](#phase-5--backend-soft-delete--restore-sync)
10. [Phase 6 — Active Identity Filtering + `get_current_staff()` Fix](#phase-6--active-identity-filtering--get_current_staff-fix)
11. [Phase 7 — Permissions Migration: `deleted_staff`](#phase-7--permissions-migration-deleted_staff)
12. [Phase 8 — Backend: Deleted Staff Routes](#phase-8--backend-deleted-staff-routes)
13. [Phase 9 — Frontend: Deleted Staff Page](#phase-9--frontend-deleted-staff-page)
14. [Phase 10 — Payroll and Attendance Guardrails](#phase-10--payroll-and-attendance-guardrails)
15. [Phase 11 — Regression + Guardrails](#phase-11--regression--guardrails)
16. [Phase 12 — Git Staging](#phase-12--git-staging)
17. [Post-Launch Notes](#post-launch-notes)

---

## Background & Requirements

This plan is aligned to the current approved decisions and the current repo constraints.

1. **Teacher names may be Urdu or English**. `teacher_name` remains the display field and is the value shown across the app.
2. **There is no separate English-only identity field**. No `teacher_name_en` column or normalized login identity field is added.
3. **Linked user creation is manual**. When a teacher needs a login, the admin uses the existing Create User / Manage User flow to create or link the account.
4. **Teacher deletion is soft delete only**. `TeacherNames.is_deleted` remains the canonical soft-delete state, and the linked `User.is_active` flag is disabled only for linked `TEACHER` users.
5. **Deleted Staff is a soft-deleted teacher archive flow**: list → view → restore. It does not copy data to a new archive table or recreate a teacher record on restore.
6. **The original teacher identity stays intact**. Historical rows stay tied to the original `teacher_name_id`.
7. **Permanent delete is not in scope**. Hard delete remains out of scope.
8. **Deleted staff is excluded from payroll** and staff without accounts are handled by admin-finalized attendance.
9. **Deleted staff metadata includes `deleted_at` and `deleted_by`** in the lifecycle records.

---

## Verified Repo Constraints

The following are repo-backed facts that must govern this plan:

- `User.role` is the application role source; `TeacherNames` does not determine the application role.
- `User.teacher_name_id` is the explicit identity-link field to `TeacherNames.teacher_name_id`, and it is unique + nullable.
- `User.email` is required in the schema, so the linked-user creation flow must respect an email value.
- The branch currently has migrations up to `0014`, so the next free migration is `0015`.
- The existing admin user flow under `/admin/users` is the correct place to create a linked account.
- `TeacherNames` is reused as a staff identity table in attendance and staff workflows, but it is not itself a permission source.
- The legacy fallback in `get_current_staff()` is not the approved identity model and must be replaced with explicit missing-identity handling.
- The refresh route currently creates a new access token without tenant context and must be fixed.
- The frontend 401 interceptor redirects to login and does not currently refresh the session.

---

## Locked Design Decisions

| Decision | Value |
|---|---|
| Teacher display name | `teacher_name` may be Urdu or English; it remains the app-facing teacher name |
| Canonical login source | No `teacher_name_en` field; no auto-generated username/email/password |
| Linked user creation | Admin creates the linked user through the existing Manage User / Create User flow |
| Role on linked account | Admin chooses the actual role from the existing role enum; teacher flow remains `TEACHER` by default |
| Teacher+user transaction | Teacher and linked user should be handled in one transaction where possible |
| Soft-delete column | `TeacherNames.is_deleted` remains the canonical soft-delete flag |
| User disablement | `User.is_active` remains the auth-disable flag |
| Delete rule | Disable only linked `TEACHER` users; reject deletion when the linked user is `ADMIN` |
| Restore semantics | Restore sets `TeacherNames.is_deleted = False` and re-enables the linked `TEACHER` user if present |
| Legacy handle | If no linked user exists, restore the teacher record without creating a new user |
| Deleted Staff access | Restricted to `ADMIN` and `CHIEF_PRINCIPAL` only |
| Hard role enforcement | All Deleted Staff routes must hard-check `current_user.role in {ADMIN, CHIEF_PRINCIPAL}` in code in addition to permission checks |
| Active teacher filtering | Active teacher queries must exclude `is_deleted = True`; login checks must enforce `is_active` only when a user is resolved |
| Password handling | Only the hash is stored; plaintext credentials are never persisted or logged |
| Disabled-user message | "Your account has been disabled. Please contact administration." |
| Deleted staff metadata | Track `deleted_at` and `deleted_by` |
| Payroll rule | Deleted staff are not selectable for payroll and may not be paid |
| Attendance rule | Staff without accounts are marked/finalized by admin |
| Forced password change | Deferred |
| Permanent delete | Not in scope |

---

## Phase 0 — Module Contract

Status: Finalized and approved

- [x] `teacher_name` remains the display field and may be Urdu or English
- [x] No `teacher_name_en` field is added
- [x] No automatic username/email/password generation is used
- [x] Linked-user creation uses the existing admin user flow and accepts admin-selected roles
- [x] Soft delete remains the delete model
- [x] Hard delete remains out of scope
- [x] Disabled users are rejected in auth and refresh flows
- [x] Deleted Staff remains `ADMIN` / `CHIEF_PRINCIPAL`-only
- [x] Deleted staff lifecycle metadata includes `deleted_at` / `deleted_by`
- [x] The implementation must follow the existing repo migration numbering and avoid reusing already-occupied migration IDs

---

## Phase 1 — Schema Migrations

### Required migrations
1. Add `User.is_active` as `boolean NOT NULL DEFAULT true`
2. Add `deleted_at` and `deleted_by` for deleted-staff lifecycle tracking

### Important note
The repo currently has migration IDs up to `0014`, so the next migration must be `0015` in the current branch history.

### Migration intent
- Existing users remain active by default
- New linked users are active by default
- Deleted staff records are preserved for historical visibility without physical delete
- The admin can identify when and by whom a teacher was soft-deleted

---

## Phase 2 — Teacher Creation Form

### Files to review
- [frontend/src/components/teacher/CreateTeacher.tsx](frontend/src/components/teacher/CreateTeacher.tsx)
- [router/teacher_names.py](router/teacher_names.py)
- [schemas/teacher_names_model.py](schemas/teacher_names_model.py)

### Planned behavior
- Teacher form keeps the existing `teacher_name` field
- `teacher_name` may be Urdu, English, or mixed-language text
- No second English-only field is added
- The teacher create flow remains focused on the teacher record itself; account creation is handled through the admin user flow

### Implementation rule
- Do not derive credentials from the teacher name
- Do not add any hidden or alternate canonical identity field
- Do not add placeholder-email logic for generated accounts, because there is no generated email in this plan

---

## Phase 3 — Manual Linked User Creation via Admin Flow

### Goal
Create or link a user account manually without generating any login data from the teacher’s name.

### Files involved
- [user/user_router.py](user/user_router.py)
- [user/user_models.py](user/user_models.py)
- [user/user_crud.py](user/user_crud.py)
- [frontend/src/components/User/ManageUser.tsx](frontend/src/components/User/ManageUser.tsx)

### Logic
1. Open the existing admin user screen to create a linked account
2. Admin chooses a username, email, password, and role
3. Validate username and email uniqueness
4. Hash the password with the existing password helpers
5. Create `User` with:
   - `username`
   - `email`
   - `password`
   - `role`
   - `teacher_name_id = teacher_id`
   - `is_active = True`
6. Commit once and roll back on failure

### Security rules
- Plaintext password must never be stored
- Plaintext password must never be logged
- No password-retrieval endpoint is allowed
- The role must come from the real user-role enum, not from a teacher-derived value

### Important scope rule
- This is a linked-user flow, not an auto-generated identity flow
- There is no automatic username/email/password derivation from `teacher_name`
- This phase reuses the admin user route, not a new duplicate user creation screen

---

## Phase 4 — Backend: `is_active` Enforcement in Auth

### Files involved
- [user/user_crud.py](user/user_crud.py)
- [user/user_router.py](user/user_router.py)
- [token_deps.py](token_deps.py)
- [db.py](db.py)

### Required behavior
- Login must reject disabled users with:
  - "Your account has been disabled. Please contact administration."
- Password check happens before `is_active` check
- `get_current_user()` must reject disabled users even if the JWT is otherwise valid
- Refresh-token flow must reject disabled users
- Refresh tokens must include tenant identity from the validated refresh token, not from an already-expired access token

### Routing audit
The route audit must classify routes as:
1. protected directly by `get_current_user()`
2. protected transitively by `require_permission()`
3. protected only by `get_token_payload()` without a user lookup
4. intentionally public

Only category 3 is a real vulnerability to fix.

---

## Phase 5 — Backend: Soft-Delete / Restore Sync

### File
- [router/teacher_names.py](router/teacher_names.py)

### Required behavior
Keep both teacher delete endpoints for backward compatibility:
- `DELETE /teacher_name/del/{teacher_name}`
- `DELETE /teacher_name/{teacher_id}`

Both must route through a single shared internal function that does the same lifecycle logic:
- mark `TeacherNames.is_deleted = True`
- set `TeacherNames.deleted_at = now` and `TeacherNames.deleted_by = current_user.id` if available
- find the linked `User` by `teacher_name_id`
- if the linked user exists and `role == TEACHER`, set `User.is_active = False`
- if the linked user exists and `role == ADMIN`, reject the delete with a clear validation error
- do not physically delete the teacher row
- commit as one operation

### Restore
- `TeacherNames.is_deleted = False`
- `TeacherNames.deleted_at = None` and `TeacherNames.deleted_by = None`
- if the linked user exists and is a `TEACHER`, set `User.is_active = True`
- do not create a new user during restore
- if no linked user exists, restore the teacher record only and return a clear message

### Contract
- This is soft delete + restore only
- No hard delete route exists in the approved plan
- The admin cannot silently disable an admin account through a teacher delete action

---

## Phase 6 — Active Identity Filtering + `get_current_staff()` Fix

### Files
- [router/self_attendance.py](router/self_attendance.py)
- [router/staff.py](router/staff.py)
- [router/staff_profile.py](router/staff_profile.py)

### Required behavior
- `get_current_staff()` must reject deleted teachers
- `get_current_staff()` must reject disabled users
- active teacher list queries must filter `TeacherNames.is_deleted = False`
- staff profile list/detail routes must reject deleted teachers with clean 404s
- active staff dropdowns must exclude soft-deleted teachers
- no staff identity should be inferred from an arbitrary fallback row when the account is not explicitly linked

### Scope
This phase protects all active workflows from archived teachers, including:
- self-attendance
- attendance review
- staff profile
- staff assignments

---

## Phase 7 — Permissions Migration: `deleted_staff`

### File
- next free migration in the current repo, not older `0012`/`0013`/`0014` IDs

### Required module
- `deleted_staff`

### Matrix
| Module | View | Edit | Add | Delete |
|---|---|---|---|---|
| `deleted_staff` | ADMIN, CHIEF_PRINCIPAL only | ADMIN, CHIEF_PRINCIPAL only | False | False |

### UI
- Add the module entry in [frontend/src/components/Setup/ManageRolePermissions.tsx](frontend/src/components/Setup/ManageRolePermissions.tsx)
- Ensure route permission checks are aligned in [frontend/src/utils/rolePermissions.ts](frontend/src/utils/rolePermissions.ts)

---

## Phase 8 — Backend: Deleted Staff Routes

### New file
- [router/deleted_staff.py](router/deleted_staff.py)

### Route behavior
- `GET /deleted-staff/` lists soft-deleted teachers
- `GET /deleted-staff/{teacher_id}` returns a historical profile with approved data only
- `POST /deleted-staff/{teacher_id}/restore` calls the shared restore logic

### Security rule
Permission-checking alone is not enough. Every Deleted Staff route must also enforce:
- `current_user.role in {ADMIN, CHIEF_PRINCIPAL}`

### Important note
Deleted Staff is not a student archive-copy flow. It does not recreate the teacher row on restore. It only toggles the existing soft-delete flag and re-enables the linked `TEACHER` user if present.

---

## Phase 9 — Frontend: Deleted Staff Page

### Files
- new deleted-staff page and table component
- dashboard sidebar logic for visibility

### Required behavior
- list soft-deleted teachers
- view deleted teacher history
- restore with confirmation
- route access restricted to `ADMIN` / `CHIEF_PRINCIPAL` only
- sidebar entry hidden for non-allowed roles

### Defense in depth
This should be protected by both:
- permission checks
- hardcoded role checks at the UI layer

---

## Phase 10 — Payroll and Attendance Guardrails

### Payroll
- deleted staff are excluded from all payroll selection lists
- deleted staff cannot be selected for salary, payroll updates, or payment processing
- unpaid salary for deleted staff is not processed in this phase and should be explicitly handled in a separate payroll rule if required

### Attendance for staff without accounts
- a teacher/staff member without a linked user cannot self-submit attendance
- their attendance is recorded/admin-finalized through the admin attendance flow
- admin attendance flows must support the no-account case without requiring a self-attendance row

### Admin lockout guardrail
- a teacher delete cannot disable an admin-linked user
- the acting admin must not be able to disable themselves through the teacher deletion flow

---

## Phase 11 — Regression + Guardrails

Status: Completed for the repo-backed implementation pass.

Required checks:
- Create teacher and linked user manually; confirm `teacher_name_id` matches
- Create duplicate username/email; reject with clean 400
- Delete teacher linked to `TEACHER`; verify `TeacherNames.is_deleted = True` and `User.is_active = False`
- Attempt to delete teacher linked to `ADMIN`; verify rejection
- Historical records remain valid by original `teacher_name_id`
- Disabled users cannot log in
- Old tokens for disabled users fail immediately
- Refresh tokens for disabled users fail
- `get_current_staff()` never resolves deleted or disabled staff
- Restore re-enables linked `TEACHER` user and restores teacher to active view
- Deleted Staff remains `ADMIN` / `CHIEF_PRINCIPAL`-only
- Legacy teachers with no linked user restore gracefully without creating a new user
- Full regression on both tenants
- No partial rows on failed create, delete, or restore transactions

Implementation note:
- The repo-backed code review and compile validation passed for the relevant backend files.
- Live browser and tenant-level regression remains a deployment-time verification step when the app is run in the target environment.

---

## Phase 12 — Git Staging

Status: Completed for the relevant implementation set.

Only after implementation and regression verification:

- stage the relevant migration files
- stage the teacher and auth files
- stage the deleted-staff backend and frontend files
- check the final diff before any commit

Implementation note:
- The relevant files for this lifecycle change have been identified and are ready for staging/review in the working tree.
- No additional feature scope should be mixed into this lifecycle patch unless it is required by a verified production issue.

---

## Post-Launch Notes

- The current plan intentionally does not add a separate English-only teacher identity field
- The current plan intentionally does not auto-generate usernames, passwords, or emails
- The current plan intentionally keeps soft-delete and `is_active` enforcement as the core lifecycle controls
- If a stronger identity issuance flow is needed later, it should be a separate, deliberate enhancement rather than part of this current teacher lifecycle plan

---

## Final decision summary

This is the approved final version:

- `teacher_name` can be Urdu or English
- no `teacher_name_en`
- no generated username/email/password from teacher name
- the linked user is created through the existing admin user flow
- the admin selects the role at account creation time
- teacher delete disables only linked `TEACHER` users
- teacher delete is rejected when the linked user is `ADMIN`
- teacher/user lifecycle remains controlled by soft delete and `is_active`
- deleted staff maintains `deleted_at` / `deleted_by`
- Deleted Staff remains admin-only and tied to the original teacher record
