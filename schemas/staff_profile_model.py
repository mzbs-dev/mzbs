from datetime import date, datetime, time
from typing import List, Optional
from sqlmodel import SQLModel

from schemas.staff_shift_assignment_model import StaffShiftAssignmentResponse


class PreviousAttendanceRow(SQLModel):
    """One finalized attendance record, tagged with its shift name."""

    staff_attendance_id: int
    attendance_date: date
    attendance_time_id: Optional[int] = None
    attendance_time_name: Optional[str] = None
    final_status: Optional[str] = None
    final_remarks: Optional[str] = None
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None


class StaffProfileResponse(SQLModel):
    """GET /staff-profile/{staff_id} — 'Get Profile' response."""

    staff_id: int
    staff_name: str
    joining_date: datetime
    total_stay: str
    assigned_shifts: List[StaffShiftAssignmentResponse]
    previous_attendance: List[PreviousAttendanceRow]
