from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class StaffShiftTimingVersion(SQLModel, table=True):
    __tablename__ = "staff_shift_timing_version"

    schedule_id: Optional[int] = Field(default=None, primary_key=True)
    attendance_time_id: int = Field(
        foreign_key="attendancetime.attendance_time_id",
        nullable=False,
        index=True,
    )
    start_time: time = Field(nullable=False)
    end_time: time = Field(nullable=False)
    effective_from: date = Field(nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    is_migration_baseline: bool = Field(default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "attendance_time_id",
            "effective_from",
            name="uq_staff_shift_timing_shift_effective_from",
        ),
    )


class StaffShiftTimingVersionCreate(SQLModel):
    start_time: time
    end_time: time
    effective_from: date


class StaffShiftTimingVersionResponse(SQLModel):
    schedule_id: int
    attendance_time_id: int
    attendance_time: str
    start_time: time
    end_time: time
    effective_from: date
    created_by: Optional[int] = None
    created_at: datetime
    is_migration_baseline: bool = False