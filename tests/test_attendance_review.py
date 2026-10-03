from datetime import date, time

from sqlmodel import select

from schemas.attendance_time_model import AttendanceTime
from schemas.staff_attendance_model import StaffAttendance
from schemas.staff_shift_assignment_model import StaffShiftAssignment
from schemas.staff_shift_timing_model import StaffShiftTimingVersion
from schemas.teacher_names_model import TeacherNames


def test_batch_finalize_saves_valid_rows_and_reports_invalid_rows(
    test_client,
    test_session,
    admin_token,
):
    attendance_date = date(2026, 9, 27)
    shift = AttendanceTime(attendance_time="Morning batch test")
    staff = TeacherNames(teacher_name="Batch Test Staff")
    test_session.add_all([shift, staff])
    test_session.commit()
    test_session.refresh(shift)
    test_session.refresh(staff)
    test_session.add_all([
        StaffShiftAssignment(
            staff_id=staff.teacher_name_id,
            attendance_time_id=shift.attendance_time_id,
        ),
        StaffShiftTimingVersion(
            attendance_time_id=shift.attendance_time_id,
            start_time=time(7, 45),
            end_time=time(14, 0),
            effective_from=date(2026, 1, 1),
        ),
    ])
    test_session.commit()

    response = test_client.post(
        "/attendance-review/batch-finalize",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "attendance_date": attendance_date.isoformat(),
            "attendance_time_id": shift.attendance_time_id,
            "records": [
                {
                    "staff_id": staff.teacher_name_id,
                    "final_status": "PRESENT",
                    "arrival_time": "08:00:00",
                    "departure_time": "14:00:00",
                },
                {
                    "staff_id": 999999,
                    "final_status": "PRESENT",
                    "arrival_time": "08:00:00",
                    "departure_time": "14:00:00",
                },
            ],
        },
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["finalized_count"] == 1
    assert result["failed_count"] == 1
    assert result["results"][0]["finalized"] is True
    assert result["results"][1]["finalized"] is False
    assert result["results"][1]["error"] == "Staff member not found."

    attendance = test_session.exec(
        select(StaffAttendance).where(
            StaffAttendance.staff_id == staff.teacher_name_id,
            StaffAttendance.attendance_date == attendance_date,
            StaffAttendance.attendance_time_id == shift.attendance_time_id,
        )
    ).one()
    assert attendance.is_finalized is True
    assert attendance.final_status == "PRESENT"
    assert attendance.arrival_time == time(8, 0)
    assert attendance.departure_time == time(14, 0)
    assert attendance.expected_start_time_snapshot == time(7, 45)


