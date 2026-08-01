"""
One-off corrective migration: adds the setup_attendance_values module,
discovered while wiring attendance_value.py into require_permission()
(Day 3). ADMIN-only end-to-end, matching every other setup_* submodule.

Note: reset_attendance_id (the full-table wipe + ID-sequence-reset utility
in attendance_value.py) deliberately stays hardcoded to require_admin() and
is NOT part of this module — it's excluded from the dynamic permission
system on purpose, so no future self-service toggle can ever grant that
capability to a non-admin role.

Run once per environment, AFTER Day 1's migration has already run there:
    python add_setup_attendance_values.py --database-url "postgresql://..."
    python add_setup_attendance_values.py   (defaults to setting.DATABASE_URL)
"""

import argparse
from sqlmodel import Session, select, create_engine
from sqlalchemy.exc import OperationalError
import setting

from schemas.role_permission_model import RolePermission
from user.user_models import UserRole

ALL_ROLES = list(UserRole)
ADMIN_ONLY = [UserRole.ADMIN]
ACTIONS = ["view", "add", "edit", "delete"]


def add_setup_attendance_values_rows(session: Session) -> None:
    existing = session.exec(
        select(RolePermission).where(RolePermission.module == "setup_attendance_values")
    ).all()
    existing_keys = {(r.role, r.action) for r in existing}

    added = 0
    for action in ACTIONS:
        for role in ALL_ROLES:
            if (role, action) in existing_keys:
                continue
            session.add(RolePermission(
                role=role,
                module="setup_attendance_values",
                action=action,
                allowed=(role in ADMIN_ONLY),
            ))
            added += 1

    session.commit()
    print(f"  [add]  {added} setup_attendance_values rows created")


def main():
    parser = argparse.ArgumentParser(description="Add setup_attendance_values module rows")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    try:
        engine = create_engine(conn_string, connect_args={"connect_timeout": 10})
        with Session(engine) as session:
            add_setup_attendance_values_rows(session)
    except OperationalError as exc:
        print("\n❌ Database connection failed.")
        print("This is usually caused by an unreachable host, DNS resolution, or network access issue.")
        print(f"Details: {exc}")
        raise SystemExit(1) from exc

    print("\n✅ Fix completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("FIX: add setup_attendance_values module")
    print("=" * 60)
    main()
