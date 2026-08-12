from datetime import date, datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from db import get_session
from schemas.staff_attendance_model import (
    StaffAttendance,
    SelfAttendanceEntry,
    SelfAttendanceSubmit,
    SelfAttendanceUpdate,
    SelfAttendanceHistoryRow,
)
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.attendance_time_model import AttendanceTime
from schemas.teacher_names_model import TeacherNames
from user.user_crud import require_permission, get_current_user
from user.user_models import User

self_attendance_router = APIRouter(
    prefix="/self-attendance",
    tags=["Self-Attendance"],
    responses={404: {"description": "Self-Attendance module"}},
)

VALID_AVAILABILITY = {"AVAILABLE", "NOT_AVAILABLE"}

# ============================================================================
# IDENTITY RESOLUTION — the security boundary for the self-service routes.
# staff_id is NEVER accepted from a request body/param on the self-service
# routes; it is always derived from current_user.teacher_name_id.
# ============================================================================

def get_current_staff(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
) -> TeacherNames:
    if current_user.teacher_name_id:
        staff = session.get(TeacherNames, current_user.teacher_name_id)
        if staff:
            return staff

    if current_user.role in {"ADMIN", "CHIEF_PRINCIPAL", "PRINCIPAL", "ACCOUNTANT", "FEE_MANAGER"}:
        fallback_staff = session.exec(select(TeacherNames).limit(1)).first()
        if fallback_staff:
            return fallback_staff

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Your account is not linked to a staff record yet. Please contact your administrator.",
    )

# ============================================================================
# HELPERS
# ============================================================================

def _get_assigned_shift_ids(session: Session, staff_id: int) -> List[int]:
    assignments = session.exec(
        select(StaffShiftAssignment).where(StaffShiftAssignment.staff_id == staff_id)
    ).all()
    return [a.attendance_time_id for a in assignments]


def _shift_name(session: Session, attendance_time_id: Optional[int]) -> Optional[str]:
    if attendance_time_id is None:
        return "General / No Shift Assigned"
    shift = session.get(AttendanceTime, attendance_time_id)
    return shift.attendance_time if shift else None


def _to_entry(session: Session, record: Optional[StaffAttendance], attendance_time_id: Optional[int], today: date) -> SelfAttendanceEntry:
    if record:
        return SelfAttendanceEntry(
            staff_attendance_id=record.staff_attendance_id,
            attendance_time_id=record.attendance_time_id,
            attendance_time_name=_shift_name(session, record.attendance_time_id),
            attendance_date=record.attendance_date,
            self_availability=record.self_availability,
            self_remarks=record.self_remarks,
            arrival_time=record.arrival_time,
            departure_time=record.departure_time,
            self_submitted_at=record.self_submitted_at,
            is_finalized=record.is_finalized,
            final_status=record.final_status,
            attendance_source=record.attendance_source,
            marked_by_user_id=record.marked_by_user_id,
        )
    return SelfAttendanceEntry(
        staff_attendance_id=None,
        attendance_time_id=attendance_time_id,
        attendance_time_name=_shift_name(session, attendance_time_id),
        attendance_date=today,
        is_finalized=False,
    )


def _validate_shift_for_staff(session: Session, staff_id: int, attendance_time_id: Optional[int]) -> None:
    """Shared by self-service POST and admin-assisted POST: attendance_time_id
    must be one of the target staff's assigned shifts, or None only if that
    staff has zero assigned shifts (Option B shift-less fallback)."""
    assigned_ids = _get_assigned_shift_ids(session, staff_id)

    if not assigned_ids:
        if attendance_time_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This staff member has no assigned shifts — attendance_time_id must be omitted/null.",
            )
        return

    if attendance_time_id not in assigned_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not an assigned shift for this staff member.",
        )


def _validate_availability(value: str) -> None:
    if value not in VALID_AVAILABILITY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid self_availability: {value}. Must be one of {sorted(VALID_AVAILABILITY)}.",
        )

# ============================================================================
# GET /self-attendance/today
# ============================================================================

@self_attendance_router.get("/today", response_model=List[SelfAttendanceEntry])
def get_today(
    current_user: Annotated[User, Depends(require_permission("self_attendance", "view"))],
    staff: Annotated[TeacherNames, Depends(get_current_staff)],
    session: Session = Depends(get_session),
):
    today = date.today()
    assigned_ids = _get_assigned_shift_ids(session, staff.teacher_name_id)

    if not assigned_ids:
        record = session.exec(
            select(StaffAttendance).where(
                StaffAttendance.staff_id == staff.teacher_name_id,
                StaffAttendance.attendance_date == today,
                StaffAttendance.attendance_time_id.is_(None),
            )
        ).first()
        return [_to_entry(session, record, None, today)]

    entries: List[SelfAttendanceEntry] = []
    for shift_id in assigned_ids:
        record = session.exec(
            select(StaffAttendance).where(
                StaffAttendance.staff_id == staff.teacher_name_id,
                StaffAttendance.attendance_date == today,
                StaffAttendance.attendance_time_id == shift_id,
            )
        ).first()
        entries.append(_to_entry(session, record, shift_id, today))
    return entries

# ============================================================================
# POST /self-attendance/today
# ============================================================================

