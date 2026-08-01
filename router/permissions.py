from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from db import get_session
from utils.cache import cache_invalidate
from token_deps import TokenPayload, get_token_payload
from schemas.role_permission_model import (
    RolePermission,
    RolePermissionResponse,
    RolePermissionUpdate,
    PermissionChangeLog,
)
from user.user_crud import require_admin, has_permission, get_current_user
from user.user_models import User, UserRole

permissions_router = APIRouter(
    prefix="/permissions",
    tags=["Permissions"],
    responses={404: {"Description": "Not found"}},
)

MODULES = [
    "students", "attendance", "exam", "exam_session", "staff", "fees", "income", "expenses", "salary",
    "admissions", "deleted_students",
    "setup_classes", "setup_class_subjects", "setup_timings", "setup_attendance_values", "setup_teachers",
    "setup_income_categories", "setup_expense_categories", "setup_users",
    "setup_reset_student_password",
]
ACTIONS = ["view", "add", "edit", "delete"]


@permissions_router.get("/", response_model=List[RolePermissionResponse])
def get_all_permissions(
    current_user: Annotated[User, Depends(require_admin())],
    session: Session = Depends(get_session),
):
    """Full permission matrix — ADMIN only. Used by the Day 4 Setup screen.

    Note: this reads directly from the DB (session is already tenant-scoped
    via get_session -> get_tenant_engine), not from the cache, so it doesn't
    need tenant_id threaded through — it was never part of the bug."""
    rows = session.exec(select(RolePermission)).all()
    return rows


@permissions_router.get("/me", response_model=dict)
def get_my_permissions(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_session),
    payload: TokenPayload = Depends(get_token_payload),
):
    """Current user's own resolved permissions — any authenticated user.
    Used by RoleContext.tsx after login, and by the sidebar to decide
    what to render, in place of the static ROLE_PERMISSIONS object."""
    result: dict[str, dict[str, bool]] = {}
    for module in MODULES:
        result[module] = {
            action: has_permission(current_user.role, module, action, session, payload.tenant_id)
            for action in ACTIONS
        }
    return result


@permissions_router.patch("/{role}/{module}/{action}", response_model=RolePermissionResponse)
def update_permission(
    role: UserRole,
    module: str,
    action: str,
    payload: RolePermissionUpdate,
    current_user: Annotated[User, Depends(require_admin())],
    session: Session = Depends(get_session),
    token_payload: TokenPayload = Depends(get_token_payload),
):
    """Toggle one cell — ADMIN only. Writes role_permissions +
    permission_change_log, then invalidates ONLY this tenant's cache entry
    so the change takes effect immediately for this school, without
    forcing every other tenant to re-fetch on their next request."""
    if module not in MODULES:
        raise HTTPException(status_code=400, detail=f"Unknown module: {module}")
    if action not in ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    row = session.exec(
        select(RolePermission).where(
            RolePermission.role == role,
            RolePermission.module == module,
            RolePermission.action == action,
        )
    ).first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No permission row found for {role.value}/{module}/{action} — "
                   f"run the Day 1 migration first, this endpoint only updates existing rows.",
        )

    old_value = row.allowed
    row.allowed = payload.allowed
    row.updated_by = current_user.id

    change_log = PermissionChangeLog(
        role=role,
        module=module,
        action=action,
        old_value=old_value,
        new_value=payload.allowed,
        changed_by=current_user.id,
    )

    session.add(row)
    session.add(change_log)
    session.commit()
    session.refresh(row)

    cache_invalidate("role_permissions", token_payload.tenant_id)

    return row