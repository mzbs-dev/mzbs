from datetime import date, datetime
from typing import Annotated, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_time_model import AttendanceTime
from schemas.staff_attendance_model import (
    AttendanceReviewEditPayload,
    AttendanceReviewBatchFinalizePayload,
    AttendanceReviewBatchFinalizeResponse,
    AttendanceReviewBatchRowResult,
    AttendanceReviewFinalizeAllPayload,
    AttendanceReviewFinalizeAllResponse,
    AttendanceReviewFinalizePayload,
    AttendanceReviewHistoryRow,
    AttendanceReviewRow,
    AttendanceReviewShiftSummary,
    AttendanceReviewSummary,
    StaffAttendance,
)
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.staff_shift_timing_model import StaffShiftTimingVersion
from schemas.teacher_names_model import TeacherNames
from user.user_crud import require_permission
from user.user_models import User
from services.staff_shift_timing import apply_shift_timing
from services.attendance_calendar import resolve_attendance_calendar

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


def _timing_for_date(
    session: Session,
    attendance_time_id: Optional[int],
    attendance_date: date,
) -> Optional[StaffShiftTimingVersion]:
    if attendance_time_id is None:
        return None
    return session.exec(
        select(StaffShiftTimingVersion)
        .where(
            StaffShiftTimingVersion.attendance_time_id == attendance_time_id,
            StaffShiftTimingVersion.effective_from <= attendance_date,
        )
        .order_by(StaffShiftTimingVersion.effective_from.desc())
    ).first()


def _compute_is_likely_late(record: StaffAttendance) -> Optional[bool]:
    arrival_time = record.arrival_time
    if arrival_time is None:
        return None
    if record.expected_start_time_snapshot is None:
        return None
    return arrival_time > record.expected_start_time_snapshot


def _build_review_row(session: Session, record: StaffAttendance, staff_name: str) -> AttendanceReviewRow:
    calendar = resolve_attendance_calendar(session, record.attendance_date)
    legacy_timing = _timing_for_date(session, record.attendance_time_id, record.attendance_date)
    expected_start_time = record.expected_start_time_snapshot or (
        legacy_timing.start_time if legacy_timing else None
    )
    expected_end_time = record.expected_end_time_snapshot or (
        legacy_timing.end_time if legacy_timing else None
    )
    return AttendanceReviewRow(
        staff_id=record.staff_id,
        staff_name=staff_name,
        staff_attendance_id=record.staff_attendance_id,
        attendance_time_id=record.attendance_time_id,
        attendance_time_name=_shift_name(session, record.attendance_time_id),
        schedule_id=record.schedule_id,
        expected_start_time=expected_start_time,
        expected_end_time=expected_end_time,
        schedule_is_legacy=record.schedule_is_legacy,
        attendance_date=record.attendance_date,
        weekday=record.attendance_date.strftime("%A"),
        is_holiday=calendar["is_holiday"],
        holiday_label=calendar["label"],
        self_availability=record.self_availability,
        self_remarks=record.self_remarks,
        arrival_time=record.arrival_time,
        departure_time=record.departure_time,
        final_status=record.final_status,
        final_remarks=record.final_remarks,
        is_finalized=record.is_finalized,
        is_likely_late=(
            record.arrival_time > expected_start_time
            if record.arrival_time is not None and expected_start_time is not None
            else None
        ),
        attendance_source=record.attendance_source,
    )


