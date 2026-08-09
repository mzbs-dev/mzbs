from datetime import datetime, time
from typing import Optional
from sqlmodel import Field, SQLModel


class AttendanceTimeShiftConfig(SQLModel, table=True):
    """1:1 extension of `attendancetime`, holding expected arrival/departure
    times per shift, without any DDL against `attendancetime` itself.

    `attendancetime` is a shared table (student attendance, dashboard
    aggregation, mark-attendance all read it), so this feature's new fields
    live in a separate table keyed 1:1 on `attendance_time_id` instead of
    being added as columns there — see STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md,
    Locked Design Decisions ("Shift timing storage").

    A row here is optional per shift — no row means "no expected times
    configured yet" for that shift, which callers must treat the same way
    as NULL expected_arrival_time/expected_departure_time (e.g. the
    is_likely_late hint on Attendance Review resolves to `null`, not `false`,
    when no config row exists for that shift — same rule as the shift-less
    fallback case).
    """

    __tablename__ = "attendance_time_shift_config"

    attendance_time_id: int = Field(
        foreign_key="attendancetime.attendance_time_id",
        primary_key=True,
    )
    expected_arrival_time: Optional[time] = Field(default=None, nullable=True)
    expected_departure_time: Optional[time] = Field(default=None, nullable=True)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AttendanceTimeShiftConfigUpsert(SQLModel):
    """Body for the Phase 6 PUT/PATCH route that sets a shift's expected times."""
    expected_arrival_time: Optional[time] = None
    expected_departure_time: Optional[time] = None


class AttendanceTimeShiftConfigResponse(SQLModel):
    attendance_time_id: int
    attendance_time: Optional[str] = None  # joined shift name, populated by the route
    expected_arrival_time: Optional[time] = None
    expected_departure_time: Optional[time] = None
    updated_at: Optional[datetime] = None
