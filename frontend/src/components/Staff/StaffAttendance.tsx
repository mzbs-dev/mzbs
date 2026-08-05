"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, Save } from "lucide-react";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { AttendanceTimeAPI } from "@/api/AttendaceTime/attendanceTimeAPI";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/dashboard/Header";

interface StaffAttendanceRow {
  staff_id: number;
  staff_name: string;
  joining_date: string;
  total_stay: string;
  attendance_id?: number;
  attendance_date?: string;
  attendance_time_id?: number;
  attendance_time?: string;
  attendance_status?: string;
  is_marked: boolean;
}

type StaffAttendanceStatus = "Present" | "Absent" | "Late" | "Leave" | "Unmarked";

const statusOptions: StaffAttendanceStatus[] = ["Present", "Absent", "Late", "Leave"];

const statusStyles: Record<StaffAttendanceStatus, string> = {
  Present: "bg-primary/10 text-primary border-primary/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  Absent: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  Late: "bg-secondary text-foreground border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  Leave: "bg-secondary text-foreground border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  Unmarked: "bg-muted text-muted-foreground border-border dark:bg-slate-700 dark:text-muted-foreground dark:border-slate-600",
};

function StatusBadge({ status }: { status: StaffAttendanceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function StaffAttendancePage() {
  const router = useRouter();
  const { role } = useRole();
  const [rows, setRows] = useState<StaffAttendanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timings, setTimings] = useState<Array<{ attendance_time_id: number; attendance_time: string }>>([]);
  const [selectedTimingId, setSelectedTimingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (role && !["ADMIN", "CHIEF_PRINCIPAL"].includes(role)) {
      router.replace("/unauthorized");
      return;
    }
    void (async () => {
      // load available timings once
      try {
        const t = await AttendanceTimeAPI.Get();
        const items = Array.isArray(t?.data) ? t.data : [];
        setTimings(items.map((it: any) => ({ attendance_time_id: it.attendance_time_id, attendance_time: it.attendance_time })));
        if (items.length && selectedTimingId == null) setSelectedTimingId(items[0].attendance_time_id);
      } catch (e) {
        // ignore
      }
      await loadAttendance(selectedDate);
    })();
  }, [role, router, selectedDate, selectedTimingId]);

  const loadAttendance = async (date: string) => {
    setLoading(true);
    try {
      const response = await StaffAPI.getAttendanceRows(date, selectedTimingId);
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Load attendance failed with timing", error);
      // Retry without timing if timing was selected
      if (selectedTimingId != null) {
        try {
          const response = await StaffAPI.getAttendanceRows(date);
          setRows(Array.isArray(response.data) ? response.data : []);
          return;
        } catch (err2) {
          console.error("Retry without timing failed", err2);
          const msg = err2?.response?.data?.detail || err2?.message || "Failed to load staff attendance";
          toast.error(String(msg));
          return;
        }
      }
      const msg = (error as any)?.response?.data?.detail || (error as any)?.message || "Failed to load staff attendance";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (staffId: number, status: StaffAttendanceStatus) => {
    setRows((current) =>
      current.map((row) => {
        if (row.staff_id !== staffId) return row;
        return {
          ...row,
          attendance_status: status,
          is_marked: status !== "Unmarked",
        };
      })
    );
  };

  const handleCheckboxChange = (staffId: number, status: StaffAttendanceStatus, checked: boolean) => {
    if (!checked) {
      handleStatusChange(staffId, "Unmarked");
      return;
    }

    handleStatusChange(staffId, status);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = rows.map((row) => ({
        staff_id: row.staff_id,
        attendance_status: row.attendance_status || "Unmarked",
      }));
      let response;
      try {
        response = await StaffAPI.submitAttendance(selectedDate, payload, selectedTimingId ?? undefined);
      } catch (err) {
        console.error("Submit failed with timing", err);
        if (selectedTimingId != null) {
          try {
            response = await StaffAPI.submitAttendance(selectedDate, payload);
          } catch (err2) {
            throw err2;
          }
        } else {
          throw err;
        }
      }
      const summary = response?.data?.summary;

      if (summary) {
        const { created_count = 0, updated_count = 0, skipped_count = 0 } = summary;
        const parts: string[] = [];
        if (updated_count > 0) parts.push(`Updated ${updated_count} attendance`);
        if (created_count > 0) parts.push(`Created ${created_count} attendance`);
        if (skipped_count > 0) parts.push(`Skipped ${skipped_count} unchanged`);
        toast.success(parts.length > 0 ? parts.join(" • ") : "Attendance saved successfully");
      } else {
        toast.success("Attendance saved successfully");
      }

      await loadAttendance(selectedDate);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const counts: Record<StaffAttendanceStatus, number> = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Leave: 0,
      Unmarked: 0,
    };

    rows.forEach((row) => {
      const status = (row.attendance_status || "Unmarked") as StaffAttendanceStatus;
      counts[status] += 1;
    });

    return counts;
  }, [rows]);

  return (
    <div className="space-y-4">
      <Header value="Staff Attendance" />

      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Staff Attendance</h2>
              <p className="text-sm text-muted-foreground">Mark or update attendance for teachers and staff</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm dark:border-border">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm dark:border-border">
                <select
                  value={selectedTimingId ?? ""}
                  onChange={(e) => setSelectedTimingId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-transparent outline-none"
                >
                  <option value="">Default</option>
                  {timings.map((t) => (
                    <option key={t.attendance_time_id} value={t.attendance_time_id}>{t.attendance_time}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Submit Attendance
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary:</span>
            {(["Present", "Absent", "Late", "Leave", "Unmarked"] as const).map((status) => (
              <div key={status} className={`rounded-full border px-3 py-1 ${statusStyles[status]}`}>
                {status}: {summary[status]}
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mark All:</span>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => rows.forEach((row) => handleStatusChange(row.staff_id, status))}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted dark:border-border dark:bg-card dark:text-foreground"
              >
                All {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-left dark:bg-card">
                <tr>
                  <th className="px-4 py-3">Staff Name</th>
                  {statusOptions.map((status) => (
                    <th key={status} className="px-4 py-3 text-center">{status}</th>
                  ))}
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={statusOptions.length + 2} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Loading attendance...
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={statusOptions.length + 2} className="px-4 py-8 text-center text-muted-foreground">No staff available.</td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const currentStatus = (row.attendance_status || "Unmarked") as StaffAttendanceStatus;
                    return (
                      <tr
                        key={row.staff_id}
                        className={`border-t border-border ${currentStatus === "Unmarked" ? "bg-secondary/70 dark:bg-amber-900/20" : "bg-primary/10/70 dark:bg-emerald-900/20"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.staff_name}</div>
                        </td>
                        {statusOptions.map((status) => (
                          <td key={status} className="px-4 py-3 text-center">
                            <Checkbox
                              checked={currentStatus === status}
                              onCheckedChange={(checked) => handleCheckboxChange(row.staff_id, status, checked === true)}
                              className="h-5 w-5"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={currentStatus} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Submit Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
