from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from db import get_session
from schemas.attendance_model import Attendance
from schemas.attendance_time_model import AttendanceTime
from schemas.exam_marks_model import ExamMark
from schemas.salary_model import Allowance, Deduction, SalaryLedger, SalaryPayment, TeacherSalary
from schemas.staff_attendance_model import StaffAttendance
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.teacher_names_model import TeacherNames, TeacherNamesResponse
from user.user_crud import require_permission
from user.user_models import User, UserRole


deleted_staff_router = APIRouter(
    prefix="/deleted-staff",
    tags=["Deleted Staff"],
    responses={404: {"description": "Not found"}},
)


def _require_admin_or_chief_principal(current_user: User) -> None:
    if current_user.role not in {UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL}:
        raise HTTPException(
            status_code=403,
            detail="Deleted staff is restricted to ADMIN and CHIEF_PRINCIPAL only.",
        )


@deleted_staff_router.get("/", response_model=list[TeacherNamesResponse])
def list_deleted_staff(
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "view"))],
    session: Annotated[Session, Depends(get_session)],
):
    """List all soft-deleted teacher records."""
    _require_admin_or_chief_principal(current_user)
    return session.exec(
        select(TeacherNames)
        .where(TeacherNames.is_deleted.is_(True))
        .order_by(TeacherNames.deleted_at.desc())
    ).all()


@deleted_staff_router.get("/{teacher_id}", response_model=TeacherNamesResponse)
def get_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "view"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Read a deleted teacher record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")
    return staff


