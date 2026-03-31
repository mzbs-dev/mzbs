from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field, Column
from sqlalchemy import DateTime
from typing import List, Optional

from sqlmodel import Field, SQLModel
from datetime import datetime

# from schemas.admission_model import Admission
# from schemas.attendance_model import Attendance
# from schemas.fee_model import Fee

# ****************************************************************************************
# Request Models


class SoftDeleteRequest(SQLModel):
    """Payload sent when an admin soft-deletes a student."""
    reason: str
    deleted_by: int  # User ID of the admin/principal performing deletion


# ****************************************************************************************
# Students


class StudentsBase(SQLModel):
    student_id: Optional[int] = Field(default=None, primary_key=True)


class Students(StudentsBase, table=True):
    student_name: str
    student_date_of_birth: datetime = Field(sa_column=Column(DateTime))
    student_gender: str
    student_age: str
    student_education: str
    class_name: str
    student_city: str
    student_address: str

    father_name: str
    father_occupation: str
    father_cnic: str
    father_cast_name: str
    father_contact: str

    # Relationship to Attendance
    attendances: list["Attendance"] = Relationship(
        back_populates="attendance_student")
    admissions: list["Admission"] = Relationship(back_populates="student")
    fees: List["Fee"] = Relationship(back_populates="students")


class StudentsCreate(SQLModel):
    student_name: str
    student_date_of_birth: datetime = Field(sa_column=Column(DateTime))
    student_gender: str
    student_age: str
    student_education: str
    class_name: str
    student_city: str
    student_address: str
    father_name: str
    father_occupation: str
    father_cnic: str
    father_cast_name: str
    father_contact: str


class StudentsResponse(StudentsBase):
    student_id: int  # type: ignore # Include the ID in the response model
    student_name: str
    student_date_of_birth: datetime = Field(sa_column=Column(DateTime))
    student_gender: str
    student_age: str
    student_education: str
    class_name: str
    student_city: str
    student_address: str

    father_name: str
    father_occupation: str
    father_cnic: str
    father_cast_name: str
    father_contact: str


class StudentsUpdate(SQLModel):
    student_name: Optional[str] = None
    student_date_of_birth: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime))
    student_gender: Optional[str] = None
    student_age: Optional[str] = None
    student_education: Optional[str] = None
    class_name: Optional[str] = None
    student_city: Optional[str] = None
    student_address: Optional[str] = None

    father_name: Optional[str] = None
    father_occupation: Optional[str] = None
    father_cnic: Optional[str] = None
    father_cast_name: Optional[str] = None
    father_contact: Optional[str] = None


# ****************************************************************************************
# Deleted Students (Soft Delete Audit Table)


class DeletedStudent(SQLModel, table=True):
    """Audit table for soft-deleted students."""
    student_id: Optional[int] = Field(default=None, primary_key=True)
    original_student_id: int
    student_name: str
    class_name: str
    student_date_of_birth: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime))
    student_gender: Optional[str] = None
    student_age: Optional[str] = None
    student_education: Optional[str] = None
    student_city: Optional[str] = None
    student_address: Optional[str] = None
    father_name: Optional[str] = None
    father_occupation: Optional[str] = None
    father_cnic: Optional[str] = None
    father_cast_name: Optional[str] = None
    father_contact: Optional[str] = None
    reason: str
    deleted_by: int
    deleted_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime))


class DeletedStudentResponse(SQLModel):
    """Response schema for a deleted student record."""
    student_id: int
    original_student_id: int
    student_name: str
    class_name: str
    father_name: Optional[str] = None
    reason: str
    deleted_by: int
    deleted_by_name: Optional[str] = None
    deleted_at: datetime

    class Config:
        from_attributes = True