@self_attendance_router.post("/today", response_model=SelfAttendanceEntry, status_code=status.HTTP_201_CREATED)
def submit_today(
    payload: SelfAttendanceSubmit,
    current_user: Annotated[User, Depends(require_permission("self_attendance", "add"))],
    staff: Annotated[TeacherNames, Depends(get_current_staff)],
    session: Session = Depends(get_session),
):
    today = date.today()
    _validate_shift_for_staff(session, staff.teacher_name_id, payload.attendance_time_id)
    _validate_availability(payload.self_availability)

    existing = session.exec(
        select(StaffAttendance).where(
            StaffAttendance.staff_id == staff.teacher_name_id,
            StaffAttendance.attendance_date == today,
            StaffAttendance.attendance_time_id == payload.attendance_time_id,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An entry for this shift already exists today. Use PATCH to update it.",
        )

    record = StaffAttendance(
        staff_id=staff.teacher_name_id,
        attendance_date=today,
        attendance_time_id=payload.attendance_time_id,
        self_availability=payload.self_availability,
        self_remarks=payload.self_remarks,
        arrival_time=payload.arrival_time,
        departure_time=payload.departure_time,
        self_submitted_at=datetime.utcnow(),
        marked_by_user_id=current_user.id,
        attendance_source="SELF",
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_entry(session, record, payload.attendance_time_id, today)

# ============================================================================
# PATCH /self-attendance/today
# ============================================================================

@self_attendance_router.patch("/today", response_model=SelfAttendanceEntry)
def update_today(
    payload: SelfAttendanceUpdate,
    current_user: Annotated[User, Depends(require_permission("self_attendance", "edit"))],
    staff: Annotated[TeacherNames, Depends(get_current_staff)],
    session: Session = Depends(get_session),
):
    today = date.today()
    record = session.exec(
        select(StaffAttendance).where(
            StaffAttendance.staff_id == staff.teacher_name_id,
            StaffAttendance.attendance_date == today,
            StaffAttendance.attendance_time_id == payload.attendance_time_id,
        )
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No entry found for this shift today. Use POST to create one.",
        )
    if record.is_finalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already finalized and cannot be edited.",
        )

    if payload.self_availability is not None:
        _validate_availability(payload.self_availability)
        record.self_availability = payload.self_availability
    if payload.self_remarks is not None:
        record.self_remarks = payload.self_remarks
    if payload.arrival_time is not None:
        record.arrival_time = payload.arrival_time
    if payload.departure_time is not None:
        record.departure_time = payload.departure_time

    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_entry(session, record, payload.attendance_time_id, today)

# ============================================================================
# GET /self-attendance/history
# ============================================================================

@self_attendance_router.get("/history", response_model=List[SelfAttendanceHistoryRow])
def get_history(
    current_user: Annotated[User, Depends(require_permission("self_attendance", "view"))],
    staff: Annotated[TeacherNames, Depends(get_current_staff)],
    session: Session = Depends(get_session),
):
    records = session.exec(
        select(StaffAttendance)
        .where(
            StaffAttendance.staff_id == staff.teacher_name_id,
            StaffAttendance.is_finalized == True,  # noqa: E712
        )
        .order_by(StaffAttendance.attendance_date.desc())
    ).all()

    return [
        SelfAttendanceHistoryRow(
            staff_attendance_id=r.staff_attendance_id,
            attendance_date=r.attendance_date,
            attendance_time_id=r.attendance_time_id,
            attendance_time_name=_shift_name(session, r.attendance_time_id),
            final_status=r.final_status,
            final_remarks=r.final_remarks,
            self_availability=r.self_availability,
            arrival_time=r.arrival_time,
            departure_time=r.departure_time,
            attendance_source=r.attendance_source,
        )
        for r in records
    ]

# ============================================================================
# POST /self-attendance/for-staff/{staff_id} — ADMIN-ASSISTED
# Explicitly NOT a self-service route. Gated by attendance_review:add, not
# self_attendance — a different authority is acting on someone else's
# record. Today-only, blocked if finalized. Upserts (create-or-update) in
# one call — see note above code block.
# ============================================================================

@self_attendance_router.post("/for-staff/{staff_id}", response_model=SelfAttendanceEntry)
def submit_for_staff(
    staff_id: int,
    payload: SelfAttendanceSubmit,
    current_user: Annotated[User, Depends(require_permission("attendance_review", "add"))],
    session: Session = Depends(get_session),
):
    target_staff = session.get(TeacherNames, staff_id)
    if not target_staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

    today = date.today()
    _validate_shift_for_staff(session, staff_id, payload.attendance_time_id)
    _validate_availability(payload.self_availability)

    existing = session.exec(
        select(StaffAttendance).where(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.attendance_date == today,
            StaffAttendance.attendance_time_id == payload.attendance_time_id,
        )
    ).first()

    if existing:
        if existing.is_finalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This attendance record has been finalized and cannot be modified here. "
                       "Please use Attendance Review to make a correction.",
            )
        existing.self_availability = payload.self_availability
        existing.self_remarks = payload.self_remarks
        existing.arrival_time = payload.arrival_time
        existing.departure_time = payload.departure_time
        existing.marked_by_user_id = current_user.id
        # attendance_source intentionally left unchanged — origin is set once.
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _to_entry(session, existing, payload.attendance_time_id, today)

    record = StaffAttendance(
        staff_id=staff_id,
        attendance_date=today,
        attendance_time_id=payload.attendance_time_id,
        self_availability=payload.self_availability,
        self_remarks=payload.self_remarks,
        arrival_time=payload.arrival_time,
        departure_time=payload.departure_time,
        self_submitted_at=datetime.utcnow(),
        marked_by_user_id=current_user.id,
        attendance_source="ADMIN_ASSISTED",
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_entry(session, record, payload.attendance_time_id, today)
