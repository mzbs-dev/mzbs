"""
Single-row, tenant-scoped appearance settings.

Lives inside each school's own database (same DB get_session() resolves to),
so every role at that school reads the same row -- no per-role or per-user
theme logic needed, and no cross-tenant leakage is possible by construction.

Deliberately no history table (unlike permission_change_log) -- last write
wins, per explicit decision: this is a live setting, not an audited one.
"""

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, CheckConstraint


class AppearanceSettings(SQLModel, table=True):
    __tablename__ = "appearance_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="appearance_settings_single_row"),
    )

    id: int = Field(default=1, primary_key=True)
    theme_palette: str = Field(default="slate-professional")  # matches colorPalettes.ts defaultPaletteId
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AppearanceUpdate(SQLModel):
    """Request body for PATCH /appearance"""
    theme_palette: str


class AppearanceResponse(SQLModel):
    """Response body for GET /appearance"""
    theme_palette: str
    updated_at: datetime
