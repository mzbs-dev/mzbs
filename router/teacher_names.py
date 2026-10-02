from asyncio.log import logger
from datetime import datetime
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from db import get_session
from utils.cache import cache_get, cache_set, cache_invalidate
from token_deps import TokenPayload, get_token_payload

from schemas.teacher_names_model import TeacherNames, TeacherNamesCreate, TeacherNamesResponse
from schemas.attendance_model import Attendance
from schemas.exam_marks_model import ExamMark
from schemas.salary_model import TeacherSalary, SalaryLedger, SalaryPayment, Allowance, Deduction
from user.user_crud import require_permission
from user.user_models import User, UserRole

teachernames_router = APIRouter(
    prefix="/teacher_name",
    tags=["Teacher Name"],
    responses={404: {"Description": "Not found"}}
)


def _normalize_teacher_name(teacher_name: str) -> str:
    return " ".join(teacher_name.strip().split())


def _teacher_name_duplicate_detail(teacher_name: str, existing: TeacherNames | None) -> str:
    normalized_name = _normalize_teacher_name(teacher_name)
    if existing is not None and existing.is_deleted:
        return (
            f'Teacher name "{normalized_name}" already exists in deleted records. '
            'Please restore that teacher or choose a different name.'
        )
    return (
        f'Teacher name "{normalized_name}" already exists and is active. '
        'Please choose a different name.'
    )


def _validate_teacher_name_not_in_use(session: Session, teacher_name: str) -> None:
    normalized_name = _normalize_teacher_name(teacher_name)
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Teacher name is required.")

    existing = session.exec(
        select(TeacherNames).where(
            func.lower(TeacherNames.teacher_name) == normalized_name.lower()
        )
    ).first()

    if existing is None:
        return

    raise HTTPException(
        status_code=409,
        detail=_teacher_name_duplicate_detail(normalized_name, existing),
    )


@teachernames_router.get("/", response_model=dict)
async def root():
    return {"message": "MMS-General service is running", "status": "Teacher Name Router Page running :-)"}


