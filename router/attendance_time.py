
# from asyncio.log import logger
# from typing import Annotated, List
# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlmodel import Session, select
# from sqlalchemy.exc import IntegrityError  # <-- Add this import

# from db import get_session
# from utils.cache import cache_get, cache_set, cache_invalidate
# from schemas.attendance_time_model import AttendanceTime, AttendanceTimeCreate, AttendanceTimeResponse
# from schemas.attendance_model import Attendance
# from user.user_crud import require_permission, require_authenticated
# from user.user_models import User
# attendance_time_router = APIRouter(
#     prefix="/attendance_time",
#     tags=["Attendance Time"],
#     responses={404: {"Description": "Not found"}}
# )


# @attendance_time_router.get("/", response_model=dict)
# async def root():
#     return {"message": "MMS-General service is running", "status": "Attendance Time Router Page running :-)"}


# @attendance_time_router.post("/add_attendance_value/", response_model=AttendanceTimeResponse)
# def create_attendance_time(user: Annotated[User, Depends(require_permission("setup_timings", "add"))],attendance_time: AttendanceTimeCreate, session: Session = Depends(get_session)):
#     db_attendance_time = AttendanceTime(**attendance_time.model_dump())
#     session.add(db_attendance_time)

#     try:
#         session.commit()
#         session.refresh(db_attendance_time)
#         cache_invalidate("attendance_times")
#     except IntegrityError as e:
#         session.rollback()
#         logger.error(f"Integrity error: {e}")
#         if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
#             raise HTTPException(
#                 status_code=400, detail="Attendance time or ID must be unique."
#             )
#         raise HTTPException(
#             status_code=400, detail="Database integrity error."
#         )
#     except Exception as e:
#         session.rollback()
#         # Log any other unexpected errors
#         logger.error(f"Unexpected error: {e}")
#         raise HTTPException(
#             status_code=500, detail="Internal server error."
#         )

#     return db_attendance_time

# # # Returns all placed attendance_times


# @attendance_time_router.get("/attendance-values-all/", response_model=List[AttendanceTimeResponse])
# def read_attendance_times(
#     current_user: Annotated[User, Depends(require_authenticated())],
#     session: Session = Depends(get_session)
# ):
#     cached = cache_get("attendance_times")
#     if cached is not None:
#         return cached
#     attendance_times = session.exec(select(AttendanceTime)).all()
#     result = [AttendanceTimeResponse.model_validate(t) for t in attendance_times]
#     cache_set("attendance_times", result)
#     return result

# # # Returns attendance_time of any specific attendance_time-id


# @attendance_time_router.get("/{attendance_time_id}", response_model=AttendanceTimeResponse)
# def read_attendance_time(current_user: Annotated[User, Depends(require_authenticated())],attendance_time_id: int, session: Session = Depends(get_session)):
#     attendance_time = session.get(AttendanceTime, attendance_time_id)
#     if not attendance_time:
#         raise HTTPException(
#             status_code=404, detail="Attendance_time not found")
#     return attendance_time


# @attendance_time_router.delete("/del/{attend_value_name}", response_model=dict)
# def delete_attendance_time(user: Annotated[User, Depends(require_permission("setup_timings", "delete"))],attend_value_name: str, session: Session = Depends(get_session)):
#     attendance_time = session.exec(select(AttendanceTime).where(
#         AttendanceTime.attendance_time == attend_value_name)).first()
#     # Check for related records (adjust model and field as needed)
#     related_records = []  # <-- Replace with actual query if you have related records
#     if not attendance_time:
#         raise HTTPException(
#             status_code=404, detail="Attendance Time not found")
#     if related_records:
#         raise HTTPException(
#             status_code=400,
#             detail="Cannot delete: There are records using this attendance time."
#         )
#     session.delete(attendance_time)
#     session.commit()
#     cache_invalidate("attendance_times")
#     return {"message": "Attendance Time deleted successfully"}

