"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { ClassSubjectAPI } from "@/api/ClassSubject/ClassSubjectAPI";
import { ViewMarksAPI } from "@/api/ViewMarks/ViewMarksAPI";
import type { ViewMarksResponse } from "@/models/viewMarks/viewMarks";

interface ViewStudentRow {
  student_id: number;
  student_name: string;
  marks: { exam_date: string; obtained_marks: number | null; total_marks?: number | null }[];
  total_obtained_marks: number;
  total_marks: number;
  position: number;
}

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface ClassSubjectResponse {
  class_name_id: number;
  subject_name: string;
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

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const ViewMarks = () => {
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [viewData, setViewData] = useState<ViewMarksResponse | null>(null);
  const [tableRows, setTableRows] = useState<ViewStudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setSubjectOptions([]);
      setSelectedSubject("");
      return;
    }
    void loadSubjects();
  }, [selectedClassId]);

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

  const loadSubjects = async () => {
    try {
      const response = await ClassSubjectAPI.Get();
      const subjects = extractArrayData<ClassSubjectResponse>(response);
      const filteredSubjects = subjects
        .filter((item) => String(item.class_name_id) === selectedClassId)
        .map((item) => ({ id: item.subject_name, title: item.subject_name }));
      setSubjectOptions(filteredSubjects);
      if (!filteredSubjects.some((item) => item.id === selectedSubject)) {
        setSelectedSubject("");
      }
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects");
    }
  };

  const handleGet = async () => {
    if (!selectedClassId || !selectedSubject || !selectedExamType) {
      toast.error("Please select class, subject, and exam type");
      return;
    }

    try {
      setLoading(true);
      const response = await ViewMarksAPI.Get({
        class_name_id: Number(selectedClassId),
        subject_name: selectedSubject,
        exam_type: selectedExamType,
      });
      const payload = response.data as ViewMarksResponse;
      setViewData(payload);
      setTableRows(payload.students as ViewStudentRow[]);
    } catch (error) {
      console.error("Failed to load view marks", error);
      toast.error("Failed to load marks");
      setViewData(null);
      setTableRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header value="View Marks" />

      <div className="rounded-[24px] border border-border/80 bg-card/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-border dark:bg-background/70 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 basis-[220px] space-y-1.5">
            <label className="text-sm font-medium text-foreground dark:text-foreground">Class</label>
            <Select
              options={classOptions}
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              DisplayItem="title"
            />
          </div>

          <div className="min-w-[220px] flex-1 basis-[220px] space-y-1.5">
            <label className="text-sm font-medium text-foreground dark:text-foreground">Subject</label>
            <Select
              options={subjectOptions}
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              DisplayItem="title"
            />
          </div>

          <div className="min-w-[220px] flex-1 basis-[220px] space-y-1.5">
            <label className="text-sm font-medium text-foreground dark:text-foreground">Exam</label>
            <Select
              options={examTypes}
              value={selectedExamType}
              onChange={(event) => setSelectedExamType(event.target.value)}
              DisplayItem="title"
            />
          </div>

          <div className="min-w-[180px] flex-1 basis-[180px] sm:max-w-[180px]">
            <Button onClick={handleGet} className="h-10 w-full bg-primary text-white">
              Get
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground dark:border-border dark:bg-card dark:text-muted-foreground">
          Loading marks...
        </div>
      ) : viewData ? (
        <div className="rounded-xl border border-border bg-card shadow-sm dark:border-border dark:bg-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-muted dark:bg-card">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left text-sm font-semibold text-foreground dark:bg-card dark:text-foreground">
                    Student Name
                  </th>
                  {viewData.dates.map((dateValue) => (
                    <th key={dateValue} className="px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-foreground">
                      {formatDate(dateValue)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-foreground">
                    Total Obtained / Total Marks
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-foreground">
                    Position
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {tableRows.map((student) => (
                  <tr key={student.student_id}>
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 text-sm font-medium text-foreground dark:bg-card dark:text-foreground">
                      {student.student_name}
                    </td>
                    {viewData.dates.map((dateValue) => {
                      const match = student.marks.find((item) => item.exam_date === dateValue);
                      const obtainedMarks = match?.obtained_marks ?? "-";
                      const totalMarks = match?.total_marks ?? "-";
                      return (
                        <td key={`${student.student_id}-${dateValue}`} className="px-4 py-3 text-center text-sm text-muted-foreground dark:text-muted-foreground">
                          {match ? `${obtainedMarks} / ${totalMarks}` : "-"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-foreground">
                      {student.total_obtained_marks} / {student.total_marks}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-foreground">
                      {student.position}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground dark:border-border dark:bg-card dark:text-muted-foreground">
          Select filters and press Get to view exam results.
        </div>
      )}
    </div>
  );
};

export default ViewMarks;
