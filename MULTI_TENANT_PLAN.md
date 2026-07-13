# mzbs — Multi-Tenant Platform Migration Plan

**Status tracker:** update this line as work progresses.
`Current stage: Not started / Phase 0 / Phase 1 / Phase 2 / Phase 3 / Phase 4 / Phase 5 / Merged to main`

---

## Table of Contents

1. [Background & Context](#background--context)
2. [Prior Work Completed — RBAC Audit](#prior-work-completed--rbac-audit)
3. [Architecture Decisions Log](#architecture-decisions-log)
4. [Phase 0 — Branch & Environment Setup](#phase-0--branch--environment-setup)
5. [Phase 1 — Self-Service Permissions Screen](#phase-1--self-service-permissions-screen)
6. [Phase 2 — Control Plane Database](#phase-2--control-plane-database)
7. [Phase 3 — Tenant-Aware Login Flow + get_session() Rework](#phase-3--tenant-aware-login-flow--get_session-rework)
8. [Phase 4 — Migrations Across Many Databases](#phase-4--migrations-across-many-databases)
9. [Phase 5 — Super-Admin Panel](#phase-5--super-admin-panel)
10. [Merge & Production Cutover Checklist](#merge--production-cutover-checklist)
11. [Post-Launch Notes](#post-launch-notes)

---

## Background & Context

**Project:** `mzbs` — a school management application (FastAPI + SQLModel backend, Next.js/TypeScript frontend, Neon Postgres database).

**Original setup:** Single school. Frontend deployed on Netlify. Backend hosted separately. One Neon Postgres database, one fixed set of hardcoded roles and permissions in code.

**Roles in the system:** `ADMIN`, `CHIEF_PRINCIPAL`, `PRINCIPAL`, `TEACHER`, `STAFF`, `ACCOUNTANT`, `FEE_MANAGER`, `STUDENT` — stored as a native Postgres enum (`userrole`), requiring explicit SQL migrations for any role changes.

**Modules:** Students, Attendance, Exam, Staff, Fees, Income, Expenses, Salary, Setup.

**The goal driving this plan:** Convert `mzbs` into a multi-tenant platform serving roughly 10-50 schools, where:
- Each school gets its own Neon Postgres database (full data isolation)
- Each school gets its own frontend deployment (Netlify/Vercel)
- One shared FastAPI backend serves all schools
- Each school's own ADMIN can self-service adjust role permissions for their specific staffing situation (e.g., one school has an Accountant handling fees+salary only; another has no Accountant so Fee Manager needs broader reach)
- The platform owner gets a Super-Admin view across all affiliated schools

**Why school-level permission control, not platform-level:** Different schools run different staffing setups. The school's own ADMIN has the operational visibility to make these calls; the platform owner does not, and would become a bottleneck across dozens of schools if every tweak routed through them. Since each school has its own isolated database, one school's permission changes cannot affect another school's data by construction.

**Where the platform owner's control does still apply:** Defining the fixed list of roles and the fixed list of module/action combinations that exist at all (via code). School Admins can only toggle within that predefined space — they cannot invent new roles or new permission types.

---

## Prior Work Completed — RBAC Audit

This was completed on the current single-school setup, before the multi-tenant work began. It establishes the current-state permission baseline everything else builds on.

### Files reviewed
`rolePermissions.ts`, `Sidebar.tsx`, `ProtectedRoute.tsx`, `RoleContext.tsx`, `user_crud.py`, `fee.py`, `salary.py`, `income.py`, `expense.py`, `class_names.py`, `exam_marks.py`, `staff.py`, `student_portal_auth.py`, `students.py`, `dashboard.py`, `attendance_time.py`, `attendance_value.py`, `mark_attendance.py`.

### Backend dependency helpers found in `user_crud.py`
```python
def require_roles(allowed_roles: List[UserRole]): ...
def require_admin(): return require_roles([UserRole.ADMIN])
def require_admin_principal(): return require_roles([UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL])
def require_admin_teacher_principal(): return require_roles([UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.STAFF])
def require_admin_teacher_principal_accountant(): return require_roles([...+ UserRole.ACCOUNTANT])
def require_admin_accountant(): return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT])
def require_admin_fee_manager(): return require_roles([UserRole.ADMIN, UserRole.FEE_MANAGER])
def require_admin_accountant_fee_manager(): return require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FEE_MANAGER])
def require_non_student(): # blocks only UserRole.STUDENT
def require_all_roles(): # all 8 roles
def require_authenticated(): # any logged-in user
```

### Issues found and resolved

| # | Issue | Resolution |
|---|---|---|
| 1 | Students module — initially suspected TEACHER/STAFF/FEE_MANAGER would 403 | **False alarm.** `students.py` splits reads (`get_current_user` + manual STUDENT-only block, open to all other roles) from writes (`require_admin_principal()`). No mismatch. |
| 2 | Staff module backend more permissive than frontend | **Fixed.** Added `require_admin_chief_principal()` (ADMIN, CHIEF_PRINCIPAL only) to `user_crud.py`; swapped into every route in `staff.py`, replacing `require_admin_teacher_principal_accountant()`. |
| 3 | Exam module backend more permissive than frontend (STAFF could access) | **Fixed.** Added `require_admin_principal_teacher()` (ADMIN, CHIEF_PRINCIPAL, PRINCIPAL, TEACHER — excludes STAFF) to `user_crud.py`; swapped into every route in `exam_marks.py`, replacing `require_admin_teacher_principal()`. |
| 4 | Fees — dead code in `canAccessSubmenuItem()` referencing principal-level view-only access that could never trigger, because `ROLE_PERMISSIONS` never granted those roles the `"fees"` section | **Fixed.** Added `"fees"` to `CHIEF_PRINCIPAL` and `PRINCIPAL` section lists in `rolePermissions.ts`; kept the existing block on `/fees/add_fees` for those roles (view-only, consistent with original intent). |
| 5 | Income/Expense — routers import `require_admin_accountant_fee_manager` | **No live bug.** Confirmed the import is unused in both `income.py` and `expense.py` — every route actually uses `require_admin_accountant()` or `require_admin()`. FEE_MANAGER has no backend access, consistent with frontend. Dead import, harmless. |
| 6 | **Critical security gap:** `reset_attendance_id` in `attendance_value.py` guarded only by `require_authenticated()` — any logged-in user, including STUDENT, could wipe the entire `attendancevalue` table via raw SQL string execution | **Fixed.** Swapped to `require_admin()`. Replaced `session.exec("DELETE FROM attendancevalue")` with `session.exec(delete(AttendanceValue))` using the proper SQLModel delete construct. |
| 6b | Attendance — no teacher-to-own-class scoping in `mark_attendance.py` | **Confirmed intentional** — this is required in the current setup, not a bug. No change made. |
| 7 | Dead `Section` values (`"classes"`, `"attendance_time"`) in `rolePermissions.ts` never produced by `Sidebar.tsx`'s path-to-section mapping | **Fixed.** Removed from `Section` type and all role permission lists. |

### Follow-up item still open from the audit
TEACHER's Students submenu shows "All Students" with no explicit UI block on add/edit actions, while the backend rejects non-admin/principal writes. Worth confirming whether `StudentTable.tsx` / `AddNewStudent.tsx` actually hide those controls for TEACHER, or whether a teacher could see a button that always fails on submit.

---

## Architecture Decisions Log

Decisions made during planning, in the order they were settled:

1. **Database-per-tenant, not shared-DB-with-tenant_id.** Each school gets its own full Neon Postgres database. Chosen for strong data isolation, simpler compliance/export/deletion per school, and because it naturally isolates permission customization per school without needing tenant-scoping logic in a shared permissions table.
2. **Expected scale: dozens of schools (10-50).** Informs that manual onboarding is acceptable for now, but migrations must be scripted (can't be done by hand at this scale).
3. **Tenant identification mechanism: build-time `TENANT_ID` env var per frontend deployment,** sent explicitly on login; NOT subdomain/Origin-header based. Each school's frontend (deployed separately on Netlify/Vercel, potentially under the school's own hosting account) has one env var baked in at deploy time.
4. **Manual onboarding is fine for now** (create Neon DB, run migrations, deploy frontend with env var, add control-plane row, by hand) — no automated self-serve onboarding panel yet. Revisit automation once past ~50-100 schools.
5. **A Super-Admin panel is required** — the platform owner needs to see all affiliated schools and their information, separate from any school's own ADMIN role.
6. **Permission configuration belongs to the school's own ADMIN, not the platform Super-Admin.** Super-Admin controls only the fixed universe of possible roles/module-actions (via code); School Admin toggles within that universe (via a DB-backed table + UI, built in Phase 1).
7. **Repo strategy:** the Super-Admin/platform-admin **frontend** gets its own new repository (kept entirely separate so no platform-admin code ever ships in a school's deployed bundle). The platform-admin **backend** logic stays inside the existing `mzbs` backend repo, as a self-contained `control_plane/` module — split out into its own service only if a concrete future reason arises (independent scaling, team/compliance boundary).
8. **Platform-admin frontend hosting:** same Netlify/Vercel account as school sites (simplest operationally), but named unambiguously (e.g. `mzbs-platform-admin`) so it's never confused with a school in a project list of 30+ sites. Dashboard-level access to this specific project should be restricted separately from school-site access once teammates are involved.
9. **Migration tooling approach: lightweight custom runner, not Alembic** (for now). Chosen because the existing script-based migration pattern already works and dozens of schools are being onboarded soon — not the moment to also absorb a new tooling learning curve. Alembic migration is a reasonable future step if the team grows.
10. **All multi-tenant work happens on a dedicated git branch** (`multi-tenant-platform`), with fully separate staging database(s), backend deployment, and frontend deployment — never touching the live school's production environment until an explicit, checklist-driven merge/cutover.

---

## Phase 0 — Branch & Environment Setup

**Goal:** Create a fully isolated space to build Phases 1-5 in — separate branch, separate database(s), separate backend deployment, separate frontend deployment — so the live school on `main` is never at risk during development.

### Day 1 — Branch creation + repo hygiene

```bash
git checkout main
git pull origin main
git checkout -b multi-tenant-platform
git push -u origin multi-tenant-platform
```

- Enable branch protection on `main` (require PR review before merge, even solo).
- Add a warning banner to `README.md` on this branch:
  ```markdown
  > ⚠️ This branch (`multi-tenant-platform`) is under active development for
  > multi-tenant support. Do not deploy this branch's backend against the
  > production Neon database. See `docs/MULTI_TENANT_PLAN.md` for status.
  ```
- Create `docs/MULTI_TENANT_PLAN.md` — this file should live in the repo (paste this entire document there), with a running checklist of current phase/day at the top, so the plan is the actual source of truth for anyone (including another AI agent) working on this.

**End-of-day check:** confirm `main`'s deployed backend/frontend are completely unaffected by the new branch existing.

### Day 2 — Staging Neon database(s)

- Create a new Neon project: `mzbs-staging-school` — empty, schema built fresh via existing schema-creation process (not copied from production data).
- Seed with test data only: one user per role (all 8), a handful of fake students, fee categories in Urdu (matching real convention, e.g. "ماہانہ فیس"), a class or two — enough to exercise every module.
- Create a **second** staging Neon project: `mzbs-staging-school-2`, seeded similarly. Two tenants are required to meaningfully test tenant isolation later (Phase 3).

**End-of-day check:** connect to both staging databases directly, confirm schema and seed data independently.

### Day 3 — Separate backend deployment for the branch

- Stand up a second backend deployment (Render/Railway/etc.), deployed from `multi-tenant-platform` branch specifically.
- Environment variables for this deployment (fully separate from production):
  ```
  DATABASE_URL=<mzbs-staging-school connection string>
  CONTROL_PLANE_DATABASE_URL=<mzbs-staging-control-plane connection string>
  CONTROL_PLANE_ENCRYPTION_KEY=<freshly generated staging-only key>
  ```
- Also create `mzbs-staging-control-plane` — a new Neon project following Phase 2's schema — where both staging tenants get registered.
- Name the deployed service unambiguously: `mzbs-backend-staging`.

**End-of-day check:** hit the staging backend's health endpoint, confirm logs show it connecting to staging resources. Intentionally trigger an error, confirm the stack trace references the staging host, not production.

### Day 4 — Separate frontend deployment for the branch

- Create a new Netlify/Vercel site: `mzbs-frontend-staging`, deployed from `multi-tenant-platform`.
- Environment variables:
  ```
  NEXT_PUBLIC_API_URL=<staging backend URL from Day 3>
  NEXT_PUBLIC_TENANT_ID=mzbs_staging_school   (introduced properly in Phase 3)
  ```
- Configure branch-based auto-deploy: this site auto-deploys only from `multi-tenant-platform`; production site continues auto-deploying only from `main`.

**End-of-day check:** log into staging frontend with a seeded test user, confirm (via browser dev tools network tab) it talks only to the staging backend URL.

### Day 5 — Full environment map, sanity pass, go/no-go

Create `docs/ENVIRONMENTS.md`:

| | Production (main) | Staging (multi-tenant-platform branch) |
|---|---|---|
| Backend | `<existing prod URL>` | `mzbs-backend-staging` |
| Frontend | `<existing prod URL>` | `mzbs-frontend-staging` |
| School DB | `<existing prod Neon>` | `mzbs-staging-school` + `mzbs-staging-school-2` |
| Control plane | *(doesn't exist yet)* | `mzbs-staging-control-plane` |
| Encryption key | *(doesn't exist yet)* | staging-only key, distinct from future production key |

**Phase 0 sanity checklist:**
- [ ] Production branch/backend/frontend/database completely unaffected — verified by actually using the live app
- [ ] Staging branch pushed, branch protection active on `main`
- [ ] Two staging school databases exist, schema matches production, each seeded with one test user per role
- [ ] Staging backend deployed from branch, confirmed pointed only at staging resources
- [ ] Staging frontend deployed from branch, confirmed pointed only at staging backend
- [ ] `docs/MULTI_TENANT_PLAN.md` and `docs/ENVIRONMENTS.md` committed to the branch
- [ ] Personally logged into staging frontend as ADMIN and at least one non-admin test user, confirmed normal end-to-end behavior before any Phase 1 changes begin

---

## Phase 1 — Self-Service Permissions Screen

**Goal:** Replace hardcoded `require_*()` backend functions and the hardcoded `ROLE_PERMISSIONS` frontend object with a database-backed permissions table a School Admin can edit — with zero behavior change on day one (seeded to match current hardcoded rules exactly). Built and tested against `mzbs-staging-school` per Phase 0.

### Day 1 — Schema design + migration

**New table:** `role_permissions`

| column | type | notes |
|---|---|---|
| id | int, PK | |
| role | enum (UserRole) | reuses existing `userrole` enum |
| module | varchar | students, attendance, exam, staff, fees, income, expenses, salary, setup |
| action | varchar | view, add, edit, delete |
| allowed | boolean | |
| updated_by | FK → users.id, nullable | audit |
| updated_at | timestamp | |

**New table:** `permission_change_log`

| column | type |
|---|---|
| id | int, PK |
| role | enum |
| module | varchar |
| action | varchar |
| old_value | boolean |
| new_value | boolean |
| changed_by | FK → users.id |
| changed_at | timestamp |

**Files to create:**
- `schemas/role_permission_model.py` — `RolePermission`, `RolePermissionCreate`, `RolePermissionResponse`, `PermissionChangeLog` SQLModel classes
- Migration script (e.g. `add_role_permissions_tables.py`, following existing pattern like `add_effective_till_column.py`)

**Seed data** — translate current hardcoded rules exactly:
- From `ROLE_PERMISSIONS` in `rolePermissions.ts` → seeds `view` per role/module
- From each router's current `require_*()` dependency → seeds `add`/`edit`/`delete` per role/module (e.g. `fee.py`'s `create_fee` using `require_admin_accountant_fee_manager()` → ADMIN/ACCOUNTANT/FEE_MANAGER = true for `fees.add`, all others false)

**End-of-day check:** query seeded table, manually diff against the full role/module matrix from the RBAC audit — must match exactly.

### Day 2 — Backend: generic permission dependency + caching

**Edit `user/user_crud.py`:**
```python
def has_permission(role: UserRole, module: str, action: str, session: Session) -> bool:
    cache_key = f"perm:{role}:{module}:{action}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    row = session.exec(
        select(RolePermission).where(
            RolePermission.role == role,
            RolePermission.module == module,
            RolePermission.action == action,
        )
    ).first()
    result = bool(row and row.allowed)
    cache_set(cache_key, result)
    return result

def require_permission(module: str, action: str):
    def checker(
        current_user: Annotated[User, Depends(get_current_user)],
        session: Session = Depends(get_session),
    ):
        if not has_permission(current_user.role, module, action, session):
            raise HTTPException(status_code=403, detail=f"Not permitted: {module}.{action}")
        return current_user
    return checker
```
(Reuses existing `utils/cache.py` pattern already used in `class_names.py`.)

**New file `router/permissions.py`:**
- `GET /permissions` — full matrix, ADMIN-only
- `PATCH /permissions/{role}/{module}/{action}` — toggle one cell, ADMIN-only, writes `role_permissions` + `permission_change_log`, calls `cache_invalidate(...)`
- `GET /permissions/me` — current user's resolved permissions, for sidebar rendering

**Register** `permissions_router` in `main.py`.

**Do not touch existing routers yet** — mechanism only, today.

**End-of-day check:** `GET /permissions` as ADMIN matches Day 1 seed data exactly; as non-ADMIN returns 403.

### Day 3 — Wire the new dependency into existing routers

One file at a time, testing after each:
1. `salary.py`
2. `income.py`, `expense.py`
3. `fee.py` (including the `create_fee` route)
4. `staff.py`, `exam_marks.py` (should reproduce the RBAC-audit fixes exactly)
5. `students.py`, `class_names.py`, attendance files (mixed patterns, need individual attention)

**Key check after each file:** re-run RBAC-audit curl tests (STAFF against `/staff/...` and `/exam_marks/...` → 403; TEACHER against attendance → success). Must reproduce current state exactly — stop and investigate on any deviation before continuing.

### Day 4 — Frontend: Setup screen + sidebar integration

**New files:**
- `frontend/src/api/Permissions/PermissionsAPI.ts` — `getPermissions()`, `updatePermission(role, module, action, allowed)`, `getMyPermissions()`
- `frontend/src/components/Setup/ManageRolePermissions.tsx` — matrix UI (roles × module-actions), STUDENT row disabled, ADMIN's own access to this screen disabled from self-removal
- `frontend/src/app/dashboard/setup/role_permissions/page.tsx`

**Edit `Sidebar.tsx`** — add submenu item under Setup: Role Permissions.

**Edit `RoleContext.tsx`** — call `getMyPermissions()` after login, store alongside `role`.

**Edit `rolePermissions.ts`** — `canAccessSection()`/`canAccessSubmenuItem()` check fetched permissions first; keep `ROLE_PERMISSIONS` as fallback only if the fetch fails.

**End-of-day check:** log in as each of 8 roles, sidebar renders identically to before this phase started.

### Day 5 — Guardrails, audit log, full regression

**Guardrails:**
- Backend rejects any change that would remove ADMIN's own access to the permissions screen (hardcoded exception, not configurable)
- Backend rejects any attempt to modify STUDENT's permissions
- Frontend grays out the STUDENT row and the ADMIN-setup-access cell to match

**Testing checklist:**
- [ ] Full 8-role × 9-module regression matches pre-Phase-1 audit exactly
- [ ] Toggle one permission via UI takes effect without backend restart (tests cache invalidation)
- [ ] `permission_change_log` records the change correctly
- [ ] Direct API attempt to revoke ADMIN's own setup access → rejected
- [ ] Direct API attempt to modify STUDENT permissions → rejected

---

## Phase 2 — Control Plane Database

**Goal:** Stand up the directory database that lets the backend know which school it's talking to, plus a platform-admin identity above all schools. No school's frontend/login changes yet.

### Day 1 — Provision + schema design

- New, separate Neon project (e.g. `mzbs-control-plane` for production; already have `mzbs-staging-control-plane` for the branch per Phase 0).

**`tenants` table:**

| column | type | notes |
|---|---|---|
| id | int, PK | |
| tenant_id | varchar, unique | slug used in frontend env var |
| school_name | varchar | |
| contact_email | varchar | |
| frontend_url | varchar | |
| db_connection_secret | text | **encrypted**, never plaintext |
| status | enum: active/suspended/provisioning | |
| created_at / updated_at | timestamp | |

**`platform_admins` table:**

| column | type |
|---|---|
| id | int, PK |
| email | varchar, unique |
| hashed_password | varchar |
| full_name | varchar |
| created_at | timestamp |
| last_login_at | timestamp, nullable |

Deliberately excludes anything school-specific (roles, students, permissions) — this DB only knows which schools exist and who can manage the platform.

**Files:** `control_plane/db.py` (separate `get_control_plane_session()`, new `CONTROL_PLANE_DATABASE_URL` env var), `control_plane/models.py` (`Tenant`, `PlatformAdmin`), migration script for both tables.

**End-of-day check:** confirm this project is fully separate from every school's project — separate dashboards, separate connection strings.

### Day 2 — Encrypting the connection secret

**New file `control_plane/crypto.py`:**
```python
from cryptography.fernet import Fernet
import os

_key = os.environ["CONTROL_PLANE_ENCRYPTION_KEY"]
_fernet = Fernet(_key.encode())

def encrypt_connection_string(raw: str) -> str:
    return _fernet.encrypt(raw.encode()).decode()

def decrypt_connection_string(encrypted: str) -> str:
    return _fernet.decrypt(encrypted.encode()).decode()
```

Generate the key once, manually, store only as an environment variable:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Never commit it, log it, or store it in the control-plane DB itself.

**End-of-day check:** encrypt/restart-process/decrypt round-trip test. Grep codebase for any logging near tenant-lookup code that could leak the decrypted string.

### Day 3 — Backend: tenant CRUD + platform-admin auth

**New file `control_plane/tenant_service.py`:** `create_tenant()`, `get_tenant_by_id()`, `list_tenants()`, `update_tenant_status()`.

**New file `control_plane/platform_admin_auth.py`:** `authenticate_platform_admin()`, `get_current_platform_admin()` — using a JWT with a **distinct signing key or scope** from school-user tokens, so a school ADMIN's token can never be mistaken for a platform-admin token.

**New router `control_plane/router.py`:** `POST /platform-admin/login`, `GET /platform-admin/tenants`, `POST /platform-admin/tenants`, `PATCH /platform-admin/tenants/{tenant_id}/status` — all gated by `get_current_platform_admin`. Registered in `main.py` under `/platform-admin/*`.

**End-of-day check:** create one platform-admin account manually (direct insert, no public form). Log in, confirm token issued, confirm that token is rejected by existing school-facing endpoints (e.g. `/students/all`).

### Day 4 — Tenant lookup function (what Phase 3 depends on)

**New file `control_plane/tenant_lookup.py`:**
```python
_tenant_cache: dict[str, tuple[str, str]] = {}
_cache_lock = threading.Lock()

def lookup_tenant_connection(tenant_id: str) -> str:
    with _cache_lock:
        if tenant_id in _tenant_cache:
            conn_str, status = _tenant_cache[tenant_id]
        else:
            with get_control_plane_session() as session:
                tenant = get_tenant_by_id(session, tenant_id)
            if not tenant:
                raise HTTPException(status_code=404, detail="Unknown school")
            conn_str = decrypt_connection_string(tenant.db_connection_secret)
            status = tenant.status
            _tenant_cache[tenant_id] = (conn_str, status)

    if status != "active":
        raise HTTPException(status_code=403, detail="School account is not active")

    return conn_str
```

Fails closed: unknown tenant → 404, not a default. Non-active → 403, checked on every call.

**Update `update_tenant_status()`** to clear the cache entry on status change:
```python
_tenant_cache.pop(tenant_id, None)
```

**End-of-day checks:**
- [ ] Real tenant_id → correct connection string
- [ ] Nonexistent tenant_id → 404, no crash
- [ ] Suspend via endpoint → immediate 403, no restart needed
- [ ] Reactivate → works again
- [ ] 20 concurrent calls for a brand-new tenant_id → no crash, no corrupted cache entry

### Day 5 — Seed current school + full review

- Insert the live school into `tenants` (production control plane, later) / staging tenants (branch, now) with real (or staging) connection strings.

**Phase 2 review checklist:**
- [ ] Control-plane project fully separate from every school project
- [ ] Encryption key only in env vars, absent from any committed file/log/DB
- [ ] `db_connection_secret` column confirmed encrypted via direct inspection
- [ ] Platform-admin and school-user tokens cryptographically distinct, tested both directions
- [ ] `lookup_tenant_connection()` fails closed on all tested bad-input cases
- [ ] Suspend/reactivate takes effect without restart
- [ ] One platform-admin account exists, created manually
- [ ] Live/staging school represented as `tenants` row #1

---

## Phase 3 — Tenant-Aware Login Flow + get_session() Rework

**Goal:** Replace the single hardcoded DB connection with dynamic per-request routing based on `tenant_id`. Highest-risk phase — touches the auth path every request goes through.

### Day 1 — Resolve the chicken-and-egg problem (design only)

**Problem:** `get_session()` needs `tenant_id` to pick a database. `get_current_user()` needs a database session to look up the user. Circular.

**Resolution — split into steps:**
1. Decode the JWT with **no database access** (`get_token_payload()`) — token now carries `user_id`, `role`, `tenant_id`.
2. Use `tenant_id` from the decoded payload to resolve which database to connect to (`get_session()`, reworked).
3. Only then fetch the full `User` row if needed, from the now-resolved session.

Document this ordering (comment block in `user_crud.py`) before writing code.

### Day 2 — Rework the dependency chain

**Edit `user/user_crud.py`:**
```python
class TokenPayload(BaseModel):
    user_id: int
    role: UserRole
    tenant_id: str

def get_token_payload(token: Annotated[str, Depends(get_token_from_cookie_or_header)]) -> TokenPayload:
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(user_id=decoded["user_id"], role=decoded["role"], tenant_id=decoded["tenant_id"])
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

**Edit `db.py`:**
```python
from control_plane.tenant_lookup import lookup_tenant_connection

_tenant_engines: dict[str, Engine] = {}
_engine_lock = threading.Lock()

def get_session(payload: Annotated[TokenPayload, Depends(get_token_payload)]):
    tenant_id = payload.tenant_id
    with _engine_lock:
        if tenant_id not in _tenant_engines:
            conn_str = lookup_tenant_connection(tenant_id)
            _tenant_engines[tenant_id] = create_engine(conn_str)
        engine = _tenant_engines[tenant_id]
    with Session(engine) as session:
        yield session
```

**Important:** keep the function named `get_session` (don't rename to e.g. `get_tenant_session`) — every existing router already calls `Depends(get_session)`, so keeping the name means **zero router files need editing.**

**Update `get_current_user()`:**
```python
def get_current_user(
    payload: Annotated[TokenPayload, Depends(get_token_payload)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

**End-of-day check:** import `user_crud` in a plain Python shell, confirm no circular import errors, before touching any router.

### Day 3 — Confirm routers untouched + cache eviction

**Verification, not a code change:** grep `router/` for `Depends(get_session)`, confirm every hit still compiles unchanged.

**Add cache eviction:**
```python
_tenant_engine_last_used: dict[str, datetime] = {}

def evict_idle_tenant_engines(max_idle_hours: int = 6):
    cutoff = datetime.utcnow() - timedelta(hours=max_idle_hours)
    with _engine_lock:
        idle = [t for t, last in _tenant_engine_last_used.items() if last < cutoff]
        for tenant_id in idle:
            _tenant_engines.pop(tenant_id, None)
            _tenant_engine_last_used.pop(tenant_id, None)
```

**End-of-day check:** fresh backend start, hit any endpoint, confirm it still works end-to-end against the current single tenant with zero frontend changes yet.

### Day 4 — Login endpoint + frontend wiring

**Login endpoint (likely `user_router.py`):**
```python
@auth_router.post("/login")
def login(credentials: LoginRequest, session: Session = Depends(get_control_plane_lookup_session)):
    tenant_id = credentials.tenant_id or DEFAULT_TENANT_ID

    conn_str = lookup_tenant_connection(tenant_id)
    with Session(create_engine(conn_str)) as tenant_session:
        user = authenticate_user(tenant_session, credentials.username, credentials.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"user_id": user.id, "role": user.role, "tenant_id": tenant_id})
    return {"access_token": token, "role": user.role}
```

**`DEFAULT_TENANT_ID`** = the existing live school's tenant_id — this fallback means the backend behaves exactly as today if `tenant_id` is missing from the request, making the backend deploy safe to ship *before* the frontend deploy.

**Frontend — `frontend/src/api/Login/Login.ts`:**
```typescript
const response = await axiosInstance.post("/auth/login", {
  username,
  password,
  tenant_id: process.env.NEXT_PUBLIC_TENANT_ID,
});
```

**`.env` / hosting env config:**
```
NEXT_PUBLIC_TENANT_ID=your_school_slug
```

**End-of-day check:** deploy backend alone first (old frontend, no `tenant_id` sent) → confirm login works via fallback. Then deploy frontend → confirm login works, now explicitly sending `tenant_id`. Two separate, separately-verifiable deploys.

### Day 5 — Adversarial testing + cutover confirmation

**New file `tests/test_tenant_isolation.py`:**
- Tampered token test: change `tenant_id` in a decoded token without re-signing → expect 401
- Missing/malformed claim test: no `tenant_id`, empty string, nonexistent slug → expect clean 401/404, never a 500
- Concurrent cross-tenant test: simultaneous requests as two different tenants against the same endpoint, looped ~20 times → confirm no data crossover
- Cold-start test: restart backend (clears engine cache), confirm correct tenant resolves on the very first request
- Suspended tenant test: suspend a tenant while a still-valid old token exists → confirm rejection without backend restart

**Full cutover checklist:**
- [ ] Backend deployed with fallback, confirmed working against old frontend
- [ ] Frontend deployed with `tenant_id` wired in, confirmed working
- [ ] All 5 adversarial tests pass
- [ ] Idle-engine eviction confirmed (manually shrink `max_idle_hours`, confirm eviction)
- [ ] Full 8-role × all-modules regression re-run end-to-end through the new tenant-routed path

---

## Phase 4 — Migrations Across Many Databases

**Goal:** Turn manual one-off migration scripts into a system that can safely fan out a schema change across dozens of tenant databases, track what's applied where, and handle partial failures gracefully.

### Day 1 — Decide the approach

**Option A:** Adopt Alembic properly — standard, but requires converting existing scripts first, bigger shift.
**Option B (recommended):** Lightweight custom runner around the existing script pattern — add a tracking table + a fan-out loop. Chosen because dozens of schools are being onboarded soon; not the moment to also absorb new tooling. Migrating to Alembic later remains a reasonable future step; nothing here is wasted if that happens (the tracking-table concept carries over).

### Day 2 — Migration folder + per-tenant tracking table

**New folder `migrations/`:**
```
migrations/
  0001_add_role_permissions_tables.py
  0002_add_permission_change_log.py
  0003_add_effective_till_column.py
```

Each file exposes:
```python
MIGRATION_ID = "0001_add_role_permissions_tables"

def upgrade(session: Session):
    session.exec(text("CREATE TABLE IF NOT EXISTS role_permissions (...)"))
    session.commit()
```

**New table, created inside every tenant's own database:** `schema_migrations`

| column | type |
|---|---|
| id | int, PK |
| migration_id | varchar, unique |
| applied_at | timestamp |

**New file `migrations/runner_core.py`:**
```python
def ensure_migrations_table(session: Session): ...
def get_applied_migrations(session: Session) -> set[str]: ...
def apply_migration(session: Session, module) -> None:
    module.upgrade(session)
    session.exec(text("INSERT INTO schema_migrations (migration_id) VALUES (:mid)"), {"mid": module.MIGRATION_ID})
    session.commit()
```

**End-of-day check:** run manually against one tenant. Confirm one row in `schema_migrations`. Run again by hand — confirm no re-application.

### Day 3 — The fan-out runner

**New file `migrations/run_all_tenants.py`:**
```python
def discover_migrations():
    files = sorted(Path("migrations").glob("[0-9]*.py"))
    return [importlib.import_module(f"migrations.{f.stem}") for f in files]

def run_for_tenant(tenant_id, conn_str, all_migrations) -> dict:
    result = {"tenant_id": tenant_id, "applied": [], "skipped": [], "failed": None}
    engine = create_engine(conn_str)
    try:
        with Session(engine) as session:
            ensure_migrations_table(session)
            applied = get_applied_migrations(session)
            for module in all_migrations:
                if module.MIGRATION_ID in applied:
                    result["skipped"].append(module.MIGRATION_ID)
                    continue
                apply_migration(session, module)
                result["applied"].append(module.MIGRATION_ID)
    except Exception as e:
        result["failed"] = str(e)
    return result

def main():
    all_migrations = discover_migrations()
    with get_control_plane_session() as cp_session:
        tenants = list_tenants(cp_session)
    for tenant in tenants:
        if tenant.status != "active":
            continue
        conn_str = lookup_tenant_connection(tenant.tenant_id)
        result = run_for_tenant(tenant.tenant_id, conn_str, all_migrations)
        print(f"[{result['tenant_id']}] applied={result['applied']} failed={result['failed']}")
```

**Key design point:** one tenant's failure doesn't stop the loop for others.

**End-of-day check:** run against one live tenant — confirm applied. Run again — confirm skipped (idempotency).

### Day 4 — Partial-failure handling, dry-run, staging tenant

**Dry-run mode:**
```python
def main(dry_run: bool = False):
    ...
    if dry_run:
        # print pending migrations per tenant, apply nothing
```
Always run `--dry-run` before a real run.

**Dedicated staging/test tenant** (this is `mzbs-staging-school` from Phase 0) — every new migration is run here first, manually, before any fan-out run against real schools.

**`--only` flag for risky, multi-phase migrations** (e.g. the three-phase enum migration pattern — `ADD VALUE` → data `UPDATE` → type recreation):
```python
def main(dry_run: bool = False, only: str | None = None):
    all_migrations = discover_migrations()
    if only:
        all_migrations = [m for m in all_migrations if m.MIGRATION_ID == only]
```
Run each phase as a deliberate, separate, checked step across all tenants — not all three phases back-to-back per tenant with no checkpoint.

**End-of-day check:** write one throwaway migration, dry-run it, run for real against only the staging tenant via `--only`, confirm correct scope.

### Day 5 — Logging, alerting, runbook

**New control-plane table:** `migration_run_log`

| column | type |
|---|---|
| id | int, PK |
| migration_id | varchar |
| tenant_id | varchar |
| status | enum: applied/skipped/failed |
| error_detail | text, nullable |
| run_at | timestamp |

Write one row per tenant per migration, every run.

**New file `migrations/RUNBOOK.md`:**
1. Test against staging tenant first, always
2. Dry-run across all real tenants before a real run
3. Use `--only` for risky/multi-phase migrations, check tenant health between phases
4. After a real run, check `migration_run_log` for `failed` rows — investigate before re-running blindly
5. Never delete an already-applied migration file — `schema_migrations` references it by ID; new school onboarding needs the full historical sequence

**Phase 4 checklist:**
- [ ] Dry-run mode tested and accurate
- [ ] Staging tenant used for every new migration before real rollout
- [ ] `--only` flag tested for isolating one migration
- [ ] `migration_run_log` populated correctly across a real run
- [ ] Runbook written, readable by someone else covering for you
- [ ] Re-running fan-out twice in a row produces zero duplicate applications, at scale

---

## Phase 5 — Super-Admin Panel

**Goal:** Build the actual screen — platform-admin login, list of all affiliated schools and their info, basic lifecycle actions (create tenant, suspend/reactivate). New, separate repo per the decisions log; same Netlify/Vercel account as school sites, unambiguously named.

### Day 1 — New repo scaffolding + login screen

**New repo:** `mzbs-platform-admin` (Next.js + TypeScript, much smaller than the school app — no per-role sidebar complexity).

```
mzbs-platform-admin/
  src/
    app/
      login/page.tsx
      dashboard/
        page.tsx                 (tenant list)
        [tenant_id]/page.tsx      (tenant detail)
        new/page.tsx              (create tenant form)
      layout.tsx
    api/PlatformAdminAPI.ts
    context/PlatformAdminContext.tsx
    components/ProtectedPlatformRoute.tsx
```

**`src/api/PlatformAdminAPI.ts`:**
```typescript
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_BACKEND_URL });

export async function login(email: string, password: string) {
  const res = await api.post("/platform-admin/login", { email, password });
  return res.data;
}

export async function getTenants(token: string) {
  const res = await api.get("/platform-admin/tenants", { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}
```

**End-of-day check:** log in with the platform-admin account from Phase 2, confirm token issued, confirm rejected against any school-facing endpoint.

### Day 2 — Backend: response shaping + validation

**Edit `control_plane/router.py`:**
```python
@platform_router.get("/tenants", response_model=list[TenantResponse])
def list_all_tenants(admin=Depends(get_current_platform_admin), session=Depends(get_control_plane_session)):
    return list_tenants(session)

@platform_router.post("/tenants", response_model=TenantResponse, status_code=201)
def create_new_tenant(payload: TenantCreate, admin=Depends(get_current_platform_admin), session=Depends(get_control_plane_session)):
    existing = get_tenant_by_id(session, payload.tenant_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"tenant_id '{payload.tenant_id}' already exists")
    return create_tenant(session, payload.tenant_id, payload.school_name, payload.contact_email, payload.frontend_url, payload.raw_connection_string)
```

**`TenantResponse` deliberately excludes `db_connection_secret` entirely** — no legitimate reason for it to leave the backend after creation:
```python
class TenantResponse(BaseModel):
    tenant_id: str
    school_name: str
    contact_email: str
    frontend_url: str
    status: str
    created_at: datetime
```

**End-of-day check:** call `GET /platform-admin/tenants` directly, confirm response never contains the connection secret in any form.

### Day 3 — Tenant list dashboard

**`src/app/dashboard/page.tsx`** — fetches and renders a table: school name, status, contact, joined date, link to detail view. `ProtectedPlatformRoute.tsx` guards it, same pattern as the school app's `ProtectedRoute.tsx` but checking for a platform-admin token specifically.

**End-of-day check:** confirm seeded tenant(s) render correctly.

### Day 4 — Tenant detail + create form + status toggle

**`src/app/dashboard/new/page.tsx`** — form collecting `tenant_id`, `school_name`, `contact_email`, `frontend_url`, raw Neon connection string. This is the one moment the plaintext connection string is ever typed anywhere — goes over HTTPS, gets encrypted server-side, never displayed again.

**`src/app/dashboard/[tenant_id]/page.tsx`** — detail view + status toggle:
```typescript
async function toggleStatus(tenant_id: string, newStatus: string, token: string) {
  await api.patch(`/platform-admin/tenants/${tenant_id}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
}
```

**Note on scope:** this MVP shows control-plane metadata only (name, contact, status, join date) — not live per-school counts (e.g. student totals), since that would require live queries into each school's own database on-demand. Treat as a separate future enhancement once the base version is live and specific useful metrics are identified.

**End-of-day check:** create a throwaway test tenant, confirm it appears, toggle to suspended, confirm a login attempt against it now fails (cross-check with Phase 3's adversarial test).

### Day 5 — Guardrails, deployment, final review

**Guardrails:**
- No public signup form in this app, ever — platform-admin accounts created manually only
- Confirmation dialog before suspending a tenant
- Log (and consider rate-limiting) every `/platform-admin/login` attempt — high-value target

**Deployment:**
- New Netlify/Vercel project, same account, named `mzbs-platform-admin`
- `NEXT_PUBLIC_BACKEND_URL` set to shared backend
- No `NEXT_PUBLIC_TENANT_ID` here at all — this app has no single-tenant concept, which is what distinguishes it from every school frontend

**Phase 5 checklist:**
- [ ] Platform-admin login works; token rejection verified both directions (platform token on school routes, school token on platform routes)
- [ ] Tenant list renders correctly with real data
- [ ] Create-tenant form works; connection string never re-displayed after creation
- [ ] Status toggle works immediately, no restart needed
- [ ] `db_connection_secret` confirmed absent from every network response this app receives (check browser dev tools directly)
- [ ] Deployed to its own clearly-named project, separate from every school site

---

## Merge & Production Cutover Checklist

Once Phases 1-5 are built and fully tested against the staging environment from Phase 0:

1. **Merge the code to `main`, but don't cut the live school over yet.** Deploy with `DEFAULT_TENANT_ID` (Phase 3, Day 4) still pointed at the existing live school — behavior stays unchanged even with the new routing machinery live.
2. **Create the real production control-plane database** (Phase 2's schema, for real this time — separate from `mzbs-staging-control-plane`).
3. **Insert the live school into the production control plane** as `tenants` row #1, using its real connection string (encrypted per Phase 2).
4. **Deploy the frontend change last**, with the real `NEXT_PUBLIC_TENANT_ID` set — this is the actual cutover moment.
5. **Run the full Phase 3, Day 5 regression** (all adversarial tests + the 8-role matrix) against production, not just staging, before considering this done.
6. **Keep the `DEFAULT_TENANT_ID` fallback in code for a while post-cutover** — cheap insurance if production behaves differently than staging did.
7. **Onboard school #2 only after the live school has run stably on the new routing for a week or two** — this is the first genuine multi-tenant proof, not just the plan.

**A note on tooling during this whole process:** if using a separate AI coding agent for verification, confirm it's checked out on the correct branch (staging vs. `main`) before trusting any "verified against source" finding — a mismatch here produces confidently wrong answers about what's actually been changed.

---

## Post-Launch Notes

- The follow-up item from the RBAC audit (TEACHER's Students UI potentially showing an add/edit control that always fails on submit) is still open and worth a quick look independent of this plan.
- Once past ~50-100 schools, revisit: (a) automating tenant onboarding (Phase 2/3's mechanisms already support this — a form on top, not a rearchitect), (b) migrating the Phase 4 runner to Alembic if the team grows, (c) an idle-engine eviction tuning pass based on real usage patterns.
- `get_session()` (Phase 3) remains the single most security-critical function in the codebase going forward — any future change to it deserves the same adversarial-testing rigor as Phase 3, Day 5, not just a normal code review.
