from datetime import date, datetime
from typing import Annotated, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_time_model import AttendanceTime
from schemas.attendance_time_shift_config_model import AttendanceTimeShiftConfig
from schemas.staff_attendance_model import (
    AttendanceReviewEditPayload,
    AttendanceReviewFinalizePayload,
    AttendanceReviewHistoryRow,
    AttendanceReviewRow,
    StaffAttendance,
)
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.teacher_names_model import TeacherNames
from user.user_crud import require_permission
from user.user_models import User

attendance_review_router = APIRouter(
    prefix="/attendance-review",
    tags=["Attendance Review"],
    responses={404: {"description": "Attendance Review module"}},
)

VALID_FINAL_STATUSES = {"PRESENT", "LATE", "ABSENT", "LEAVE"}


def _shift_name(session: Session, attendance_time_id: Optional[int]) -> Optional[str]:
    if attendance_time_id is None:
        return "General / No Shift Assigned"
    shift = session.get(AttendanceTime, attendance_time_id)
    return shift.attendance_time if shift else None


def _compute_is_likely_late(session: Session, attendance_time_id: Optional[int], arrival_time) -> Optional[bool]:
    if attendance_time_id is None or arrival_time is None:
        return None
    config = session.get(AttendanceTimeShiftConfig, attendance_time_id)
    if config is None or config.expected_arrival_time is None:
        return None
    return arrival_time > config.expected_arrival_time


def _build_review_row(session: Session, record: StaffAttendance, staff_name: str) -> AttendanceReviewRow:
    return AttendanceReviewRow(
        staff_id=record.staff_id,
        staff_name=staff_name,
        staff_attendance_id=record.staff_attendance_id,
        attendance_time_id=record.attendance_time_id,
        attendance_time_name=_shift_name(session, record.attendance_time_id),
        attendance_date=record.attendance_date,
        self_availability=record.self_availability,
        self_remarks=record.self_remarks,
        arrival_time=record.arrival_time,
        departure_time=record.departure_time,
        final_status=record.final_status,
        final_remarks=record.final_remarks,
        is_finalized=record.is_finalized,
        is_likely_late=_compute_is_likely_late(session, record.attendance_time_id, record.arrival_time),
        attendance_source=record.attendance_source,
    )


def _validate_shift_for_staff(session: Session, staff_id: int, attendance_time_id: Optional[int]) -> None:
    if attendance_time_id is None:
        return

    assignments = session.exec(
        select(StaffShiftAssignment.attendance_time_id)
        .where(StaffShiftAssignment.staff_id == staff_id)
    ).all()

    # If the staff member has no explicit shift assignments, allow a shiftless record.
    if not assignments:
        return

    if attendance_time_id not in assignments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not an assigned shift for this staff member.",
        )


@attendance_review_router.get("/rows", response_model=List[AttendanceReviewRow])
def get_attendance_review_rows(
    current_user: Annotated[User, Depends(require_permission("attendance_review", "view"))],
    session: Session = Depends(get_session),
    attendance_date: Optional[date] = Query(None),
    attendance_time_id: Optional[int] = Query(None),
):
    selected_date = attendance_date or date.today()
    staff_members = session.exec(select(TeacherNames).order_by(TeacherNames.teacher_name)).all()
    query = select(StaffAttendance).where(StaffAttendance.attendance_date == selected_date)
    if attendance_time_id is not None:
        query = query.where(StaffAttendance.attendance_time_id == attendance_time_id)
    records = session.exec(query).all()

    record_map: dict[Tuple[int, Optional[int]], StaffAttendance] = {
        (record.staff_id, record.attendance_time_id): record for record in records
    }

    rows: List[AttendanceReviewRow] = []
    for staff in staff_members:
        if attendance_time_id is not None:
            record = record_map.get((staff.teacher_name_id, attendance_time_id))
            if record:
                rows.append(_build_review_row(session, record, staff.teacher_name))
            else:
                rows.append(
                    AttendanceReviewRow(
                        staff_id=staff.teacher_name_id,
                        staff_name=staff.teacher_name,
                        attendance_date=selected_date,
                        attendance_time_id=attendance_time_id,
                        attendance_time_name=_shift_name(session, attendance_time_id),
                        is_finalized=False,
                    )
                )
            continue

        # No timing filter: include any existing record, plus a placeholder row if none exists.
        staff_records = [record for key, record in record_map.items() if key[0] == staff.teacher_name_id]
        if staff_records:
            for record in staff_records:
                rows.append(_build_review_row(session, record, staff.teacher_name))
        else:
            rows.append(
                AttendanceReviewRow(
                    staff_id=staff.teacher_name_id,
                    staff_name=staff.teacher_name,
                    attendance_date=selected_date,
                    is_finalized=False,
                )
            )

    return rows


