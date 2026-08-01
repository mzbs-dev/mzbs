"""
Script to create backend Python files with specified content from a list.
Useful for bulk backend file creation and FastAPI/SQLAlchemy setup.

Usage:
    1. Define files in the BACKEND_FILES_DATA dictionary with paths and content
    2. Run the script: python create_backend_files.py
    3. Files will be created in the specified base directory
"""

import os
from pathlib import Path

# Define the base directory where files will be created
BASE_DIR = "."

# Dictionary of backend files to create with their content
# Format: "relative/path/filename.py": "file content"
BACKEND_FILES_DATA = {
    # Router files
    "router/__init__.py": "",
    
    "router/adm_del.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.admin_create_user_model import AdminCreateUser
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    '''Delete a user by ID'''
    # Implementation
    pass
""",
    
    "router/admin_create_user.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.admin_create_user_model import AdminCreateUser
from user.user_crud import create_user
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/create-user")
def create_admin_user(user: AdminCreateUser, db: Session = Depends(get_db)):
    '''Admin endpoint to create new user'''
    return create_user(db, user)
""",
    
    "router/students.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.students_model import StudentCreate, StudentUpdate
from database import get_db

router = APIRouter(prefix="/students", tags=["students"])

@router.get("/")
def get_students(db: Session = Depends(get_db)):
    '''Get all students'''
    pass

@router.post("/")
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    '''Create a new student'''
    pass

@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db)):
    '''Get student by ID'''
    pass

@router.put("/{student_id}")
def update_student(student_id: int, student: StudentUpdate, db: Session = Depends(get_db)):
    '''Update student'''
    pass

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    '''Delete student'''
    pass
""",
    
    "router/teacher_names.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.teacher_names_model import TeacherNameCreate
from database import get_db

router = APIRouter(prefix="/teachers", tags=["teachers"])

@router.get("/")
def get_teachers(db: Session = Depends(get_db)):
    '''Get all teachers'''
    pass

@router.post("/")
def create_teacher(teacher: TeacherNameCreate, db: Session = Depends(get_db)):
    '''Create a new teacher'''
    pass

@router.get("/{teacher_id}")
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    '''Get teacher by ID'''
    pass

@router.put("/{teacher_id}")
def update_teacher(teacher_id: int, teacher: TeacherNameCreate, db: Session = Depends(get_db)):
    '''Update teacher'''
    pass

@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    '''Delete teacher'''
    pass
""",
    
    "router/class_names.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.class_names_model import ClassNameCreate
from database import get_db

router = APIRouter(prefix="/class-names", tags=["classes"])

@router.get("/")
def get_class_names(db: Session = Depends(get_db)):
    '''Get all class names'''
    pass

@router.post("/")
def create_class_name(class_name: ClassNameCreate, db: Session = Depends(get_db)):
    '''Create a new class name'''
    pass

@router.get("/{class_id}")
def get_class_name(class_id: int, db: Session = Depends(get_db)):
    '''Get class by ID'''
    pass

@router.put("/{class_id}")
def update_class_name(class_id: int, class_name: ClassNameCreate, db: Session = Depends(get_db)):
    '''Update class name'''
    pass

@router.delete("/{class_id}")
def delete_class_name(class_id: int, db: Session = Depends(get_db)):
    '''Delete class name'''
    pass
""",
    
    "router/attendance_time.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.attendance_time_model import AttendanceTimeCreate
from database import get_db

router = APIRouter(prefix="/attendance-times", tags=["attendance"])

@router.get("/")
def get_attendance_times(db: Session = Depends(get_db)):
    '''Get all attendance time slots'''
    pass

@router.post("/")
def create_attendance_time(time_slot: AttendanceTimeCreate, db: Session = Depends(get_db)):
    '''Create new attendance time slot'''
    pass

@router.get("/{time_id}")
def get_attendance_time(time_id: int, db: Session = Depends(get_db)):
    '''Get attendance time by ID'''
    pass

@router.put("/{time_id}")
def update_attendance_time(time_id: int, time_slot: AttendanceTimeCreate, db: Session = Depends(get_db)):
    '''Update attendance time slot'''
    pass

@router.delete("/{time_id}")
def delete_attendance_time(time_id: int, db: Session = Depends(get_db)):
    '''Delete attendance time slot'''
    pass
""",
    
    "router/mark_attendance.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.attendance_value_model import AttendanceValueCreate
