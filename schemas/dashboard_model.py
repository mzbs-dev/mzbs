from pydantic import BaseModel
from typing import List, Dict, Optional, Union

class UserLoginSummary(BaseModel):
    Roll: str
    Total: int

class AttendanceSummary(BaseModel):
    date: str
    class_name: str
    attendance_values: Dict[str, int]  # e.g., {"Present": 10, "Absent": 5}

class StudentSummary(BaseModel):
    total_students: int
    present: int
    absent: int
    late: int
    leave: int

class IncomeExpenseCategorySummary(BaseModel):
    year: int
    month: int
    category_summary: Dict[str, float]  # e.g., {"Category1": 1000.0, "Category2": 500.0}

class GraphDataPoint(BaseModel):
    label: str
    value: float

class Dataset(BaseModel):
    label: str
    data: List[float]
    backgroundColor: Union[str, List[str]]
    borderColor: Optional[Union[str, List[str]]] = None  # Updated to accept either string or list
    borderWidth: Optional[int] = None

class GraphData(BaseModel):
    labels: List[str]
    datasets: List[Dataset]
    title: str

class LoginGraphData(BaseModel):
    summary: List[UserLoginSummary]
    graph: GraphData

class AttendanceGraphData(BaseModel):
    summary: List[AttendanceSummary]
    graph: GraphData

class StudentGraphData(BaseModel):
    summary: StudentSummary
    graph: GraphData

class CategoryGraphData(BaseModel):
    summary: List[IncomeExpenseCategorySummary]
    graph: GraphData
    total: float



