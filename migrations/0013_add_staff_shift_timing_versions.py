"""Add immutable, effective-dated staff timing versions for shared shifts."""

from sqlmodel import Session, text


MIGRATION_ID = "0013_add_staff_shift_timing_versions"


def upgrade(session: Session) -> None:
    session.exec(text(
        """
        CREATE TABLE IF NOT EXISTS staff_shift_timing_version (
            schedule_id SERIAL PRIMARY KEY,
            attendance_time_id INTEGER NOT NULL
                REFERENCES attendancetime(attendance_time_id),
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            effective_from DATE NOT NULL,
            created_by INTEGER REFERENCES "user"(id),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_migration_baseline BOOLEAN NOT NULL DEFAULT FALSE,
            CONSTRAINT uq_staff_shift_timing_shift_effective_from
                UNIQUE (attendance_time_id, effective_from),
            CONSTRAINT ck_staff_shift_timing_start_before_end
                CHECK (start_time < end_time)
        )
        """
    ))
    session.exec(text(
        """
        ALTER TABLE staffattendance
            ADD COLUMN IF NOT EXISTS schedule_id INTEGER
                REFERENCES staff_shift_timing_version(schedule_id),
            ADD COLUMN IF NOT EXISTS expected_start_time_snapshot TIME,
            ADD COLUMN IF NOT EXISTS expected_end_time_snapshot TIME,
            ADD COLUMN IF NOT EXISTS schedule_is_legacy BOOLEAN NOT NULL DEFAULT FALSE
        """
    ))
    session.exec(text(
        """
        UPDATE staffattendance
        SET schedule_is_legacy = TRUE
        WHERE schedule_id IS NULL
        """
    ))
    session.exec(text(
        """
        ALTER TABLE staffattendance
            DROP CONSTRAINT IF EXISTS ck_staffattendance_schedule_required
        """
    ))
    session.exec(text(
        """
        ALTER TABLE staffattendance
            ADD CONSTRAINT ck_staffattendance_schedule_required
            CHECK (schedule_id IS NOT NULL OR schedule_is_legacy = TRUE)
        """
    ))
    session.exec(text(
        """
        INSERT INTO staff_shift_timing_version (
            attendance_time_id, start_time, end_time, effective_from,
            is_migration_baseline
        )
        SELECT attendance_time_id, expected_arrival_time, expected_departure_time,
               DATE '0001-01-01', TRUE
        FROM attendance_time_shift_config
        WHERE expected_arrival_time IS NOT NULL
          AND expected_departure_time IS NOT NULL
        ON CONFLICT (attendance_time_id, effective_from) DO NOTHING
        """
    ))
    session.exec(text(
        "CREATE INDEX IF NOT EXISTS ix_staff_shift_timing_version_shift_date "
        "ON staff_shift_timing_version (attendance_time_id, effective_from DESC)"
    ))


def main():
    from migrations.runner_core import run_single_migration
    run_single_migration(MIGRATION_ID, upgrade)


if __name__ == "__main__":
    main()