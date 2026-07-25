"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { ClassSubjectAPI } from "@/api/ClassSubject/ClassSubjectAPI";
import { StudentAPI } from "@/api/Student/StudentsAPI";
import { ExamMarksAPI } from "@/api/ExamMarks/ExamMarksAPI";
import { TeacherNameAPI } from "@/api/Teacher/TeachetAPI";

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface ClassSubjectResponse {
  class_name_id: number;
  subject_name: string;
}

interface StudentResponse {
  student_id: number;
  student_name: string;
}

interface ExamMarkRecord {
  exam_date: string;
  class_name_id: number;
  teacher_name_id: number;
  subject_name: string;
  exam_type: string;
  total_marks: number;
  student_id: number;
  obtained_marks: number | null;
}

interface TeacherResponse {
  teacher_name_id: number;
  teacher_name: string;
}

const examTypes = [
  { id: "Weekly Test", title: "Weekly Test" },
  { id: "Monthly Test", title: "Monthly Test" },
  { id: "3 Monthly", title: "3 Monthly" },
  { id: "6 Monthly", title: "6 Monthly" },
  { id: "Final Exam", title: "Final Exam" },
];

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const parseDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const computePositions = (rows: { total_obtained_marks: number }[]) => {
  const sorted = [...rows].sort((a, b) => b.total_obtained_marks - a.total_obtained_marks);
  const positions: number[] = [];
  let previousTotal: number | null = null;
  let currentPosition = 0;

  sorted.forEach((row) => {
    if (previousTotal === null || row.total_obtained_marks !== previousTotal) {
      currentPosition += 1;
      previousTotal = row.total_obtained_marks;
    }
    positions.push(currentPosition);
  });

  return sorted.map((row) => {
    const positionIndex = sorted.findIndex((sortedRow) => sortedRow === row);
    return positions[positionIndex];
  });
};

