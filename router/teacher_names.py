from asyncio.log import logger
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError  # <-- Add this import

from db import get_session
from utils.cache import cache_get, cache_set, cache_invalidate
from token_deps import TokenPayload, get_token_payload

from schemas.teacher_names_model import TeacherNames, TeacherNamesCreate, TeacherNamesResponse
from schemas.attendance_model import Attendance
from schemas.exam_marks_model import ExamMark
from schemas.salary_model import TeacherSalary, SalaryLedger, SalaryPayment, Allowance, Deduction
from user.user_crud import require_permission, require_admin_teacher_principal_accountant
from user.user_models import User

teachernames_router = APIRouter(
    prefix="/teacher_name",
    tags=["Teacher Name"],
    responses={404: {"Description": "Not found"}}
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
            raise HTTPException(
                status_code=400, detail="Teacher name or ID must be unique."
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


@teachernames_router.get("/teacher-names-all/", response_model=List[TeacherNamesResponse])
def read_teachernames(
    current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    cached = cache_get("teacher_names", payload.tenant_id)
    if cached is not None:
        return cached
    teachernames = session.exec(select(TeacherNames)).all()
    result = [TeacherNamesResponse.model_validate(t) for t in teachernames]
    cache_set("teacher_names", payload.tenant_id, result)
    return result

# # Returns teacher name of any specific teacher-name-id


@teachernames_router.get("/{teacher_name_id}", response_model=TeacherNamesResponse)
def read_teachernames(current_user: Annotated[User, Depends(require_admin_teacher_principal_accountant())],teacher_name_id: int, session: Session = Depends(get_session)):
    teachernames = session.get(TeacherNames, teacher_name_id)
    if not teachernames:
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
    # Check for related records (adjust model and field as needed)
    # related_records = session.exec(select(SomeRelatedModel).where(SomeRelatedModel.teacher_name == teacher_name)).all()
    related_records = []  # <-- Replace with actual query if you have related records
    if related_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: There are records using this teacher names."
        )
    session.delete(teachernames)
    session.commit()
    cache_invalidate("teacher_names", payload.tenant_id)
    return {"message": "Teacher Name deleted successfully"}

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
    """Delete a teacher by their ID"""
    teacher = session.get(TeacherNames, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=404,
            detail=f"Teacher with ID {teacher_id} not found"
        )

    related_records = _get_related_teacher_record_names(session, teacher_id)
    if related_records:
        related_list = ", ".join(related_records)
        raise HTTPException(
            status_code=409,
            detail=f"Please delete related {related_list} records first before deleting this teacher."
        )

    try:
        session.delete(teacher)
        session.commit()
        cache_invalidate("teacher_names", payload.tenant_id)
        return {"message": f"Teacher with ID {teacher_id} deleted successfully"}
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