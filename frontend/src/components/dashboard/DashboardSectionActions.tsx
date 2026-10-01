"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";

export const dashboardFilterGroupClassName =
  "flex h-10 shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2";

export const dashboardSelectClassName =
  "h-8 min-w-0 rounded border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export const dashboardDateInputClassName =
  "h-10 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const DashboardDateInput = ({
  id,
  label,
  value,
  onChange,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: string;
}) => (
  <>
    <label className="sr-only" htmlFor={id}>{label}</label>
    <input
      id={id}
      type="date"
      max={max}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={dashboardDateInputClassName}
    />
  </>
);

export const DashboardToolbar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);

export const DashboardViewLink = ({
  href,
  label = "View",
}: {
  href: string;
  label?: string;
}) => (
  <Link
    href={href}
    className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  >
    {label} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);

export const DashboardRefreshButton = ({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-label="Refresh summary"
    title="Refresh summary"
    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  >
    <RefreshCw
      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
      aria-hidden="true"
    />
  </button>
);

export const getAttendanceMarkHref = (
  attendanceDate: string,
  classNameId: number,
  attendanceTimeId: number
) => {
  const params = new URLSearchParams({
    attendance_date: attendanceDate,
    class_name_id: String(classNameId),
    attendance_time_id: String(attendanceTimeId),
  });
  return `/dashboard/attendance/mark_attendance?${params.toString()}`;
};