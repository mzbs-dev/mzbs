"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { DashboardDateInput } from "@/components/dashboard/DashboardSectionActions";
import {
  AttendanceReviewAPI,
  AttendanceReviewSummary,
} from "@/api/AttendanceReview/AttendanceReviewAPI";
import { useRole } from "@/context/RoleContext";

const getLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const reviewHref = (attendanceDate: string, attendanceTimeId?: number | null) => {
  const shift = attendanceTimeId === undefined ? "all" : attendanceTimeId === null ? "none" : String(attendanceTimeId);
  return `/dashboard/staff/attendance-review?attendance_date=${encodeURIComponent(attendanceDate)}&attendance_time_id=${shift}`;
};

const countItems = (summary: AttendanceReviewSummary) => [
  { label: "Present", value: summary.present, note: "Includes late", tone: "text-emerald-700" },
  { label: "Leave", value: summary.leave, tone: "text-amber-700" },
  { label: "Absent", value: summary.absent, tone: "text-rose-700" },
  { label: "Unmarked", value: summary.unmarked, note: "No status assigned", tone: "text-slate-600" },
];

export default function StaffAttendanceDashboardCard() {
  const { role, permissions, permissionsLoaded } = useRole();
  const normalizedRole = role?.toUpperCase();
  const roleAllowed = normalizedRole === "ADMIN" || normalizedRole === "CHIEF_PRINCIPAL";
  const permissionAllowed = normalizedRole === "ADMIN"
    || (permissionsLoaded && (permissions
      ? permissions.attendance_review?.view === true
      : normalizedRole === "CHIEF_PRINCIPAL"));
  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [summary, setSummary] = useState<AttendanceReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSummary = useCallback(async (date: string) => {
    setLoading(true);
    setError(false);
    try {
      setSummary(await AttendanceReviewAPI.getSummary(date));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleAllowed && permissionAllowed) void loadSummary(selectedDate);
  }, [loadSummary, permissionAllowed, roleAllowed, selectedDate]);

  if (!roleAllowed || !permissionAllowed) return null;

  const currentSummary = summary?.attendance_date === selectedDate ? summary : null;
  const progress = currentSummary && currentSummary.total > 0
    ? Math.round((currentSummary.finalized / currentSummary.total) * 100)
    : 0;

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-md transition-shadow hover:shadow-lg sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold tracking-wide text-gray-800">STAFF ATTENDANCE</h2>
        <div className="flex items-center gap-2">
          <DashboardDateInput
            id="staff-attendance-date"
            label="Attendance date"
            max={getLocalDate()}
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <button
            type="button"
            onClick={() => void loadSummary(selectedDate)}
            disabled={loading}
            title="Refresh staff attendance"
            aria-label="Refresh staff attendance"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !currentSummary ? (
        <div className="space-y-5" aria-label="Loading staff attendance">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
          <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : error && !currentSummary ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-sm text-gray-500">
          <p>Unable to load staff attendance for this date.</p>
          <button type="button" onClick={() => void loadSummary(selectedDate)} className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
            Try again
          </button>
        </div>
      ) : currentSummary ? (
        <>
          {error && <p role="status" className="mb-4 text-sm text-rose-700">Refresh failed; showing the last loaded figures.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase text-sky-800">Total</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{currentSummary.total}</p>
              <p className="text-xs text-gray-500">Staff-shift records</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-800">Finalized</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{currentSummary.finalized}</p>
              <p className="text-xs text-gray-500">Reviewed and locked</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase text-amber-800">Pending</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{currentSummary.pending}</p>
              <p className="text-xs text-gray-500">To be finalized</p>
            </div>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 border-y border-gray-200 py-5 sm:grid-cols-4">
            {countItems(currentSummary).map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs font-semibold uppercase text-gray-500">{item.label}</p>
                <p className={`mt-1 text-2xl font-bold ${item.tone}`}>{item.value}</p>
                {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
              </div>
            ))}
          </div>
          <p className="-mt-3 mb-5 text-xs text-gray-500">Unmarked records are included in Pending; status counts are separate from finalization.</p>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Finalization Progress</span>
              <span className="font-semibold tabular-nums text-gray-700">{progress}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label="Finalization progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Attendance by Shift</h3>
            {currentSummary.shifts.length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-500">No staff attendance rows for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      {["Shift", "Total", "Finalized", "Pending", "Present", "Leave", "Absent", "Unmarked", ""].map((heading, index) => (
                        <th key={`${heading}-${index}`} className="px-2 py-2 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentSummary.shifts.map((shift) => (
                      <tr key={shift.attendance_time_id ?? "general"} className="text-gray-700">
                        <th scope="row" className="whitespace-nowrap px-2 py-3 font-medium">{shift.attendance_time_name}</th>
                        {[shift.total, shift.finalized, shift.pending, shift.present, shift.leave, shift.absent, shift.unmarked].map((value, index) => (
                          <td key={index} className="px-2 py-3 tabular-nums">{value}</td>
                        ))}
                        <td className="px-2 py-3 text-right">
                          <Link
                            href={reviewHref(selectedDate, shift.attendance_time_id)}
                            className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-900"
                          >
                            Review <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      ) : null}
    </section>
  );
}