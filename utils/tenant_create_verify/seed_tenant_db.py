"""
seed_staging.py

Phase 0, Day 2 — seeds a staging Neon database with test data:
one user per role (all 8), two classes, a handful of fake students,
fee records, income/expense categories (Urdu), and attendance values.

USAGE (run from the mzbs repo root, so `schemas.*` / `user.*` imports resolve):

    python seed_staging.py --database-url "postgresql://user:pass@host/dbname"

Run this once against mzbs-staging-school, then again against
mzbs-staging-school-2 (just point --database-url at the other project's
connection string). Safe to re-run: it checks for existing rows first.

This script deliberately does NOT import db.py or setting.py — it builds
its own engine from the --database-url argument, so it never touches
whatever DATABASE_URL is in your local .env (which should stay pointed
at your real dev/production DB).
"""

import argparse
import sys
from datetime import datetime, timedelta
from decimal import Decimal

from sqlmodel import SQLModel, Session, create_engine, select

# --- Import every schema module so SQLModel.metadata knows about every
#     table AND so relationship string references (e.g. "Attendance")
#     resolve correctly before create_all() runs. ---
import schemas.admission_model            # noqa: F401
import schemas.attendance_model           # noqa: F401
import schemas.attendance_time_model      # noqa: F401
import schemas.attendance_value_model     # noqa: F401
import schemas.class_names_model          # noqa: F401
import schemas.class_subject_model        # noqa: F401
import schemas.deleted_student_model      # noqa: F401
import schemas.exam_marks_model           # noqa: F401
import schemas.expense_cat_names_model    # noqa: F401
import schemas.expense_model              # noqa: F401
import schemas.fee_model                  # noqa: F401
import schemas.income_cat_names_model     # noqa: F401
import schemas.income_model               # noqa: F401
import schemas.salary_model               # noqa: F401
import schemas.staff_attendance_model     # noqa: F401
import schemas.student_parent_credentials_model  # noqa: F401
import schemas.student_profile_model      # noqa: F401
import schemas.students_model             # noqa: F401
import schemas.teacher_names_model        # noqa: F401

from schemas.class_names_model import ClassNames
from schemas.students_model import Students
from schemas.fee_model import Fee, FeeStatus
from schemas.attendance_value_model import AttendanceValue
from schemas.income_cat_names_model import IncomeCatNames
from schemas.expense_cat_names_model import ExpenseCatNames

from user.user_models import User, UserRole
from user.services import get_password_hash


STAGING_PASSWORD = "Staging@123"  # same password for every seeded test user


def seed_roles(session: Session) -> None:
    """One user per role (all 8 roles)."""
    existing_usernames = set(session.exec(select(User.username)).all())

    for role in UserRole:
        username = role.value.lower()
        if username in existing_usernames:
            print(f"  [skip] user '{username}' already exists")
            continue
        user = User(
            username=username,
            email=f"{username}@staging.mzbs.test",
            password=get_password_hash(STAGING_PASSWORD),
            role=role,
        )
        session.add(user)
        print(f"  [add]  user '{username}' ({role.value})")

    session.commit()


def seed_classes(session: Session) -> dict[str, ClassNames]:
    """Two classes, enough to exercise class-scoped features."""
    class_names = ["Class 1", "Class 2"]
    result: dict[str, ClassNames] = {}

    for name in class_names:
        existing = session.exec(
            select(ClassNames).where(ClassNames.class_name == name)
        ).first()
        if existing:
            print(f"  [skip] class '{name}' already exists")
            result[name] = existing
            continue
        cls = ClassNames(class_name=name)
        session.add(cls)
        session.commit()
        session.refresh(cls)
        result[name] = cls
        print(f"  [add]  class '{name}'")

    return result


# def seed_students(session: Session) -> list[Students]:
#     """A handful of fake students split across the two classes."""
#     fake_students = [
#         dict(
#             student_name="Ali Raza",
#             student_date_of_birth=datetime(2015, 3, 12),
#             student_gender="Male",
#             student_age="11",
#             student_education="Primary",
#             class_name="Class 1",
#             student_city="Lahore",
#             student_address="123 Model Town",
#             father_name="Raza Ahmed",
#             father_occupation="Shopkeeper",
#             father_cnic="35202-1234567-1",
#             father_cast_name="Rajput",
#             father_contact="03001234567",
#         ),
#         dict(
#             student_name="Ayesha Khan",
#             student_date_of_birth=datetime(2014, 7, 20),
#             student_gender="Female",
#             student_age="12",
#             student_education="Primary",
#             class_name="Class 1",
#             student_city="Lahore",
#             student_address="45 Johar Town",
#             father_name="Imran Khan",
#             father_occupation="Teacher",
#             father_cnic="35202-7654321-2",
#             father_cast_name="Khan",
#             father_contact="03007654321",
#         ),
#         dict(
#             student_name="Bilal Ahmed",
#             student_date_of_birth=datetime(2013, 11, 5),
#             student_gender="Male",
#             student_age="13",
#             student_education="Middle",
#             class_name="Class 2",
#             student_city="Lahore",
#             student_address="9 Garden Town",
#             father_name="Ahmed Sultan",
#             father_occupation="Engineer",
#             father_cnic="35202-1112223-3",
#             father_cast_name="Sultan",
#             father_contact="03211112223",
#         ),
#         dict(
#             student_name="Sana Malik",
#             student_date_of_birth=datetime(2013, 1, 30),
#             student_gender="Female",
#             student_age="13",
#             student_education="Middle",
#             class_name="Class 2",
#             student_city="Lahore",
#             student_address="77 Gulberg",
#             father_name="Malik Tariq",
#             father_occupation="Businessman",
#             father_cnic="35202-4445556-4",
#             father_cast_name="Malik",
#             father_contact="03334445556",
#         ),
#     ]