const ClassResultPage = () => {
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<number, string>>({});
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [sheetReady, setSheetReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [examMarks, setExamMarks] = useState<ExamMarkRecord[]>([]);
  const [subjectTotals, setSubjectTotals] = useState<Record<string, number | null>>({});
  const [subjectTeacherNames, setSubjectTeacherNames] = useState<Record<string, string>>({});
  const [subjectExamDates, setSubjectExamDates] = useState<Record<string, string>>({});
  const [teacherName, setTeacherName] = useState("");
  const [conductedDate, setConductedDate] = useState("");
  const [rows, setRows] = useState<
    {
      student_id: number;
      student_name: string;
      marks: Record<string, string>;
      total_obtained_marks: number;
      position: number;
      remarks: string;
    }[]
  >([]);

  useEffect(() => {
    void loadClasses();
    void loadTeachers();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await ClassNameAPI.Get();
      const classes = extractArrayData<ClassNameResponse>(response);
      setClassOptions(classes.map((item) => ({ id: item.class_name_id, title: item.class_name })));
    } catch (error) {
      console.error("Failed to load classes", error);
      toast.error("Failed to load classes");
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await TeacherNameAPI.Get();
      const teachers = extractArrayData<TeacherResponse>(response);
      setTeacherMap(Object.fromEntries(teachers.map((item) => [item.teacher_name_id, item.teacher_name])));
    } catch (error) {
      console.error("Failed to load teacher names", error);
    }
  };

  const loadSubjects = async (classId: number) => {
    try {
      const response = await ClassSubjectAPI.Get();
      const subjects = extractArrayData<ClassSubjectResponse>(response);
      const filtered = subjects
        .filter((item) => item.class_name_id === classId)
        .map((item) => item.subject_name);
      setSubjectOptions(filtered);
      return filtered;
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects");
      return [] as string[];
    }
  };

  const loadClassResult = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    if (!selectedExamType) {
      toast.error("Please select an exam type");
      return;
    }

    setLoading(true);
    setSheetReady(false);

    try {
      const classId = Number(selectedClassId);
      const [subjects, studentResponse, marksResponse] = await Promise.all([
        loadSubjects(classId),
        StudentAPI.GetStudentbyFilter(classId),
        ExamMarksAPI.GetByFilters({ class_name_id: classId, exam_type: selectedExamType }),
      ]);

      const studentsData = extractArrayData<StudentResponse>(studentResponse);
      const examMarksData = extractArrayData<ExamMarkRecord>(marksResponse);
      setStudents(studentsData);
      setExamMarks(examMarksData);
      setSubjectOptions(subjects);

      const subjectLatestMap = new Map<
        string,
        { exam_date: string; teacher_name_id: number; total_marks: number }
      >();

      examMarksData.forEach((record) => {
        if (!subjectLatestMap.has(record.subject_name)) {
          subjectLatestMap.set(record.subject_name, {
            exam_date: record.exam_date,
            teacher_name_id: record.teacher_name_id,
            total_marks: record.total_marks,
          });
          return;
        }

        const existing = subjectLatestMap.get(record.subject_name);
        if (!existing) return;

        const recordDate = parseDate(record.exam_date);
        const existingDate = parseDate(existing.exam_date);

        if (recordDate > existingDate) {
          subjectLatestMap.set(record.subject_name, {
            exam_date: record.exam_date,
            teacher_name_id: record.teacher_name_id,
            total_marks: record.total_marks,
          });
        }
      });

      const totals: Record<string, number | null> = {};
      const teachers: Record<string, string> = {};
      const dates: Record<string, string> = {};
      let totalMarksSum = 0;

      subjects.forEach((subject) => {
        const session = subjectLatestMap.get(subject);
        totals[subject] = session ? session.total_marks : null;
        teachers[subject] = session ? teacherMap[session.teacher_name_id] ?? "" : "";
        dates[subject] = session ? session.exam_date : "";
        if (session) totalMarksSum += session.total_marks;
      });

      setSubjectTotals(totals);
      setSubjectTeacherNames(teachers);
      setSubjectExamDates(dates);

      const latestExam = examMarksData.reduce<ExamMarkRecord | null>((latest, record) => {
        if (!latest) return record;
        const recordDate = parseDate(record.exam_date);
        const latestDate = parseDate(latest.exam_date);
        return recordDate > latestDate ? record : latest;
      }, null);

      if (latestExam) {
        setTeacherName(teacherMap[latestExam.teacher_name_id] ?? "");
        setConductedDate(latestExam.exam_date);
      } else {
        setTeacherName("");
        setConductedDate("");
      }

      const marksBySubjectAndStudent = new Map<string, Map<number, number | null>>();
      subjectLatestMap.forEach((session, subject) => {
        marksBySubjectAndStudent.set(subject, new Map());
      });

      examMarksData.forEach((record) => {
        const session = subjectLatestMap.get(record.subject_name);
        if (!session) return;
        if (record.exam_date !== session.exam_date) return;
        const subjectMap = marksBySubjectAndStudent.get(record.subject_name);
        if (!subjectMap) return;
        subjectMap.set(record.student_id, record.obtained_marks ?? null);
      });

      const studentRows = studentsData.map((student) => {
        const marks: Record<string, string> = {};
        let totalObtained = 0;
        let hasMarks = false;

        subjects.forEach((subject) => {
          const subjectMap = marksBySubjectAndStudent.get(subject);
          const value = subjectMap?.get(student.student_id) ?? null;
          if (typeof value === "number") {
            marks[subject] = String(value);
            totalObtained += value;
            hasMarks = true;
          } else {
            marks[subject] = "";
          }
        });

        return {
          student_id: student.student_id,
          student_name: student.student_name,
          marks,
          total_obtained_marks: totalObtained,
          position: 0,
          remarks: "",
          hasMarks,
        };
      });

      const sortedRows = [...studentRows].sort((a, b) => b.total_obtained_marks - a.total_obtained_marks || a.student_name.localeCompare(b.student_name));
      let previousTotal: number | null = null;
      let currentPosition = 0;
      sortedRows.forEach((row) => {
        if (previousTotal === null || row.total_obtained_marks !== previousTotal) {
          currentPosition += 1;
          previousTotal = row.total_obtained_marks;
        }
        row.position = currentPosition;
      });

      setRows(sortedRows);
      setSheetReady(true);
    } catch (error) {
      console.error("Failed to load class result", error);
      toast.error("Failed to load class result. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const className = classOptions.find((item) => String(item.id) === selectedClassId)?.title ?? "";
  const totalMarksSum = Object.values(subjectTotals).reduce((sum, value) => sum + (value ?? 0), 0);
  const totalObtainedSum = rows.reduce((sum, row) => sum + row.total_obtained_marks, 0);

  return (
    <div className="space-y-6">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        @media print {
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-wrapper {
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .print-sheet {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          .print-sheet th,
          .print-sheet td {
            padding: 0.35rem !important;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
            white-space: normal !important;
          }
          .print-sheet th:first-child,
          .print-sheet td:first-child {
            width: 4% !important;
          }
          .print-sheet th:nth-child(2),
          .print-sheet td:nth-child(2) {
            width: 18% !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          .print-only {
            display: block !important;
          }
          .screen-only {
            display: none !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="no-print">
        <Header value="Class Result" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1 max-w-[320px]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
              <Select
                options={classOptions}
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                DisplayItem="title"
              />
            </div>
          </div>

          <div className="min-w-[160px] flex-1 max-w-[320px]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exam</label>
              <Select
                options={examTypes}
                value={selectedExamType}
                onChange={(event) => setSelectedExamType(event.target.value)}
                DisplayItem="title"
              />
            </div>
          </div>

          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
            <Button onClick={loadClassResult} className="bg-primary text-white min-w-[150px]">
              Get Class Result
            </Button>
            <Button onClick={() => window.print()} className="bg-slate-900 text-white min-w-[100px]">
              Print
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-400">
          Loading class result...
        </div>
      )}

      {sheetReady && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900 print-wrapper">
          <div className="mb-4 text-center">
            <div className="text-base font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Class Name: {className}
            </div>
            <div className="text-base font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Test: {selectedExamType}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 print-sheet">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:bg-slate-900 dark:text-gray-300">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Student Name
                  </th>
                  {subjectOptions.map((subject) => (
                    <th key={subject} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {subject}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total Marks
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Position
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Teacher</td>
                  {subjectOptions.map((subject) => (
                    <td key={`teacher-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {subjectTeacherNames[subject] || ""}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Date Conducted</td>
                  {subjectOptions.map((subject) => (
                    <td key={`date-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {subjectExamDates[subject] ? formatDate(subjectExamDates[subject]) : ""}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Total Marks</td>
                  {subjectOptions.map((subject) => (
                    <td key={`total-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {subjectTotals[subject] ?? ""}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    {totalMarksSum || ""}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                </tr>
                {rows.map((row, index) => (
                  <tr key={row.student_id}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.student_name}</td>
                    {subjectOptions.map((subject) => (
                      <td key={`${row.student_id}-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {row.marks[subject]}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {row.total_obtained_marks || ""}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {row.position}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {row.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right text-xs text-gray-500 dark:text-gray-400 print-only">
            Print Date: {formatDate(new Date().toISOString())}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassResultPage;
