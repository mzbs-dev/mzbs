"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useRole } from "@/context/RoleContext";
import { canAccessSection } from "@/utils/rolePermissions";
import {
  SelfAttendanceAPI,
  SelfAttendanceEntry,
  SelfAttendanceHistoryRow,
} from "@/api/SelfAttendance/SelfAttendanceAPI";

type ShiftKey = string;

interface ShiftFormState {
  self_availability: "AVAILABLE" | "NOT_AVAILABLE" | null;
  self_remarks: string;
  arrival_time: string;
  departure_time: string;
}

const shiftKey = (id: number | null): ShiftKey => (id === null ? "none" : String(id));
const savedTimesKey = (key: ShiftKey): string => `self-attendance-times-${key}`;

const getSavedTimes = (key: ShiftKey): Pick<ShiftFormState, "arrival_time" | "departure_time"> => {
  try {
    const saved = window.localStorage.getItem(savedTimesKey(key));
    if (!saved) return { arrival_time: "", departure_time: "" };
    const parsed = JSON.parse(saved) as Partial<Pick<ShiftFormState, "arrival_time" | "departure_time">>;
    return {
      arrival_time: typeof parsed.arrival_time === "string" ? parsed.arrival_time : "",
      departure_time: typeof parsed.departure_time === "string" ? parsed.departure_time : "",
    };
  } catch {
    return { arrival_time: "", departure_time: "" };
  }
};