# @attendance_time_router.delete("/{attendance_time_id}", response_model=dict)
# def delete_attendance_time_by_id(
#     user: Annotated[User, Depends(require_permission("setup_timings", "delete"))],
#     attendance_time_id: int, 
#     session: Session = Depends(get_session)
# ):
#     """Delete an attendance time by its ID"""
#     attendance_time = session.get(AttendanceTime, attendance_time_id)
#     if not attendance_time:
#         raise HTTPException(
#             status_code=404, 
#             detail=f"Attendance Time with ID {attendance_time_id} not found"
#         )
#     # Check for related attendance records
#     linked_attendance = session.exec(select(Attendance).where(Attendance.attendance_time_id == attendance_time_id)).first()
#     if linked_attendance:
#         raise HTTPException(
#             status_code=409,
#             detail="Please delete related attendance records first before deleting this timing."
#         )
#     try:
#         session.delete(attendance_time)
#         session.commit()
#         cache_invalidate("attendance_times")
#         return {"message": f"Attendance Time with ID {attendance_time_id} deleted successfully"}
#     except Exception as e:
#         session.rollback()
#         logger.error(f"Error deleting attendance time: {e}")
#         raise HTTPException(
#             status_code=500,
#             detail="Error deleting attendance time"
#         )

from asyncio.log import logger
from datetime import date, datetime
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from utils.cache import cache_get, cache_set, cache_invalidate
from token_deps import TokenPayload, get_token_payload
from schemas.attendance_time_model import AttendanceTime, AttendanceTimeCreate, AttendanceTimeResponse
from schemas.attendance_model import Attendance
from schemas.attendance_time_shift_config_model import (
    AttendanceTimeShiftConfig,
    AttendanceTimeShiftConfigUpsert,
    AttendanceTimeShiftConfigResponse,
)
from schemas.staff_shift_timing_model import (
    StaffShiftTimingVersion,
    StaffShiftTimingVersionCreate,
    StaffShiftTimingVersionResponse,
)
from services.staff_shift_timing import validate_timing_range
from user.user_crud import require_permission, require_authenticated
from user.user_models import User
attendance_time_router = APIRouter(
    prefix="/attendance_time",
    tags=["Attendance Time"],
    responses={404: {"Description": "Not found"}}
)


def _timing_version_response(
    session: Session,
    version: StaffShiftTimingVersion,
) -> StaffShiftTimingVersionResponse:
    shift = session.get(AttendanceTime, version.attendance_time_id)
    return StaffShiftTimingVersionResponse(
        schedule_id=version.schedule_id,
        attendance_time_id=version.attendance_time_id,
        attendance_time=shift.attendance_time if shift else "",
        start_time=version.start_time,
        end_time=version.end_time,
        effective_from=version.effective_from,
        created_by=version.created_by,
        created_at=version.created_at,
        is_migration_baseline=version.is_migration_baseline,
    )


@attendance_time_router.get(
    "/{attendance_time_id}/timing-versions",
    response_model=List[StaffShiftTimingVersionResponse],
)
def list_timing_versions(
    attendance_time_id: int,
    current_user: Annotated[User, Depends(require_authenticated())],
    session: Session = Depends(get_session),
):
    if not session.get(AttendanceTime, attendance_time_id):
        raise HTTPException(status_code=404, detail="Attendance Time not found")
    versions = session.exec(
        select(StaffShiftTimingVersion)
        .where(StaffShiftTimingVersion.attendance_time_id == attendance_time_id)
        .order_by(StaffShiftTimingVersion.effective_from.desc())
    ).all()
    return [_timing_version_response(session, version) for version in versions]