from database import get_db

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.get("/")
def get_attendance_records(db: Session = Depends(get_db)):
    '''Get all attendance records'''
    pass

@router.post("/mark")
def mark_attendance(attendance: AttendanceValueCreate, db: Session = Depends(get_db)):
    '''Mark attendance for student'''
    pass

@router.get("/student/{student_id}")
def get_student_attendance(student_id: int, db: Session = Depends(get_db)):
    '''Get attendance records for student'''
    pass

@router.put("/{attendance_id}")
def update_attendance(attendance_id: int, attendance: AttendanceValueCreate, db: Session = Depends(get_db)):
    '''Update attendance record'''
    pass

@router.delete("/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    '''Delete attendance record'''
    pass
""",
    
    "router/fee.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.fee_model import FeeCreate
from database import get_db

router = APIRouter(prefix="/fees", tags=["fees"])

@router.get("/")
def get_fees(db: Session = Depends(get_db)):
    '''Get all fees'''
    pass

@router.post("/")
def create_fee(fee: FeeCreate, db: Session = Depends(get_db)):
    '''Create new fee'''
    pass

@router.get("/{fee_id}")
def get_fee(fee_id: int, db: Session = Depends(get_db)):
    '''Get fee by ID'''
    pass

@router.put("/{fee_id}")
def update_fee(fee_id: int, fee: FeeCreate, db: Session = Depends(get_db)):
    '''Update fee'''
    pass

@router.delete("/{fee_id}")
def delete_fee(fee_id: int, db: Session = Depends(get_db)):
    '''Delete fee'''
    pass
""",
    
    "router/income.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.income_model import IncomeCreate
from database import get_db

router = APIRouter(prefix="/incomes", tags=["income"])

@router.get("/")
def get_incomes(db: Session = Depends(get_db)):
    '''Get all income records'''
    pass

@router.post("/")
def create_income(income: IncomeCreate, db: Session = Depends(get_db)):
    '''Create new income record'''
    pass

@router.get("/{income_id}")
def get_income(income_id: int, db: Session = Depends(get_db)):
    '''Get income by ID'''
    pass

@router.put("/{income_id}")
def update_income(income_id: int, income: IncomeCreate, db: Session = Depends(get_db)):
    '''Update income record'''
    pass

@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db)):
    '''Delete income record'''
    pass
""",
    
    "router/expense.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.expense_model import ExpenseCreate
from database import get_db

router = APIRouter(prefix="/expenses", tags=["expense"])

@router.get("/")
def get_expenses(db: Session = Depends(get_db)):
    '''Get all expenses'''
    pass

@router.post("/")
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    '''Create new expense'''
    pass

@router.get("/{expense_id}")
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    '''Get expense by ID'''
    pass

@router.put("/{expense_id}")
def update_expense(expense_id: int, expense: ExpenseCreate, db: Session = Depends(get_db)):
    '''Update expense'''
    pass

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    '''Delete expense'''
    pass
""",
    
    "router/expense_cat_names.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.expense_cat_names_model import ExpenseCategoryCreate
from database import get_db

router = APIRouter(prefix="/expense-categories", tags=["expense"])

@router.get("/")
def get_expense_categories(db: Session = Depends(get_db)):
    '''Get all expense categories'''
    pass

@router.post("/")
def create_expense_category(category: ExpenseCategoryCreate, db: Session = Depends(get_db)):
    '''Create new expense category'''
    pass

@router.get("/{category_id}")
def get_expense_category(category_id: int, db: Session = Depends(get_db)):
    '''Get expense category by ID'''
    pass

@router.put("/{category_id}")
def update_expense_category(category_id: int, category: ExpenseCategoryCreate, db: Session = Depends(get_db)):
    '''Update expense category'''
    pass

@router.delete("/{category_id}")
def delete_expense_category(category_id: int, db: Session = Depends(get_db)):
    '''Delete expense category'''
    pass
""",
    
    "router/income_cat_names.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.income_cat_names_model import IncomeCategoryCreate
from database import get_db

router = APIRouter(prefix="/income-categories", tags=["income"])

@router.get("/")
def get_income_categories(db: Session = Depends(get_db)):
    '''Get all income categories'''
    pass

@router.post("/")
def create_income_category(category: IncomeCategoryCreate, db: Session = Depends(get_db)):
    '''Create new income category'''
    pass

@router.get("/{category_id}")
def get_income_category(category_id: int, db: Session = Depends(get_db)):
    '''Get income category by ID'''
    pass

@router.put("/{category_id}")
def update_income_category(category_id: int, category: IncomeCategoryCreate, db: Session = Depends(get_db)):
    '''Update income category'''
    pass

@router.delete("/{category_id}")
def delete_income_category(category_id: int, db: Session = Depends(get_db)):
    '''Delete income category'''
    pass
""",
    
    "router/dashboard.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/")
