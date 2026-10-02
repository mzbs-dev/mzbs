from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from db import get_session
from schemas.teacher_names_model import TeacherNames, TeacherNamesResponse
from user.user_crud import require_permission
from user.user_models import User, UserRole


deleted_staff_router = APIRouter(
    prefix="/deleted-staff",
    tags=["Deleted Staff"],
    responses={404: {"description": "Not found"}},
)


def _require_admin_or_chief_principal(current_user: User) -> None:
    if current_user.role not in {UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL}:
        raise HTTPException(
            status_code=403,
            detail="Deleted staff is restricted to ADMIN and CHIEF_PRINCIPAL only.",
        )


@deleted_staff_router.get("/", response_model=list[TeacherNamesResponse])
def list_deleted_staff(
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "view"))],
    session: Annotated[Session, Depends(get_session)],
):
    """List all soft-deleted teacher records."""
    _require_admin_or_chief_principal(current_user)
    return session.exec(
        select(TeacherNames)
        .where(TeacherNames.is_deleted.is_(True))
        .order_by(TeacherNames.deleted_at.desc())
    ).all()


@deleted_staff_router.get("/{teacher_id}", response_model=TeacherNamesResponse)
def get_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "view"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Read a deleted teacher record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")
    return staff


@deleted_staff_router.post("/{teacher_id}/restore", response_model=TeacherNamesResponse)
def restore_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "edit"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Restore a soft-deleted teacher record without creating a new record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")

    linked_user = session.exec(
        select(User).where(User.teacher_name_id == staff.teacher_name_id)
    ).first()

    staff.is_deleted = False
    staff.deleted_at = None
    staff.deleted_by = None

    if linked_user is not None and linked_user.role != UserRole.ADMIN:
        linked_user.is_active = True
        session.add(linked_user)

    session.add(staff)
    session.commit()
    session.refresh(staff)
    return staff


@deleted_staff_router.delete("/{teacher_id}/permanent")
def permanently_delete_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "edit"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Permanently remove a soft-deleted teacher and its linked teacher-user record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")

    linked_user = session.exec(
        select(User).where(User.teacher_name_id == staff.teacher_name_id)
    ).first()

    if linked_user is not None and linked_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Cannot permanently delete this teacher because the linked user is an ADMIN account.",
        )

    try:
        if linked_user is not None:
            session.delete(linked_user)
            session.flush()

        session.delete(staff)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot permanently delete this teacher because attendance, payroll, "
                "or another record still references it. Related history was preserved."
            ),
        ) from exc
    except Exception as exc:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Permanent deletion failed. No records were removed.",
        ) from exc

    return {"message": f"Teacher '{staff.teacher_name}' and linked user were permanently deleted."}