const saveTimes = (key: ShiftKey, form: Pick<ShiftFormState, "arrival_time" | "departure_time">) => {
  try {
    window.localStorage.setItem(savedTimesKey(key), JSON.stringify(form));
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
};

const emptyForm = (): ShiftFormState => ({
  self_availability: null,
  self_remarks: "",
  arrival_time: "",
  departure_time: "",
});

const SelfAttendance: React.FC = () => {
  const { permissions, isLoading: roleLoading, role } = useRole();

  const [entries, setEntries] = useState<SelfAttendanceEntry[]>([]);
  const [history, setHistory] = useState<SelfAttendanceHistoryRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [forms, setForms] = useState<Record<ShiftKey, ShiftFormState>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ShiftKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = permissions?.self_attendance?.view ?? canAccessSection(role, "profile", permissions);
  const canAdd = permissions?.self_attendance?.add ?? canAccessSection(role, "profile", permissions);
  const canEdit = permissions?.self_attendance?.edit ?? canAccessSection(role, "profile", permissions);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [data, historyData] = await Promise.all([
        SelfAttendanceAPI.getToday(),
        SelfAttendanceAPI.getHistory(),
      ]);
      setEntries(data);
      setHistory(historyData);
      setHistoryPage(1);
      setForms((prev) => {
        const next: Record<ShiftKey, ShiftFormState> = {};
        for (const entry of data) {
          const key = shiftKey(entry.attendance_time_id);
          const savedTimes = getSavedTimes(key);
          next[key] =
            prev[key] ?? {
              self_availability:
                (entry.self_availability as "AVAILABLE" | "NOT_AVAILABLE" | null) ?? null,
              self_remarks: entry.self_remarks ?? "",
              arrival_time: entry.arrival_time ?? savedTimes.arrival_time,
              departure_time: entry.departure_time ?? savedTimes.departure_time,
            };
        }
        return next;
      });
    } catch {
      setError("Could not load today's attendance. Please refresh or try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      loadToday();
    } else {
      setLoading(false);
    }
  }, [canView, loadToday]);

  const updateForm = (key: ShiftKey, patch: Partial<ShiftFormState>) => {
    setForms((prev) => {
      const nextForm = { ...(prev[key] ?? emptyForm()), ...patch };
      if ("arrival_time" in patch || "departure_time" in patch) {
        saveTimes(key, nextForm);
      }
      return { ...prev, [key]: nextForm };
    });
  };

  const handleSubmit = async (entry: SelfAttendanceEntry) => {
    const key = shiftKey(entry.attendance_time_id);
    const form = forms[key];

    if (!form?.self_availability) {
      toast.error("Please select Available or Not Available first.");
      return;
    }

    setSavingKey(key);

    try {
      const payload = {
        attendance_time_id: entry.attendance_time_id,
        self_availability: form.self_availability,
        self_remarks: form.self_availability === "NOT_AVAILABLE" ? form.self_remarks || undefined : undefined,
        arrival_time: form.arrival_time || undefined,
        departure_time: form.departure_time || undefined,
      };

      if (entry.staff_attendance_id === null) {
        await SelfAttendanceAPI.submitToday(payload);
        toast.success("Attendance submitted.");
      } else {
        await SelfAttendanceAPI.updateToday(payload);
        toast.success("Attendance updated.");
      }

      await loadToday();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save attendance.");
    } finally {
      setSavingKey(null);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
        Loading your attendance…
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        You don&apos;t have access to Self-Attendance.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Today&apos;s Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Submit or update your self-attendance for the current day.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {entries.length === 0 && !error && (
        <div className="rounded-xl border border-border/80 bg-card/80 px-4 py-5 text-sm text-muted-foreground">
          No attendance entries found for today.
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => {
          const key = shiftKey(entry.attendance_time_id);
          const form = forms[key] ?? emptyForm();
          const isFinalized = entry.is_finalized;
          const isNew = entry.staff_attendance_id === null;
          const canSubmitThis = isNew ? canAdd : canEdit;
          const isSaving = savingKey === key;

          const cardTitle = (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                {entry.attendance_time_name ?? "Today's Attendance"}
                <span className="font-bold text-foreground">
                  {entry.schedule_is_legacy
                    ? "Historical timing unavailable"
                    : entry.expected_start_time && entry.expected_end_time
                    ? `${entry.expected_start_time.slice(0, 5)} - ${entry.expected_end_time.slice(0, 5)}`
                    : "Timing not configured"}
                </span>
              </span>
              {isFinalized && (
                <span className="text-xs font-normal text-muted-foreground">
                  Finalized{entry.final_status ? ` — ${entry.final_status}` : ""} — no longer editable
                </span>
              )}
            </div>
          );

          return (
            <Card key={key} title={cardTitle} className={isFinalized ? "opacity-70" : undefined}>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant={form.self_availability === "AVAILABLE" ? "default" : "outline"}
                    disabled={isFinalized || !canSubmitThis}
                    onClick={() => updateForm(key, {
                      self_availability: "AVAILABLE",
                      arrival_time: form.arrival_time || entry.expected_start_time?.slice(0, 5) || "",
                      departure_time: form.departure_time || entry.expected_end_time?.slice(0, 5) || "",
                    })}
                    className="flex-1"
                  >
                    Available
                  </Button>
                  <Button
                    type="button"
                    variant={form.self_availability === "NOT_AVAILABLE" ? "default" : "outline"}
                    disabled={isFinalized || !canSubmitThis}
                    onClick={() => updateForm(key, { self_availability: "NOT_AVAILABLE" })}
                    className="flex-1"
                  >
                    Not Available
                  </Button>
                </div>

                {form.self_availability === "NOT_AVAILABLE" && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Remarks</label>
                    <Input
                      placeholder="Reason (optional)"
                      value={form.self_remarks}
                      disabled={isFinalized || !canSubmitThis}
                      onChange={(event) => updateForm(key, { self_remarks: event.target.value })}
                    />
                  </div>
                )}

                {form.self_availability === "AVAILABLE" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Arrival Time</label>
                      <Input
                        type="time"
                        value={form.arrival_time}
                        disabled={isFinalized || !canSubmitThis}
                        onChange={(event) => updateForm(key, { arrival_time: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Departure Time</label>
                      <Input
                        type="time"
                        value={form.departure_time}
                        disabled={isFinalized || !canSubmitThis}
                        onChange={(event) => updateForm(key, { departure_time: event.target.value })}
                      />
                    </div>
                  </div>
                )}

                {!isFinalized && canSubmitThis && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSubmit(entry)}
                    >
                      {isSaving ? <LoaderIcon className="h-4 w-4 animate-spin" /> : isNew ? "Submit" : "Update"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Previous Attendance">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No finalized attendance records found.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {historyPage} of {Math.max(1, Math.ceil(history.length / 10))}
              </span>
              <span>
                {history.filter((row) => !row.is_calendar_holiday).length} finalized record(s)
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Shift</th>
                    <th className="px-3 py-2">Final Status</th>
                    <th className="px-3 py-2">Arrival</th>
                    <th className="px-3 py-2">Departure</th>
                    <th className="px-3 py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .slice((historyPage - 1) * 10, historyPage * 10)
                    .map((row) => (
                      <tr
                        key={row.staff_attendance_id ?? `holiday-${row.attendance_date}`}
                        className={`border-t border-border ${row.is_calendar_holiday ? "bg-muted/40" : ""}`}
                      >
                        <td className="px-3 py-2">
                          {new Date(row.attendance_date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-3 py-2">{row.weekday}</td>
                        <td className="px-3 py-2">
                          {row.is_calendar_holiday ? "—" : (
                            <>
                              <div>{row.attendance_time_name ?? "General / No Shift Assigned"}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.expected_start_time && row.expected_end_time
                                  ? `${row.expected_start_time.slice(0, 5)} - ${row.expected_end_time.slice(0, 5)}`
                                  : "Historical timing unavailable"}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.is_calendar_holiday ? (
                            <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">HOLIDAY</span>
                          ) : row.final_status ?? "—"}
                        </td>
                        <td className="px-3 py-2">{row.arrival_time ?? "—"}</td>
                        <td className="px-3 py-2">{row.departure_time ?? "—"}</td>
                        <td className="px-3 py-2">{row.holiday_label ?? row.final_remarks ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {history.length > 10 && (
              <Pagination
                className="mt-3"
                currentPage={historyPage}
                totalPages={Math.ceil(history.length / 10)}
                onPageChange={setHistoryPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default SelfAttendance;
