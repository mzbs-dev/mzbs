# MZBS TeacherNames / Staff Identity Clarification

## 1. Purpose

The MZBS application was originally developed around a teacher-centric model. As additional staff roles were introduced, some existing teacher-oriented terminology and database relationships remained in use.

The important point is that historical terminology must not automatically be interpreted as the current business meaning of every feature.

This document establishes the verified distinction between:

- application role,
- staff identity,
- the `TeacherNames` table,
- the optional `User.teacher_name_id` relationship, and
- individual teacher/staff workflows.

---

## 2. Verified Repository Facts

### 2.1 `TeacherNames` does not contain the user's application role

The `TeacherNames` model does not have a role field that identifies a person as:

- TEACHER
- ADMIN
- PRINCIPAL
- CHIEF_PRINCIPAL
- ACCOUNTANT
- FEE_MANAGER
- etc.

Therefore:

> A `TeacherNames` record by itself must not be interpreted as proof of the person's application role.

The application role is represented separately by `User.role`.

---

### 2.2 `User.role` determines the application role

The `User` model contains the actual application role.

Therefore, when code needs to determine what permissions or application behavior a logged-in account should have, it should use:

```text
User.role
```

and not infer the role from the existence of a `TeacherNames` record.

---

### 2.3 `User.teacher_name_id` is an optional identity link

`User.teacher_name_id` is a nullable relationship connecting a user account to a `TeacherNames` record.

Conceptually:

```text
User
 ├── role
 └── teacher_name_id → TeacherNames.teacher_name_id (optional)
```

This means:

- a user account can have a linked staff identity;
- the link may be absent;
- the absence of the link must not be resolved by guessing another `TeacherNames` record.

The relationship identifies the person's staff record when it is explicitly populated. It does not itself determine the user's application role.

---

## 3. What `TeacherNames` Should Mean

The safest interpretation is:

> `TeacherNames` is a historical/shared identity abstraction reused by several parts of the application. It should not automatically be described as either "teachers only" or "all staff" without examining the business purpose of the specific workflow.

Some features use this identity as a broader staff identity. For example, staff attendance explicitly refers to the linked `TeacherNames` ID as `staff_id`.

However, other features remain explicitly teacher-oriented.

Therefore, terminology should be interpreted feature by feature.

---

## 4. Staff Attendance

Staff attendance is one of the areas where the shared identity is explicitly being used as staff identity.

The attendance model uses the `TeacherNames` identity as:

```text
staff_id
```

Therefore, in staff-attendance workflows, the `TeacherNames` record can represent the staff member whose attendance is being recorded.

This does not mean that every other workflow using `TeacherNames` is automatically staff-wide.

---

## 5. Salary and Ledger — Important Qualification

Salary and ledger references require more careful wording.

The repository shows that these models reference `TeacherNames`, but the models and comments currently describe them using teacher-specific terminology such as:

- Teacher Salary
- Teacher Ledger

Therefore, the database relationship proves that these records are connected to a `TeacherNames` identity.

It does not, by itself, prove that salary and ledger are intended to cover every staff role.

Future work involving salary or ledger should therefore first verify the business rule.

Do not document these modules as universally staff-wide merely because their foreign key points to `TeacherNames`.

---

## 6. Legacy `get_current_staff()` Fallback

There is an important existing behavior in `self_attendance.py`.

When an account from certain roles does not have an explicit `teacher_name_id`, the current implementation can fall back to the first `TeacherNames` record.

This behavior is technically present in the repository, but it should be treated as legacy/unsafe behavior, not as correct identity resolution.

For example:

```text
User
teacher_name_id = NULL
        ↓
current fallback
        ↓
first TeacherNames record
```

There is no reliable basis for concluding that the first record belongs to that logged-in user.

This can therefore associate attendance with the wrong person.

Furthermore, this behavior conflicts with the nearby `User` model documentation indicating that an account without the required identity link should receive a 403 for self-attendance.

### Required interpretation

The fallback should not be used as evidence that the account is associated with that staff member.

Future changes should prefer:

```text
explicit User.teacher_name_id
```

and should not silently substitute an arbitrary `TeacherNames` record.

---

## 7. Do Not Broadly Rename Existing Terminology

The presence of names such as:

