# mzbs — Teacher Lifecycle (Auto-User-Linking, Safe Deletion) & Deleted Staff Plan

**Status tracker:** update this line as work progresses.
`Current phase: Not started / Phase 0`

**This is a planning document only — no code has been written yet.** Every phase below is meant to be reviewed and corrected before implementation starts, per the same process used for `MULTI_TENANT_PLAN.md`, `DEBIT_MODULE_PLAN.md`, and `STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md`.

---

## Table of Contents

1. [Background & Requirements](#background--requirements)
2. [Locked Design Decisions](#locked-design-decisions)
3. [Open Questions Requiring Confirmation](#open-questions-requiring-confirmation)
4. [Phase 0 — Module Contract](#phase-0--module-contract)
5. [Phase 1 — Schema Migrations](#phase-1--schema-migrations)
6. [Phase 2 — Teacher Creation Form: New Fields](#phase-2--teacher-creation-form-new-fields)
7. [Phase 3 — Backend: Atomic Teacher+User Creation](#phase-3--backend-atomic-teacheruser-creation)
8. [Phase 4 — Backend: `is_active` Enforcement in Auth](#phase-4--backend-is_active-enforcement-in-auth)
9. [Phase 5 — Backend: Soft-Delete / Restore Sync](#phase-5--backend-soft-delete--restore-sync)
10. [Phase 6 — `get_current_staff()` Fix + Active-List Filtering (`staff.py`, `staff_profile.py`)](#phase-6--get_current_staff-fix--active-list-filtering-staffpy-staff_profilepy)
11. [Phase 7 — Permissions Migration: `deleted_staff`](#phase-7--permissions-migration-deleted_staff)
12. [Phase 8 — Backend: Deleted Staff Routes](#phase-8--backend-deleted-staff-routes)
13. [Phase 9 — Frontend: Deleted Staff Page](#phase-9--frontend-deleted-staff-page)
14. [Phase 10 — Regression + Guardrails](#phase-10--regression--guardrails)
15. [Phase 11 — Git Staging](#phase-11--git-staging)
16. [Post-Launch Notes](#post-launch-notes)

---

## Background & Requirements

Consolidated from two requirements docs plus prior codebase tracing in this conversation:

1. **Teacher creation** (`Setup → Teachers → Create`) must automatically create and link a `User` account to the new `TeacherNames` record, so the teacher can immediately use Self-Attendance, Attendance Review-visible history, Staff Profile, and exam functionality without a separate manual linking step.
2. **Teacher deletion** (`Setup → Teachers → Delete`) must be a **soft delete** — the existing `TeacherNames.is_deleted` flag, already implemented — and must **also disable the linked `User` account** (new `is_active` field, does not exist yet) rather than deleting either row. All historical attendance, self-attendance, salary, allowance/deduction, and exam records must remain intact and keep referencing the original `teacher_name_id`.
3. **Deleted Staff page** — new, ADMIN/CHIEF_PRINCIPAL-only page modeled on the existing Deleted Students page's *UI conventions* (list → View → Restore), but with a materially different backend mechanism: Deleted Students copies to an archive table and recreates the student on restore; Deleted Staff must **not** do this, because teacher history depends on FK continuity to the original `teacher_name_id`. Deleted Staff instead filters/toggles the existing `TeacherNames.is_deleted` row directly.
4. **Auto-generated identity rule** (confirmed by you):
   ```
   username = f"{tenant}_{teacher_name_en}"
   password = f"{tenant}_{teacher_name_en}@123"
   email    = f"{tenant}_{teacher_name_en}@gmail.com"
   ```
   `teacher_name_en` is a new, persisted, English-only field distinct from the (possibly Urdu) display `teacher_name`.
5. **Collision handling** (confirmed): reject the second teacher creation with a clean `400`, checked against active **and** soft-deleted teachers' accounts — no auto-suffixing.
6. **Placeholder email** (confirmed): visible UI warning that the generated email is not a real mailbox.
7. **Permanent delete** — explicitly **not** part of this plan; soft-delete + restore only (see Locked Design Decisions).

---

## Locked Design Decisions

| Decision | Value | Source |
|---|---|---|
| Soft-delete column | `TeacherNames.is_deleted` (existing, already implemented in `teacher_names.py:143`) — no new teacher status field | Confirmed |
| New `User` column | `is_active: bool`, `default=True`, `nullable=False` | Confirmed |
| Auth enforcement points | Login function (`user_crud.py:45`) **and** `get_current_user()` (`user_crud.py:159`) — both must reject `is_active=False` | Confirmed |
| Teacher+User creation | One atomic transaction — both rows or neither; roll back on any failure | Confirmed |
| Username/password/email generation rule | `{tenant}_{teacher_name_en}` / `{tenant}_{teacher_name_en}@123` / `{tenant}_{teacher_name_en}@gmail.com` — derived from a new **English-only** `teacher_name_en` field, not the (possibly Urdu) display `teacher_name` | Confirmed (formula) + Confirmed (Urdu source field, this turn) |
| New `TeacherNames` column | `teacher_name_en: Optional[str]`, nullable (legacy rows predating this feature won't have it), required via form validation going forward, **persisted permanently as canonical login-identity source** | Confirmed |
| Collision behavior | Reject with clean `400`: *"A user account already exists for this teacher name. Please use a different teacher name."* — checked against both generated username and email, **including soft-deleted/archived teachers' accounts** (a restored/disabled username stays reserved), `IntegrityError` caught as final safeguard | Confirmed |
| `is_active` route audit | Every router audited for direct `Depends(get_token_payload)` usage without a subsequent `Depends(get_current_user)` in the chain; each finding fixed so disabled users cannot act on old JWTs. **Correction (audit finding):** classify each hit as (a) protected transitively via `require_permission()` — which itself calls `get_current_user()` — (b) protected directly, (c) protected only by `get_token_payload()` with no user lookup at all, or (d) intentionally public. Only category (c) is an actual gap. | Confirmed, required |
| Credential delivery | One-time admin success dialog showing generated username + temporary password after teacher creation; **no** later password-retrieval endpoint of any kind | Confirmed |
| Credential-handling hardening (audit finding) | Because the password is deterministic (`{tenant}_{teacher_name_en}@123`), the one-time dialog is UX, not a security boundary. Required hardening: no password in any log line (request/response/debug); `Cache-Control: no-store` on the creation response; not persisted in frontend state/local storage beyond the dialog's lifetime; not included in analytics, error reporting, or toast/notification history; explicit test confirming the password is gone from frontend memory after the dialog closes | Confirmed, required |
| Forced password change on first login | Deferred — **not** built in this phase; no `must_change_password` flag/middleware added now; tracked as a follow-up security enhancement (flagged by audit as high-priority follow-up given the deterministic password) | Confirmed (scope narrowed) |
| Login error message for disabled accounts | Explicit: *"Your account has been disabled. Please contact administration."* — not the generic invalid-credentials message | Confirmed |
| Teacher-name display across the app | `teacher_name` (existing display field, may be Urdu) remains the **only** name shown in every existing selection dropdown/table — Teacher Setup, Attendance, Exams, Payroll, Staff Profile, Attendance Review, and the new Deleted Staff list. Unchanged, no dual-display anywhere. | Confirmed |
| `teacher_name_en` visibility | Shown **only** on the Teacher creation form (admin input) and implicitly via the generated username in the one-time credential dialog — never displayed as its own labeled field anywhere else in the app | Confirmed |
| Permanent/hard delete of a teacher | **Not included in this plan.** Only soft-delete + restore exist. No route or UI removes a teacher's row or historical data permanently. | Confirmed — not wanted at this time |
| Placeholder email UI warning | Required, visible on the Teacher creation form | Confirmed |
| Deleted Staff scope | ADMIN, CHIEF_PRINCIPAL only — narrower than Deleted Students (which also allows PRINCIPAL) | Confirmed |
| Deleted Staff role enforcement (audit finding) | Permission-table gating (`deleted_staff.view`/`.edit`) is **not sufficient by itself** — an ADMIN could toggle `deleted_staff` on for another role via `ManageRolePermissions.tsx`, which would violate the hard ADMIN/CHIEF_PRINCIPAL-only requirement. Every Deleted Staff route must **also** hard-check `current_user.role in {ADMIN, CHIEF_PRINCIPAL}` in code, in addition to `require_permission()` — not togglable via the permissions UI, unlike every other module in this system. This is a deliberate exception to the system's normal self-service-permissions philosophy. | Confirmed, required (see Phase 8) |
| Deleted Staff permission module | New module key `deleted_staff`, actions `view`/`edit` real (edit = restore), `add`/`delete` reserved/unused — do **not** reuse `staff_profile` | Confirmed |
| Deleted Staff mechanism | Filter/toggle existing `TeacherNames.is_deleted` directly — **no** archive-table-copy-and-recreate pattern (unlike Deleted Students) | Confirmed, per FK-continuity requirement |
| `get_current_staff()` fallback bug | Must be fixed to exclude `is_deleted=true` teachers, and to reject `is_active=false` users, as part of this plan (not deferred) | Confirmed |
| Password storage | Only the hash is ever stored; plaintext generated password is never persisted or logged after creation | Confirmed (security-standard, non-negotiable) |
| Creation response schema (audit finding) | The existing `add_teacher_name` route returns `response_model=TeacherNamesResponse`, which has no room for `username`/`raw_password`. A **new, dedicated** response model is required (e.g. `TeacherCreationResponse` wrapping `teacher: TeacherNamesResponse` + `username: str` + `temporary_password: str`), used **only** on the creation route — never reused by any "get details" or retry endpoint. | Confirmed, required (see Phase 3) |

---

## Open Questions Requiring Confirmation

**All five open questions from the prior draft are now resolved and moved into Locked Design Decisions above.** Summary of what was resolved this session:

1. **Normalization/identity source** — `teacher_name_en` (English, persisted) is the canonical source; `teacher_name` (possibly Urdu) is display-only. Normalization rule below still applies.
2. **Collision scope** — reject on any existing username/email, including soft-deleted teachers' accounts. A soft-deleted teacher's identity stays reserved until restored or the DB record is otherwise changed.
3. **`is_active` route audit** — required, not optional; part of Phase 4.
4. **Credential delivery** — one-time admin dialog, no retrieval endpoint.
5. **Forced password change** — deferred to a future enhancement, out of scope for this phase.

**One new item surfaced by this resolution, was open, now also resolved:**

### 6. Login error message specificity for disabled accounts — **RESOLVED**

Confirmed: use an explicit message — *"Your account has been disabled. Please contact administration."* — rather than the generic invalid-credentials error. See Locked Design Decisions and Phase 4.

### 7. Teacher-name display (Urdu vs. English) across the app — **RESOLVED**

Confirmed: `teacher_name` (existing display field) remains the only name shown anywhere in the app's UI. `teacher_name_en` is never displayed as a labeled field outside the Teacher creation form itself. See Locked Design Decisions.

### 8. Permanent/hard delete — **RESOLVED**

Confirmed: not wanted at this time. Remains explicitly out of scope for this plan.

**Normalization rule, applied to `teacher_name_en` only (not the Urdu display name):**
```
1. Trim leading/trailing whitespace.
2. Lowercase.
3. Replace runs of internal whitespace with a single underscore.
4. Strip any character outside [a-z0-9_].
5. If the result is empty after stripping → reject with 400:
   "Teacher Name (English) must contain at least one English letter or number."
6. Collapse repeated underscores into one.
```
Example: display `teacher_name = "عاصف"`, `teacher_name_en = "Asif"` → normalized `asif` → generated username `mzbs_asif`.

---

## Phase 0 — Module Contract

Status: 🔜 Not started — all design questions resolved, ready to begin once you say go

- [x] Confirmed: `teacher_name_en` persisted, used as canonical login-identity source
- [x] Confirmed: collision check rejects on any existing username/email, including archived teachers
- [x] Confirmed: `is_active` route audit required in Phase 4
- [x] Confirmed: one-time credential dialog, no retrieval endpoint
- [x] Confirmed: forced password change deferred out of scope
- [x] Confirmed: explicit "Your account has been disabled. Please contact administration." login message
- [x] Confirmed: `teacher_name` (unchanged) remains the only displayed name app-wide; `teacher_name_en` never shown outside the creation form
- [x] Confirmed: permanent/hard delete not wanted, stays out of scope
- [x] Confirmed: next migration number is `0012` (last existing is `0011`) — three new migrations in this plan get `0012`, `0013`, `0014` in the order below

---

## Phase 1 — Schema Migrations

**File 1:** `migrations/0012_add_is_active_to_user.py`
- `ALTER TABLE "user" ADD COLUMN is_active boolean NOT NULL DEFAULT true` (additive, safe on existing rows — every existing user becomes active by default, correct since none were previously disabled).

**File 2:** `migrations/0013_add_teacher_name_en_to_teacher_names.py`
- `ALTER TABLE teachernames ADD COLUMN teacher_name_en varchar NULL` (additive, nullable so existing rows are unaffected).
- Persisted permanently, per Locked Design Decisions — `teacher_name_en` is the canonical login-identity source, not a transient/optional field.

**End-of-day check:** run against `mzbs_staging_school` first, verify column exists with correct default via direct inspection, confirm no existing login breaks (all existing users read as `is_active=true`).

---

## Phase 2 — Teacher Creation Form: New Fields

**Files:** `CreateTeacher.tsx` (or actual name — needs verification), `teacher_names.py:28` (`POST /teacher_name/add_teacher_name/`), corresponding Pydantic/SQLModel create schema.

- Teacher form gains **one new required field**: **"Teacher Name (English)"** (`teacher_name_en`), shown alongside the existing `teacher_name` field (which may be Urdu). Helper text: *"Used only to generate the teacher's login username. Must be in English letters."*
- Client-side validation on `teacher_name_en`: reject non-Latin characters at input time (mirrors the server-side normalization in Phase 1/3), so the admin gets immediate feedback rather than a round-trip 400.
- Username/password/email themselves remain **generated server-side**, not directly admin-typed — only `teacher_name_en` is typed, and the formula is applied to it.
- Add the placeholder-email warning text near the submit button, exact copy per your confirmation:
  > "The system will create a placeholder login email. This is not a real mailbox and will not receive emails."
- Add a post-creation success dialog showing generated username + temporary password, with a "Copy" affordance and a one-time-only framing (not retrievable again after dismissal — flag this clearly in the UI so admin doesn't dismiss without noting it down).

**End-of-day check:** submit a normal teacher name, confirm the warning renders, confirm no backend calls happen until this phase's backend work (Phase 3) exists.

---

## Phase 3 — Backend: Atomic Teacher+User Creation

**File:** `teacher_names.py` (`add_teacher_name` route), extended in place.

**Logic, in order, inside a single DB transaction:**
1. Validate `teacher_name_en` is present and Latin-script; normalize it per Phase 0/Question 1's confirmed rule (the Urdu/display `teacher_name` is stored as-is and never used for identity generation).
2. Compute `username`, `raw_password`, `email` from the confirmed formula, using normalized `teacher_name_en` (not `teacher_name`).
3. Pre-check: does a `User` with this `username` OR this `email` already exist (scope per Question 2's answer)? If yes → rollback nothing (nothing written yet), return clean `400`:
   > "A user account already exists for this teacher name. Please use a different teacher name."
4. Create `TeacherNames` row.
5. Hash `raw_password` (existing hashing utility — likely `passlib`/`bcrypt`, confirm exact function from `user_crud.py`).
6. Create `User` row with `teacher_name_id` set to the new teacher's ID, `role = UserRole.TEACHER`, `is_active = True`.
7. Commit once. On any exception before commit, roll back both rows — teacher must never exist without its linked user.
8. Catch `IntegrityError` as a final safeguard (race condition between step 3's check and step 6's insert) → clean `400`, same message as step 3.
9. Response uses a **new, dedicated response model** (per audit finding — the existing `TeacherNamesResponse` has no room for credentials):
   ```python
   class TeacherCreationResponse(BaseModel):
       teacher: TeacherNamesResponse
       username: str
       temporary_password: str
   ```
   `username`/`temporary_password` are returned **only** in this single response body, from this single route, never persisted, never logged in plaintext, never reachable from any other endpoint (no "get details" or retry route ever includes them). Response also sets `Cache-Control: no-store`.

**End-of-day check:**
- [ ] Create a teacher, confirm both rows exist, confirm `teacher_name_id` FK is correct
- [ ] Attempt to create a duplicate-name teacher → clean 400, confirm no partial rows left behind (query both tables directly)
- [ ] Confirm plaintext password never appears in any log line (grep logs after a test creation)
- [ ] Confirm generated user can log in successfully with `username` + `raw_password` from the response
- [ ] Confirm `TeacherCreationResponse` is returned only from the creation route; confirm no other route (list, detail, retry) can ever surface `temporary_password`
- [ ] Confirm response has `Cache-Control: no-store`; confirm frontend does not persist the password beyond the dialog's open lifetime (test: close dialog, check frontend state/local storage for any trace)

---

## Phase 4 — Backend: `is_active` Enforcement in Auth

**Files:** `user_crud.py` (login function at line ~45, `get_current_user()` at line ~159, `require_permission()` at line ~425), plus a router-wide dependency-graph audit (methodology corrected below).

- Login: reject **explicitly** for a disabled account with:
  > "Your account has been disabled. Please contact administration."
  This is a deliberate deviation from generic invalid-credentials wording, per your confirmation — the info-leak tradeoff (confirming the account exists) is accepted in favor of UX clarity for legitimately-disabled staff.
- `get_current_user()`: reject with `401` if `is_active=False`, independent of token validity, using the same explicit disabled-account message for both fresh login and mid-session requests.
- **Refresh-token route** (`user_router.py`, ~line 239): the audit found this route currently looks up the user but does **not** check `is_active` before issuing a new access token. Must be fixed as part of this phase — same explicit-message behavior as login.
- **Refresh-token tenant claim:** the refresh-created JWT currently does **not** include `tenant_id`, while the normal login token does. Fix this in the refresh route during this phase by carrying the validated tenant claim into the new access token. This is required for consistent tenant-scoped behavior after refresh and is intentionally included because Phase 4 already modifies the same route.
- **Audit methodology (corrected per review):** do **not** rely on simple text-matching for `Depends(get_token_payload)`. `require_permission()` already depends on `get_current_user()` internally, so a route using `Depends(require_permission(...))` is already protected even if `get_token_payload` also appears nearby. Classify every route into exactly one of:
  1. Protected directly via `Depends(get_current_user)`
  2. Protected transitively via `Depends(require_permission(...))` (which itself calls `get_current_user()`)
  3. Protected **only** by `Depends(get_token_payload)` with no user-lookup anywhere in the chain — **this is the only real gap category**
  4. Intentionally public/unauthenticated
  List every route found in category 3 explicitly, and fix or explicitly accept each one individually — no blanket patch.

**End-of-day check:**
- [ ] Disable a user directly in DB → immediate 401 on their next request, no restart needed (mirrors Phase 3 Day 5's adversarial pattern in the multi-tenant plan)
- [ ] A token issued *before* disabling still fails immediately after disabling (tests the `get_current_user` check, not just login)
- [ ] Refresh route rejects a disabled user's refresh attempt
- [ ] Category-3 audit list reviewed and each gap addressed or explicitly accepted, with the classification (not just a grep hit-list) documented

---

## Phase 5 — Backend: Soft-Delete / Restore Sync (Shared Function)

**File:** `teacher_names.py` (both existing delete routes, extended to call one shared function).

**Confirmed decision:** keep **both** existing delete endpoints for backward compatibility —
- `DELETE /teacher_name/del/{teacher_name}`
- `DELETE /teacher_name/{teacher_id}`

Both must route through **one shared internal function**, e.g. `_soft_delete_teacher_and_sync_user(teacher_id: int)`, so the sync logic exists in exactly one place and cannot drift between the two entry points:

```python
def _soft_delete_teacher_and_sync_user(session: Session, teacher_id: int) -> None:
    """
    Single source of truth for teacher soft-delete.
    Called by both DELETE /teacher_name/del/{teacher_name} and
    DELETE /teacher_name/{teacher_id}.
    Updates TeacherNames.is_deleted and linked User.is_active atomically.
    """
    teacher = session.get(TeacherNames, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher.is_deleted = True

    linked_user = session.exec(
        select(User).where(User.teacher_name_id == teacher_id)
    ).first()
    if linked_user:
        linked_user.is_active = False
    else:
        logger.warning(f"Soft-deleting teacher {teacher_id} with no linked user (legacy record).")

    session.commit()
```

Both existing routes are edited to call this function instead of whatever inline logic they currently have, so `TeacherNames.is_deleted` and `User.is_active` update **atomically, in one transaction, identically regardless of which endpoint was called**.

**Restore flow (Phase 8's restore route calls into this logic):**
```
TeacherNames.is_deleted = False
User.is_active = True    (same lookup, only if a linked User exists)
```

**Confirmed decision — legacy teacher with no linked user:** restore the teacher only; response explicitly reports "No linked login account exists for this teacher — restored teacher record only." Does **not** auto-create a new user during restore (would contradict "restoring must never create a new User account").

**End-of-day check:**
- [ ] Delete a teacher via **each** of the two existing delete routes → both correctly flip `is_deleted`/`is_active` identically, confirmed by direct DB inspection after each
- [ ] Delete a teacher with a linked user → both rows flip correctly, all historical attendance/salary/exam rows still query correctly by `teacher_name_id`
- [ ] Delete a legacy teacher with **no** linked user → soft-delete still succeeds, no crash, warning logged
- [ ] Restore a teacher with a linked user → both rows flip back, disabled user can log in again, teacher reappears in active lists
- [ ] Restore a legacy teacher with **no** linked user → teacher reappears in active lists, response clearly reports no login account exists, no new user silently created

---

## Phase 6 — `get_current_staff()` Fix + Active-List Filtering (`staff.py`, `staff_profile.py`)

**File 1:** `router/self_attendance.py`, where `get_current_staff()` is defined.

- Add `TeacherNames.is_deleted == False` filter to whatever query currently selects/falls back to a teacher record.
- Add `User.is_active == True` check before resolving staff identity, if not already covered by Phase 4's `get_current_user()` fix.

**File 2:** `staff.py:67` — active-teacher list query needs `TeacherNames.is_deleted == False` added.

**File 3:** `router/staff_profile.py` — **confirmed to already exist in the repository and registered in `main.py`** (the earlier draft's assumption that this file was "not yet built" per `STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md`'s status line was stale — that status line doesn't reflect current reality). Add `TeacherNames.is_deleted == False` filters to its list route, detail route, and shift-replacement route. The detail and shift-replacement routes must return a clean 404 for archived staff.

**End-of-day check:**
- [ ] Confirm a disabled/deleted teacher's identity can no longer be resolved via `get_current_staff()`, using a direct test rather than inference
- [ ] Confirm `staff.py:67`'s active-teacher list excludes soft-deleted teachers
- [ ] Confirm `router/staff_profile.py`'s list, detail, and shift-replacement routes all exclude soft-deleted teachers
- [ ] A soft-deleted teacher no longer appears in `staff_profile.py`'s staff-selection dropdown, and a direct API call to its detail route for a soft-deleted teacher returns a clean 404 (not a raw 200 with stale-looking data)

---

## Phase 7 — Permissions Migration: `deleted_staff`

**File:** `migrations/0014_add_deleted_staff_permissions.py`, following the exact idempotent pattern of `0004_add_debit_module_permissions.py` / `0006_add_staff_profile_attendance_permissions.py`.

| module | view | edit | add | delete |
|---|---|---|---|---|
| `deleted_staff` | ADMIN, CHIEF_PRINCIPAL = `True`; all others `False` | ADMIN, CHIEF_PRINCIPAL = `True` (restore) | `False` for all (reserved, no route) | `False` for all (reserved, no route) |

Also add `{ key: "deleted_staff", label: "Deleted Staff" }` to `ManageRolePermissions.tsx`'s module groups (Phase 9 covers the actual sidebar wiring).

**End-of-day check:** query `role_permissions` for `deleted_staff` × 8 roles × 4 actions (32 rows), confirm against the table above on both tenants.

---

## Phase 8 — Backend: Deleted Staff Routes

**New file:** `router/deleted_staff.py`, modeled on `deleted_students.py`'s route shape but backed by the toggle mechanism from Phase 5, **not** an archive-copy mechanism.

**Critical correction from the audit:** permission-table gating alone (`Depends(require_permission('deleted_staff', '<action>'))`) is **not sufficient**, because an ADMIN could toggle `deleted_staff` on for `PRINCIPAL`/`TEACHER`/any role via `ManageRolePermissions.tsx`, which would violate the hard "ADMIN/CHIEF_PRINCIPAL only" requirement from your original spec. Every route below must **also** hard-check the role in code:
```python
current_user: User = Depends(require_permission("deleted_staff", "view"))
if current_user.role not in {UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL}:
    raise HTTPException(status_code=403)
```
This is a deliberate, documented exception to this system's normal self-service-permissions philosophy (see Locked Design Decisions) — `deleted_staff` is the one module where the permission toggle is **not** the actual authorization boundary.

Routes, each guarded by both `Depends(require_permission('deleted_staff', '<action>'))` **and** the explicit role check above:

- `GET /deleted-staff/` — list all `TeacherNames` where `is_deleted = True`, with the approved existing identifying fields (`teacher_name`, `created_at`) (`view`)
- `GET /deleted-staff/{teacher_id}` — historical profile using the approved existing fields and related historical records (`view`)
- `POST /deleted-staff/{teacher_id}/restore` — calls Phase 5's restore logic (`edit`)

The current `TeacherNames` schema has no contact, address, or phone fields. The Deleted Staff profile therefore shows only the approved existing fields (`teacher_name` and `created_at`) plus historical records from related tables: attendance, self-attendance, salary, allowances/deductions, and exam records. `teacher_name_en` remains an identity-generation field and is not displayed here, consistent with the locked visibility rule. Richer profile fields are deferred to the separate Staff Profile scope.

The active `GET /staff-profile/{staff_id}` route must reject a soft-deleted teacher with a clean 404, forcing archived-teacher viewing through Deleted Staff.

**End-of-day check:**
- [ ] `GET /deleted-staff/` as ADMIN → correct list; as CHIEF_PRINCIPAL → correct list; as TEACHER → 403; **as a role with `deleted_staff.view` manually toggled `True` via `ManageRolePermissions.tsx` but role ≠ ADMIN/CHIEF_PRINCIPAL → still 403** (this specifically tests the hard role-check, not just the permission table)
- [ ] `GET /deleted-staff/{teacher_id}` returns only the approved existing profile fields plus historical records, verified against direct DB queries
- [ ] Restore → teacher reappears in active list, disappears from deleted list, user re-enabled (or correctly reports no linked user, per Phase 5)

---

## Phase 9 — Frontend: Deleted Staff Page

**Files:** new page + table component, modeled on `page.tsx` / `DeletedStudentsTable.tsx`'s *layout conventions only* (list, View icon, Restore action, confirmation dialog before restore).

- Sidebar entry visible only to ADMIN/CHIEF_PRINCIPAL (both permission-driven via `deleted_staff.view` **and** hardcoded role check at the sidebar level, matching the pattern already used for the Profile module's STUDENT exclusion in the staff-attendance plan, and matching Phase 8's backend hard role-check, for defense in depth).
- View action opens the full historical profile (attendance, self-attendance, salary, allowances/deductions, exam records) — reuse existing tab/section components from Staff Profile where possible rather than rebuilding.
- Restore action behind a confirmation dialog, matching Deleted Students' existing UX pattern.

**End-of-day check:** log in as each of the 8 roles, confirm only ADMIN/CHIEF_PRINCIPAL see the sidebar entry and can access the route directly (URL-guessing test, not just sidebar-hiding).

---

## Phase 10 — Regression + Guardrails

- [ ] Create teacher → linked user created atomically, login works with generated credentials
- [ ] Duplicate teacher name → clean 400, no partial rows, no plaintext password logged
- [ ] Delete teacher → `is_deleted=true`, linked `is_active=false`, all historical rows (attendance, self-attendance, salary, allowance/deduction, exam) still resolve by `teacher_name_id`, still visible in reports/aggregates that don't filter on active-teacher lists
- [ ] Disabled user cannot log in; a pre-existing valid token for that user is rejected on next request (not just next login)
- [ ] `get_current_staff()` never resolves a deleted/disabled identity
- [ ] Restore → all of the above reverses correctly, no duplicate rows created, original teacher ID preserved throughout
- [ ] Deleted Staff page/API restricted to ADMIN/CHIEF_PRINCIPAL at both frontend and backend layers (direct API test as TEACHER/PRINCIPAL → 403)
- [ ] Toggle `deleted_staff` permission off for CHIEF_PRINCIPAL via `ManageRolePermissions.tsx` → sidebar entry disappears without backend restart
- [ ] Legacy teachers with no linked user (pre-existing before this feature) → deletion still works without crashing, restore path handles a null-user case gracefully, response clearly reports no linked account
- [ ] Both existing teacher-delete endpoints behave identically with respect to `is_active` sync
- [ ] Deleted Staff access with `deleted_staff.view`/`.edit` manually enabled for a non-ADMIN/CHIEF_PRINCIPAL role via `ManageRolePermissions.tsx` → still 403 at the API level (tests the hard role-check independent of the permission toggle)
- [ ] Refresh-token attempt for a disabled user → rejected, consistent with login/`get_current_user()` behavior
- [ ] Full regression on both `mzbs` and `mzbs_staging_school`

---

## Phase 11 — Git Staging

Files to stage once implementation and regression are complete (staging only — **committing happens only when you explicitly ask for it**, not automatically as part of finishing a phase):

```powershell
git add migrations/0012_add_is_active_to_user.py migrations/0013_add_teacher_name_en_to_teacher_names.py migrations/0014_add_deleted_staff_permissions.py
git add schemas/user_models.py router/teacher_names.py user/user_crud.py router/deleted_staff.py main.py
git add frontend/src/components/teacher/CreateTeacher.tsx frontend/src/components/Setup/ManageRolePermissions.tsx
git add frontend/src/app/dashboard/setup/deleted_staff/ frontend/src/components/DeletedStaff/
git add frontend/src/components/dashboard/Sidebar.tsx frontend/src/utils/rolePermissions.ts
git status
```
Commit message to use **once you tell me to commit**: `"Add auto teacher-user linking, is_active soft-disable, and Deleted Staff restore functionality"`

---

## Post-Launch Notes

- Revisit forced first-login password change if the deferred decision turns out to be a real support burden in practice — track this as a deferred item, not a dropped one. Given the audit's finding that the password is fully deterministic, treat this as a **higher-priority** follow-up than originally framed.
- The email-uniqueness-collision race between Phase 3's pre-check and insert is inherently narrow (single-admin-at-a-time usage is the norm per your usage pattern), but the `IntegrityError` catch is kept as a permanent safeguard regardless.
- Add explicit server-side tests for `teacher_name_en` normalization collisions (e.g. `"A-sif"`, `"Asíf"`, `"Asif!!"` all normalize to `asif` — confirm the collision error message is clear about *why* the second creation was rejected, not just that it was).
- Consider, in a future pass, whether an actual invitation-link flow (rather than a one-time credential dialog) is worth building once the teacher/user base grows.
- If a genuine permanent-delete/right-to-erasure capability is ever needed, it must be scoped as a **separate, deliberately dangerous feature** — it cannot reuse this plan's soft-delete mechanism, since it would necessarily break the FK-continuity guarantee this entire plan is built around.
- The refresh-token `tenant_id` gap is fixed within Phase 4, and `router/staff_profile.py` is an existing registered route whose active queries are updated in Phase 6.
