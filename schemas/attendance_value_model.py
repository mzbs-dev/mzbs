from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field, Column
from sqlalchemy import String, Integer, DateTime
from typing import List, Optional, Literal
from pydantic import BaseModel

# ==================== SQLModel Database Models ====================

class AttendanceValueBase(SQLModel):
    attendance_value_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class AttendanceValue(AttendanceValueBase, table=True):
    attendance_value: str = Field(index=True, unique=True)

    # Relationship back to Attendance
    attendances: list["Attendance"] = Relationship(
        back_populates="attendance_value")


# ==================== Pydantic API Models ====================

class AttendanceValueBaseAPI(BaseModel):
    student_id: int
    date: datetime
    status: Literal['present', 'absent', 'late', 'leave']


class AttendanceValueCreate(AttendanceValueBaseAPI):
    pass


class AttendanceValueUpdate(AttendanceValueBaseAPI):
    pass


class AttendanceValueResponse(AttendanceValueBaseAPI):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AttendanceValueDelete(SQLModel):
    attendance_value_id: int
    message: str = "Attendance value deleted successfully"
