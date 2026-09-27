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