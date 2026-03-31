# Dashboard auth fix — apply checklist

## Backend  (`dashboard_router.py`)

### 1. Copy the file
Replace your existing dashboard router with `dashboard_router.py`.
Adjust the three import lines at the top to match your project paths:

```python
from ..dependencies import get_db             # wherever your DB dep lives
from ..auth.dependencies import get_current_user  # your JWT dep
from ..models.user import User                # your User model
```

If your project already uses these imports in another router (e.g. students),
copy the exact same lines from there.

### 2. Verify the router is registered
In your `main.py` (or wherever you `include_router`), check the dashboard
router is included — it should already be. No change needed here.

### 3. Remove /graph-test in production
The `/dashboard/graph-test` endpoint returns raw HTML and has no real use
outside development. The new file has it commented out. Delete it entirely
from your CRUD layer too.

### 4. Optional — add role-based restrictions
The file includes commented-out examples for restricting specific endpoints
to certain roles (e.g. income/expense to ACCOUNTANT/ADMIN only).
Uncomment and adapt to your access requirements.

---

## Frontend  (`dashboardAPI.ts`)

### 1. Copy the file
Replace `src/api/Dashboard/dashboardAPI.ts` with the new file.
The key change: every function now calls `axiosInstance` (your authenticated
interceptor instance) instead of plain `axios` or a public client.

### 2. Verify axiosInterceptorInstance path
The import at the top is:
```ts
import axiosInstance from "../axiosInterceptorInstance";
```
This assumes `dashboardAPI.ts` is one level deep inside `src/api/Dashboard/`.
If your interceptor file is at a different relative path, update the import.

### 3. Update callers if function names changed
If your existing dashboard components call functions by a different name,
update those calls. The functions in the new file are:

| Function                   | Endpoint                         |
|----------------------------|----------------------------------|
| getUserRoleSummary()       | GET /dashboard/user-roles        |
| getAttendanceSummary()     | GET /dashboard/attendance-summary|
| getStudentSummary(date?)   | GET /dashboard/student-summary   |
| getIncomeSummary(y?, m?)   | GET /dashboard/income-summary    |
| getExpenseSummary(y?, m?)  | GET /dashboard/expense-summary   |
| getTotalStudents()         | GET /dashboard/total-students    |
| getUnmarkedStudents(date?) | GET /dashboard/unmarked-students |
| getIncomeExpenseSummary(y?)| GET /dashboard/income-expense-summary |
| getFeeSummary(y?)          | GET /dashboard/fee-summary       |

### 4. Test the auth flow end-to-end
1. Log in → confirm token is stored in your interceptor
2. Navigate to the dashboard → network tab should show
   `Authorization: Bearer <token>` on every `/dashboard/*` request
3. Clear the token (log out) and try to access `/dashboard/user-roles`
   directly → backend should return `401 Unauthorized`

---

## Second issue fixed at the same time: bulk attendance

While you're in the backend, also fix this in your attendance router:

```python
# attendance_router.py  — find add_bulk_attendance and add the dependency

@router.post("/add_bulk_attendance/")
def add_bulk_attendance(
    payload: BulkAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),   # ← ADD THIS
):
    ...
```

This is the second unauthenticated endpoint found in the analysis.
