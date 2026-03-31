from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from typing import List, Optional
# from schemas.attendance_model import Attendance
# from schemas.fee_model import Fee

# ****************************************************************************************
# Class Names

class ClassNamesBase(SQLModel):
    class_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class ClassNames(ClassNamesBase, table=True):
    class_name: str = Field(index=True, unique=True)

    # Relationship back to Attendance
    attendances: List["Attendance"] = Relationship(back_populates="attendance_class") # type: ignore
    fees: List["Fee"] = Relationship(back_populates="class_names") # type: ignore


class ClassNamesCreate(SQLModel):
    class_name: str = Field(index=True, unique=True)


class ClassNamesResponse(ClassNamesBase, SQLModel):
    class_name: str