def _build_empty_review_row(
    session: Session,
    staff_id: int,
    staff_name: str,
    attendance_date: date,
    attendance_time_id: Optional[int],
) -> AttendanceReviewRow:
    timing = _timing_for_date(session, attendance_time_id, attendance_date)
    calendar = resolve_attendance_calendar(session, attendance_date)
    return AttendanceReviewRow(
        staff_id=staff_id,
        staff_name=staff_name,
        attendance_date=attendance_date,
        attendance_time_id=attendance_time_id,
        attendance_time_name=_shift_name(session, attendance_time_id),
        schedule_id=timing.schedule_id if timing else None,
        expected_start_time=timing.start_time if timing else None,
        expected_end_time=timing.end_time if timing else None,
        weekday=attendance_date.strftime("%A"),
        is_holiday=calendar["is_holiday"],
        holiday_label=calendar["label"],
        is_finalized=False,
    )
    expected_end_time = record.expected_end_time_snapshot or (
        legacy_timing.end_time if legacy_timing else None
    )
    return AttendanceReviewRow(
        staff_id=record.staff_id,
        staff_name=staff_name,
        staff_attendance_id=record.staff_attendance_id,
        attendance_time_id=record.attendance_time_id,
        attendance_time_name=_shift_name(session, record.attendance_time_id),
        schedule_id=record.schedule_id,
        expected_start_time=expected_start_time,
        expected_end_time=expected_end_time,
        schedule_is_legacy=record.schedule_is_legacy,
        attendance_date=record.attendance_date,
        self_availability=record.self_availability,
        self_remarks=record.self_remarks,
        arrival_time=record.arrival_time,
        departure_time=record.departure_time,
        final_status=record.final_status,
        final_remarks=record.final_remarks,
        is_finalized=record.is_finalized,
        is_likely_late=(
            record.arrival_time > expected_start_time
            if record.arrival_time is not None and expected_start_time is not None
            else None
        ),
        attendance_source=record.attendance_source,
    )


def _validate_shift_for_staff(session: Session, staff_id: int, attendance_time_id: Optional[int]) -> None:
    if attendance_time_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A shift is required.")

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
    unassigned_only: bool = Query(False),
):
    selected_date = attendance_date or date.today()
    staff_members = session.exec(
        select(TeacherNames)
        .where(TeacherNames.is_deleted.is_(False))
        .order_by(TeacherNames.teacher_name)
    ).all()
    assignments = session.exec(select(StaffShiftAssignment)).all()
    assigned_shift_ids: dict[int, list[int]] = {}
    for assignment in assignments:
        assigned_shift_ids.setdefault(assignment.staff_id, []).append(assignment.attendance_time_id)

    query = select(StaffAttendance).where(StaffAttendance.attendance_date == selected_date)
    if attendance_time_id is not None:
        query = query.where(StaffAttendance.attendance_time_id == attendance_time_id)
    elif unassigned_only:
        query = query.where(StaffAttendance.attendance_time_id.is_(None))
    records = session.exec(query).all()

    record_map: dict[Tuple[int, Optional[int]], StaffAttendance] = {
        (record.staff_id, record.attendance_time_id): record for record in records
    }

    rows: List[AttendanceReviewRow] = []
    for staff in staff_members:
        staff_shifts = assigned_shift_ids.get(staff.teacher_name_id, [])
        if unassigned_only and staff_shifts:
            continue
        shifts = (
            [attendance_time_id]
            if attendance_time_id is not None and attendance_time_id in staff_shifts
            else staff_shifts
        )

        if attendance_time_id is not None:
            if not shifts:
                continue

            record = record_map.get((staff.teacher_name_id, attendance_time_id))
            if record:
                rows.append(_build_review_row(session, record, staff.teacher_name))
            else:
                rows.append(_build_empty_review_row(
                    session,
                    staff.teacher_name_id,
                    staff.teacher_name,
                    selected_date,
                    attendance_time_id,
                ))
            continue

        # Show one row for every assigned shift, even before self-attendance is submitted.
        if shifts:
            for shift_id in shifts:
                record = record_map.get((staff.teacher_name_id, shift_id))
                if record:
                    rows.append(_build_review_row(session, record, staff.teacher_name))
                else:
                    rows.append(_build_empty_review_row(
                        session,
                        staff.teacher_name_id,
                        staff.teacher_name,
                        selected_date,
                        shift_id,
                    ))
        else:
            # Preserve the general row for staff without explicit assignments.
            staff_records = [
                record for key, record in record_map.items()
                if key[0] == staff.teacher_name_id and key[1] is None
            ]
            if staff_records:
                for record in staff_records:
                    rows.append(_build_review_row(session, record, staff.teacher_name))
            else:
                rows.append(
                    AttendanceReviewRow(
                        staff_id=staff.teacher_name_id,
                        staff_name=staff.teacher_name,
                        attendance_date=selected_date,
                        attendance_time_id=None,
                        attendance_time_name=_shift_name(session, None),
                        weekday=selected_date.strftime("%A"),
                        is_holiday=resolve_attendance_calendar(session, selected_date)["is_holiday"],
                        holiday_label=resolve_attendance_calendar(session, selected_date)["label"],
                        is_finalized=False,
                    )
                )

    return rows


