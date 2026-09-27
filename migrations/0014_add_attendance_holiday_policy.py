"""Add shared weekly holiday rules and one-off date exceptions."""

from sqlmodel import Session, text


MIGRATION_ID = "0014_add_attendance_holiday_policy"


def upgrade(session: Session) -> None:
    session.exec(text(
        """
        CREATE TABLE IF NOT EXISTS attendance_weekly_holiday (
            id SERIAL PRIMARY KEY,
            weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
            created_by INTEGER REFERENCES "user"(id),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_attendance_weekly_holiday_weekday UNIQUE (weekday)
        )
        """
    ))
    session.exec(text(
        """
        CREATE TABLE IF NOT EXISTS attendance_date_exception (
            id SERIAL PRIMARY KEY,
            exception_date DATE NOT NULL,
            kind VARCHAR NOT NULL CHECK (kind IN ('HOLIDAY', 'WORKING_DAY')),
            label VARCHAR,
            created_by INTEGER REFERENCES "user"(id),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_attendance_date_exception_date UNIQUE (exception_date)
        )
        """
    ))


if __name__ == "__main__":
    raise SystemExit("Run through migrations.run_all_tenants")