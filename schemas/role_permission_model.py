from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

from user.user_models import UserRole


class RolePermissionBase(SQLModel):
    role: UserRole
    module: str  # students, attendance, exam, staff, fees, income, expenses, salary, setup
    action: str  # view, add, edit, delete
    allowed: bool = False


class RolePermission(RolePermissionBase, table=True):
    __tablename__ = "role_permissions"

    id: Optional[int] = Field(default=None, primary_key=True)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RolePermissionCreate(RolePermissionBase):
    pass


class RolePermissionResponse(RolePermissionBase):
    id: int
    updated_by: Optional[int] = None
    updated_at: datetime


class RolePermissionUpdate(SQLModel):
    allowed: bool


class PermissionChangeLog(SQLModel, table=True):
    __tablename__ = "permission_change_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    role: UserRole
    module: str
    action: str
    old_value: bool
    new_value: bool
    changed_by: int = Field(foreign_key="user.id")
    changed_at: datetime = Field(default_factory=datetime.utcnow)
