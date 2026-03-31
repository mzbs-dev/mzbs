from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# ─────────────────────────────────────────────────────────────────────────────
# Import your project's existing auth dependency and DB session exactly as you
# use them in every other router (e.g. students, fees, attendance, etc.).
# Adjust the import paths to match your project structure.
# ─────────────────────────────────────────────────────────────────────────────
from ..dependencies import get_db                   # your DB session dep
from ..auth.dependencies import get_current_user    # your JWT bearer dep
from ..models.user import User                      # your User model
from ..schemas.dashboard import (                   # your existing schemas
    LoginGraphData,
    AttendanceGraphData,
    StudentGraphData,
    CategoryGraphData,
)
from ..crud import dashboard as crud                # your existing CRUD layer

# ─────────────────────────────────────────────────────────────────────────────
# THE KEY CHANGE: add dependencies=[Depends(get_current_user)] to the router.
# This single line secures every endpoint in this file automatically —
# no need to touch each function signature individually.
# ─────────────────────────────────────────────────────────────────────────────
router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)],   # ← ADD THIS
)


# ── User role distribution ────────────────────────────────────────────────────
@router.get("/user-roles", response_model=LoginGraphData)
def get_user_role_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),   # ← gives you the user
):
    """
    Fetch user role distribution summary.
    Now requires a valid Bearer token.
    Optional: restrict to ADMIN / PRINCIPAL only:

        if current_user.role not in ("ADMIN", "PRINCIPAL"):
            raise HTTPException(status_code=403, detail="Not authorised")
    """
    return crud.get_user_role_summary(db)


# ── Attendance summary ────────────────────────────────────────────────────────
@router.get("/attendance-summary", response_model=AttendanceGraphData)
def get_attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Today's attendance summary with graph data. Requires auth."""
    return crud.get_attendance_summary(db)


# ── Student summary ───────────────────────────────────────────────────────────
@router.get("/student-summary", response_model=StudentGraphData)
def get_student_summary(
    date: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Present / absent / late / sick / leave counts. Requires auth."""
    return crud.get_student_summary(db, date=date)


# ── Income summary ────────────────────────────────────────────────────────────
@router.get("/income-summary", response_model=CategoryGraphData)
def get_income_summary(
    year: int = 2026,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Income by category for a given month / year. Requires auth.
    Optional: restrict to financial roles:

        FINANCIAL_ROLES = ("ADMIN", "ACCOUNTANT", "PRINCIPAL")
        if current_user.role not in FINANCIAL_ROLES:
            raise HTTPException(status_code=403, detail="Not authorised")
    """
    return crud.get_income_summary(db, year=year, month=month)


# ── Expense summary ───────────────────────────────────────────────────────────
@router.get("/expense-summary", response_model=CategoryGraphData)
def get_expense_summary(
    year: int = 2026,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Expense by category. Requires auth."""
    return crud.get_expense_summary(db, year=year, month=month)


# ── Total students ────────────────────────────────────────────────────────────
@router.get("/total-students", response_model=int)
def get_total_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Total student count. Requires auth."""
    return crud.get_total_students(db)


# ── Unmarked students ─────────────────────────────────────────────────────────
@router.get("/unmarked-students", response_model=list[int])
def get_unmarked_students(
    date: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Student IDs without attendance for the given date. Requires auth."""
    return crud.get_unmarked_students(db, date=date)


# ── Income + expense combined ─────────────────────────────────────────────────
@router.get("/income-expense-summary")
def get_income_expense_summary(
    year: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Combined income/expense comparison for a year. Requires auth."""
    return crud.get_income_expense_summary(db, year=year)


# ── Fee collection summary ────────────────────────────────────────────────────
@router.get("/fee-summary")
def get_fee_summary(
    year: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Monthly fee collection. Requires auth."""
    return crud.get_fee_summary(db, year=year)


# ── Graph test (dev/debug endpoint — remove in production) ────────────────────
# @router.get("/graph-test", response_class=HTMLResponse)
# def get_graph_test():
#     """Dev only — remove before deploying to production."""
#     ...
