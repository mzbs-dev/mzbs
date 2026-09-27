from datetime import date, time
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from schemas.staff_shift_timing_model import StaffShiftTimingVersion


def resolve_shift_timing(
    session: Session,
    attendance_time_id: Optional[int],
    attendance_date: date,
) -> StaffShiftTimingVersion:
    if attendance_time_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A shift is required for new staff attendance.",
        )

    version = session.exec(
        select(StaffShiftTimingVersion)
        .where(
            StaffShiftTimingVersion.attendance_time_id == attendance_time_id,
            StaffShiftTimingVersion.effective_from <= attendance_date,
        )
        .order_by(StaffShiftTimingVersion.effective_from.desc())
    ).first()
    if version is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No shift timing version applies to this attendance date.",
        )
    return version


def apply_shift_timing(
    session: Session,
    attendance: object,
    attendance_time_id: Optional[int],
    attendance_date: date,
) -> StaffShiftTimingVersion:
    version = resolve_shift_timing(session, attendance_time_id, attendance_date)
    attendance.schedule_id = version.schedule_id
    attendance.expected_start_time_snapshot = version.start_time
    attendance.expected_end_time_snapshot = version.end_time
    attendance.schedule_is_legacy = False
    return version


def validate_timing_range(start_time: time, end_time: time) -> None:
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be earlier than end time.",
        )