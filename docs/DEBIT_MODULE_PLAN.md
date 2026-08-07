# mzbs — Debit Module Implementation Plan

**Status tracker:** update this line as work progresses.
`Current phase: Phase 2 complete / Phase 3 in progress`

---

## Table of Contents

1. [Background & Requirements](#background--requirements)
2. [Locked Design Decisions](#locked-design-decisions)
3. [Phase 0 — Module Contract](#phase-0--module-contract)
4. [Phase 1 — Permissions Migration](#phase-1--permissions-migration)
5. [Phase 2 — Schema + Table Migration](#phase-2--schema--table-migration)
6. [Phase 3 — Backend Router](#phase-3--backend-router)
7. [Phase 4 — Permissions Matrix UI](#phase-4--permissions-matrix-ui)
8. [Phase 5 — API Client](#phase-5--api-client)
9. [Phase 6 — Sidebar Tab](#phase-6--sidebar-tab)
10. [Phase 7 — Manage Debit Page](#phase-7--manage-debit-page)
11. [Phase 8 — View Debit Page](#phase-8--view-debit-page)
12. [Phase 9 — Comparison Page](#phase-9--comparison-page)
13. [Phase 10 — Regression + Guardrails](#phase-10--regression--guardrails)
14. [Phase 11 — Git Staging + Commit](#phase-11--git-staging--commit)
15. [Open Questions / Deferred Decisions](#open-questions--deferred-decisions)

---

## Background & Requirements

The Debit module helps the institute track outstanding debts (money borrowed from a person), both active and cleared, with three pages:

1. **Manage Debit** — two collapsible sections: Add Debit, Clear Debit
2. **View Debit** — searchable/filterable table of all debit records
3. **Comparison** — financial summary cards + monthly chart

**Add Debit fields:** Person Name, Debit Date, Amount, Expected Return Date (optional), Payment Method (Cash/Online), Receipt No (optional text), Remarks.

**Clear Debit fields:** select an existing active/partially-cleared debit, Cleared Amount, Payment Date, Payment Method (Cash/Online), Receipt No (optional text), Remarks (optional). System auto-updates remaining balance and status.

**View Debit columns:** Person Name, Debit Date, Original Amount, Cleared Amount, Remaining Balance, Expected Return Date, Payment Method, Status (Active/Cleared/Partially Cleared), Remarks, Actions. Filters: date range, status, payment method, person name.

**Comparison cards:** Total Debit Taken, Total Debit Cleared, Total Outstanding Debit, Number of Active Debits, Number of Cleared Debits, plus monthly comparison chart.

---

## Locked Design Decisions

| Decision | Value |
|---|---|
| Module key (`role_permissions.module`) | `debit` |
| Tables | `debit` (borrowing record) + `debit_payment` (repayment/clearance record, FK → `debit.id`) |
| Status field | **Computed at read time**, not stored — `remaining_balance = amount - SUM(debit_payment.cleared_amount)`; status derived from that (`ACTIVE` / `PARTIALLY_CLEARED` / `CLEARED`) |
| ADMIN permissions | `view` / `add` / `edit` / `delete` — all `True` |
| ACCOUNTANT permissions | `view` / `add` / `edit` — `True`; `delete` — `False` |
| All other roles (CHIEF_PRINCIPAL, PRINCIPAL, TEACHER, STAFF, FEE_MANAGER, STUDENT) | No access — all `False` |
| "Clear Debit" action maps to permission action | `edit` (mutates existing debit's state) — no separate 5th action |
| `payment_method` | 2-value enum: `CASH`, `ONLINE` — same on both `debit` and `debit_payment` |
| `receipt_no` | Optional free-text field on **both** `debit` and `debit_payment` — references an existing document/receipt number, not system-generated |
| Sidebar placement | Nested as 3 submenu items **under the existing Expense menu item** (`id: 17`), not a new top-level tab |
| Sidebar paths | `/dashboard/expense/debit/manage`, `/dashboard/expense/debit/view`, `/dashboard/expense/debit/comparison` |
| Delete-with-payments behavior | FK has no `ON DELETE CASCADE` — deleting a `Debit` with existing `DebitPayment` rows will be blocked with a clean 400 in the router (Phase 3), not allowed to cascade-delete payment history |

**Known tradeoff (accepted, not a bug):** the parent "Expense" sidebar nav item's own visibility is gated by the `expenses` module (via `getMenuItemSection`), not `debit`. Since both ADMIN and ACCOUNTANT already have `expenses` access, this is a non-issue today — but a hypothetical future role with `debit` access but no `expenses` access would not see the Debit pages at all, since they're nested under a section they can't open. Revisit only if such a role is ever introduced.

---

## Phase 0 — Module Contract

Status: ✅ Complete (this document is the output)

Confirmed: module key, per-role defaults, entity fields, sidebar placement, `receipt_no` field, delete-blocking behavior.

---

## Phase 1 — Permissions Migration

Status: ✅ Complete — applied to both `mzbs_staging_school` and `mzbs`

**File:** `migrations/0004_add_debit_module_permissions.py`

Seeds `role_permissions` for module `debit`, actions `view`/`add`/`edit`/`delete`, per the `ROLE_DEFAULTS` table in [Locked Design Decisions](#locked-design-decisions). Idempotent — skips existing `(role, module, action)` rows.

**Run:**
```powershell
uv run python -m migrations.run_all_tenants --dry-run --only 0004_add_debit_module_permissions
uv run python -m migrations.run_all_tenants --only 0004_add_debit_module_permissions --tenant mzbs_staging_school
uv run python -m migrations.run_all_tenants --only 0004_add_debit_module_permissions --tenant mzbs
```

**Result:** 32 rows inserted per tenant (8 roles × 4 actions), verified via direct query on both `mzbs_staging_school` and `mzbs`.

**Side finding (unrelated to Debit, fixed along the way):** `migration_run_log` table didn't exist in the control-plane DB yet. Created via the one-off script `migrations/control_plane_migration_run_log_table.py`, invoked per its own docstring (not runnable directly — no `__main__` block):
```powershell
@'
from control_plane.db import get_control_plane_session
from migrations.control_plane_migration_run_log_table import upgrade

with get_control_plane_session() as s:
    upgrade(s)
print("migration_run_log table created.")
'@ | Set-Content -Encoding utf8 _tmp_create_log_table.py
uv run python _tmp_create_log_table.py
Remove-Item _tmp_create_log_table.py
```

---

## Phase 2 — Schema + Table Migration

Status: ✅ Files written — ⏳ **pending your run + verification against staging/prod**

**Files:**
- `schemas/debit_model.py` — `PaymentMethod` and `DebitStatus` enums; `Debit` + `DebitPayment` SQLModel tables; `DebitCreate`/`DebitUpdate`/`DebitResponse`/`DebitDetailResponse`; `DebitPaymentCreate`/`DebitPaymentResponse`; `DebitSummaryResponse` + `DebitMonthlyStat` for the Comparison page.
- `migrations/0005_add_debit_tables.py` — creates both tables via `SQLModel.metadata.create_all()`, FK-order-safe.

**Run:**
```powershell
uv run python -m migrations.run_all_tenants --dry-run --only 0005_add_debit_tables
uv run python -m migrations.run_all_tenants --only 0005_add_debit_tables --tenant mzbs_staging_school
```

**Verify:**
```powershell
uv run python -c "from sqlalchemy import inspect, create_engine; import setting; e=create_engine(str(setting.DATABASE_URL)); insp=inspect(e); print('debit' in insp.get_table_names(), 'debit_payment' in insp.get_table_names())"
```

Then apply to `mzbs` the same way once staging looks right.

---

## Phase 3 — Backend Router

Status: 🔜 Not started

**File:** `router/debit.py`

Routes, each guarded by `Depends(require_permission('debit', '<action>'))`:
- `POST /debit/` — create a debit (`add`)
- `GET /debit/all` — list with computed `cleared_amount`/`remaining_balance`/`status`; filters: `date_from`, `date_to`, `status`, `payment_method`, `person_name` (`view`)
- `GET /debit/{debit_id}` — single debit + its `DebitPayment` history → `DebitDetailResponse` (`view`)
- `PATCH /debit/{debit_id}` — edit base fields (`edit`)
- `DELETE /debit/{debit_id}` — delete; **reject with 400 if any `DebitPayment` rows exist** against it (`delete`)
- `POST /debit/{debit_id}/clear` — add a `DebitPayment`; reject if `cleared_amount` would push remaining balance below 0 (`edit`)
- `GET /debit/summary` — `DebitSummaryResponse` for the Comparison page (`view`)

Register `debit_router` in `main.py`.

---

## Phase 4 — Permissions Matrix UI

Status: 🔜 Not started

**File:** `frontend/src/components/Setup/ManageRolePermissions.tsx`

Add `{ key: "debit", label: "Debit" }` to the `MODULE_GROUPS` "Core" group (matches how `salary`/`fees`/`expenses` are listed today). Only do this after Phase 1's migration is confirmed applied on the tenant being viewed — otherwise ADMIN sees a togglable row that 403s.

---

## Phase 5 — API Client

Status: 🔜 Not started

**File:** `frontend/src/api/Debit/DebitAPI.ts`

Functions: `addDebit`, `getDebits(filters?)`, `getDebitById(id)`, `updateDebit(id, data)`, `deleteDebit(id)`, `clearDebit(debitId, data)`, `getDebitSummary()` — using `axiosInterceptorInstance`, matching `SalaryAPI.ts`'s namespace/export style.

---

## Phase 6 — Sidebar Tab

Status: 🔜 Not started

**Files:** `frontend/src/components/dashboard/Sidebar.tsx`, `frontend/src/utils/rolePermissions.ts`

- Add 3 submenu entries to the existing `Expense` menu item (`id: 17`)'s `submenu` array: Manage Debit → `/dashboard/expense/debit/manage`, View Debit → `/dashboard/expense/debit/view`, Comparison → `/dashboard/expense/debit/comparison`.
- Add 3 entries to `SUBMENU_MODULE_MAP` in `rolePermissions.ts`, each `{ match: "/expense/debit/...", module: "debit", action: "view" }` — without this, `canAccessSubmenuItemDynamic` falls through to its default (`true`, visible-if-parent-accessible), which would make the Debit submenu visible to anyone who can see Expense at all, regardless of their actual `debit` permission.
- No changes needed to `getMenuItemSection` — the parent Expense item's own gating via `expenses` module is an accepted tradeoff (see [Locked Design Decisions](#locked-design-decisions)).
- Add `"debit"` nowhere to the static `ROLE_PERMISSIONS`/`Section` fallback unless you want a hardcoded fallback for offline/failed-fetch cases — optional, low priority since dynamic permissions are the primary path.

---

## Phase 7 — Manage Debit Page

Status: 🔜 Not started

**Files:** `frontend/src/app/dashboard/expense/debit/manage/page.tsx`, `frontend/src/components/Debit/ManageDebit.tsx` (or split into `AddDebitPanel.tsx` + `ClearDebitPanel.tsx`)

Two collapsible sections, mirroring `ManageSalary.tsx`'s exact layout/behavior (rounded card, `ChevronDown`/`ChevronUp` toggle, `react-hook-form` per section):

1. **Add Debit** — Person Name, Debit Date, Amount, Expected Return Date (optional), Payment Method (select: Cash/Online), Receipt No (optional), Remarks. Calls `addDebit()`. Gate by `permissions.debit.add`.
2. **Clear Debit** — select from active/partially-cleared debits (`getDebits({status: 'ACTIVE,PARTIALLY_CLEARED'})`), show selected debit's current remaining balance, then Cleared Amount, Payment Date, Payment Method, Receipt No (optional), Remarks (optional). Calls `clearDebit()`. Gate by `permissions.debit.edit`.

---

## Phase 8 — View Debit Page

Status: 🔜 Not started

**Files:** `frontend/src/app/dashboard/expense/debit/view/page.tsx`, `frontend/src/components/Debit/DebitTable.tsx`

Searchable/filterable table: Person Name, Debit Date, Original Amount, Cleared Amount, Remaining Balance, Expected Return Date, Payment Method, Status (badge), Remarks, Actions (Edit gated by `permissions.debit.edit`, Delete gated by `permissions.debit.delete`). Filters: date range, status, payment method, person name.

---

## Phase 9 — Comparison Page

Status: 🔜 Not started

**File:** `frontend/src/app/dashboard/expense/debit/comparison/page.tsx`

Summary cards from `getDebitSummary()`: Total Debit Taken, Total Debit Cleared, Total Outstanding Debit, Active count, Cleared count. Monthly bar/line chart (reuse whatever charting lib is already in the project) comparing debit taken vs. cleared per month. Gate the page by `permissions.debit.view`.

---

## Phase 10 — Regression + Guardrails

- [ ] Migration applied to **both** `mzbs` and `mzbs_staging_school`, confirmed via `migration_run_log`
- [ ] Log in as ADMIN, ACCOUNTANT, and 2 other roles — sidebar visibility matches defaults
- [ ] Add debit → appears in View Debit with status `ACTIVE`
- [ ] Partial clear → status updates to `PARTIALLY_CLEARED`, remaining balance correct
- [ ] Full clear → status updates to `CLEARED`
- [ ] Attempt to clear more than remaining balance → rejected with clean error, not a 500
- [ ] Attempt to delete a debit with existing payments → rejected with clean 400
- [ ] Direct API call as unauthorized role → 403 on all 4 actions, independent of frontend hiding
- [ ] ACCOUNTANT cannot delete a debit (frontend button hidden AND backend 403 on direct call)
- [ ] Toggle `debit` permission off for ACCOUNTANT via `ManageRolePermissions.tsx` → sidebar tab disappears without backend restart
- [ ] Comparison page totals match manual sum of View Debit table

---

## Phase 11 — Git Staging + Commit

```powershell
git add migrations/0004_add_debit_module_permissions.py migrations/0005_add_debit_tables.py
git add schemas/debit_model.py router/debit.py main.py
git add frontend/src/components/Setup/ManageRolePermissions.tsx
git add frontend/src/api/Debit/DebitAPI.ts
git add frontend/src/components/dashboard/Sidebar.tsx frontend/src/utils/rolePermissions.ts
git add frontend/src/components/Debit/
git add frontend/src/app/dashboard/expense/debit/
git status
git commit -m "Add Debit module: permissions, backend CRUD, Manage/View/Comparison pages under Expense"
```

---

## Open Questions / Deferred Decisions

- **`migration_run_log` fix** — was this a one-off gap, or does it suggest earlier fan-out migrations (0001–0003) also ran without audit logging? Worth a quick check of the table's row count vs. how many migrations have actually been run historically.
- **Cascade vs. block on delete** — currently locked as "block delete if payments exist" (Phase 2 decision). If a use case emerges for admins needing to void a debit entirely including its payment history, revisit as a soft-delete pattern instead of hard delete.
