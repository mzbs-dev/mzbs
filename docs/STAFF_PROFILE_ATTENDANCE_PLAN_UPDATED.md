# mzbs — Staff Profile, Self-Attendance & Attendance Review Implementation Plan

**Status tracker:** update this line as work progresses.
`Current phase: Not started / Phase 0`

Source requirements consolidated from: `Finalized Requirements — Staff, Profile & Attendance System.md`, `Teacher Self-Attendance Enhancement.md`, `Part 2 — Staff Attendance Supervision & Finalization.md`, `Part 3 — Profile Module and Staff Profile Navigation.md`, `Part 4 — Staff Profile Structure.md`, `Part 5 — Permissions, UI-UX Consistency, and Role Restrictions.md`, plus review of existing `staff.py`, `staff_attendance_model.py`, `StaffAttendance.tsx`, `ViewStaff.tsx`.

---

## Table of Contents

1. [Background & Requirements Summary](#background--requirements-summary)
2. [Gap Analysis — Current vs. Required](#gap-analysis--current-vs-required)
3. [Locked Design Decisions](#locked-design-decisions)
4. [Open Questions / Assumptions Requiring Confirmation](#open-questions--assumptions-requiring-confirmation)
5. [Phase 0 — Module Contract](#phase-0--module-contract)
6. [Phase 1 — Permissions Migration](#phase-1--permissions-migration)
7. [Phase 2 — Schema Migration](#phase-2--schema-migration)
8. [Phase 3 — Backend: Self-Attendance Routes](#phase-3--backend-self-attendance-routes)
9. [Phase 4 — Backend: Attendance Review Routes](#phase-4--backend-attendance-review-routes)
10. [Phase 5 — Backend: Staff Profile Routes](#phase-5--backend-staff-profile-routes)
11. [Phase 6 — Backend: Shift Timing Setup Routes](#phase-6--backend-shift-timing-setup-routes)
12. [Phase 7 — Permissions Matrix UI](#phase-7--permissions-matrix-ui)
13. [Phase 8 — API Clients](#phase-8--api-clients)
14. [Phase 9 — Sidebar: Profile Module + Renamed Staff Menu](#phase-9--sidebar-profile-module--renamed-staff-menu)
15. [Phase 10 — Frontend: Self-Attendance Page](#phase-10--frontend-self-attendance-page)
16. [Phase 11 — Frontend: Attendance Review Page](#phase-11--frontend-attendance-review-page)
17. [Phase 12 — Frontend: Staff Profile Page](#phase-12--frontend-staff-profile-page)
18. [Phase 13 — Frontend: Shift Timing Setup Page](#phase-13--frontend-shift-timing-setup-page)
19. [Phase 14 — Regression + Guardrails](#phase-14--regression--guardrails)
20. [Phase 15 — Git Staging + Commit](#phase-15--git-staging--commit)
21. [Post-Launch Notes](#post-launch-notes)

---

## Background & Requirements Summary

The current system has a single **Staff** sidebar module (Admin/Chief Principal only) with two pages — **View Staff** and **Staff Attendance** — backed by one table, `staffattendance`, holding a single `attendance_status` field with no distinction between a teacher's self-report and an admin's official decision.

The new requirements split this into **three conceptually separate concerns**, each with its own permission surface and its own page:

1. **Self-Attendance** (new) — every non-Student role gets a **Profile** sidebar module; its first page lets the logged-in user mark **today only** as Available/Not Available, with optional remarks (if Not Available) and manual Arrival/Departure time entry, **submitted once per assigned shift** (a staff member working multiple shifts in a day submits one entry per shift, not one blended entry). Editable only until Admin/Chief Principal finalizes that specific shift's entry.
2. **Attendance Review** (renamed from *Staff Attendance*) — Admin/Chief Principal review each staff member's self-report (or see "Pending / Not Submitted" if none exists) and assign the **official** status: Present, Late, Absent, or Leave. A **Confirmed** column shows the finalized status itself, not just a boolean. Full edit/delete/remarks authority.
3. **Staff Profile** (renamed from *View Staff*) — staff-selection dropdown + "Get Profile" button, basic info header, tab structure (`Basic Information`, `Previous Attendance`, `Syllabus` placeholder), modeled directly on the existing Student Profile UI.

A supporting piece — **Shift/School Timing Setup** — is required so Admin/Chief Principal can configure expected arrival/departure per shift (e.g. Pehla Waqat, Doosra Waqat, Maghrib Ke Baad) in the Setup module, used as a reference during review (not an automatic Late determination).

All four surfaces (Staff, Staff Profile, Attendance Review, Self-Attendance) must plug into the existing DB-backed `role_permissions` system — no hardcoded role checks — with both frontend gating and backend enforcement. The Student role must never see the Profile module, at the frontend and backend level both.

---

## Gap Analysis — Current vs. Required

| Area | Current state (`staff.py`, `staff_attendance_model.py`, `.tsx` files) | Required state |
|---|---|---|
| Permission module key | Everything guarded by a single `require_permission("staff", ...)` | Must split into 4 module keys: `staff`, `staff_profile`, `attendance_review`, `self_attendance` |
| Data model | One table `staffattendance`: `staff_id`, `attendance_time_id`, `attendance_date`, `attendance_status` (single field, admin-set only, no self-report concept) | Needs self-report fields (availability, remarks, arrival/departure time, submitted_at) **and** finalization fields (final_status, admin remarks, finalized flag/by/at) — see [Phase 2](#phase-2--schema-migration) |
| Who can write | Only Admin/Chief Principal write via bulk endpoint; no self-service path for a teacher | Teacher must be able to create/update **only their own** record, only for today, only pre-finalization |
| Statuses available | `Present/Absent/Leave/Late/Unmarked` — same enum used everywhere | Self-Attendance: only `Available`/`Not Available`. Attendance Review final status: `Present/Late/Absent/Leave`. Two distinct vocabularies. |
| Pending/not-submitted handling | Rows default to `Unmarked` if no record | Review page must show **"Pending / Not Submitted"**, explicitly not implying Absent |
| Finalization / lock | No concept of finalized/locked record | Teacher must be blocked from editing once Admin/Chief Principal finalizes |
| Sidebar | `Staff` module: "View Staff", "Staff Attendance" (Admin/Chief Principal only); no `Profile` module for anyone | `Profile` module for every non-Student role (Self-Attendance page); `Staff` renamed to "Staff Profile" + "Attendance Review" |
| Staff Profile page | `ViewStaff.tsx` is a flat searchable table, no selection/tabs | Needs dropdown + "Get Profile" + basic-info header + tabbed sections (mirroring Student Profile) |
| Shift/timing config | `AttendanceTime` model exists (`attendance_time_id`, `attendance_time` name) with no arrival/departure time fields | Needs `expected_arrival_time` / `expected_departure_time` columns (or new table) editable from Setup |
| Frontend role gating | Hardcoded `["ADMIN", "CHIEF_PRINCIPAL"].includes(role)` checks inline in `.tsx` files | Must move to `require_permission`-driven dynamic permission checks, consistent with rest of app (per RBAC audit pattern already used for other modules) |

---

## Locked Design Decisions

| Decision | Value |
|---|---|
| Permission module keys | `staff` (kept, for any general staff-list/basic-CRUD use), `staff_profile`, `attendance_review`, `self_attendance` — four independent rows in `role_permissions`, each with `view`/`add`/`edit`/`delete` |
| Self-Attendance availability values | Exactly two: `AVAILABLE`, `NOT_AVAILABLE` — no Late/Absent at this stage |
| Final attendance status values (Attendance Review) | `PRESENT`, `LATE`, `ABSENT`, `LEAVE` — unrelated enum from self-attendance availability |
| Self-attendance is per **assigned shift**, not per day | Reversing the earlier "one record per day" decision. A staff member can be assigned to **one or more shifts** (many-to-many, via a new `staff_shift_assignment` junction table). Their daily self-attendance produces **one record per assigned shift per day** — a teacher working Pehla Waqat + Doosra Waqat submits two separate Available/Not-Available + arrival/departure entries for the same date, not one blended entry. Unique constraint restored to `(staff_id, attendance_date, attendance_time_id)`. Staff with exactly one assigned shift experience this as effectively "mark once a day" — the UI just shows a single card instead of a list. |
| Which shifts appear for a staff member | **Only their assigned shifts** — the self-attendance page never shows all school shifts to everyone. **Option B is locked:** a staff member with zero assigned shifts still gets one clearly labeled generic **"General / No Shift Assigned"** entry (`attendance_time_id = null`) so self-attendance never dead-ends. This fallback does not represent a school shift; it is an explicit temporary/general attendance record that remains visible to Admin/Chief Principal for review and later shift configuration. |
| Shift assignment is many-to-many, managed from Staff Profile | New table `staff_shift_assignment` (`staff_id` FK, `attendance_time_id` FK, unique on the pair). Admin/Chief Principal assign/remove a staff member's shifts from the **Staff Profile** page (not the staff-creation screen, and not the Shift Timing Setup screen) — this also gives the `staff_profile.edit` permission action real, exercised functionality (see revised Phase 5). |
| "Add/Finalize" permission action | The Attendance Review permission's `add` action governs the *finalize* operation (assigning final status where none existed); `edit` governs changing an already-finalized record. Matches the existing 4-action (`view/add/edit/delete`) shape — no 5th action introduced, same pattern as Debit module's "Clear Debit → edit" decision |
| Lock behavior | Teacher-facing self-attendance endpoints reject writes once `is_finalized = true` on that record, with a clean 400, not a 500 |
| Remarks visibility | Teacher's own remarks (`self_remarks`) are visible to Admin/Chief Principal in Attendance Review; Admin's remarks (`final_remarks`) are a separate column, not merged into the same field |
| Confirmed column semantics | Stores the actual finalized status string (`Present`/`Late`/`Absent`/`Leave`), not a boolean — `is_finalized` boolean stays as a separate internal field for lock logic |
| Staff Profile tabs (Phase 1 of this feature) | `Basic Information` (implemented), `Previous Attendance` (implemented — reads finalized records only), `Syllabus` (placeholder tab, disabled/"Coming soon", no backend yet) |
| Staff Profile permission scope (clarified) | All four actions (`view`/`add`/`edit`/`delete`) are seeded per Phase 1. **`view` and `edit` are both real, exercised routes** — `view` for reading the profile, `edit` for managing a staff member's assigned shifts (new, per the shift-assignment redesign below). `add`/`delete` remain reserved for future profile functionality (no route exists for either) and must never be read as implying profile creation/deletion exists. Phase 5 and Phase 14 both call this out explicitly. |
| Self-Attendance delete = locked business rule, not just a default | `self_attendance.delete` is seeded `False` for every role including ADMIN/CHIEF_PRINCIPAL, and this is enforced **in the router itself** (no `DELETE /self-attendance/*` route exists at all) — not merely left togglable via `ManageRolePermissions.tsx`. A teacher must never be able to erase their own attendance history, and this isn't meant to be flippable by a School Admin later without a deliberate code change. If a correction is needed, it goes through Admin/Chief Principal's Attendance Review edit path, which touches the same row. |
| `attendance_status` (legacy column) — single-source-of-truth rule | Kept as a column for one release per Phase 2, but **no new code path may read or write it after the migration lands** — not the self-attendance router, not the attendance-review router, not any frontend type. Its only purpose is a manual rollback reference (direct SQL inspection) if `final_status`/`is_finalized` back-fill needs to be double-checked. Grep the codebase for `attendance_status` as a final Phase 4 check to confirm zero live references outside the migration file itself. |
| Old bulk-attendance endpoint (`POST /staff/attendance`) removal timing | **Not removed in the same phase that ships the new Attendance Review routes.** Kept live and unchanged through Phase 4–13 so any not-yet-updated frontend build keeps working. Only removed in a dedicated follow-up step, after (a) the new Attendance Review page is confirmed working end-to-end on both tenants, and (b) both tenants' currently-deployed frontend bundles are confirmed to no longer call it (per the existing Phase 14 checklist item). See revised [Open Question #4](#open-questions--assumptions-requiring-confirmation). |
| Student Profile restriction | `Profile` sidebar module is omitted entirely for `STUDENT` role — both in `Sidebar.tsx` rendering and via `require_permission` returning 403 if a STUDENT token somehow calls a Profile-module endpoint (defense in depth; STUDENT rows in `role_permissions` for `self_attendance` seeded `False` across all actions) |
| Staff-to-shift assignment (revised — many-to-many, see above) | Superseded the earlier single-`assigned_attendance_time_id`-on-`TeacherNames` design. See the new "Self-attendance is per assigned shift" and "Shift assignment is many-to-many" rows above. |
| Shift timing storage | Extend existing `attendancetime` table with `expected_arrival_time: Optional[time]`, `expected_departure_time: Optional[time]` rather than a new table — reuses the existing shift-name concept (`Pehla Waqat`, etc.) instead of duplicating it |
| Late auto-suggestion | Backend may return a computed `is_likely_late: bool` hint on the Attendance Review row (arrival vs. shift's `expected_arrival_time`) but never auto-sets `final_status` — Admin/Chief Principal always makes the explicit choice, per requirement §5 |
| Route namespace | New router `router/profile_attendance.py` for self-attendance (teacher-facing), existing `router/staff.py` renamed in purpose to Attendance Review + Staff Profile endpoints (kept in one file, or split into `router/staff_profile.py` — see Phase 3/4/5 file layout) |

---

## Open Questions / Locked Assumptions

The remaining items below are implementation assumptions. Items explicitly marked **Resolved** or **Locked** are final decisions for this plan; they should not be reopened during implementation unless a new requirement is introduced.

1. **Per-shift self-attendance — Resolved.** Self-attendance is **per assigned shift per day**, not one record per day. A staff member can be assigned multiple shifts (many-to-many via `staff_shift_assignment`), and submits one Available/Not-Available + arrival/departure entry per assigned shift. This is a locked design decision.
2. **"Arrival/Departure time editable until finalized" vs. Attendance Review editing the same fields:** once Admin/Chief Principal finalizes, can they still see/edit the teacher's original arrival/departure time, or only their own final status + remarks? **Assumption:** Admin/Chief Principal can edit everything on the record (including the teacher's reported times) as part of "Edit attendance" authority in §4 of the Finalized Requirements doc — the lock only applies to the teacher's own edit path.
3. **Syllabus tab:** explicitly deferred/placeholder per Part 4 — no backend work planned in this plan; a disabled tab with "Coming soon" is Phase 12 scope only.
4. **Existing bulk-mark endpoint (`POST /staff/attendance` in current `staff.py`):** Used today by `StaffAttendance.tsx` for supervisor-driven bulk marking with the old 5-status enum. **Revised decision (was previously assumed removed in Phase 4):** the endpoint is **left live and untouched through Phase 4–13**, running in parallel with the new Attendance Review routes on the same underlying table. It is only deprecated/removed in a dedicated follow-up step once (a) the new Attendance Review page is confirmed working on both tenants, and (b) both tenants' currently-deployed frontend bundles are confirmed to no longer call it. This avoids a window where an un-updated frontend build breaks.
5. **Historical data migration:** existing rows in `staffattendance` have `attendance_status` values from the old 5-value enum (`Present/Absent/Leave/Late/Unmarked`), already representing admin-set finalized values, not self-reports. **Assumption:** Phase 2's migration maps existing `attendance_status` → new `final_status` + sets `is_finalized = true` on all pre-existing rows (self-report fields left null for historical rows, which is correct — no self-report existed for them).
6. **Where staff get their assigned shift set — Resolved.** Shift assignment is no longer a single field on the staff-creation form at all — it's a many-to-many relationship managed from the **Staff Profile** page (Admin/Chief Principal select a staff member, then add/remove one or more shifts for them). This sidesteps the earlier problem of not knowing which file creates `TeacherNames` rows, since the assignment UI now lives entirely in a screen this plan already builds (Phase 12).
7. **Shift-less staff fallback — Option B locked.** If a staff member has zero assigned shifts, **do not block self-attendance**. Show one clearly labeled **"General / No Shift Assigned"** card/entry. Store it with `attendance_time_id = null`. This is a valid temporary/general attendance record, but it is not associated with any school shift and therefore must not receive a late hint. Admin/Chief Principal can later assign one or more shifts from Staff Profile; future self-attendance will then use those assigned shifts. Existing shift-less historical records must remain untouched if assignments change.

---

## Phase 0 — Module Contract

Status: 🔜 Not started

Confirm before Phase 1 begins:
- [ ] The 4 module keys and their action semantics (table above)
- [ ] The two self-attendance values (`AVAILABLE` / `NOT_AVAILABLE`) and four final-status values (`PRESENT`/`LATE`/`ABSENT`/`LEAVE`)
- [ ] Sign off on the remaining implementation assumptions in the "Open Questions / Locked Assumptions" section; the per-shift model and Option B shift-less fallback are already locked decisions
- [ ] Confirm which roles besides ADMIN/CHIEF_PRINCIPAL should default to `self_attendance` = true (Teacher, Staff, Principal, Accountant, Fee Manager — i.e. every role except STUDENT) — likely all non-STUDENT roles, but confirm PRINCIPAL/ACCOUNTANT/FEE_MANAGER/STAFF explicitly
- [x] Multi-shift design locked: one self-attendance record per assigned shift per day, shifts managed many-to-many from Staff Profile
- [x] Option B locked: zero-shift staff receive one "General / No Shift Assigned" fallback entry instead of being blocked

---

## Phase 1 — Permissions Migration

Status: 🔜 Not started

**File:** `migrations/0006_add_staff_profile_attendance_permissions.py`

Seeds `role_permissions` for three **new** module keys (the existing `staff` module/rows are untouched):

| module | view | add | edit | delete |
|---|---|---|---|---|
| `self_attendance` | All non-STUDENT roles = `True` | All non-STUDENT roles = `True` (create today's record) | All non-STUDENT roles = `True` (update own, pre-finalization) | All roles = `False` (no self-delete; corrections go through Admin) |
| `attendance_review` | ADMIN, CHIEF_PRINCIPAL = `True`; all others `False` | ADMIN, CHIEF_PRINCIPAL = `True` (finalize) | ADMIN, CHIEF_PRINCIPAL = `True` | ADMIN, CHIEF_PRINCIPAL = `True` |
| `staff_profile` | ADMIN, CHIEF_PRINCIPAL = `True`; all others `False` | `False` for all (profile is a read/composite view, not a created entity) | ADMIN, CHIEF_PRINCIPAL = `True` (edit basic info if applicable) | `False` for all |

`STUDENT` role rows: explicitly seeded `False` across all actions for all three new modules — defense in depth alongside the frontend/sidebar restriction.

Idempotent — skips existing `(role, module, action)` rows, same pattern as `0004_add_debit_module_permissions.py`.

**Run:**
```powershell
uv run python -m migrations.run_all_tenants --dry-run --only 0006_add_staff_profile_attendance_permissions
uv run python -m migrations.run_all_tenants --only 0006_add_staff_profile_attendance_permissions --tenant mzbs_staging_school
uv run python -m migrations.run_all_tenants --only 0006_add_staff_profile_attendance_permissions --tenant mzbs
```

**End-of-day check:** query `role_permissions` for the 3 new module keys × 8 roles × 4 actions (96 rows), diff against the table above on both tenants.

---

## Phase 2 — Schema Migration

Status: 🔜 Not started

**File:** `schemas/staff_attendance_model.py` (extended in place — not a new file, to preserve existing imports/foreign keys)

**Add columns to `StaffAttendance`:**

| column | type | notes |
|---|---|---|
| `self_availability` | `Optional[str]`, nullable | `AVAILABLE` / `NOT_AVAILABLE`, null = not submitted |
| `self_remarks` | `Optional[str]`, nullable | teacher's own remarks, shown to Admin/Chief Principal |
| `arrival_time` | `Optional[time]`, nullable | teacher-entered |
| `departure_time` | `Optional[time]`, nullable | teacher-entered |
| `self_submitted_at` | `Optional[datetime]`, nullable | set on first self-submit |
| `final_status` | `Optional[str]`, nullable | `PRESENT`/`LATE`/`ABSENT`/`LEAVE` — replaces old `attendance_status` semantically |
| `final_remarks` | `Optional[str]`, nullable | Admin/Chief Principal's own remarks, separate from `self_remarks` |
| `is_finalized` | `bool`, default `False` | drives the teacher-side lock |
| `finalized_by` | `Optional[int]`, FK → `user.id`, nullable | audit |
| `finalized_at` | `Optional[datetime]`, nullable | audit |

**Constraint change:** the earlier plan dropped `attendance_time_id` from the uniqueness key; that is **reverted**. Restore/keep `UniqueConstraint("staff_id", "attendance_date", "attendance_time_id")` — a staff member can now legitimately have multiple rows for the same date (one per assigned shift). `attendance_time_id` becomes the field that identifies **which working period** a given row represents, not just an optional reference — nullable only for the shift-less fallback case (staff with zero assigned shifts, per Locked Design Decisions).

**Data migration step (same file, run once):**
```python
# For every existing row:
#   final_status = attendance_status  (mapped from old 5-value enum, "Unmarked" -> null)
#   is_finalized = True  (existing rows represent already-admin-set records)
#   self_* fields stay null (no self-report existed historically)
#   attendance_time_id stays whatever it already was (existing rows already carry it optionally; no backfill needed since old rows predate the shift-assignment concept)
```
Keep `attendance_status` column temporarily (deprecated, unused by new code) for one release cycle as a rollback safety net; drop in a follow-up migration once Phase 4 is confirmed stable — do not drop it in this same migration.

**New model, same file or a new `schemas/attendance_time_model.py` edit:**

Extend existing `AttendanceTime` model (Phase 6 dependency, listed here since it's the same schema-migration phase):

| column | type | notes |
|---|---|---|
| `expected_arrival_time` | `Optional[time]`, nullable | configurable shift start |
| `expected_departure_time` | `Optional[time]`, nullable | configurable shift end |

**New table — `staff_shift_assignment`** (new file `schemas/staff_shift_assignment_model.py`), replacing the earlier single-FK design per the revised many-to-many decision:

| column | type | notes |
|---|---|---|
| `id` | int, PK | |
| `staff_id` | int, FK → `teachernames.teacher_name_id`, indexed | |
| `attendance_time_id` | int, FK → `attendancetime.attendance_time_id`, indexed | |
| `assigned_by` | `Optional[int]`, FK → `user.id`, nullable | audit — which Admin/Chief Principal made the assignment |
| `created_at` | datetime | |

`UniqueConstraint("staff_id", "attendance_time_id")` — a staff member can't be assigned the same shift twice; multiple rows (one per shift) is exactly how "Pehla Waqat + Doosra Waqat" is represented.

**Migration file:** `migrations/0007_extend_staff_attendance_and_shift_timing.py` — `ALTER TABLE` additive-only for `staffattendance`/`attendancetime` columns, plus `CREATE TABLE IF NOT EXISTS staff_shift_assignment`. No destructive drops in this migration.

**Run:**
```powershell
uv run python -m migrations.run_all_tenants --dry-run --only 0007_extend_staff_attendance_and_shift_timing
uv run python -m migrations.run_all_tenants --only 0007_extend_staff_attendance_and_shift_timing --tenant mzbs_staging_school
```

**Verify:**
```powershell
uv run python -c "from sqlalchemy import inspect, create_engine; import setting; e=create_engine(str(setting.DATABASE_URL)); insp=inspect(e); cols=[c['name'] for c in insp.get_columns('staffattendance')]; print(sorted(cols)); print('staff_shift_assignment' in insp.get_table_names())"
```

Then apply to `mzbs` the same way once staging looks right, and confirm the data-migration step correctly back-filled `final_status`/`is_finalized` on pre-existing rows (spot-check a handful against the old `attendance_status` values).

---

## Phase 3 — Backend: Self-Attendance Routes

Status: 🔜 Not started

**New file:** `router/self_attendance.py` (kept separate from `staff.py` since the caller identity/authorization model is fundamentally different — "act on your own record" vs. "act on any staff record")

Routes, each guarded by `Depends(require_permission('self_attendance', '<action>'))`:

- `GET /self-attendance/today` — returns an **array**, one entry per shift assigned to the current user (via `staff_shift_assignment`), each showing that shift's name + today's submission state for it (or an empty/unsubmitted shape if not yet marked for that shift). If the user has **zero** assigned shifts, returns a single shift-less entry (`attendance_time_id: null`) so the page never dead-ends (`view`)
- `POST /self-attendance/today` — body includes `attendance_time_id` (must be one of the caller's assigned shifts, or `null` only if they have no assigned shifts at all — **reject 400 "Not an assigned shift" otherwise**); creates that shift's self-report for today; **reject with 400 if a record already exists for `(today, that shift)`** (use PATCH instead); **reject with 400 if `is_finalized`** on that shift's existing record (defensive) (`add`)
- `PATCH /self-attendance/today` — body includes `attendance_time_id` identifying which shift's entry to update (availability, remarks, arrival/departure time); **reject with 400 "Attendance already finalized and cannot be edited" if `is_finalized = true`** on that specific shift's record (`edit`)
- `GET /self-attendance/history` — the logged-in user's own **finalized** history only, across all their shifts, each row tagged with its shift name (`view`)

**Critical authorization rule enforced in every handler:** `staff_id` for all writes is derived **only** from `current_user.id` (resolved via the existing `teachernames`/`user` linkage already used elsewhere in the codebase) — never accepted as a request body field. This directly satisfies the "teacher can only create/update their own self-attendance" requirement; there is no `staff_id` parameter a caller could override.

**Date guard:** every write route computes "today" server-side (`date.today()`), never trusts a client-supplied date — satisfies "must not be able to select or create self-attendance for previous or future dates."

Register `self_attendance_router` in `main.py`.

---

## Phase 4 — Backend: Attendance Review Routes

Status: 🔜 Not started

**New routes alongside the existing file:** `router/staff.py` gains the new Attendance Review endpoints below. Per the revised Open Question #4, **the old `POST /staff/attendance` bulk endpoint and its 5-status enum are left running unchanged in this phase** — they are not touched, repurposed, or removed here. Removal is a separate, later step gated on confirming no live frontend build still calls it (see [Locked Design Decisions](#locked-design-decisions) and Phase 14).

Routes, each guarded by `Depends(require_permission('attendance_review', '<action>'))`:

- `GET /attendance-review/rows` — **one row per staff member per assigned shift** for a given date (a staff member with two assigned shifts produces two rows) — never one row per unassigned shift, and never all-shifts-for-all-staff. Each row: staff name, shift name, `self_availability`, `self_remarks`, `arrival_time`, `departure_time`, `final_status` (null → frontend renders **"Pending / Not Submitted"**, not Absent), `is_finalized`, `final_remarks`, plus computed `is_likely_late` hint (compares that row's `arrival_time` to that specific shift's `expected_arrival_time`; **`null` — not `false`** — if the row has no shift, i.e. the shift-less fallback case) (`view`)
- `POST /attendance-review/{staff_id}/finalize` — body includes `attendance_time_id` identifying which of the staff member's shift-rows for that date is being finalized; sets `final_status`, `final_remarks`, `is_finalized = true`, `finalized_by`, `finalized_at` on that specific row; **reject 400 if already finalized** (use edit route instead) (`add`)
- `PATCH /attendance-review/{staff_id}` — body includes `attendance_time_id` to identify the row; edits `final_status`, `final_remarks`, and — per Open Question #2's locked assumption — also `arrival_time`/`departure_time`/`self_availability` if Admin needs to correct a teacher's original entry, scoped to that one shift's row only (`edit`)
- `DELETE /attendance-review/{staff_id}` — body/query includes `attendance_time_id`; deletes that specific shift's row for the given staff+date, not all of that staff member's rows for the day (`delete`)
- `GET /attendance-review/history` — historical finalized records with staff/date/shift filters, for audit purposes (`view`)

**Validation:** `final_status` restricted to `PRESENT`/`LATE`/`ABSENT`/`LEAVE` — reject anything else with a clean 400, mirroring the existing `VALID_STATUSES` pattern in `staff.py` but with the new vocabulary.

---

## Phase 5 — Backend: Staff Profile Routes

Status: 🔜 Not started

**New file:** `router/staff_profile.py` (or extend `staff.py` — kept as new file to match the module-key split from Phase 1)

Routes, each guarded by `Depends(require_permission('staff_profile', '<action>'))`:

- `GET /staff-profile/list` — dropdown source: staff id + name only, for the "select a staff member" control (`view`)
- `GET /staff-profile/{staff_id}` — "Get Profile" response: basic info (name, joining date, total stay — reusing `_calculate_total_stay()` already in `staff.py`) + `assigned_shifts` (array of the staff member's current shift assignments, from `staff_shift_assignment`) + a `previous_attendance` array of **finalized-only** records (`is_finalized = true`), each tagged with its shift name, ordered most-recent-first (`view`)
- `PUT /staff-profile/{staff_id}/shifts` — **replaces** the staff member's full set of assigned shifts with the given list (simplest correct semantics for a multi-select "these are their shifts now" UI — diff-and-patch is unnecessary complexity here); writes to `staff_shift_assignment`, removing rows no longer in the list and adding new ones; `assigned_by` set to `current_user.id` on newly added rows (`edit`)

**`view` and `edit` are both real, exercised routes now** — `edit` didn't exist in the original draft of this plan (Staff Profile was read-only), but the revised many-to-many shift design gives it a genuine purpose: shift assignment. `add`/`delete` remain unbuilt/reserved (profile itself isn't a created/deletable entity) — Phase 14's regression checklist tests `staff_profile.view` and `.edit` against live routes, but not `.add`/`.delete`.

---

## Phase 6 — Backend: Shift Timing Setup Routes

Status: 🔜 Not started

**Edit existing file:** wherever `AttendanceTime` CRUD currently lives (`router/attendance_time.py` per the RBAC audit's file list) — extend, don't duplicate.

- Extend existing create/update payloads to accept `expected_arrival_time` / `expected_departure_time`.
- No new permission module needed — this rides on whatever existing `setup` (or equivalent) module/action already gates `AttendanceTime` CRUD today; confirm the exact current module key before wiring (likely `setup` per the RBAC audit's module list).

**End-of-day check:** create/edit a shift with both expected times set, confirm it round-trips via `GET`, confirm Attendance Review's `is_likely_late` hint (Phase 4) reflects a change to these values without a restart (cache-invalidation check, same pattern as other permission-cache work).

---

## Phase 7 — Permissions Matrix UI

Status: 🔜 Not started

**File:** `frontend/src/components/Setup/ManageRolePermissions.tsx`

Add three entries to `MODULE_GROUPS`:
```
{ key: "self_attendance", label: "Self-Attendance" }
{ key: "attendance_review", label: "Attendance Review" }
{ key: "staff_profile", label: "Staff Profile" }
```
Grey out / disable the `STUDENT` row for all three, consistent with existing STUDENT-row handling elsewhere in this component. Only enable after Phase 1's migration is confirmed applied on the tenant being viewed.

---

## Phase 8 — API Clients

Status: 🔜 Not started

**New files**, matching `SalaryAPI.ts`'s namespace/export style:

- `frontend/src/api/SelfAttendance/SelfAttendanceAPI.ts` — `getToday()` (returns array, one per assigned shift), `submitToday(payload)`, `updateToday(payload)`, `getHistory()`
- `frontend/src/api/AttendanceReview/AttendanceReviewAPI.ts` — `getRows(date)` (one row per staff-per-shift), `finalize(staffId, date, attendanceTimeId, payload)`, `updateRecord(staffId, date, attendanceTimeId, payload)`, `deleteRecord(staffId, date, attendanceTimeId)`, `getHistory(filters)`
- `frontend/src/api/StaffProfile/StaffProfileAPI.ts` — `getStaffList()`, `getProfile(staffId)`, `setShifts(staffId, shiftIds)`

**Edit existing:** `frontend/src/api/Staff/StaffAPI.ts` — remove/deprecate the old bulk-attendance calls per Phase 4's decision (only after confirming no other consumer needs them).

**Edit existing:** `frontend/src/api/AttendanceTime/attendanceTimeAPI.ts` — extend request/response types for the two new expected-time fields (Phase 6).

---

## Phase 9 — Sidebar: Profile Module + Renamed Staff Menu

Status: 🔜 Not started

**Files:** `frontend/src/components/dashboard/Sidebar.tsx`, `frontend/src/utils/rolePermissions.ts`

- **New top-level `Profile` menu item**, visible to every role **except `STUDENT`** (hardcoded role exclusion at the sidebar level, matching the explicit "Student must not have Profile" requirement — in addition to, not instead of, the permission-driven `self_attendance` gating on its submenu).
  - Submenu: **Self-Attendance** → `/dashboard/profile/self-attendance`
  - Structure the submenu array so future Profile pages can be appended without restructuring (per Part 3 §1's explicit forward-compatibility requirement).
- **Rename existing Staff menu entries:**
  - "View Staff" → **"Staff Profile"**, path stays or becomes `/dashboard/staff/profile` (confirm whether path itself changes or only the label — recommend keeping path stable to avoid breaking bookmarks unless the route is being restructured anyway per Phase 12)
  - "Staff Attendance" → **"Attendance Review"**, `/dashboard/staff/attendance-review`
- Add `SUBMENU_MODULE_MAP` entries:
  ```
  { match: "/profile/self-attendance", module: "self_attendance", action: "view" }
  { match: "/staff/profile", module: "staff_profile", action: "view" }
  { match: "/staff/attendance-review", module: "attendance_review", action: "view" }
  ```
  Without these, `canAccessSubmenuItemDynamic` falls through to its default-visible behavior — same pitfall already documented and avoided in the Debit module plan.

---

## Phase 10 — Frontend: Self-Attendance Page

Status: 🔜 Not started

**Files:** `frontend/src/app/dashboard/profile/self-attendance/page.tsx`, `frontend/src/components/Profile/SelfAttendance.tsx`

- Loads today's shift-entries via `SelfAttendanceAPI.getToday()` — an **array**, one card per assigned shift (e.g. a teacher with Pehla Waqat + Doosra Waqat sees two cards for today; a single-shift or shift-less staff member sees one). Each card is labeled with its shift name (or a generic "Today's Attendance" label if shift-less).
- Per card: today's date displayed prominently, current submission state clearly shown, per requirement "clearly communicate this is the teacher's own attendance record."
- Two-option control per card (not a 5-status checkbox grid like the old admin table): **Available** / **Not Available**, simple toggle/radio pattern.
- If **Not Available** selected on a card: reveal optional **Remarks** field for that shift.
- **Arrival Time** / **Departure Time** per card: use a lightweight time-picker (reuse whatever time-input pattern already exists in the codebase, e.g. from `AttendanceTime` setup forms) — must be quick, not cumbersome, per the Teacher Self-Attendance Enhancement doc §2. Multiple cards means multiple time-picker pairs, one per shift — keep each card visually self-contained so a two-shift day doesn't read as one confusing merged form.
- Submit button **per card** calls `submitToday({attendance_time_id, ...})` on first save for that shift, `updateToday({attendance_time_id, ...})` on subsequent edits (page detects which call to make per-card based on whether that shift's record already exists).
- **Locked-state UI, per card:** once a given shift's entry comes back `is_finalized = true`, disable that card's inputs only (other still-open shifts on the same day remain editable), show "Finalized by [Admin/Chief Principal] — no longer editable" on that card. Backend enforces this independently per-shift (Phase 3) — this is UX only, not the security boundary.
- Gate the whole page by `permissions.self_attendance.view`; gate submit controls by `permissions.self_attendance.add` / `.edit` as appropriate.

---

## Phase 11 — Frontend: Attendance Review Page

Status: 🔜 Not started

**Files:** `frontend/src/app/dashboard/staff/attendance-review/page.tsx`, refactor `StaffAttendance.tsx` in place (rename component to `AttendanceReview.tsx`) or create fresh under a `Staff/` component folder — recommend a fresh component given the data shape changes substantially (self-report columns + final-status columns coexist now, replacing the single 5-checkbox-per-row layout).

Table columns per the Finalized Requirements §4 example, **plus a Shift column** since a staff member can now appear on multiple rows for the same date (per Locked Design Decisions): Staff, Shift, Self-Attendance (`Available`/`Not Available`/**"Pending / Not Submitted"**), Arrival, Departure, Confirmed (shows the actual `final_status` string, styled with the existing status-badge pattern already in `StaffAttendance.tsx`), Remarks (both `self_remarks` and `final_remarks` visible, clearly labeled/separated), Action (View/Edit/Delete).

- Rows are grouped/sorted by staff name so a two-shift teacher's two rows sit adjacent, not scattered (e.g. Ahmed/Pehla Waqat directly above Ahmed/Doosra Waqat).
- Row-level action: assign/edit final status via a dropdown or modal (Present/Late/Absent/Leave) + remarks field, scoped to that one staff+shift row — replaces the old "Mark All" checkbox-grid bulk-marking UX, since finalization is now a deliberate per-staff-per-shift administrative decision, not a bulk daily checklist (confirm this UX shift is acceptable, or keep a "bulk-mark all Present" convenience action if the old workflow is still wanted for speed — flag this as a UX decision point, not silently dropped).
- Surface the `is_likely_late` hint (Phase 4/6) as a subtle visual cue (e.g. a small "Reported later than expected" tag) next to Arrival Time, computed against that row's specific shift — never auto-selects Late, per requirement §5.
- Gate Edit action by `permissions.attendance_review.edit`, Delete by `.delete`, initial finalize action by `.add`.
- Keep the existing date-picker control from the current page (`selectedDate`); the existing shift-select filter (`selectedTimingId`) becomes a genuine filter now (show only rows for one shift) rather than a semi-redundant control, since rows are already shift-labeled.

---

## Phase 12 — Frontend: Staff Profile Page

Status: 🔜 Not started

**Files:** `frontend/src/app/dashboard/staff/profile/page.tsx`, `frontend/src/components/Staff/StaffProfile.tsx` (replaces `ViewStaff.tsx`'s flat-table pattern)

- Staff-selection dropdown (`StaffProfileAPI.getStaffList()`) + **"Get Profile"** button — no profile shown until clicked, per Part 3 §7 workflow.
- On fetch, render **basic information header** (name, joining date, total stay) using the same visual treatment as the existing Student Profile header component — reuse that component/pattern directly rather than rebuilding it, per the explicit "use Student Profile as primary UI/UX reference" instruction.
- Tab structure below the header, mirroring Student Profile's tab component:
  - **Basic Information** — the same fields as the header, or additional staff metadata if any exists beyond name/joining-date. **Also includes the new "Assigned Shifts" control** (per the revised many-to-many shift design): a multi-select of available shifts (from `AttendanceTimeAPI`), pre-populated with `assigned_shifts` from `getProfile()`, saved via `StaffProfileAPI.setShifts(staffId, shiftIds)` → `PUT /staff-profile/{staff_id}/shifts`. Gate this control specifically by `permissions.staff_profile.edit`.
  - **Previous Attendance** — table of `previous_attendance` from `getProfile()`, finalized records only, columns: Date, **Shift**, Final Status, Arrival, Departure, Remarks
  - **Syllabus** — placeholder tab, visibly present but disabled/"Coming soon" per Locked Design Decision — no functionality, no backend call
- Gate the page by `permissions.staff_profile.view`.

---

## Phase 13 — Frontend: Shift Timing Setup Page

Status: 🔜 Not started

**File:** wherever the existing Shift/Attendance-Time setup page lives today (extend, don't duplicate) — add two time-input fields (`Expected Arrival Time`, `Expected Departure Time`) to the existing shift create/edit form.

This page manages **shift definitions only** (name + expected times). It does **not** assign shifts to staff — that's Staff Profile's job now (Phase 12), per the revised many-to-many design. Keeping these two concerns on separate screens matches how the school actually thinks about it: "what are our shifts" (Setup) vs. "who works which shift" (Staff Profile, per staff member).

- Reuse the same time-picker component chosen in Phase 10 for consistency.
- End-of-day check: edit an existing shift's expected times, confirm Attendance Review's `is_likely_late` hint (Phase 11) reflects the change without requiring a page-unrelated cache clear.
- End-of-day check: create a brand-new shift here, confirm it immediately appears as an assignable option in Staff Profile's "Assigned Shifts" multi-select (Phase 12) without a restart.

---

## Phase 14 — Regression + Guardrails

- [ ] Migration `0006` applied to **both** `mzbs` and `mzbs_staging_school`, confirmed via `role_permissions` row counts
- [ ] Migration `0007` applied to both, confirmed via column inspection + spot-checked historical-row backfill (`final_status`/`is_finalized`) + `staff_shift_assignment` table exists
- [ ] Log in as each of the 8 roles — `Profile` module visible for all except `STUDENT`; `Staff → Staff Profile` / `Attendance Review` visible only per seeded defaults
- [ ] Assign a staff member two shifts (e.g. Pehla Waqat + Doosra Waqat) from Staff Profile → their Self-Attendance page shows two separate cards for today
- [ ] Submit Available for shift 1, Not Available for shift 2, same day → both rows persist independently, neither overwrites the other
- [ ] Attendance Review for that date shows two distinct rows for that staff member, one per shift, correctly labeled
- [ ] Staff member with **zero** assigned shifts → Self-Attendance still shows one clearly labeled **"General / No Shift Assigned"** card, submits normally, and Attendance Review shows one shift-less row with no `is_likely_late` hint (`null`, not `false`)
- [ ] Remove one of a two-shift staff member's shifts via Staff Profile → their next day's Self-Attendance only shows the remaining shift's card; historical rows for the removed shift are untouched (only future self-attendance stops offering it)
- [ ] Teacher submits self-attendance for today (any shift) → appears correctly in Attendance Review as `Available`/`Not Available` (not auto-Present/Absent)
- [ ] Teacher who submits nothing for an assigned shift → that shift's Attendance Review row shows **"Pending / Not Submitted"**, not Absent
- [ ] Teacher attempts to submit/edit for a past or future date → rejected (date is always server-derived, never accepted from client)
- [ ] Teacher attempts to submit with an `attendance_time_id` that isn't one of their assigned shifts → rejected 400
- [ ] Teacher attempts to pass another `staff_id` in the self-attendance payload → ignored/rejected; only their own record is ever affected
- [ ] Admin/Chief Principal finalizes one shift's record for a two-shift-per-day staff member → only that shift locks; the other shift's record for the same day remains editable by the teacher
- [ ] Admin/Chief Principal edits an already-finalized record → succeeds (per Open Question #2's locked assumption)
- [ ] Delete a finalized shift-row → succeeds for ADMIN/CHIEF_PRINCIPAL only, 403 for all other roles at the API level (not just hidden in UI), and only removes that one shift's row, not the staff member's other shift-rows for the same day
- [ ] Direct API call as unauthorized role to any of the 3 new module's routes → 403 on all actions, independent of frontend hiding
- [ ] `STUDENT` role: confirmed 403 on `self_attendance`/`attendance_review`/`staff_profile` endpoints even if a request is crafted manually
- [ ] Toggle `self_attendance` off for e.g. FEE_MANAGER via `ManageRolePermissions.tsx` → Profile/Self-Attendance submenu disappears without backend restart
- [ ] Staff Profile → select a staff member → Get Profile → Previous Attendance tab matches Attendance Review's finalized history for that staff member exactly, including correct shift labels on multi-shift days
- [ ] Shift timing edit (expected arrival/departure) reflects in Attendance Review's late-hint without restart
- [ ] Newly created shift (Setup) immediately appears as an option in Staff Profile's shift multi-select without restart
- [ ] Grep the codebase for `attendance_status` after Phase 4 lands — confirm zero live reads/writes outside the Phase 2 migration file itself (legacy column, single-source-of-truth rule)
- [ ] Old bulk-attendance endpoint's removal (if confirmed per Open Question #4) does not break any other still-deployed frontend build — check both tenants' currently-live frontend bundles before removing, not just the branch being worked on

---

## Phase 15 — Git Staging + Commit

```powershell
git add migrations/0006_add_staff_profile_attendance_permissions.py migrations/0007_extend_staff_attendance_and_shift_timing.py
git add schemas/staff_attendance_model.py schemas/attendance_time_model.py schemas/staff_shift_assignment_model.py
git add router/self_attendance.py router/staff_profile.py router/staff.py router/attendance_time.py main.py
git add frontend/src/components/Setup/ManageRolePermissions.tsx
git add frontend/src/api/SelfAttendance/ frontend/src/api/AttendanceReview/ frontend/src/api/StaffProfile/ frontend/src/api/AttendanceTime/attendanceTimeAPI.ts frontend/src/api/Staff/StaffAPI.ts
git add frontend/src/components/dashboard/Sidebar.tsx frontend/src/utils/rolePermissions.ts
git add frontend/src/components/Profile/ frontend/src/components/Staff/
git add frontend/src/app/dashboard/profile/ frontend/src/app/dashboard/staff/
git status
git commit -m "Add Self-Attendance, Attendance Review, Staff Profile modules with dedicated permissions and shift-timing support"
```

---

## Post-Launch Notes

- Revisit the old `attendance_status` column drop (deferred in Phase 2) once Phase 4 has run stably in production for at least one full attendance cycle.
- The "bulk-mark all Present" convenience UX flagged as an open question in Phase 11 — resolve based on actual admin usage patterns before assuming it's no longer wanted.
- `Syllabus` tab (Phase 12) and any further Staff Profile tabs are explicitly out of scope here — this plan only builds the extensible structure per Part 4 §4.
- Once this ships, the RBAC audit's still-open follow-up item (TEACHER's Students submenu showing an add/edit control that always fails on submit) remains a separate, independent cleanup — not addressed by this plan.
