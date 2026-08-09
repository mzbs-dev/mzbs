"""
Migration script to seed role_permissions for the three new module keys
introduced by the Staff Profile / Self-Attendance / Attendance Review
feature (see STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md, Phase 1).

The existing `staff` module rows are untouched by this migration.

New module keys seeded here:
  - self_attendance    (teacher-facing: mark today's own attendance)
  - attendance_review  (admin-facing: finalize official attendance)
  - staff_profile      (admin-facing: profile view + shift assignment)

Per the Locked Design Decisions table in the plan doc:
  - self_attendance: view/add/edit = True for every role except STUDENT;
                      delete = False for ALL roles including ADMIN/CHIEF_PRINCIPAL
                      (this is a locked business rule, not a togglable default —
                      there is no DELETE route for self_attendance at all, see
                      router/self_attendance.py in Phase 3 of the plan)
  - attendance_review: view/add/edit/delete = True for ADMIN, CHIEF_PRINCIPAL only;
                        False for every other role
  - staff_profile: view/edit = True for ADMIN, CHIEF_PRINCIPAL only (both are real,
                    exercised routes — view reads the profile, edit manages shift
                    assignment); add/delete = False for ALL roles (reserved, no
                    route exists for either — profile is not a created/deleted entity)

STUDENT is explicitly False across all actions for all three modules — both as a
natural consequence of NON_STUDENT exclusion, and as defense-in-depth alongside the
frontend Profile-menu exclusion and backend require_permission() checks.

Run this script once per environment via the fan-out runner (recommended):
    uv run python -m migrations.run_all_tenants --dry-run --only 0006_add_staff_profile_attendance_permissions
    uv run python -m migrations.run_all_tenants --only 0006_add_staff_profile_attendance_permissions --tenant mzbs_staging_school
    uv run python -m migrations.run_all_tenants --only 0006_add_staff_profile_attendance_permissions --tenant mzbs

Or standalone (falls back to setting.DATABASE_URL if --database-url is omitted),
same convention as 0001_add_role_permissions_tables.py:
    uv run python -m migrations.0006_add_staff_profile_attendance_permissions
"""

import argparse

from sqlmodel import Session, select, create_engine
import setting

from schemas.role_permission_model import RolePermission
from user.user_models import UserRole


# ─── Seed matrix ────────────────────────────────────────────────────────────
# Source: STAFF_PROFILE_ATTENDANCE_PLAN_UPDATED.md, "Phase 1 — Permissions
# Migration" table, confirmed against "Locked Design Decisions".

ALL_ROLES = list(UserRole)
NON_STUDENT = [r for r in ALL_ROLES if r != UserRole.STUDENT]
ADMIN_CHIEF_PRINCIPAL = [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL]
NONE_ALLOWED: list[UserRole] = []

MATRIX: dict[str, dict[str, list[UserRole]]] = {
    "self_attendance": {
        "view": NON_STUDENT,
        "add": NON_STUDENT,
        "edit": NON_STUDENT,
        # Locked business rule: nobody can self-delete attendance history,
        # not even ADMIN/CHIEF_PRINCIPAL. Enforced doubly — no DELETE route
        # exists in router/self_attendance.py at all. This row exists so the
        # Permissions Matrix UI has something to display (greyed out / off),
        # not because it's meant to ever be toggled True.
        "delete": NONE_ALLOWED,
    },
    "attendance_review": {
        "view": ADMIN_CHIEF_PRINCIPAL,
        "add": ADMIN_CHIEF_PRINCIPAL,     # finalize
        "edit": ADMIN_CHIEF_PRINCIPAL,
        "delete": ADMIN_CHIEF_PRINCIPAL,
    },
    "staff_profile": {
        "view": ADMIN_CHIEF_PRINCIPAL,
        # add/delete reserved — no route exists for either in this plan.
        # Seeded False for every role so the matrix has a complete row;
        # do not read this as "profile creation/deletion exists".
        "add": NONE_ALLOWED,
        "edit": ADMIN_CHIEF_PRINCIPAL,    # manages staff_shift_assignment
        "delete": NONE_ALLOWED,
    },
}

ACTIONS = ["view", "add", "edit", "delete"]


def build_rows() -> list[RolePermission]:
    """Expand MATRIX into one RolePermission row per (role, module, action)."""
    rows: list[RolePermission] = []
    for module, action_map in MATRIX.items():
        for action in ACTIONS:
            allowed_roles = set(action_map[action])
            for role in ALL_ROLES:
                rows.append(
                    RolePermission(
                        role=role,
                        module=module,
                        action=action,
                        allowed=role in allowed_roles,
                    )
                )
    return rows


def seed_permissions(session: Session, commit: bool = True) -> None:
    print("\nSeeding role_permissions for self_attendance / attendance_review / staff_profile...")
    existing = session.exec(select(RolePermission)).all()
    existing_keys = {(r.role, r.module, r.action) for r in existing}

    rows_to_add = build_rows()
    added = 0
    skipped = 0

    for row in rows_to_add:
        key = (row.role, row.module, row.action)
        if key in existing_keys:
            skipped += 1
            continue
        session.add(row)
        added += 1

    if commit:
        session.commit()
    print(f"✓ Seed complete: {added} rows added, {skipped} already existed (skipped)")


def print_summary(session: Session) -> None:
    total = session.exec(
        select(RolePermission).where(
            RolePermission.module.in_(list(MATRIX.keys()))
        )
    ).all()
    expected = len(MATRIX) * len(ACTIONS) * len(ALL_ROLES)
    print(f"\nTotal rows across the 3 new modules: {len(total)}")
    print(f"Expected ({len(MATRIX)} modules x {len(ACTIONS)} actions x {len(ALL_ROLES)} roles): {expected}")
    if len(total) != expected:
        print("⚠️  Row count mismatch — investigate before proceeding.")
    else:
        print("✓ Row count matches expected matrix size")


MIGRATION_ID = "0006_add_staff_profile_attendance_permissions"


def upgrade(session: Session) -> None:
    """Entry point used by migrations/run_all_tenants.py.

    Does not commit. runner_core.py's apply_migration() commits the
    upgrade and the schema_migrations tracking row together, atomically.
    Idempotent — safe to re-run; existing (role, module, action) rows are
    skipped rather than duplicated or overwritten.
    """
    seed_permissions(session, commit=False)


def main():
    parser = argparse.ArgumentParser(
        description="Seed role_permissions for self_attendance/attendance_review/staff_profile"
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="Target DB connection string. Defaults to setting.DATABASE_URL (local .env) if omitted.",
    )
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

    with Session(engine) as session:
        seed_permissions(session)
        print_summary(session)

    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("STAFF PROFILE / SELF-ATTENDANCE / ATTENDANCE REVIEW PERMISSIONS")
    print("=" * 60)
    print("\nThis script will seed role_permissions for 3 new module keys:")
    print("  self_attendance, attendance_review, staff_profile")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