@attendance_time_router.post(
    "/{attendance_time_id}/timing-versions",
    response_model=StaffShiftTimingVersionResponse,
)
def create_timing_version(
    attendance_time_id: int,
    timing: StaffShiftTimingVersionCreate,
    user: Annotated[User, Depends(require_permission("setup_timings", "edit"))],
    session: Session = Depends(get_session),
):
    if not session.get(AttendanceTime, attendance_time_id):
        raise HTTPException(status_code=404, detail="Attendance Time not found")
    validate_timing_range(timing.start_time, timing.end_time)
    version = StaffShiftTimingVersion(
        attendance_time_id=attendance_time_id,
        start_time=timing.start_time,
        end_time=timing.end_time,
        effective_from=timing.effective_from,
        created_by=user.id,
    )
    session.add(version)
    try:
        session.commit()
        session.refresh(version)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A timing version already exists for this shift and effective date.",
        )
    return _timing_version_response(session, version)


@attendance_time_router.get(
    "/{attendance_time_id}/timing-version",
    response_model=StaffShiftTimingVersionResponse,
)
def get_timing_version_for_date(
    attendance_time_id: int,
    current_user: Annotated[User, Depends(require_authenticated())],
    for_date: date = Query(...),
    session: Session = Depends(get_session),
):
    version = session.exec(
        select(StaffShiftTimingVersion)
        .where(
            StaffShiftTimingVersion.attendance_time_id == attendance_time_id,
            StaffShiftTimingVersion.effective_from <= for_date,
        )
        .order_by(StaffShiftTimingVersion.effective_from.desc())
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="No timing version applies to this date")
    return _timing_version_response(session, version)


@attendance_time_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Attendance Time Router Page running :-)"}


@attendance_time_router.post("/add_attendance_value/", response_model=AttendanceTimeResponse)
def create_attendance_time(
    user: Annotated[User, Depends(require_permission("setup_timings", "add"))],
    attendance_time: AttendanceTimeCreate,
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    db_attendance_time = AttendanceTime(**attendance_time.model_dump())
    session.add(db_attendance_time)

    try:
        session.commit()
        session.refresh(db_attendance_time)
        cache_invalidate("attendance_times", payload.tenant_id)
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            raise HTTPException(
                status_code=400, detail="Attendance time or ID must be unique."
            )
        raise HTTPException(
            status_code=400, detail="Database integrity error."
        )
    except Exception as e:
        session.rollback()
        # Log any other unexpected errors
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error."
        )

    return db_attendance_time

# # Returns all placed attendance_times


