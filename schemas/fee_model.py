from datetime import datetime
from sqlmodel import  Relationship, SQLModel, Field
from typing import List, Optional
import enum

# if TYPE_CHECKING:
#     from .students_model import Students
#     from .class_names_model import ClassNames

class FeeStatus(str, enum.Enum):
    PAID = "Paid"
    UNPAID = "Unpaid"

class FeeBase(SQLModel):
    fee_id: int = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

class Fee(FeeBase, table=True):
    student_id: int = Field(foreign_key="students.student_id", nullable=False)
    class_id: int = Field(foreign_key="classnames.class_name_id", nullable=False)
    fee_amount: float = Field(nullable=False)
    fee_month: str = Field(nullable=False)
    fee_year: str = Field(nullable=False)  # Changed from int to str
    fee_status: FeeStatus = Field(nullable=False, default=FeeStatus.UNPAID)

    # Relationships back to Student and ClassNames
    students: Optional["Students"] = Relationship(back_populates="fees") # type: ignore
    class_names: Optional["ClassNames"] = Relationship(back_populates="fees") # type: ignore
    

class FeeCreate(SQLModel):
    student_id: int
    class_id: int
    fee_amount: float
    fee_month: str
    fee_year: str  # Changed from int to str
    # fee_status: FeeStatus = FeeStatus.UNPAID

class FeeResponse(FeeBase, SQLModel):
    student_name: Optional[str] = None
    father_name: Optional[str] = None
    class_name: Optional[str] = None
    fee_amount: float
    fee_month: str
    fee_year: str  # Changed from int to str
    fee_status: FeeStatus

class FeeUpdateRequest(FeeBase, SQLModel):
    fee_amount: Optional[float] = None
    fee_month: Optional[int] = None
    fee_year: Optional[str] = None  # Changed from Optional[int] to Optional[str]
    fee_status: Optional[FeeStatus] = None

class FeeFilter(SQLModel):
    student_id: Optional[int] = None
    class_id: Optional[int] = None
    fee_month: Optional[str] = None
    fee_year: Optional[str] = None  # Changed from Optional[int] to Optional[str]
    fee_status: Optional[FeeStatus] = None

class FeeDelete(SQLModel):
    fee_id: int
    message: str = "Fee deleted successfully"

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

class FilterPaidUnpaid(SQLModel):
    student_id: int
    student_name: str
    father_name: str
    class_name: str
    fee_status: FeeStatus
    fee_month: str
    fee_year: str  # Still string, but we'll handle conversion
    fee_amount: float

    @classmethod
    def from_fee(cls, fee, student_details, class_name):
        return cls(
            student_id=fee.student_id,
            student_name=student_details["student_name"],
            father_name=student_details["father_name"],
            class_name=class_name,
            fee_status=fee.fee_status,
            fee_month=fee.fee_month,
            fee_year=str(fee.fee_year),  # Explicit conversion
            fee_amount=fee.fee_amount
        )

