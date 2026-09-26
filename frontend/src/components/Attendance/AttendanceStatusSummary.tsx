"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { AttendanceAPI } from "@/api/Attendance/AttendanceAPI";
import { ClassNameAPI } from "@/api/ClassName/ClassNameAPI";
import Loader from "@/components/Loader";
import { ArrowDown, ArrowUp } from "lucide-react";

interface ClassNamesData {
  class_name_id: number;
  class_name: string;
}

interface AttendanceStatusResponse {
  student_id: number;
  student_name: string;
  father_name: string;
  class_name: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  date_range: {
    from: string;
    to: string;
  };
}

interface FormData {
  class_name: string;
  from_date: string;
  to_date: string;
}

type SortColumn = "student_name" | "present" | "absent" | "late" | "leave";

const AttendanceStatusSummary = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>();

  const selectedClass = watch("class_name");
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassNamesData[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<AttendanceStatusResponse[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("student_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setClassesLoading(true);
      const response = await ClassNameAPI.Get();
      const payload = (response as { data?: unknown }).data;
      const classesData = Array.isArray(payload)
        ? payload
        : (payload as { data?: ClassNamesData[] } | undefined)?.data ?? [];
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (!data.class_name || data.class_name === "") {
        toast.error("Please select a class");
        setIsLoading(false);
        return;
      }

      const response = await AttendanceAPI.GetAttendanceStatusSummary(
        undefined,
        data.class_name,
        data.from_date || undefined,
        data.to_date || undefined
      );
      setSummaryData(response.data);
      setHasResults(true);
      toast.success("Attendance summary loaded successfully");
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setSummaryData([]);
        setHasResults(true);
        toast.info("No attendance records match the selected criteria");
      } else {
        toast.error("Failed to fetch attendance summary");
        setHasResults(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sortedSummary = [...summaryData].sort((left, right) => {
    const leftValue = left[sortColumn];
    const rightValue = right[sortColumn];
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));
    if (comparison !== 0) return comparison * (sortDirection === "asc" ? 1 : -1);
    return left.student_name.localeCompare(right.student_name);
  });

  const sortBy = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "student_name" ? "asc" : "desc");
  };

  const totals = summaryData.reduce(
    (result, student) => ({
      present: result.present + student.present,
      absent: result.absent + student.absent,
      late: result.late + student.late,
      leave: result.leave + student.leave,
      total: result.total + student.total,
    }),
    { present: 0, absent: 0, late: 0, leave: 0, total: 0 }
  );

  const statusHeaders: { key: SortColumn; label: string }[] = [
    { key: "present", label: "Present" },
    { key: "absent", label: "Absent" },
    { key: "late", label: "Late" },
    { key: "leave", label: "Leave" },
  ];
  const sortedByLabel = statusHeaders.find(({ key }) => key === sortColumn)?.label ?? "Student";
  const sortDirectionLabel = sortColumn === "student_name"
    ? (sortDirection === "asc" ? "A to Z" : "Z to A")
    : (sortDirection === "asc" ? "lowest to highest" : "highest to lowest");
  const activeHeaderClass = "bg-primary/10 text-primary border-b-2 border-primary";
  const activeColumnClass = "bg-primary/[0.06] dark:bg-primary/[0.12]";

  return (
    <div className="mx-auto w-auto px-2 sm:px-4">
      <Header value="Attendance Status Summary" />
      <Loader isActive={isLoading || classesLoading} />

      {/* Filter Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-card dark:bg-background rounded-xl shadow-sm border border-border dark:border-secondary p-4 sm:p-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-foreground">
                Class *
              </label>
              <select
                {...register("class_name", {
                  required: "Class is required",
                })}
                className="w-full border bg-card rounded-md px-3 py-2 text-sm focus:ring focus:ring-primary/20 dark:bg-card dark:text-foreground dark:border-border h-10"
              >
                <option value="">-- Select Class --</option>
                <option value="ALL">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.class_name_id} value={cls.class_name}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
              {errors.class_name && (
                <span className="text-red-500 text-xs">
                  {errors.class_name.message}
                </span>
              )}
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-foreground">
                From Date
              </label>
              <Input
                type="date"
                placeholder="From date"
                {...register("from_date")}
                className="h-10 text-sm"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-foreground">
                To Date
              </label>
              <Input
                type="date"
                placeholder="To date"
                {...register("to_date")}
                className="h-10 text-sm"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isLoading || !selectedClass}
                className="w-full h-10 text-sm"
              >
                {isLoading ? "Loading..." : "Get Summary"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Results */}
      {hasResults && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Class Attendance Summary</h2>
          <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
            Sorted by <span className="font-semibold text-foreground">{sortedByLabel}</span>, {sortDirectionLabel}
            {sortDirection === "asc" ? <ArrowUp aria-hidden="true" className="h-4 w-4 text-primary" /> : <ArrowDown aria-hidden="true" className="h-4 w-4 text-primary" />}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border bg-muted text-left">
                  <th aria-sort={sortColumn === "student_name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 text-sm font-semibold ${sortColumn === "student_name" ? activeHeaderClass : ""}`}>
                    <button type="button" onClick={() => sortBy("student_name")} className="flex items-center gap-1.5 hover:underline">
                      Student{sortColumn === "student_name" && (sortDirection === "asc" ? <ArrowUp aria-hidden="true" className="h-4 w-4" /> : <ArrowDown aria-hidden="true" className="h-4 w-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold">Father Name</th>
                  <th className="px-4 py-3 text-sm font-semibold">Class</th>
                  {statusHeaders.map(({ key, label }) => (
                    <th key={key} aria-sort={sortColumn === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 text-center text-sm font-semibold ${sortColumn === key ? activeHeaderClass : ""}`}>
                      <button type="button" onClick={() => sortBy(key)} className="mx-auto flex items-center gap-1.5 hover:underline">
                        {label}{sortColumn === key && (sortDirection === "asc" ? <ArrowUp aria-hidden="true" className="h-4 w-4" /> : <ArrowDown aria-hidden="true" className="h-4 w-4" />)}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedSummary.length ? sortedSummary.map((student) => (
                  <tr key={student.student_id} className="border-b border-border last:border-0 hover:bg-muted/60">
                    <td className={`px-4 py-3 text-sm font-medium ${sortColumn === "student_name" ? activeColumnClass : ""}`}>{student.student_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{student.father_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{student.class_name}</td>
                    <td className={`px-4 py-3 text-center text-sm ${sortColumn === "present" ? activeColumnClass : ""}`}>{student.present}</td>
                    <td className={`px-4 py-3 text-center text-sm ${sortColumn === "absent" ? activeColumnClass : ""}`}>{student.absent}</td>
                    <td className={`px-4 py-3 text-center text-sm ${sortColumn === "late" ? activeColumnClass : ""}`}>{student.late}</td>
                    <td className={`px-4 py-3 text-center text-sm ${sortColumn === "leave" ? activeColumnClass : ""}`}>{student.leave}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold">{student.total}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No students found for this selection.</td></tr>
                )}
              </tbody>
              {summaryData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-sm">Class total</td>
                    <td className="px-4 py-3 text-center text-sm">{totals.present}</td>
                    <td className="px-4 py-3 text-center text-sm">{totals.absent}</td>
                    <td className="px-4 py-3 text-center text-sm">{totals.late}</td>
                    <td className="px-4 py-3 text-center text-sm">{totals.leave}</td>
                    <td className="px-4 py-3 text-center text-sm">{totals.total}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasResults && !isLoading && (
        <div className="mt-6 bg-card dark:bg-background rounded-xl shadow-sm border border-border dark:border-secondary p-8 text-center">
          <p className="text-muted-foreground dark:text-muted-foreground">
            Select a class and date range, then click &quot;Get Summary&quot; to view attendance totals for every student. Select a status column header to sort the whole class by that status.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatusSummary;