def test_attendance_review_summary_counts_staff_shifts_and_statuses(
    test_client,
    test_session,
    admin_token,
):
    attendance_date = date(2026, 9, 29)
    morning = AttendanceTime(attendance_time="Summary Morning")
    afternoon = AttendanceTime(attendance_time="Summary Afternoon")
    multi_shift_staff = TeacherNames(teacher_name="Summary Multi Shift")
    unmarked_staff = TeacherNames(teacher_name="Summary Unmarked")
    leave_staff = TeacherNames(teacher_name="Summary Leave")
    general_staff = TeacherNames(teacher_name="Summary General")
    deleted_staff = TeacherNames(teacher_name="Summary Deleted", is_deleted=True)
    test_session.add_all([
        morning,
        afternoon,
        multi_shift_staff,
        unmarked_staff,
        leave_staff,
        general_staff,
        deleted_staff,
    ])
    test_session.commit()
    for item in (morning, afternoon, multi_shift_staff, unmarked_staff, leave_staff, general_staff, deleted_staff):
        test_session.refresh(item)

    test_session.add_all([
        StaffShiftAssignment(staff_id=multi_shift_staff.teacher_name_id, attendance_time_id=morning.attendance_time_id),
        StaffShiftAssignment(staff_id=multi_shift_staff.teacher_name_id, attendance_time_id=afternoon.attendance_time_id),
        StaffShiftAssignment(staff_id=unmarked_staff.teacher_name_id, attendance_time_id=morning.attendance_time_id),
        StaffShiftAssignment(staff_id=leave_staff.teacher_name_id, attendance_time_id=afternoon.attendance_time_id),
        StaffShiftAssignment(staff_id=deleted_staff.teacher_name_id, attendance_time_id=morning.attendance_time_id),
        StaffAttendance(
            staff_id=multi_shift_staff.teacher_name_id,
            attendance_time_id=morning.attendance_time_id,
            attendance_date=attendance_date,
            final_status="PRESENT",
            is_finalized=False,
        ),
        StaffAttendance(
            staff_id=multi_shift_staff.teacher_name_id,
            attendance_time_id=afternoon.attendance_time_id,
            attendance_date=attendance_date,
            final_status="LATE",
            is_finalized=True,
        ),
        StaffAttendance(
            staff_id=leave_staff.teacher_name_id,
            attendance_time_id=afternoon.attendance_time_id,
            attendance_date=attendance_date,
            final_status="LEAVE",
            is_finalized=False,
        ),
        StaffAttendance(
            staff_id=general_staff.teacher_name_id,
            attendance_time_id=None,
            attendance_date=attendance_date,
            final_status="ABSENT",
            is_finalized=True,
        ),
        StaffAttendance(
            staff_id=deleted_staff.teacher_name_id,
            attendance_time_id=morning.attendance_time_id,
            attendance_date=attendance_date,
            final_status="PRESENT",
            is_finalized=False,
        ),
        StaffAttendance(
            staff_id=multi_shift_staff.teacher_name_id,
            attendance_time_id=morning.attendance_time_id,
            attendance_date=date(2026, 9, 28),
            final_status="ABSENT",
            is_finalized=True,
        ),
    ])
    test_session.commit()

    response = test_client.get(
        "/attendance-review/summary",
        params={"attendance_date": attendance_date.isoformat()},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary["total"] == 5
    assert summary["finalized"] == 2
    assert summary["pending"] == 3
    assert summary["present"] == 2
    assert summary["leave"] == 1
    assert summary["absent"] == 1
    assert summary["unmarked"] == 1
    assert {shift["attendance_time_name"]: shift for shift in summary["shifts"]} == {
        "Summary Morning": {
            "attendance_time_id": morning.attendance_time_id,
            "attendance_time_name": "Summary Morning",
            "total": 2,
            "finalized": 0,
            "pending": 2,
            "present": 1,
            "leave": 0,
            "absent": 0,
            "unmarked": 1,
        },
        "Summary Afternoon": {
            "attendance_time_id": afternoon.attendance_time_id,
            "attendance_time_name": "Summary Afternoon",
            "total": 2,
            "finalized": 1,
            "pending": 1,
            "present": 1,
            "leave": 1,
            "absent": 0,
            "unmarked": 0,
        },
        "General / No Shift Assigned": {
            "attendance_time_id": None,
            "attendance_time_name": "General / No Shift Assigned",
            "total": 1,
            "finalized": 1,
            "pending": 0,
            "present": 0,
            "leave": 0,
            "absent": 1,
            "unmarked": 0,
        },
    }


def test_delete_finalized_attendance_review_record(
    test_client,
    test_session,
    admin_token,
):
    attendance_date = date(2026, 9, 29)
    staff = TeacherNames(teacher_name="Finalized Attendance Delete Test")
    test_session.add(staff)
    test_session.commit()
    test_session.refresh(staff)

    record = StaffAttendance(
        staff_id=staff.teacher_name_id,
        attendance_time_id=None,
        attendance_date=attendance_date,
        final_status="PRESENT",
        is_finalized=True,
    )
    test_session.add(record)
    test_session.commit()

    response = test_client.delete(
        f"/attendance-review/{staff.teacher_name_id}",
        params={"attendance_date": attendance_date.isoformat()},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["detail"] == "Attendance record deleted."
    assert test_session.get(StaffAttendance, record.staff_attendance_id) is None