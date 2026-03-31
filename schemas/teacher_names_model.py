from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field, Column
from sqlalchemy import String, Integer, DateTime
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# Teacher Names


class TeacherNamesBase(SQLModel):
    teacher_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class TeacherNames(TeacherNamesBase, table=True):
    teacher_name: str = Field(index=True, unique=True)

    # Relationship to Attendance
    attendances: list["Attendance"] = Relationship(
        back_populates="attendance_teacher")


class TeacherNamesCreate(SQLModel):
    teacher_name: str = Field(index=True, unique=True)


class TeacherNamesResponse(TeacherNamesBase, SQLModel):
    teacher_name: str
