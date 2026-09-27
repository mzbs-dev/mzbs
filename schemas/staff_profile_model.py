from datetime import date, datetime, time
from typing import List, Optional
from sqlmodel import SQLModel

from schemas.staff_shift_assignment_model import StaffShiftAssignmentResponse


class PreviousAttendanceRow(SQLModel):
    """One finalized attendance record, tagged with its shift name."""

    staff_attendance_id: Optional[int] = None
    is_calendar_holiday: bool = False
    holiday_label: Optional[str] = None
    attendance_date: date
    weekday: str = ""
    attendance_time_id: Optional[int] = None
    attendance_time_name: Optional[str] = None
    schedule_id: Optional[int] = None
    expected_start_time: Optional[time] = None
    expected_end_time: Optional[time] = None
    schedule_is_legacy: bool = False
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
