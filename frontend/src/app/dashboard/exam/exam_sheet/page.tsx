"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { ClassSubjectAPI } from "@/api/ClassSubject/ClassSubjectAPI";
import { StudentAPI } from "@/api/Student/StudentsAPI";

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

const ExamSheetPage = () => {
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [sheetReady, setSheetReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadClasses();
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

  const handleGetSubjects = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    if (!selectedExamType) {
      toast.error("Please select an exam type");
      return;
    }

    try {
      setLoading(true);
      const response = await ClassSubjectAPI.Get();
      const allSubjects = extractArrayData<ClassSubjectResponse>(response);
      const filtered = allSubjects
        .filter((item) => String(item.class_name_id) === selectedClassId)
        .map((item) => item.subject_name);
      setSubjects(filtered);
      setSheetReady(false);
      if (!filtered.length) {
        toast.error("No subjects found for the selected class");
      }
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    if (!selectedExamType) {
      toast.error("Please select an exam type");
      return;
    }
    if (!subjects.length) {
      toast.error("Please load subjects before creating the exam sheet");
      return;
    }

    try {
      setLoading(true);
      const response = await StudentAPI.GetStudentbyFilter(Number(selectedClassId));
      const studentsData = extractArrayData<StudentResponse>(response);
      setStudents(studentsData);
      setSheetReady(true);
      if (!studentsData.length) {
        toast.error("No students found for the selected class");
      }
    } catch (error) {
      console.error("Failed to load students", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

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
          table {
            width: 100% !important;
            border-collapse: collapse;
          }
        }
      `}</style>
      <div className="no-print">
        <Header value="Exam Sheet" />
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
            <Button onClick={handleGetSubjects} className="bg-primary text-white min-w-[150px]">
              Get Subjects
            </Button>
            <Button onClick={handleCreateSheet} className="bg-secondary text-white min-w-[150px]">
              Create Exam Sheet
            </Button>
            <Button onClick={() => window.print()} className="bg-slate-900 text-white min-w-[100px]">
              Print
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-400">
          Loading...
        </div>
      )}

      {subjects.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900 no-print">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subjects for selected class</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <span
                key={subject}
                className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}

      {sheetReady && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900 print-wrapper">
          <div className="mb-4 text-center">
            <div className="text-base font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
              Class Name: {classOptions.find((item) => String(item.id) === selectedClassId)?.title ?? ""}
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
                  {subjects.map((subject) => (
                    <th key={subject} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {subject}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Total Marks</td>
                  {subjects.map((subject) => (
                    <td key={`total-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                </tr>
                {students.map((student, index) => (
                  <tr key={student.student_id}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{student.student_name}</td>
                    {subjects.map((subject) => (
                      <td key={`${student.student_id}-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        &nbsp;
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Teacher Name</td>
                  {subjects.map((subject) => (
                    <td key={`teacher-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-700 dark:bg-neutral-900 dark:text-gray-300"></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Signature</td>
                  {subjects.map((subject) => (
                    <td key={`signature-${subject}`} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                  ))}
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSheetPage;
