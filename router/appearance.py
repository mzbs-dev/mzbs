"""
Appearance settings router.

GET  /appearance   -- any authenticated role (all roles see the same theme,
                       since this table has exactly one row per tenant DB)
PATCH /appearance  -- ADMIN only

ASSUMPTION TO VERIFY against user/user_crud.py:
  - `require_admin` is imported from user.user_crud and is CALLED to
    produce the dependency: Depends(require_admin()), matching the
    documented pattern (def require_admin(): return require_roles([...])).
  - `get_current_user` is imported from user.user_crud and returns an
    object with an `.id` attribute (used for `updated_by`).
If either of these differs in the real file, only the two `Depends(...)`
lines below need adjusting -- nothing else in this router depends on it.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from db import get_session
from user.user_crud import get_current_user, require_admin
from schemas.appearance_model import AppearanceSettings, AppearanceUpdate, AppearanceResponse

appearance_router = APIRouter(prefix="/appearance", tags=["appearance"])


@appearance_router.get("", response_model=AppearanceResponse)
def get_appearance(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    row = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
    if not row:
        # Should never happen post-migration, but fail soft rather than 500
        # so a missed migration doesn't take down every dashboard's load.
        row = AppearanceSettings(id=1, theme_palette="default")
    return AppearanceResponse(theme_palette=row.theme_palette, updated_at=row.updated_at)


@appearance_router.patch("", response_model=AppearanceResponse)
def update_appearance(
    payload: AppearanceUpdate,
    session: Session = Depends(get_session),
    current_user=Depends(require_admin()),
):
    row = session.exec(select(AppearanceSettings).where(AppearanceSettings.id == 1)).first()
    if not row:
        row = AppearanceSettings(id=1)
        session.add(row)

    row.theme_palette = payload.theme_palette
    row.updated_by = current_user.id
    row.updated_at = datetime.utcnow()

    session.add(row)
    session.commit()
    session.refresh(row)

    return AppearanceResponse(theme_palette=row.theme_palette, updated_at=row.updated_at)