@attendance_time_router.get("/attendance-values-all/", response_model=List[AttendanceTimeResponse])
def read_attendance_times(
    current_user: Annotated[User, Depends(require_authenticated())],
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    cached = cache_get("attendance_times", payload.tenant_id)
    if cached is not None:
        return cached
    attendance_times = session.exec(select(AttendanceTime)).all()
    result = [AttendanceTimeResponse.model_validate(t) for t in attendance_times]
    cache_set("attendance_times", payload.tenant_id, result)
    return result

# # Returns attendance_time of any specific attendance_time-id


@attendance_time_router.get("/{attendance_time_id}", response_model=AttendanceTimeResponse)
def read_attendance_time(current_user: Annotated[User, Depends(require_authenticated())],attendance_time_id: int, session: Session = Depends(get_session)):
    attendance_time = session.get(AttendanceTime, attendance_time_id)
    if not attendance_time:
        raise HTTPException(
            status_code=404, detail="Attendance_time not found")
    return attendance_time


@attendance_time_router.delete("/del/{attend_value_name}", response_model=dict)
def delete_attendance_time(
    user: Annotated[User, Depends(require_permission("setup_timings", "delete"))],
    attend_value_name: str,
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    attendance_time = session.exec(select(AttendanceTime).where(
        AttendanceTime.attendance_time == attend_value_name)).first()
    # Check for related records (adjust model and field as needed)
    related_records = []  # <-- Replace with actual query if you have related records
    if not attendance_time:
        raise HTTPException(
            status_code=404, detail="Attendance Time not found")
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this attendance time."
        )
    session.delete(attendance_time)
    session.commit()
    cache_invalidate("attendance_times", payload.tenant_id)
    return {"message": "Attendance Time deleted successfully"}

@attendance_time_router.delete("/{attendance_time_id}", response_model=dict)
def delete_attendance_time_by_id(
    user: Annotated[User, Depends(require_permission("setup_timings", "delete"))],
    attendance_time_id: int, 
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    """Delete an attendance time by its ID"""
    attendance_time = session.get(AttendanceTime, attendance_time_id)
    if not attendance_time:
        raise HTTPException(
            status_code=404, 
            detail=f"Attendance Time with ID {attendance_time_id} not found"
        )
    # Check for related attendance records
    linked_attendance = session.exec(select(Attendance).where(Attendance.attendance_time_id == attendance_time_id)).first()
    if linked_attendance:
        raise HTTPException(
            status_code=409,
            detail="Please delete related attendance records first before deleting this timing."
        )
    try:
        session.delete(attendance_time)
        session.commit()
        cache_invalidate("attendance_times", payload.tenant_id)
        return {"message": f"Attendance Time with ID {attendance_time_id} deleted successfully"}
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting attendance time: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting attendance time"
        )


# ============================================================================
# Phase 6 — Shift Timing Setup (expected arrival/departure per shift)
# Writes to attendance_time_shift_config, NOT to attendancetime itself —
# per the locked "shadow table" design decision (attendancetime is
# load-bearing/shared with student attendance and dashboard aggregation;
# no DDL against it). Additive only — nothing above this line is touched.
# ============================================================================


def _to_shift_config_response(
    session: Session,
    attendance_time_id: int,
    config: Optional[AttendanceTimeShiftConfig],
) -> AttendanceTimeShiftConfigResponse:
    shift = session.get(AttendanceTime, attendance_time_id)
    return AttendanceTimeShiftConfigResponse(
        attendance_time_id=attendance_time_id,
        attendance_time=shift.attendance_time if shift else None,
        expected_arrival_time=config.expected_arrival_time if config else None,
        expected_departure_time=config.expected_departure_time if config else None,
        updated_at=config.updated_at if config else None,
    )


@attendance_time_router.get(
    "/{attendance_time_id}/shift-config",
    response_model=AttendanceTimeShiftConfigResponse,
)
def get_shift_config(
    current_user: Annotated[User, Depends(require_authenticated())],
    attendance_time_id: int,
    session: Session = Depends(get_session),
):
    shift = session.get(AttendanceTime, attendance_time_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Attendance Time not found")
    config = session.get(AttendanceTimeShiftConfig, attendance_time_id)
    # No row yet is a valid state, not an error — resolves to all-null times.
    return _to_shift_config_response(session, attendance_time_id, config)


@attendance_time_router.put(
    "/{attendance_time_id}/shift-config",
    response_model=AttendanceTimeShiftConfigResponse,
)
def upsert_shift_config(
    user: Annotated[User, Depends(require_permission("setup_timings", "edit"))],
    attendance_time_id: int,
    payload: AttendanceTimeShiftConfigUpsert,
    session: Session = Depends(get_session),
):
    shift = session.get(AttendanceTime, attendance_time_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Attendance Time not found")

    config = session.get(AttendanceTimeShiftConfig, attendance_time_id)
    if config:
        config.expected_arrival_time = payload.expected_arrival_time
        config.expected_departure_time = payload.expected_departure_time
        config.updated_by = user.id
        config.updated_at = datetime.utcnow()
    else:
        config = AttendanceTimeShiftConfig(
            attendance_time_id=attendance_time_id,
            expected_arrival_time=payload.expected_arrival_time,
            expected_departure_time=payload.expected_departure_time,
            updated_by=user.id,
        )
    session.add(config)
    session.commit()
    session.refresh(config)
    return _to_shift_config_response(session, attendance_time_id, config)
