"""Migration 0010 — make staff attendance support multiple shifts per day.

Older tenant databases used a unique constraint on (staff_id, attendance_date),
which allowed only one attendance row per staff member per day. The current
model and self-attendance routes require one row per staff/date/shift instead.
"""

from sqlmodel import Session, text


MIGRATION_ID = "0010_fix_staff_attendance_multi_shift_constraint"


def upgrade(session: Session) -> None:
    """Replace the legacy staff/date constraint with the shift-aware one."""
    session.exec(
        text(
            "ALTER TABLE staffattendance "
            "DROP CONSTRAINT IF EXISTS uq_staff_attendance_staff_date"
        )
    )
    session.exec(
        text(
            "ALTER TABLE staffattendance "
            "DROP CONSTRAINT IF EXISTS uq_staff_attendance_staff_date_time"
        )
    )
    session.exec(
        text(
            "ALTER TABLE staffattendance "
            "ADD CONSTRAINT uq_staff_attendance_staff_date_time "
            "UNIQUE (staff_id, attendance_date, attendance_time_id)"
        )
    )
    session.exec(
        text(
            "ALTER TABLE staffattendance "
            "ALTER COLUMN attendance_status DROP NOT NULL"
        )
    )