```text
TeacherNames
teacher_name_id
teacher_id
teacher salary
teacher ledger
teacher attendance
```

does not mean that all of these should now be renamed to `StaffNames`, `staff_id`, etc.

Such a broad refactor could unnecessarily affect:

- existing database relationships,
- API contracts,
- frontend code,
- permissions,
- attendance,
- salary,
- ledger,
- historical records,
- tenant deployments,
- and existing functionality.

The safer approach is to preserve existing schema and terminology unless a specific feature requires a change.

---

## 8. How Future Development Should Interpret `teacher_*`

Every `teacher_*` reference should be classified according to its actual business context.

### Teacher-specific example

A workflow that deals specifically with:

- teaching classes,
- subjects,
- teacher assignments,
- teacher-specific academic operations,

may genuinely be teacher-specific.

### Staff-wide example

A workflow explicitly dealing with:

- staff attendance,
- staff identity,
- staff self-attendance,

may use `TeacherNames` as the underlying historical staff identity.

### Ambiguous example

Salary, ledger, allowances, deductions, or other payroll features should not automatically be classified as staff-wide or teacher-only from the table/field name alone.

Their actual business rules should be checked before modifying them.

---

## 9. Identity Resolution Rule

For future implementation work, the preferred identity-resolution logic is:

```text
1. Read the logged-in User.
2. Determine application role from User.role.
3. If the feature requires a staff identity:
      use User.teacher_name_id.
4. If teacher_name_id is NULL:
      do not guess a TeacherNames record.
5. Handle the missing identity explicitly
      according to the feature's authorization/business rule.
```

In particular:

> Never use "the first `TeacherNames` record" as a substitute for a missing identity relationship.

---

## 10. Development Guidance

When an implementation agent encounters a field or model containing `teacher_*`, it should:

1. Inspect the model and its relationships.
2. Determine whether the workflow is actually teacher-specific or staff-wide.
3. Check `User.role` when role matters.
4. Check `User.teacher_name_id` when staff identity matters.
5. Preserve existing database/API contracts unless a change is specifically required.
6. Avoid broad terminology refactoring.
7. Treat missing identity links explicitly rather than guessing.
8. Distinguish verified repository behavior from the desired future architecture.

---

## 11. Canonical Rule for MZBS Development

The following rule should be used in future implementation plans and coding-agent prompts:

> `TeacherNames` is a historical/shared identity abstraction reused by multiple MZBS workflows. It does not itself determine a user's application role. Determine the application role from `User.role`, and when a feature requires the actual staff identity, use the explicit `User.teacher_name_id` relationship. Do not infer a role from a `TeacherNames` record, do not assume every workflow using `TeacherNames` is staff-wide, and do not substitute an arbitrary `TeacherNames` record when the explicit identity link is missing. Evaluate each `teacher_*` workflow according to its actual business purpose before making changes.

---

## 12. Practical Impact on Future MZBS Work

This clarification should be applied particularly carefully to:

- Staff Attendance
- Self Attendance
- Teacher Attendance Review
- Staff Salary
- Salary Ledger
- Allowances
- Deductions
- Teacher/Staff Accounts
- Deleted Staff
- Permissions
- User-to-staff linking
- Any future staff-management features

The goal is to extend the existing system without breaking historical functionality, while progressively making identity handling more explicit and reliable.

---

## 13. Repository Verification Summary

This clarification is supported by the codebase as follows:

- `TeacherNames` has no role field: [schemas/teacher_names_model.py](../schemas/teacher_names_model.py)
- `User.role` is the role source: [user/user_models.py](../user/user_models.py)
- `User.teacher_name_id` is nullable and optional: [user/user_models.py](../user/user_models.py)
- Staff attendance uses the linked identity as `staff_id`: [schemas/staff_attendance_model.py](../schemas/staff_attendance_model.py)
- The actual identity link is defined in migration 0008: [migrations/0008_add_teacher_name_id_to_user.py](../migrations/0008_add_teacher_name_id_to_user.py)
- The current self-attendance fallback is a legacy issue and should not be treated as correct identity resolution: [router/self_attendance.py](../router/self_attendance.py)

This classification is therefore a repository-grounded clarification, not a broad rename recommendation.
