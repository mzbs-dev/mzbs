from datetime import date
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_time_model import AttendanceTime
from schemas.staff_attendance_model import StaffAttendance, StaffListItem
from schemas.staff_profile_model import PreviousAttendanceRow, StaffProfileResponse
from schemas.staff_shift_assignment_model import (
    StaffShiftAssignment,
    StaffShiftAssignmentResponse,
    StaffShiftsReplaceRequest,
)
from schemas.teacher_names_model import TeacherNames
from router.staff import _calculate_total_stay
from services.attendance_calendar import list_attendance_holidays
from user.user_crud import require_permission
from user.user_models import User

staff_profile_router = APIRouter(
    prefix="/staff-profile",
    tags=["Staff Profile"],
    responses={404: {"description": "Staff Profile module"}},
)


def _shift_assignments_for(session: Session, staff_id: int) -> List[StaffShiftAssignmentResponse]:
    assignments = session.exec(
        select(StaffShiftAssignment).where(StaffShiftAssignment.staff_id == staff_id)
    ).all()
    result: List[StaffShiftAssignmentResponse] = []
    for assignment in assignments:
        shift = session.get(AttendanceTime, assignment.attendance_time_id)
        result.append(
            StaffShiftAssignmentResponse(
                id=assignment.id,
                staff_id=assignment.staff_id,
                attendance_time_id=assignment.attendance_time_id,
                attendance_time=shift.attendance_time if shift else None,
                assigned_by=assignment.assigned_by,
                created_at=assignment.created_at,
            )
        )
    return result


@staff_profile_router.get("/list", response_model=List[StaffListItem])
def get_staff_profile_list(
    current_user: Annotated[User, Depends(require_permission("staff_profile", "view"))],
    session: Session = Depends(get_session),
):
    staff_members = session.exec(select(TeacherNames).where(TeacherNames.is_deleted.is_(False)).order_by(TeacherNames.teacher_name)).all()
    return [
        StaffListItem(
            staff_id=m.teacher_name_id,
            staff_name=m.teacher_name,
            joining_date=m.created_at,
            total_stay=_calculate_total_stay(m.created_at),
        )
        for m in staff_members
    ]


@staff_profile_router.get("/{staff_id}", response_model=StaffProfileResponse)
def get_staff_profile(
    staff_id: int,
    current_user: Annotated[User, Depends(require_permission("staff_profile", "view"))],
    session: Session = Depends(get_session),
):
    staff = session.get(TeacherNames, staff_id)
    if not staff or staff.is_deleted:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    records = session.exec(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.is_finalized == True,  # noqa: E712
        )
        .order_by(StaffAttendance.attendance_date.desc())
    ).all()

    previous_attendance: List[PreviousAttendanceRow] = []
    for record in records:
        shift_name = None
        if record.attendance_time_id is not None:
            shift = session.get(AttendanceTime, record.attendance_time_id)
            shift_name = shift.attendance_time if shift else None
        previous_attendance.append(
            PreviousAttendanceRow(
                staff_attendance_id=record.staff_attendance_id,
                attendance_date=record.attendance_date,
                weekday=record.attendance_date.strftime("%A"),
                attendance_time_id=record.attendance_time_id,
                attendance_time_name=shift_name,
                schedule_id=record.schedule_id,
                expected_start_time=record.expected_start_time_snapshot,
                expected_end_time=record.expected_end_time_snapshot,
                schedule_is_legacy=record.schedule_is_legacy,
                final_status=record.final_status,
                final_remarks=record.final_remarks,
                arrival_time=record.arrival_time,
                departure_time=record.departure_time,
            )
        )

    previous_attendance.extend(
        PreviousAttendanceRow(
            staff_attendance_id=None,
            is_calendar_holiday=True,
            holiday_label=holiday["label"],
            attendance_date=holiday["attendance_date"],
            weekday=holiday["weekday"],
            final_status="HOLIDAY",
            final_remarks=holiday["label"],
        )
        for holiday in list_attendance_holidays(
            session,
            staff.created_at.date(),
            date.today(),
        )
    )
    previous_attendance.sort(
        key=lambda row: (row.attendance_date, not row.is_calendar_holiday),
        reverse=True,
    )
    return StaffProfileResponse(
        staff_id=staff.teacher_name_id,
        staff_name=staff.teacher_name,
        joining_date=staff.created_at,
        total_stay=_calculate_total_stay(staff.created_at),
        assigned_shifts=_shift_assignments_for(session, staff_id),
        previous_attendance=previous_attendance,
    )


@staff_profile_router.put("/{staff_id}/shifts", response_model=List[StaffShiftAssignmentResponse])
def replace_staff_shifts(
    staff_id: int,
    payload: StaffShiftsReplaceRequest,
    current_user: Annotated[User, Depends(require_permission("staff_profile", "edit"))],
    session: Session = Depends(get_session),
):
    staff = session.get(TeacherNames, staff_id)
    if not staff or staff.is_deleted:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    requested_ids = set(payload.attendance_time_ids)

    if requested_ids:
        found_ids = set(
            session.exec(
                select(AttendanceTime.attendance_time_id).where(
                    AttendanceTime.attendance_time_id.in_(requested_ids)
                )
            ).all()
        )
        missing = requested_ids - found_ids
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown attendance_time_id(s): {sorted(missing)}",
            )

    existing = session.exec(
        select(StaffShiftAssignment).where(StaffShiftAssignment.staff_id == staff_id)
    ).all()
    existing_ids = {entry.attendance_time_id for entry in existing}

    for entry in existing:
        if entry.attendance_time_id not in requested_ids:
            session.delete(entry)

    for shift_id in requested_ids - existing_ids:
        session.add(
            StaffShiftAssignment(
                staff_id=staff_id,
                attendance_time_id=shift_id,
                assigned_by=current_user.id,
            )
        )

    session.commit()
    return _shift_assignments_for(session, staff_id)
