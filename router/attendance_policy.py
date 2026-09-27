from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_policy_model import (
    AttendanceCalendarResult,
    AttendanceDateException,
    AttendanceDateExceptionCreate,
    AttendanceDateExceptionResponse,
    AttendancePolicyResponse,
    AttendanceWeeklyHoliday,
)
from services.attendance_calendar import VALID_EXCEPTION_KINDS, resolve_attendance_calendar
from user.user_crud import require_authenticated, require_permission
from user.user_models import User

attendance_policy_router = APIRouter(prefix="/attendance-policy", tags=["Attendance Policy"])


def _exception_response(item: AttendanceDateException) -> AttendanceDateExceptionResponse:
    return AttendanceDateExceptionResponse(
        id=item.id,
        exception_date=item.exception_date,
        kind=item.kind,
        label=item.label,
    )


@attendance_policy_router.get("", response_model=AttendancePolicyResponse)
def get_policy(
    current_user: Annotated[User, Depends(require_authenticated())],
    session: Session = Depends(get_session),
):
    weekly = session.exec(select(AttendanceWeeklyHoliday).order_by(AttendanceWeeklyHoliday.weekday)).all()
    exceptions = session.exec(select(AttendanceDateException).order_by(AttendanceDateException.exception_date)).all()
    return AttendancePolicyResponse(
        weekly_holidays=[item.weekday for item in weekly],
        date_exceptions=[_exception_response(item) for item in exceptions],
    )


@attendance_policy_router.put("/weekly-holidays", response_model=AttendancePolicyResponse)
def replace_weekly_holidays(
    weekdays: list[int],
    user: Annotated[User, Depends(require_permission("setup_timings", "edit"))],
    session: Session = Depends(get_session),
):
    if len(set(weekdays)) != len(weekdays) or any(day < 0 or day > 6 for day in weekdays):
        raise HTTPException(status_code=400, detail="Weekdays must be unique values from 0 (Monday) to 6 (Sunday).")
    existing = session.exec(select(AttendanceWeeklyHoliday)).all()
    for item in existing:
        session.delete(item)
    for day in weekdays:
        session.add(AttendanceWeeklyHoliday(weekday=day, created_by=user.id))
    session.commit()
    return get_policy(user, session)


@attendance_policy_router.post("/exceptions", response_model=AttendanceDateExceptionResponse)
def create_date_exception(
    payload: AttendanceDateExceptionCreate,
    user: Annotated[User, Depends(require_permission("setup_timings", "edit"))],
    session: Session = Depends(get_session),
):
    if payload.kind not in VALID_EXCEPTION_KINDS:
        raise HTTPException(status_code=400, detail="kind must be HOLIDAY or WORKING_DAY.")
    item = AttendanceDateException(**payload.model_dump(), created_by=user.id)
    session.add(item)
    try:
        session.commit()
        session.refresh(item)
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="An exception already exists for this date.")
    return _exception_response(item)


@attendance_policy_router.delete("/exceptions/{exception_id}", response_model=dict)
def delete_date_exception(
    exception_id: int,
    user: Annotated[User, Depends(require_permission("setup_timings", "edit"))],
    session: Session = Depends(get_session),
):
    item = session.get(AttendanceDateException, exception_id)
    if not item:
        raise HTTPException(status_code=404, detail="Date exception not found.")
    session.delete(item)
    session.commit()
    return {"message": "Date exception deleted."}


@attendance_policy_router.get("/resolve/{attendance_date}", response_model=AttendanceCalendarResult)
def resolve_policy(
    attendance_date: date,
    current_user: Annotated[User, Depends(require_authenticated())],
    session: Session = Depends(get_session),
):
    return resolve_attendance_calendar(session, attendance_date)