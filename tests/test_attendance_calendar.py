from datetime import date

from schemas.attendance_policy_model import AttendanceDateException, AttendanceWeeklyHoliday
from services.attendance_calendar import resolve_attendance_calendar


def test_weekly_holiday_is_resolved_from_date(test_session):
    test_session.add(AttendanceWeeklyHoliday(weekday=6))
    test_session.commit()

    result = resolve_attendance_calendar(test_session, date(2026, 9, 27))

    assert result["weekday"] == "Sunday"
    assert result["is_holiday"] is True
    assert result["label"] == "Weekly Holiday"


def test_date_exception_overrides_weekly_holiday(test_session):
    test_session.add(AttendanceWeeklyHoliday(weekday=6))
    test_session.add(
        AttendanceDateException(
            exception_date=date(2026, 9, 27),
            kind="WORKING_DAY",
            label="Special class",
        )
    )
    test_session.commit()

    result = resolve_attendance_calendar(test_session, date(2026, 9, 27))

    assert result["weekday"] == "Sunday"
    assert result["is_holiday"] is False
    assert result["label"] == "Special class"


def test_holiday_exception_overrides_working_weekday(test_session):
    test_session.add(
        AttendanceDateException(
            exception_date=date(2026, 9, 28),
            kind="HOLIDAY",
            label="Institute closed",
        )
    )
    test_session.commit()

    result = resolve_attendance_calendar(test_session, date(2026, 9, 28))

    assert result["weekday"] == "Monday"
    assert result["is_holiday"] is True
    assert result["label"] == "Institute closed"