#     created: list[Students] = []
#     for data in fake_students:
#         existing = session.exec(
#             select(Students).where(Students.student_name == data["student_name"])
#         ).first()
#         if existing:
#             print(f"  [skip] student '{data['student_name']}' already exists")
#             created.append(existing)
#             continue
#         student = Students(**data)
#         session.add(student)
#         session.commit()
#         session.refresh(student)
#         created.append(student)
#         print(f"  [add]  student '{data['student_name']}' ({data['class_name']})")

#     return created


# def seed_fees(session: Session, students: list[Students], classes: dict[str, ClassNames]) -> None:
#     """One or two fee records per student."""
#     existing_count = len(session.exec(select(Fee)).all())
#     if existing_count > 0:
#         print(f"  [skip] {existing_count} fee record(s) already exist")
#         return

#     months = ["June", "July"]
#     for student in students:
#         class_obj = classes[student.class_name]
#         for month in months:
#             fee = Fee(
#                 student_id=student.student_id,
#                 class_id=class_obj.class_name_id,
#                 fee_amount=Decimal("2500"),
#                 fee_month=month,
#                 fee_year="2026",
#                 fee_status=FeeStatus.UNPAID if month == "July" else FeeStatus.PAID,
#             )
#             session.add(fee)
#         print(f"  [add]  2 fee records for '{student.student_name}'")

#     session.commit()


def seed_categories(session: Session) -> None:
    """Income/Expense categories in Urdu, matching real-world convention."""
    income_categories = ["اسکول فیس آمدنی", "عطیات"]
    expense_categories = ["بجلی کا بل", "تنخواہیں"]

    existing_income = set(session.exec(select(IncomeCatNames.income_cat_name)).all())
    for name in income_categories:
        if name in existing_income:
            print(f"  [skip] income category '{name}' already exists")
            continue
        session.add(IncomeCatNames(income_cat_name=name))
        print(f"  [add]  income category '{name}'")

    existing_expense = set(session.exec(select(ExpenseCatNames.expense_cat_name)).all())
    for name in expense_categories:
        if name in existing_expense:
            print(f"  [skip] expense category '{name}' already exists")
            continue
        session.add(ExpenseCatNames(expense_cat_name=name))
        print(f"  [add]  expense category '{name}'")

    session.commit()


def seed_attendance_values(session: Session) -> None:
    existing = session.exec(select(AttendanceValue)).all()
    if existing:
        print(f"  [skip] {len(existing)} attendance value(s) already exist")
        return
    for value in ["Present", "Absent", "Late", "Leave"]:
        session.add(AttendanceValue(attendance_value=value))
    session.commit()
    print("  [add]  attendance values: Present, Absent, Late, Leave")


def main():
    parser = argparse.ArgumentParser(description="Seed a staging Neon database for mzbs")
    parser.add_argument(
        "--database-url",
        required=True,
        help="Full postgresql:// connection string for the target staging DB",
    )
    args = parser.parse_args()

    print(f"Connecting to: {args.database_url.split('@')[-1]}")  # don't print credentials
    engine = create_engine(
        args.database_url,
        echo=False,
        connect_args={"connect_timeout": 10},
    )

    print("\nCreating tables (SQLModel.metadata.create_all)...")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        print("\nSeeding roles (8 users, one per role)...")
        seed_roles(session)

        print("\nSeeding classes...")
        classes = seed_classes(session)

        print("\nSeeding students...")
        students = seed_students(session)

        print("\nSeeding fee records...")
        seed_fees(session, students, classes)

        print("\nSeeding income/expense categories (Urdu)...")
        seed_categories(session)

        print("\nSeeding attendance values...")
        seed_attendance_values(session)

    print(f"\nDone. Test login for every role: password = '{STAGING_PASSWORD}'")
    print("Usernames: admin, chief_principal, principal, teacher, staff, student, accountant, fee_manager")


if __name__ == "__main__":
    sys.exit(main())
