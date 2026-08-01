"""
One-off corrective migration: introduces the exam_session module (split out
of exam) and fixes the exam/delete row for TEACHER.

Context: Day 1's original seed set exam.delete = ADMIN, CHIEF_PRINCIPAL,
PRINCIPAL only (matching the bulk session-delete endpoint at the time).
Wiring exam_marks.py into require_permission() (Day 3) surfaced that the
single-mark delete endpoint (DELETE /{exam_mark_id}) actually also allows
TEACHER today, and the user chose to preserve that rather than tighten it.
So:
  - exam/delete for TEACHER: False -> True (matches current single-mark
    delete behavior, used by DELETE /{exam_mark_id})
  - new module exam_session/delete: ADMIN, CHIEF_PRINCIPAL, PRINCIPAL only
    (matches current behavior of the bulk DELETE /session/ endpoint)

Run this once per environment, AFTER the Day 1 migration has already run
there (it does not create tables — assumes role_permissions already exists):
    python fix_exam_session_split.py --database-url "postgresql://..."
    python fix_exam_session_split.py   (defaults to setting.DATABASE_URL)
"""

import argparse
from datetime import datetime

from sqlmodel import Session, select, create_engine
import setting

from schemas.role_permission_model import RolePermission, PermissionChangeLog
from user.user_models import UserRole

ALL_ROLES = list(UserRole)
NON_STUDENT = [r for r in ALL_ROLES if r != UserRole.STUDENT]

# exam_session mirrors exam's view/add/edit for consistency, but only
# "delete" is ever actually checked by any endpoint today.
EXAM_SESSION_MATRIX = {
    "view": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
    "add": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
    "edit": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL, UserRole.TEACHER],
    "delete": [UserRole.ADMIN, UserRole.CHIEF_PRINCIPAL, UserRole.PRINCIPAL],  # NOTE: no TEACHER
}


def fix_exam_delete_for_teacher(session: Session, changed_by_user_id: int | None) -> None:
    row = session.exec(
        select(RolePermission).where(
            RolePermission.role == UserRole.TEACHER,
            RolePermission.module == "exam",
            RolePermission.action == "delete",
        )
    ).first()

    if not row:
        print("  [skip] exam/delete row for TEACHER not found — was Day 1 run here?")
        return

    if row.allowed:
        print("  [skip] exam/delete for TEACHER is already True")
        return

    old_value = row.allowed
    row.allowed = True
    row.updated_by = changed_by_user_id
    session.add(row)

    session.add(PermissionChangeLog(
        role=UserRole.TEACHER,
        module="exam",
        action="delete",
        old_value=old_value,
        new_value=True,
        changed_by=changed_by_user_id,
    ))
    session.commit()
    print("  [fix]  exam/delete for TEACHER: False -> True")


def add_exam_session_rows(session: Session) -> None:
    existing = session.exec(
        select(RolePermission).where(RolePermission.module == "exam_session")
    ).all()
    existing_keys = {(r.role, r.action) for r in existing}

    added = 0
    for action, allowed_roles in EXAM_SESSION_MATRIX.items():
        allowed_set = set(allowed_roles)
        for role in ALL_ROLES:
            if (role, action) in existing_keys:
                continue
            session.add(RolePermission(
                role=role,
                module="exam_session",
                action=action,
                allowed=role in allowed_set,
            ))
            added += 1

    session.commit()
    print(f"  [add]  {added} exam_session rows created")


def main():
    parser = argparse.ArgumentParser(description="Fix exam/exam_session module split")
    parser.add_argument("--database-url", default=None)
    parser.add_argument(
        "--changed-by-user-id",
        type=int,
        default=None,
        help="User ID to attribute this change to in permission_change_log (optional)",
    )
    args = parser.parse_args()

    conn_string = args.database_url or str(setting.DATABASE_URL)
    print(f"Target database: {conn_string.split('@')[-1]}")

    engine = create_engine(conn_string, connect_args={"connect_timeout": 10})

    with Session(engine) as session:
        print("\nFixing exam/delete for TEACHER...")
        fix_exam_delete_for_teacher(session, args.changed_by_user_id)

        print("\nAdding exam_session rows...")
        add_exam_session_rows(session)

    print("\n✅ Fix completed successfully!")


if __name__ == "__main__":
    print("=" * 60)
    print("FIX: exam/exam_session module split")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Set exam/delete = True for TEACHER (preserves current single-mark delete)")
    print("2. Create exam_session rows (delete = ADMIN/CHIEF_PRINCIPAL/PRINCIPAL only)")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    input()

    main()
