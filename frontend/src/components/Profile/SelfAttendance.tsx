"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Card from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRole } from "@/context/RoleContext";
import {
  SelfAttendanceAPI,
  SelfAttendanceEntry,
} from "@/api/SelfAttendance/SelfAttendanceAPI";

type ShiftKey = string;

interface ShiftFormState {
  self_availability: "AVAILABLE" | "NOT_AVAILABLE" | null;
  self_remarks: string;
  arrival_time: string;
  departure_time: string;
}

const shiftKey = (id: number | null): ShiftKey => (id === null ? "none" : String(id));

const emptyForm = (): ShiftFormState => ({
  self_availability: null,
  self_remarks: "",
  arrival_time: "",
  departure_time: "",
});

const SelfAttendance: React.FC = () => {
  const { permissions, isLoading: roleLoading } = useRole();

  const [entries, setEntries] = useState<SelfAttendanceEntry[]>([]);
  const [forms, setForms] = useState<Record<ShiftKey, ShiftFormState>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ShiftKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = permissions?.self_attendance?.view ?? false;
  const canAdd = permissions?.self_attendance?.add ?? false;
  const canEdit = permissions?.self_attendance?.edit ?? false;

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await SelfAttendanceAPI.getToday();
      setEntries(data);
      setForms((prev) => {
        const next: Record<ShiftKey, ShiftFormState> = {};
        for (const entry of data) {
          const key = shiftKey(entry.attendance_time_id);
          next[key] =
            prev[key] ?? {
              self_availability:
                (entry.self_availability as "AVAILABLE" | "NOT_AVAILABLE" | null) ?? null,
              self_remarks: entry.self_remarks ?? "",
              arrival_time: entry.arrival_time ?? "",
              departure_time: entry.departure_time ?? "",
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
    setForms((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyForm()), ...patch },
    }));
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
              <span>{entry.attendance_time_name ?? "Today's Attendance"}</span>
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
                    onClick={() => updateForm(key, { self_availability: "AVAILABLE" })}
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
    </div>
  );
};

export default SelfAttendance;