@teachernames_router.post("/add_teacher_name/", response_model=TeacherNamesResponse)
def create_teachernames(
    user: Annotated[User, Depends(require_permission("setup_teachers", "add"))],
    teachernames: TeacherNamesCreate,
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    normalized_name = _normalize_teacher_name(teachernames.teacher_name)
    teachernames.teacher_name = normalized_name
    _validate_teacher_name_not_in_use(session, teachernames.teacher_name)

    db_teachernames = TeacherNames(**teachernames.model_dump())
    session.add(db_teachernames)

    try:
        session.commit()
        session.refresh(db_teachernames)
        cache_invalidate("teacher_names", payload.tenant_id)
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Integrity error: {e}")
        if "unique constraint" in str(e.orig).lower() or "duplicate key" in str(e.orig).lower():
            existing = session.exec(
                select(TeacherNames).where(
                    func.lower(TeacherNames.teacher_name) == normalized_name.lower()
                )
            ).first()
            raise HTTPException(
                status_code=409,
                detail=_teacher_name_duplicate_detail(normalized_name, existing),
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

    return db_teachernames

# # Returns all placed teacher names


def _get_linked_user_for_teacher(session: Session, teacher_id: int) -> User | None:
    return session.exec(
        select(User).where(User.teacher_name_id == teacher_id)
    ).first()


def _soft_delete_teacher(session: Session, teacher: TeacherNames, actor: User) -> TeacherNames:
    teacher.is_deleted = True
    teacher.deleted_at = datetime.utcnow()
    teacher.deleted_by = actor.id

    linked_user = _get_linked_user_for_teacher(session, teacher.teacher_name_id)
    if linked_user is not None:
        if linked_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete this teacher because the linked user is an ADMIN account.",
            )
        linked_user.is_active = False
        session.add(linked_user)

    session.add(teacher)
    return teacher


def _restore_teacher(session: Session, teacher: TeacherNames) -> TeacherNames:
    teacher.is_deleted = False
    teacher.deleted_at = None
    teacher.deleted_by = None

    linked_user = _get_linked_user_for_teacher(session, teacher.teacher_name_id)
    if linked_user is not None and linked_user.role != UserRole.ADMIN:
        linked_user.is_active = True
        session.add(linked_user)

    session.add(teacher)
    return teacher


@teachernames_router.get("/teacher-names-for-attendance/", response_model=List[TeacherNamesResponse])
def read_teachernames_for_attendance(
    current_user: Annotated[User, Depends(require_permission("attendance", "view"))],
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    """Fetch active teacher names for attendance marking. Soft-deleted staff stay excluded."""
    cached = cache_get("teacher_names", payload.tenant_id)
    if cached is not None:
        return cached
    teacher_rows = session.exec(
        select(
            TeacherNames.teacher_name_id,
            TeacherNames.teacher_name,
            TeacherNames.created_at,
        ).where(TeacherNames.is_deleted.is_(False))
    ).all()
    result = [
        TeacherNamesResponse(
            teacher_name_id=teacher_id,
            teacher_name=teacher_name,
            created_at=created_at,
            is_deleted=False,
        )
        for teacher_id, teacher_name, created_at in teacher_rows
    ]
    cache_set("teacher_names", payload.tenant_id, result)
    return result


@teachernames_router.get("/teacher-names-all/", response_model=List[TeacherNamesResponse])
def read_teachernames(
    current_user: Annotated[User,Depends(require_permission("attendance", "view"))],
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    cached = cache_get("teacher_names", payload.tenant_id)
    if cached is not None:
        return cached
    teacher_rows = session.exec(
        select(
            TeacherNames.teacher_name_id,
            TeacherNames.teacher_name,
            TeacherNames.created_at,
        ).where(TeacherNames.is_deleted.is_(False))
    ).all()
    result = [
        TeacherNamesResponse(
            teacher_name_id=teacher_id,
            teacher_name=teacher_name,
            created_at=created_at,
            is_deleted=False,
        )
        for teacher_id, teacher_name, created_at in teacher_rows
    ]
    cache_set("teacher_names", payload.tenant_id, result)
    return result

# # Returns teacher name of any specific teacher-name-id


@teachernames_router.get("/{teacher_name_id}", response_model=TeacherNamesResponse)
def read_teachernames(current_user: Annotated[User, Depends(require_permission("setup_teachers", "view"))],teacher_name_id: int, session: Session = Depends(get_session)):
    teachernames = session.get(TeacherNames, teacher_name_id)
    if not teachernames or teachernames.is_deleted:
        raise HTTPException(
            status_code=404, detail="Teacher name not found")
    return teachernames


@teachernames_router.delete("/del/{teacher_name}", response_model=dict)
def delete_teachernames(
    user: Annotated[User, Depends(require_permission("setup_teachers", "delete"))],
    teacher_name: str,
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    teachernames = session.exec(select(TeacherNames).where(
        TeacherNames.teacher_name == teacher_name)).first()
    if not teachernames:
        raise HTTPException(
            status_code=404, detail="Teacher Name not found")
    if teachernames.is_deleted:
        raise HTTPException(
            status_code=409,
            detail="Teacher is already deleted."
        )

    _soft_delete_teacher(session, teachernames, user)
    session.commit()
    cache_invalidate("teacher_names", payload.tenant_id)
    return {"message": "Teacher Name soft-deleted successfully"}

def _get_related_teacher_record_names(session: Session, teacher_id: int) -> list[str]:
    related_records: list[str] = []

    if session.exec(select(Attendance).where(Attendance.teacher_name_id == teacher_id)).first():
        related_records.append("attendance")
    if session.exec(select(ExamMark).where(ExamMark.teacher_name_id == teacher_id)).first():
        related_records.append("exam marks")
    if session.exec(select(TeacherSalary).where(TeacherSalary.teacher_id == teacher_id)).first():
        related_records.append("salary")
    if session.exec(select(SalaryLedger).where(SalaryLedger.teacher_id == teacher_id)).first():
        related_records.append("salary ledger")
    if session.exec(select(SalaryPayment).where(SalaryPayment.teacher_id == teacher_id)).first():
        related_records.append("salary payment")
    if session.exec(select(Allowance).where(Allowance.teacher_id == teacher_id)).first():
        related_records.append("allowance")
    if session.exec(select(Deduction).where(Deduction.teacher_id == teacher_id)).first():
        related_records.append("deduction")

    return related_records


@teachernames_router.delete("/{teacher_id}", response_model=dict)
def delete_teacher_by_id(
    user: Annotated[User, Depends(require_permission("setup_teachers", "delete"))],
    teacher_id: int,
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    """Soft-delete a teacher by their ID."""
    teacher = session.get(TeacherNames, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=404,
            detail=f"Teacher with ID {teacher_id} not found"
        )

    if teacher.is_deleted:
        raise HTTPException(
            status_code=409,
            detail=f"Teacher with ID {teacher_id} is already deleted."
        )

    try:
        _soft_delete_teacher(session, teacher, user)
        session.commit()
        cache_invalidate("teacher_names", payload.tenant_id)
        return {"message": f"Teacher with ID {teacher_id} soft-deleted successfully"}
    except HTTPException:
        session.rollback()
        raise
    except IntegrityError as e:
        session.rollback()
        logger.error(f"Error deleting teacher: {e}")
        raise HTTPException(
            status_code=409,
            detail="Cannot delete teacher because related records still exist."
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting teacher: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error deleting teacher"
        )