def get_dashboard_data(db: Session = Depends(get_db)):
    '''Get dashboard overview data'''
    pass

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    '''Get dashboard statistics'''
    pass

@router.get("/charts")
def get_dashboard_charts(period: str = "month", db: Session = Depends(get_db)):
    '''Get dashboard chart data'''
    pass
""",
    
    # Schema files
    "schemas/__init__.py": "",
    
    "schemas/admin_create_user_model.py": """from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminCreateUser(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str
    is_active: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123",
                "first_name": "John",
                "last_name": "Doe",
                "role": "admin"
            }
        }
""",
    
    "schemas/students_model.py": """from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    name: str
    email: EmailStr
    roll_no: str
    class_name: str
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    
class StudentCreate(StudentBase):
    pass

class StudentUpdate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/teacher_names_model.py": """from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class TeacherBaseModel(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = None
    phone_number: Optional[str] = None
    
class TeacherNameCreate(TeacherBaseModel):
    pass

class TeacherNameUpdate(TeacherBaseModel):
    pass

class TeacherNameResponse(TeacherBaseModel):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/class_names_model.py": """from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClassNameBase(BaseModel):
    name: str
    level: str
    capacity: Optional[int] = None
    
class ClassNameCreate(ClassNameBase):
    pass

class ClassNameUpdate(ClassNameBase):
    pass

class ClassNameResponse(ClassNameBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/attendance_time_model.py": """from pydantic import BaseModel
from datetime import time

class AttendanceTimeBase(BaseModel):
    start_time: time
    end_time: time
    
class AttendanceTimeCreate(AttendanceTimeBase):
    pass

class AttendanceTimeUpdate(AttendanceTimeBase):
    pass

class AttendanceTimeResponse(AttendanceTimeBase):
    id: int
    
    class Config:
        from_attributes = True
""",
    
    "schemas/attendance_value_model.py": """from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class AttendanceValueBase(BaseModel):
    student_id: int
    date: datetime
    status: Literal['present', 'absent', 'late']
    
class AttendanceValueCreate(AttendanceValueBase):
    pass

class AttendanceValueUpdate(AttendanceValueBase):
    pass

class AttendanceValueResponse(AttendanceValueBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/fee_model.py": """from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class FeeBase(BaseModel):
    student_id: int
    amount: float
    due_date: datetime
    status: Literal['pending', 'paid', 'overdue'] = 'pending'
    category: str = 'tuition'
    
class FeeCreate(FeeBase):
    pass

class FeeUpdate(FeeBase):
    pass

class FeeResponse(FeeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/income_model.py": """from pydantic import BaseModel
from datetime import datetime

class IncomeBase(BaseModel):
    category: str
    amount: float
    description: str
    date: datetime
    
class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(IncomeBase):
    pass

class IncomeResponse(IncomeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/expense_model.py": """from pydantic import BaseModel
from datetime import datetime

class ExpenseBase(BaseModel):
    category: str
    amount: float
    description: str
    date: datetime
    
class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/expense_cat_names_model.py": """from pydantic import BaseModel

class ExpenseCategoryBase(BaseModel):
    name: str
    description: str = ""
    
class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(ExpenseCategoryBase):
    pass

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    
    class Config:
        from_attributes = True
""",
    
    "schemas/income_cat_names_model.py": """from pydantic import BaseModel

class IncomeCategoryBase(BaseModel):
    name: str
    description: str = ""
    
class IncomeCategoryCreate(IncomeCategoryBase):
    pass

class IncomeCategoryUpdate(IncomeCategoryBase):
    pass

class IncomeCategoryResponse(IncomeCategoryBase):
    id: int
    
    class Config:
        from_attributes = True
""",
    
    "schemas/admission_model.py": """from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AdmissionBase(BaseModel):
    student_id: int
    admission_date: datetime
    status: str = 'active'
    
class AdmissionCreate(AdmissionBase):
    pass

class AdmissionUpdate(AdmissionBase):
    pass

class AdmissionResponse(AdmissionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
""",
    
    "schemas/attendance_model.py": """from pydantic import BaseModel
from datetime import datetime

class AttendanceBase(BaseModel):
    class_id: int
    date: datetime
    
class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int
    
    class Config:
        from_attributes = True
""",
    
    "schemas/dashboard_model.py": """from pydantic import BaseModel
from typing import Optional, List

class DashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    total_revenue: float
    total_expenses: float
    
class ChartData(BaseModel):
    label: str
    value: float
    
class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_fees: List[dict] = []
    recent_expenses: List[dict] = []
""",
    
    # User files
    "user/__init__.py": "",
    
    "user/user_models.py": """from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
""",
    
    "user/user_crud.py": """from sqlalchemy.orm import Session
from user.user_models import User
from schemas.admin_create_user_model import AdminCreateUser
from utils.authentication import get_password_hash

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: AdminCreateUser):
    db_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def update_user(db: Session, user_id: int, user_data: dict):
    db_user = get_user(db, user_id)
    if db_user:
        for key, value in user_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user
""",
    
    "user/user_router.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.admin_create_user_model import AdminCreateUser
from user.user_crud import create_user, get_user, update_user, delete_user
from database import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/")
def create_new_user(user: AdminCreateUser, db: Session = Depends(get_db)):
    '''Create a new user'''
    return create_user(db, user)

@router.get("/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    '''Get user by ID'''
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}")
def update_user_data(user_id: int, user_data: dict, db: Session = Depends(get_db)):
    '''Update user'''
    user = update_user(db, user_id, user_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}")
def delete_user_data(user_id: int, db: Session = Depends(get_db)):
    '''Delete user'''
    user = delete_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}
""",
    
    "user/services.py": """from sqlalchemy.orm import Session
from user.user_models import User
from user.user_crud import get_user_by_email

class UserService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        '''Authenticate user with email and password'''
        user = get_user_by_email(db, email)
        if not user:
            return None
        # Add password verification logic
        return user
    
    @staticmethod
    def get_current_user(db: Session, user_id: int):
        '''Get current logged-in user'''
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def is_admin(user: User):
        '''Check if user is admin'''
        return user.role == "admin"
    
    @staticmethod
    def is_teacher(user: User):
        '''Check if user is teacher'''
        return user.role == "teacher"
    
    @staticmethod
    def is_student(user: User):
        '''Check if user is student'''
        return user.role == "student"
""",
    
    "user/settings.py": """from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    debug: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()
""",
}


def create_backend_files(base_dir: str = BASE_DIR, files: dict = BACKEND_FILES_DATA) -> None:
    """
    Create backend files with specified content.
    
    Args:
        base_dir: Base directory where files will be created
        files: Dictionary with file paths and content
    """
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"Creating backend files in: {base_dir}\n")
    
    for file_path, content in files.items():
        full_path = os.path.join(base_dir, file_path)
        
        try:
            # Create directory structure if it doesn't exist
            directory = os.path.dirname(full_path)
            if directory:
                Path(directory).mkdir(parents=True, exist_ok=True)
            
            # Check if file already exists
            if os.path.exists(full_path):
                print(f"⚠️  SKIPPED: {file_path} (already exists)")
                skipped_count += 1
                continue
            
            # Create and write file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ CREATED: {file_path}")
            created_count += 1
            
        except Exception as e:
            print(f"❌ ERROR: {file_path} - {str(e)}")
            error_count += 1
    
    # Print summary
    print(f"\n" + "="*60)
    print(f"Summary:")
    print(f"  Created: {created_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors:  {error_count}")
    print(f"="*60)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--interactive':
        print("Interactive Backend File Creator")
        print("="*60)
        print("Enter file paths and content. Type 'done' when finished.\n")
        
        files = {}
        
        while True:
            file_path = input("Enter file path (or 'done' to finish): ").strip()
            
            if file_path.lower() == 'done':
                break
            
            if not file_path:
                print("⚠️  File path cannot be empty. Try again.\n")
                continue
            
            print("Enter file content (type 'END' on a new line when done):")
            content_lines = []
            while True:
                line = input()
                if line == 'END':
                    break
                content_lines.append(line)
            
            content = '\n'.join(content_lines)
            files[file_path] = content
            print(f"✓ Added: {file_path}\n")
        
        if files:
            create_backend_files(files=files)
        else:
            print("No files to create.")
    else:
        # Use predefined BACKEND_FILES_DATA
        create_backend_files()