@attendance_review_router.get("/summary", response_model=AttendanceReviewSummary)
def get_attendance_review_summary(
    current_user: Annotated[User, Depends(require_permission("attendance_review", "view"))],
    session: Session = Depends(get_session),
    attendance_date: Optional[date] = Query(None),
):
    selected_date = attendance_date or date.today()
    rows = get_attendance_review_rows(current_user, session, selected_date, None, False)

    def summarize(review_rows: List[AttendanceReviewRow], shift_id: Optional[int], shift_name: str):
        counts = {
            "attendance_time_id": shift_id,
            "attendance_time_name": shift_name,
            "total": len(review_rows),
            "finalized": sum(row.is_finalized for row in review_rows),
            "pending": sum(not row.is_finalized for row in review_rows),
            "present": 0,
            "leave": 0,
            "absent": 0,
            "unmarked": 0,
        }
        for row in review_rows:
            final_status = (row.final_status or "").upper()
            if final_status in {"PRESENT", "LATE"}:
                counts["present"] += 1
            elif final_status == "LEAVE":
                counts["leave"] += 1
            elif final_status == "ABSENT":
                counts["absent"] += 1
            else:
                counts["unmarked"] += 1
        return counts

    grouped_rows: dict[Tuple[Optional[int], str], List[AttendanceReviewRow]] = {}
    for row in rows:
        key = (row.attendance_time_id, row.attendance_time_name or "General / No Shift Assigned")
        grouped_rows.setdefault(key, []).append(row)

    shifts = [
        AttendanceReviewShiftSummary(**summarize(shift_rows, shift_id, shift_name))
        for (shift_id, shift_name), shift_rows in grouped_rows.items()
    ]
    shifts.sort(key=lambda shift: shift.attendance_time_name.casefold())
    overall = summarize(rows, None, "All Shifts")
    return AttendanceReviewSummary(
        **overall,
        attendance_date=selected_date,
        shifts=shifts,
    )


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
            arrival_time=payload.arrival_time,
            departure_time=payload.departure_time,
            is_finalized=True,
            finalized_by=current_user.id,
            finalized_at=datetime.utcnow(),
            attendance_source="ADMIN_ASSISTED",
        )
        apply_shift_timing(session, record, payload.attendance_time_id, payload.attendance_date)
        session.add(record)
    else:
        record.final_status = payload.final_status
        record.final_remarks = payload.final_remarks
        record.arrival_time = payload.arrival_time
        record.departure_time = payload.departure_time
        record.is_finalized = True
        record.finalized_by = current_user.id
        record.finalized_at = datetime.utcnow()
        record.updated_at = datetime.utcnow()
        session.add(record)

    session.commit()
    session.refresh(record)
    return _build_review_row(session, record, staff.teacher_name)


