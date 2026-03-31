from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional


class SoftDeleteRequest(SQLModel):
    """Payload sent when an admin soft-deletes a student."""
    reason: str
    deleted_by: int  # User ID of the admin/principal performing deletion

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Student transferred to another school",
                "deleted_by": 1
            }
        }


class DeletedStudentResponse(SQLModel):
    """Response schema for a deleted student record."""
    student_id: int
    original_student_id: int
    student_name: str
    class_name: str
    father_name: Optional[str] = None
    reason: str
    deleted_by: int
    deleted_by_name: Optional[str] = None   # populated via join in router
    deleted_at: datetime

    class Config:
        from_attributes = True
