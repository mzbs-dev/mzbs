from datetime import date, datetime, time
from typing import List, Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint
from typing import Union
from schemas.attendance_time_model import AttendanceTime


class StaffAttendance(SQLModel, table=True):
    staff_attendance_id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False, index=True)
    attendance_time_id: Optional[int] = Field(default=None, foreign_key="attendancetime.attendance_time_id", index=True, nullable=True)
    attendance_date: date = Field(default_factory=date.today, index=True)

    # DEPRECATED (kept nullable for rollback reference only — migration 0007
    # relaxed this to nullable). No new code path may read or write this
    # field after Phase 2 — use final_status instead. See
    # STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md, Locked Design Decisions,
    # "attendance_status (legacy column)". Grep check before Phase 4 lands.
    attendance_status: Optional[str] = Field(default=None, index=True, nullable=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # ---- Self-report fields (Phase 2 / 0007) ----
    self_availability: Optional[str] = Field(default=None, nullable=True)  # "AVAILABLE" / "NOT_AVAILABLE"
    self_remarks: Optional[str] = Field(default=None, nullable=True)
    arrival_time: Optional[time] = Field(default=None, nullable=True)
    departure_time: Optional[time] = Field(default=None, nullable=True)
    self_submitted_at: Optional[datetime] = Field(default=None, nullable=True)

    # ---- Finalization fields (Phase 2 / 0007) ----
    final_status: Optional[str] = Field(default=None, index=True, nullable=True)  # PRESENT/LATE/ABSENT/LEAVE
    final_remarks: Optional[str] = Field(default=None, nullable=True)
    is_finalized: bool = Field(default=False, nullable=False, index=True)
    finalized_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    finalized_at: Optional[datetime] = Field(default=None, nullable=True)

    # ---- Marking-audit fields (migration 0009) ----
    # Who actually performed the write, and whether it was the staff
    # member's own submission or an admin-assisted one. attendance_source
    # is set once at creation and never changed by later PATCH edits.
    marked_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    attendance_source: Optional[str] = Field(default=None, nullable=True, index=True)  # SELF / ADMIN_ASSISTED

    __table_args__ = (
        UniqueConstraint("staff_id", "attendance_date", "attendance_time_id", name="uq_staff_attendance_staff_date_time"),
    )


# ============================================================================
# Existing DTOs — UNCHANGED. Old bulk-attendance endpoint (staff.py) and its
# frontend consumer keep working exactly as before (Locked Design Decision:
# old endpoint left live/untouched through Phase 4–13).
# ============================================================================

class StaffAttendanceCreate(SQLModel):
    staff_id: int
    attendance_date: date = Field(default_factory=date.today)
    attendance_time_id: Optional[int] = None
    attendance_status: str


class StaffAttendanceBulkCreate(SQLModel):
    attendance_date: date = Field(default_factory=date.today)
    attendance_time_id: Optional[int] = None
    records: List[StaffAttendanceCreate]


class StaffAttendanceUpdate(SQLModel):
    attendance_status: Optional[str] = None
    attendance_date: Optional[date] = None
    attendance_time_id: Optional[int] = None


class StaffListItem(SQLModel):
    staff_id: int
    staff_name: str
    joining_date: datetime
    total_stay: str


class StaffAttendanceRow(SQLModel):
    staff_id: int
    staff_name: str
    joining_date: datetime
    total_stay: str
    attendance_id: Optional[int] = None
    attendance_date: Optional[date] = None
    attendance_time_id: Optional[int] = None
    attendance_time: Optional[str] = None
    attendance_status: Optional[str] = None
    is_marked: bool = False


class StaffAttendanceResponse(SQLModel):
    staff_attendance_id: int
    staff_id: int
    attendance_date: date
    attendance_status: str
    staff_name: str
    joining_date: datetime
    total_stay: str
    attendance_time_id: Optional[int]
    attendance_time: Optional[str]
    created_at: datetime
    updated_at: datetime


class StaffAttendanceSaveSummary(SQLModel):
    created_count: int
    updated_count: int
    skipped_count: int


class StaffAttendanceBulkResponse(SQLModel):
    summary: StaffAttendanceSaveSummary
    records: List[StaffAttendanceResponse]


# ============================================================================
# Phase 3 DTOs — Self-Attendance (teacher-facing)
# New, additive only. Nothing above this line is touched.
# ============================================================================

class SelfAttendanceEntry(SQLModel):
    """One shift's entry — either today's current state (GET /today) or
    the shape returned after a write. attendance_time_id is null only for
    the shift-less 'General / No Shift Assigned' fallback case."""
    staff_attendance_id: Optional[int] = None  # null if not yet submitted for this shift today
    attendance_time_id: Optional[int] = None
    attendance_time_name: Optional[str] = None  # "General / No Shift Assigned" for the fallback case
    attendance_date: date
    self_availability: Optional[str] = None
    self_remarks: Optional[str] = None
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None
    self_submitted_at: Optional[datetime] = None
    is_finalized: bool = False
    final_status: Optional[str] = None
    attendance_source: Optional[str] = None
    marked_by_user_id: Optional[int] = None


class SelfAttendanceSubmit(SQLModel):
    """POST /self-attendance/today body."""
    attendance_time_id: Optional[int] = None  # null only allowed if caller has zero assigned shifts
    self_availability: str  # "AVAILABLE" / "NOT_AVAILABLE"
    self_remarks: Optional[str] = None
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None


class SelfAttendanceUpdate(SQLModel):
    """PATCH /self-attendance/today body."""
    attendance_time_id: Optional[int] = None  # identifies which shift's row to update
    self_availability: Optional[str] = None
    self_remarks: Optional[str] = None
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None


class SelfAttendanceHistoryRow(SQLModel):
    staff_attendance_id: int
    attendance_date: date
    attendance_time_id: Optional[int]
    attendance_time_name: Optional[str] = None
    final_status: Optional[str] = None
    final_remarks: Optional[str] = None
    self_availability: Optional[str] = None
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None
    attendance_source: Optional[str] = None