@attendance_review_router.post("/{staff_id}/finalize", response_model=AttendanceReviewRow)
def finalize_attendance_review(
    staff_id: int,
    payload: AttendanceReviewFinalizePayload,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "add"))],
    session: Session = Depends(get_session),
):
    if payload.final_status not in VALID_FINAL_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid final status.")

    staff = session.get(TeacherNames, staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

    _validate_shift_for_staff(session, staff_id, payload.attendance_time_id)

    record = session.exec(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.attendance_date == payload.attendance_date,
            StaffAttendance.attendance_time_id == payload.attendance_time_id,
        )
    ).first()

    if record and record.is_finalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance record has already been finalized.")

    if record is None:
        record = StaffAttendance(
            staff_id=staff_id,
            attendance_date=payload.attendance_date,
            attendance_time_id=payload.attendance_time_id,
            final_status=payload.final_status,
            final_remarks=payload.final_remarks,
            is_finalized=True,
            finalized_by=current_user.id,
            finalized_at=datetime.utcnow(),
            attendance_source="ADMIN_ASSISTED",
        )
        session.add(record)
    else:
        record.final_status = payload.final_status
        record.final_remarks = payload.final_remarks
        record.is_finalized = True
        record.finalized_by = current_user.id
        record.finalized_at = datetime.utcnow()
        record.updated_at = datetime.utcnow()
        session.add(record)

    session.commit()
    session.refresh(record)
    return _build_review_row(session, record, staff.teacher_name)


@attendance_review_router.patch("/{staff_id}", response_model=AttendanceReviewRow)
def update_attendance_review_record(
    staff_id: int,
    payload: AttendanceReviewEditPayload,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "edit"))],
    session: Session = Depends(get_session),
):
    if payload.attendance_date is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="attendance_date is required.")

    staff = session.get(TeacherNames, staff_id)
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

    record = session.exec(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.attendance_date == payload.attendance_date,
            StaffAttendance.attendance_time_id == payload.attendance_time_id,
        )
    ).first()

    if not record or not record.is_finalized:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finalized attendance record not found.")

    if payload.final_status is not None:
        if payload.final_status not in VALID_FINAL_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid final status.")
        record.final_status = payload.final_status
    if payload.final_remarks is not None:
        record.final_remarks = payload.final_remarks
    if payload.self_availability is not None:
        record.self_availability = payload.self_availability
    if payload.arrival_time is not None:
        record.arrival_time = payload.arrival_time
    if payload.departure_time is not None:
        record.departure_time = payload.departure_time

    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return _build_review_row(session, record, staff.teacher_name)


@attendance_review_router.delete("/{staff_id}")
def delete_attendance_review_record(
    staff_id: int,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "delete"))],
    session: Session = Depends(get_session),
    attendance_date: date = Query(...),
    attendance_time_id: Optional[int] = Query(None),
):
    record = session.exec(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.attendance_date == attendance_date,
            StaffAttendance.attendance_time_id == attendance_time_id,
        )
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    session.delete(record)
    session.commit()
    return {"detail": "Attendance record deleted."}


@attendance_review_router.get("/history", response_model=List[AttendanceReviewHistoryRow])
def get_attendance_review_history(
    current_user: Annotated[User, Depends(require_permission("attendance_review", "view"))],
    session: Session = Depends(get_session),
    staff_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    attendance_time_id: Optional[int] = Query(None),
):
    query = select(StaffAttendance)
    if staff_id is not None:
        query = query.where(StaffAttendance.staff_id == staff_id)
    if date_from is not None:
        query = query.where(StaffAttendance.attendance_date >= date_from)
    if date_to is not None:
        query = query.where(StaffAttendance.attendance_date <= date_to)
    if attendance_time_id is not None:
        query = query.where(StaffAttendance.attendance_time_id == attendance_time_id)

    records = session.exec(query.order_by(StaffAttendance.attendance_date.desc())).all()
    staff_names = {staff.teacher_name_id: staff.teacher_name for staff in session.exec(select(TeacherNames)).all()}

    return [
        AttendanceReviewHistoryRow(
            staff_attendance_id=record.staff_attendance_id,
            staff_id=record.staff_id,
            staff_name=staff_names.get(record.staff_id, "Unknown"),
            attendance_date=record.attendance_date,
            attendance_time_id=record.attendance_time_id,
            attendance_time_name=_shift_name(session, record.attendance_time_id),
            final_status=record.final_status,
            final_remarks=record.final_remarks,
            self_availability=record.self_availability,
            arrival_time=record.arrival_time,
            departure_time=record.departure_time,
            is_finalized=record.is_finalized,
            finalized_at=record.finalized_at,
        )
        for record in records
    ]
