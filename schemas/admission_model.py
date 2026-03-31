from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field, Column
from sqlalchemy import String, Integer, DateTime
from typing import List, Optional

from datetime import datetime
from .students_model import Students

# Student Admission and Deletion-----------------------------------------------------------------------------------
# Used for Student Admission and Deletion Management


class AdmissionBase(SQLModel):
    admission_id: Optional[int] = Field(default=None, primary_key=True)


class Admission(AdmissionBase, table=True):
    admission_id: Optional[int] = Field(default=None, primary_key=True)
    admission_date: datetime = Field(sa_column=Column(DateTime))
    required_class: str

    # Foreign key to reference the Students table
    student_id: Optional[int] = Field(foreign_key="students.student_id")

    # Relationship back to Students
    student: Optional[Students] = Relationship(back_populates="admissions")


class AdmissionCreate(SQLModel):
    student_id: int
    required_class: str
    admission_date: datetime = Field(sa_column=Column(DateTime))


class AdmissionResponse(SQLModel):
    admission_id: int
    student_id: int
    admission_date: datetime = Field(sa_column=Column(DateTime))
    required_class: str


class TerminationBase(SQLModel):
    termination_id: Optional[int] = Field(default=None, primary_key=True)


class Termination(TerminationBase, table=True):
    total_stay: float
    termination_reason: str
    termination_date: datetime = Field(sa_column=Column(DateTime))
    attendance_count: int

    # Foreign key to reference Admission
    admission_id: Optional[int] = Field(foreign_key="admission.admission_id")

    # Relationship back to Admission
    admission: Optional[Admission] = Relationship()


class TerminationResponse(SQLModel):
    total_stay: float
    termination_reason: str
    termination_date: datetime = Field(sa_column=Column(DateTime))
    admission_id: int
    attendance_count: int


class DeletedStudents(SQLModel, table=True):
    deleted_student_id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int
    student_name: str
    student_date_of_birth: datetime
    student_gender: str
    student_age: str
    student_education: str
    student_class_name: str
    student_city: str
    student_address: str
    father_name: str
    father_occupation: str
    father_cnic: str
    father_cast_name: str
    father_contact: str
    deletion_date: datetime = Field(default=datetime.now())
    termination_reason: str
    attendance_count: int
    total_stay: int
