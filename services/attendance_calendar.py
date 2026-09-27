from datetime import date, timedelta

from sqlmodel import Session, select

from schemas.attendance_policy_model import AttendanceDateException, AttendanceWeeklyHoliday


VALID_EXCEPTION_KINDS = {"HOLIDAY", "WORKING_DAY"}


def resolve_attendance_calendar(session: Session, attendance_date: date) -> dict:
    exception = session.exec(
        select(AttendanceDateException).where(
            AttendanceDateException.exception_date == attendance_date
        )
    ).first()
    if exception:
        return {
            "attendance_date": attendance_date,
            "weekday": attendance_date.strftime("%A"),
            "is_holiday": exception.kind == "HOLIDAY",
            "label": exception.label or exception.kind.replace("_", " ").title(),
        }

    weekday = attendance_date.weekday()
    weekly = session.exec(
        select(AttendanceWeeklyHoliday).where(AttendanceWeeklyHoliday.weekday == weekday)
    ).first()
    return {
        "attendance_date": attendance_date,
        "weekday": attendance_date.strftime("%A"),
        "is_holiday": weekly is not None,
        "label": "Weekly Holiday" if weekly else None,
    }


def list_attendance_holidays(session: Session, start_date: date, end_date: date) -> list[dict]:
    if start_date > end_date:
        return []

    weekly_holidays = set(session.exec(select(AttendanceWeeklyHoliday.weekday)).all())
    exceptions = session.exec(
        select(AttendanceDateException).where(
            AttendanceDateException.exception_date >= start_date,
            AttendanceDateException.exception_date <= end_date,
        )
    ).all()
    exceptions_by_date = {item.exception_date: item for item in exceptions}

    holidays = []
    current_date = start_date
    while current_date <= end_date:
        exception = exceptions_by_date.get(current_date)
        if exception:
            is_holiday = exception.kind == "HOLIDAY"
            label = exception.label or exception.kind.replace("_", " ").title()
        else:
            is_holiday = current_date.weekday() in weekly_holidays
            label = "Weekly Holiday" if is_holiday else None

        if is_holiday:
            holidays.append({
                "attendance_date": current_date,
                "weekday": current_date.strftime("%A"),
                "label": label,
            })
        current_date += timedelta(days=1)

    return holidays