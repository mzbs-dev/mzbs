from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from datetime import datetime
from typing import List, Optional

# Attendance Time


class AttendanceTimeBase(SQLModel):
    attendance_time_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class AttendanceTime(AttendanceTimeBase, table=True):
    attendance_time: str = Field(index=True, unique=True)

    # Relationship back to Attendance
    attendances: list["Attendance"] = Relationship( # type: ignore
        back_populates="attendance_time")


class AttendanceTimeCreate(SQLModel):
    attendance_time: str = Field(index=True, unique=True)


class AttendanceTimeResponse (AttendanceTimeBase, SQLModel):
    attendance_time: str
