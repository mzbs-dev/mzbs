from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class AttendanceWeeklyHoliday(SQLModel, table=True):
    __tablename__ = "attendance_weekly_holiday"

    id: Optional[int] = Field(default=None, primary_key=True)
    weekday: int = Field(nullable=False, index=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("weekday", name="uq_attendance_weekly_holiday_weekday"),)


class AttendanceDateException(SQLModel, table=True):
    __tablename__ = "attendance_date_exception"

    id: Optional[int] = Field(default=None, primary_key=True)
    exception_date: date = Field(nullable=False, index=True)
    kind: str = Field(nullable=False)
    label: Optional[str] = Field(default=None, nullable=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("exception_date", name="uq_attendance_date_exception_date"),)


class AttendancePolicyResponse(SQLModel):
    weekly_holidays: list[int]
    date_exceptions: list["AttendanceDateExceptionResponse"]


class AttendanceDateExceptionCreate(SQLModel):
    exception_date: date
    kind: str
    label: Optional[str] = None


class AttendanceDateExceptionResponse(SQLModel):
    id: int
    exception_date: date
    kind: str
    label: Optional[str] = None


class AttendanceCalendarResult(SQLModel):
    attendance_date: date
    weekday: str
    is_holiday: bool
    label: Optional[str] = None