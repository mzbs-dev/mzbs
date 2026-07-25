from schemas.view_marks_model import StudentMarkByDate, StudentMarksViewRow, enrich_student_mark_rows


def test_enrich_student_mark_rows_assigns_totals_and_positions():
    rows = [
        StudentMarksViewRow(
            student_id=1,
            student_name="Alice",
            marks=[
                StudentMarkByDate(exam_date="2024-01-01", obtained_marks=30, total_marks=50),
                StudentMarkByDate(exam_date="2024-02-01", obtained_marks=20, total_marks=50),
            ],
        ),
        StudentMarksViewRow(
            student_id=2,
            student_name="Bob",
            marks=[
                StudentMarkByDate(exam_date="2024-01-01", obtained_marks=40, total_marks=50),
                StudentMarkByDate(exam_date="2024-02-01", obtained_marks=20, total_marks=50),
            ],
        ),
    ]

    enriched = enrich_student_mark_rows(rows)

    assert enriched[0].student_id == 2
    assert enriched[0].total_obtained_marks == 60
    assert enriched[0].total_marks == 100
    assert enriched[0].position == 1

    assert enriched[1].student_id == 1
    assert enriched[1].total_obtained_marks == 50
    assert enriched[1].total_marks == 100
    assert enriched[1].position == 2


def test_enrich_student_mark_rows_uses_dense_ranking_for_ties():
    rows = [
        StudentMarksViewRow(
            student_id=1,
            student_name="Alice",
            marks=[StudentMarkByDate(exam_date="2024-01-01", obtained_marks=98, total_marks=100)],
        ),
        StudentMarksViewRow(
            student_id=2,
            student_name="Bob",
            marks=[StudentMarkByDate(exam_date="2024-01-01", obtained_marks=98, total_marks=100)],
        ),
        StudentMarksViewRow(
            student_id=3,
            student_name="Carol",
            marks=[StudentMarkByDate(exam_date="2024-01-01", obtained_marks=94, total_marks=100)],
        ),
        StudentMarksViewRow(
            student_id=4,
            student_name="Dave",
            marks=[StudentMarkByDate(exam_date="2024-01-01", obtained_marks=87, total_marks=100)],
        ),
        StudentMarksViewRow(
            student_id=5,
            student_name="Eve",
            marks=[StudentMarkByDate(exam_date="2024-01-01", obtained_marks=87, total_marks=100)],
        ),
    ]

    enriched = enrich_student_mark_rows(rows)

    assert [student.position for student in enriched] == [1, 1, 2, 3, 3]