@deleted_staff_router.get("/{teacher_id}/references")
def get_deleted_staff_references(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "view"))],
    session: Annotated[Session, Depends(get_session)],
):
    """List records that still refer to a deleted staff member."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")

    attendance_time_ids = {
        record.attendance_time_id
        for record in session.exec(
            select(StaffAttendance).where(StaffAttendance.staff_id == teacher_id)
        ).all()
        if record.attendance_time_id is not None
    }
    attendance_time_ids.update(
        record.attendance_time_id
        for record in session.exec(
            select(Attendance).where(Attendance.teacher_name_id == teacher_id)
        ).all()
        if record.attendance_time_id is not None
    )
    attendance_time_ids.update(
        record.attendance_time_id
        for record in session.exec(
            select(StaffShiftAssignment).where(StaffShiftAssignment.staff_id == teacher_id)
        ).all()
    )
    attendance_times = {
        item.attendance_time_id: item.attendance_time
        for item in session.exec(
            select(AttendanceTime).where(AttendanceTime.attendance_time_id.in_(attendance_time_ids))
        ).all()
    } if attendance_time_ids else {}

    categories = []

    def add_category(label: str, records: list[dict]) -> None:
        categories.append({"label": label, "count": len(records), "records": records})

    staff_attendance = session.exec(
        select(StaffAttendance)
        .where(StaffAttendance.staff_id == teacher_id)
        .order_by(StaffAttendance.attendance_date.desc())
    ).all()
    add_category("Staff attendance", [
        {
            "id": record.staff_attendance_id,
            "details": (
                f"{record.attendance_date.isoformat()} · "
                f"{attendance_times.get(record.attendance_time_id, 'unassigned shift')} · "
                f"{record.final_status or record.attendance_status or 'unmarked'}"
            ),
        }
        for record in staff_attendance
    ])

    legacy_attendance = session.exec(
        select(Attendance)
        .where(Attendance.teacher_name_id == teacher_id)
        .order_by(Attendance.attendance_date.desc())
    ).all()
    add_category("Class attendance records", [
        {
            "id": record.attendance_id,
            "details": (
                f"{record.attendance_date.date().isoformat()} · "
                f"class {record.class_name_id if record.class_name_id is not None else 'unknown'} · "
                f"{attendance_times.get(record.attendance_time_id, 'unassigned shift')}"
            ),
        }
        for record in legacy_attendance
    ])

    exam_marks = session.exec(
        select(ExamMark)
        .where(ExamMark.teacher_name_id == teacher_id)
        .order_by(ExamMark.exam_date.desc())
    ).all()
    add_category("Exam marks", [
        {
            "id": record.exam_mark_id,
            "details": (
                f"{record.exam_date.isoformat()} · {record.subject_name} · "
                f"{record.exam_type} · class {record.class_name_id}"
            ),
        }
        for record in exam_marks
    ])

    salaries = session.exec(
        select(TeacherSalary).where(TeacherSalary.teacher_id == teacher_id)
    ).all()
    add_category("Salary configurations", [
        {
            "id": record.id,
            "details": (
                f"Effective from {record.effective_from}"
                f"{f' to {record.effective_till}' if record.effective_till else ''}"
            ),
        }
        for record in salaries
    ])

    ledgers = session.exec(
        select(SalaryLedger)
        .where(SalaryLedger.teacher_id == teacher_id)
        .order_by(SalaryLedger.year.desc(), SalaryLedger.month.desc())
    ).all()
    add_category("Salary ledger entries", [
        {
            "id": record.id,
            "details": f"{record.year}-{record.month:02d}",
        }
        for record in ledgers
    ])

    payments = session.exec(
        select(SalaryPayment)
        .where(SalaryPayment.teacher_id == teacher_id)
        .order_by(SalaryPayment.payment_date.desc())
    ).all()
    add_category("Salary payments", [
        {
            "id": record.id,
            "details": f"{record.payment_date} · ledger {record.ledger_id}",
        }
        for record in payments
    ])

    allowances = session.exec(
        select(Allowance)
        .where(Allowance.teacher_id == teacher_id)
        .order_by(Allowance.year.desc(), Allowance.month.desc())
    ).all()
    add_category("Allowances", [
        {
            "id": record.id,
            "details": f"{record.year}-{record.month:02d}",
        }
        for record in allowances
    ])

    deductions = session.exec(
        select(Deduction)
        .where(Deduction.teacher_id == teacher_id)
        .order_by(Deduction.year.desc(), Deduction.month.desc())
    ).all()
    add_category("Deductions", [
        {
            "id": record.id,
            "details": f"{record.year}-{record.month:02d} · {record.type}",
        }
        for record in deductions
    ])

    assignments = session.exec(
        select(StaffShiftAssignment)
        .where(StaffShiftAssignment.staff_id == teacher_id)
        .order_by(StaffShiftAssignment.created_at.desc())
    ).all()
    add_category("Shift assignments", [
        {
            "id": record.id,
            "details": attendance_times.get(record.attendance_time_id, "Unknown shift"),
        }
        for record in assignments
    ])

    linked_users = session.exec(
        select(User).where(User.teacher_name_id == teacher_id)
    ).all()
    add_category("Linked user accounts", [
        {"id": record.id, "details": f"{record.username} · {record.role.value}"}
        for record in linked_users
    ])

    return {"teacher_id": teacher_id, "teacher_name": staff.teacher_name, "categories": categories}


@deleted_staff_router.post("/{teacher_id}/restore", response_model=TeacherNamesResponse)
def restore_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "edit"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Restore a soft-deleted teacher record without creating a new record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")

    has_exam_marks = session.exec(
        select(ExamMark.exam_mark_id).where(ExamMark.teacher_name_id == teacher_id)
    ).first()
    if has_exam_marks is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot permanently delete this teacher because exam marks reference this record. "
                "Restore the teacher or retain it in the deleted staff archive to preserve history."
            ),
        )

    linked_user = session.exec(
        select(User).where(User.teacher_name_id == staff.teacher_name_id)
    ).first()

    staff.is_deleted = False
    staff.deleted_at = None
    staff.deleted_by = None

    if linked_user is not None and linked_user.role != UserRole.ADMIN:
        linked_user.is_active = True
        session.add(linked_user)

    session.add(staff)
    session.commit()
    session.refresh(staff)
    return staff


@deleted_staff_router.delete("/{teacher_id}/permanent")
def permanently_delete_deleted_staff(
    teacher_id: int,
    current_user: Annotated[User, Depends(require_permission("deleted_staff", "edit"))],
    session: Annotated[Session, Depends(get_session)],
):
    """Permanently remove a soft-deleted teacher and its linked teacher-user record."""
    _require_admin_or_chief_principal(current_user)
    staff = session.get(TeacherNames, teacher_id)
    if not staff or not staff.is_deleted:
        raise HTTPException(status_code=404, detail="Deleted staff record not found.")

    linked_user = session.exec(
        select(User).where(User.teacher_name_id == staff.teacher_name_id)
    ).first()

    if linked_user is not None and linked_user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Cannot permanently delete this teacher because the linked user is an ADMIN account.",
        )

    try:
        if linked_user is not None:
            session.delete(linked_user)
            session.flush()

        session.delete(staff)
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot permanently delete this teacher because attendance, payroll, "
                "or another record still references it. Related history was preserved."
            ),
        ) from exc
    except Exception as exc:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Permanent deletion failed. No records were removed.",
        ) from exc

    return {"message": f"Teacher '{staff.teacher_name}' and linked user were permanently deleted."}