@attendance_review_router.post(
    "/batch-finalize",
    response_model=AttendanceReviewBatchFinalizeResponse,
)
def batch_finalize_attendance_review(
    payload: AttendanceReviewBatchFinalizePayload,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "add"))],
    session: Session = Depends(get_session),
):
    if not session.get(AttendanceTime, payload.attendance_time_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found.")

    staff_id_counts: dict[int, int] = {}
    for item in payload.records:
        staff_id_counts[item.staff_id] = staff_id_counts.get(item.staff_id, 0) + 1

    finalized_count = 0
    results: List[AttendanceReviewBatchRowResult] = []
    for item in payload.records:
        staff = session.get(TeacherNames, item.staff_id)
        if staff is None:
            results.append(AttendanceReviewBatchRowResult(
                staff_id=item.staff_id,
                finalized=False,
                error="Staff member not found.",
            ))
            continue

        if staff_id_counts[item.staff_id] > 1:
            results.append(AttendanceReviewBatchRowResult(
                staff_id=item.staff_id,
                staff_name=staff.teacher_name,
                finalized=False,
                error="Duplicate staff row in this batch.",
            ))
            continue

        try:
            if item.final_status not in VALID_FINAL_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid final status.")

            _validate_shift_for_staff(session, item.staff_id, payload.attendance_time_id)
            record = session.exec(
                select(StaffAttendance)
                .where(
                    StaffAttendance.staff_id == item.staff_id,
                    StaffAttendance.attendance_date == payload.attendance_date,
                    StaffAttendance.attendance_time_id == payload.attendance_time_id,
                )
                .with_for_update()
            ).first()

            if record and record.is_finalized:
                raise HTTPException(status_code=409, detail="Attendance is already finalized.")

            now = datetime.utcnow()
            if record is None:
                record = StaffAttendance(
                    staff_id=item.staff_id,
                    attendance_date=payload.attendance_date,
                    attendance_time_id=payload.attendance_time_id,
                    attendance_source="ADMIN_ASSISTED",
                )
                apply_shift_timing(
                    session,
                    record,
                    payload.attendance_time_id,
                    payload.attendance_date,
                )

            record.final_status = item.final_status
            record.final_remarks = item.final_remarks
            record.arrival_time = item.arrival_time
            record.departure_time = item.departure_time
            record.is_finalized = True
            record.finalized_by = current_user.id
            record.finalized_at = now
            record.updated_at = now
            session.add(record)
            session.commit()
            finalized_count += 1
            results.append(AttendanceReviewBatchRowResult(
                staff_id=item.staff_id,
                staff_name=staff.teacher_name,
                finalized=True,
            ))
        except HTTPException as exc:
            session.rollback()
            results.append(AttendanceReviewBatchRowResult(
                staff_id=item.staff_id,
                staff_name=staff.teacher_name,
                finalized=False,
                error=str(exc.detail),
            ))
        except IntegrityError:
            session.rollback()
            results.append(AttendanceReviewBatchRowResult(
                staff_id=item.staff_id,
                staff_name=staff.teacher_name,
                finalized=False,
                error="Could not save this row; refresh and retry.",
            ))

    return AttendanceReviewBatchFinalizeResponse(
        attendance_date=payload.attendance_date,
        attendance_time_id=payload.attendance_time_id,
        finalized_count=finalized_count,
        failed_count=len(results) - finalized_count,
        results=results,
    )


@attendance_review_router.post(
    "/finalize-all",
    response_model=AttendanceReviewFinalizeAllResponse,
)
def finalize_all_attendance_review(
    payload: AttendanceReviewFinalizeAllPayload,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "add"))],
    session: Session = Depends(get_session),
):
    query = select(StaffAttendance).where(
        StaffAttendance.attendance_date == payload.attendance_date
    )
    if payload.attendance_time_id is not None:
        query = query.where(StaffAttendance.attendance_time_id == payload.attendance_time_id)
    records = session.exec(query.with_for_update()).all()

    incomplete = [
        str(record.staff_id)
        for record in records
        if record.final_status is None
    ]
    if incomplete:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "All existing attendance records must have a final status before finalization.",
                "incomplete_staff_ids": incomplete,
            },
        )

    finalized_count = 0
    already_finalized_count = 0
    now = datetime.utcnow()
    for record in records:
        if record.is_finalized:
            already_finalized_count += 1
            continue
        record.is_finalized = True
        record.finalized_by = current_user.id
        record.finalized_at = now
        record.updated_at = now
        session.add(record)
        finalized_count += 1
    session.commit()
    return AttendanceReviewFinalizeAllResponse(
        attendance_date=payload.attendance_date,
        attendance_time_id=payload.attendance_time_id,
        finalized_count=finalized_count,
        already_finalized_count=already_finalized_count,
    )


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

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")
    if record.is_finalized:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Finalized attendance cannot be edited.")

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
    staff_names = {
        staff.teacher_name_id: staff.teacher_name
        for staff in session.exec(select(TeacherNames).where(TeacherNames.is_deleted.is_(False))).all()
    }

    return [
        AttendanceReviewHistoryRow(
            staff_attendance_id=record.staff_attendance_id,
            staff_id=record.staff_id,
            staff_name=staff_names.get(record.staff_id, "Unknown"),
            attendance_date=record.attendance_date,
            weekday=record.attendance_date.strftime("%A"),
            is_holiday=resolve_attendance_calendar(session, record.attendance_date)["is_holiday"],
            holiday_label=resolve_attendance_calendar(session, record.attendance_date)["label"],
            attendance_time_id=record.attendance_time_id,
            attendance_time_name=_shift_name(session, record.attendance_time_id),
            schedule_id=record.schedule_id,
            expected_start_time=record.expected_start_time_snapshot or (
                timing.start_time if (timing := _timing_for_date(session, record.attendance_time_id, record.attendance_date)) else None
            ),
            expected_end_time=record.expected_end_time_snapshot or (
                timing.end_time if timing else None
            ),
            schedule_is_legacy=record.schedule_is_legacy,
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
