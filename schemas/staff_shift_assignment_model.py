from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class StaffShiftAssignment(SQLModel, table=True):
    """Many-to-many staff-to-shift assignment.

    Replaces the earlier single-`assigned_attendance_time_id`-on-`TeacherNames`
    design (superseded per STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md, Locked
    Design Decisions). A staff member can hold zero, one, or several shift
    assignments; each is a separate row here. Managed from the Staff Profile
    page (PUT /staff-profile/{staff_id}/shifts, Phase 5), not from the
    staff-creation form and not from Shift Timing Setup.
    """

    __tablename__ = "staff_shift_assignment"

    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False, index=True)
    attendance_time_id: int = Field(foreign_key="attendancetime.attendance_time_id", nullable=False, index=True)
    assigned_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("staff_id", "attendance_time_id", name="uq_staff_shift_assignment_staff_shift"),
    )


class StaffShiftAssignmentCreate(SQLModel):
    attendance_time_id: int


class StaffShiftAssignmentResponse(SQLModel):
    id: int
    staff_id: int
    attendance_time_id: int
    attendance_time: Optional[str] = None  # joined shift name, populated by the route
    assigned_by: Optional[int] = None
    created_at: datetime


class StaffShiftsReplaceRequest(SQLModel):
    """Body for PUT /staff-profile/{staff_id}/shifts — full replacement semantics."""
    attendance_time_ids: list[int]
