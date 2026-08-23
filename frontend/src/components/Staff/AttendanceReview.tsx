"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import {
  AttendanceReviewAPI,
  AttendanceReviewRow,
} from "@/api/AttendanceReview/AttendanceReviewAPI";
import { AttendanceTimeAPI } from "@/api/AttendanceTime/attendanceTimeAPI";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type FinalStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
const FINAL_STATUSES: FinalStatus[] = ["PRESENT", "LATE", "ABSENT", "LEAVE"];

const statusStyles: Record<FinalStatus | "PENDING", string> = {
  PRESENT: "bg-primary/10 text-primary border-primary/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  ABSENT: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  LATE: "bg-secondary text-foreground border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  LEAVE: "bg-secondary text-foreground border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  PENDING: "bg-muted text-muted-foreground border-border dark:bg-slate-700 dark:text-muted-foreground dark:border-slate-600",
};

function StatusBadge({ status }: { status: FinalStatus | null }) {
  const key = status ?? "PENDING";
  const label = status ?? "Pending / Not Submitted";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[key]}`}>
      {label}
    </span>
  );
}

export default function AttendanceReview() {
  const { permissions } = useRole();
  const canFinalize = permissions?.attendance_review?.add ?? false;
  const canEdit = permissions?.attendance_review?.edit ?? false;
  const canDelete = permissions?.attendance_review?.delete ?? false;

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timings, setTimings] = useState<Array<{ attendance_time_id: number; attendance_time: string }>>([]);
  const [selectedTimingId, setSelectedTimingId] = useState<number | null>(null);
  const [rows, setRows] = useState<AttendanceReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [editingRow, setEditingRow] = useState<AttendanceReviewRow | null>(null);
  const [modalStatus, setModalStatus] = useState<FinalStatus | "">("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [modalArrivalTime, setModalArrivalTime] = useState("");
  const [modalDepartureTime, setModalDepartureTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const t = await AttendanceTimeAPI.Get();
        const items = Array.isArray(t?.data) ? t.data : [];
        setTimings(
          items.map((it: any) => ({
            attendance_time_id: it.attendance_time_id,
            attendance_time: it.attendance_time,
          }))
        );
      } catch {
        // Non-fatal — filter just stays empty
      }
    })();
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AttendanceReviewAPI.getRows(selectedDate, selectedTimingId ?? undefined);
      setRows(data);
    } catch {
      toast.error("Failed to load attendance review rows.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedTimingId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const openModal = (row: AttendanceReviewRow) => {
    setEditingRow(row);
    setModalStatus((row.final_status as FinalStatus) || "");
    setModalRemarks(row.final_remarks ?? "");
    setModalArrivalTime(row.arrival_time ?? "");
    setModalDepartureTime(row.departure_time ?? "");
  };

  const closeModal = () => {
    setEditingRow(null);
    setModalStatus("");
    setModalRemarks("");
    setModalArrivalTime("");
    setModalDepartureTime("");
  };

  const handleSaveModal = async () => {
    if (!editingRow || !modalStatus) {
      toast.error("Please select a status.");
      return;
    }
    setSaving(true);
    try {
      if (editingRow.is_finalized) {
        await AttendanceReviewAPI.updateRecord(editingRow.staff_id, {
          attendance_date: editingRow.attendance_date,
          attendance_time_id: editingRow.attendance_time_id,
          final_status: modalStatus,
          final_remarks: modalRemarks || undefined,
          arrival_time: modalArrivalTime || undefined,
          departure_time: modalDepartureTime || undefined,
        });
        toast.success("Attendance record updated.");
      } else {
        await AttendanceReviewAPI.finalize(editingRow.staff_id, {
          attendance_date: editingRow.attendance_date,
          attendance_time_id: editingRow.attendance_time_id,
          final_status: modalStatus,
          final_remarks: modalRemarks || undefined,
          arrival_time: modalArrivalTime || undefined,
          departure_time: modalDepartureTime || undefined,
        });
        toast.success("Attendance finalized.");
      }
      closeModal();
      await loadRows();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: AttendanceReviewRow) => {
    if (!window.confirm(`Delete the attendance record for ${row.staff_name} (${row.attendance_time_name ?? "shift"})?`)) {
      return;
    }
    try {
      await AttendanceReviewAPI.deleteRecord(row.staff_id, row.attendance_date, row.attendance_time_id ?? undefined);
      toast.success("Record deleted.");
      await loadRows();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to delete record.");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Attendance Review</h2>
            <p className="text-sm text-muted-foreground">
              Review staff self-reports and assign official attendance status.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none"
              />
            </label>

            <Select
              value={selectedTimingId != null ? String(selectedTimingId) : "all"}
              onValueChange={(v) => setSelectedTimingId(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All shifts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                {timings.map((t) => (
                  <SelectItem key={t.attendance_time_id} value={String(t.attendance_time_id)}>
                    {t.attendance_time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Self-Attendance</th>
              <th className="px-4 py-3">Arrival</th>
              <th className="px-4 py-3">Departure</th>
              <th className="px-4 py-3">Confirmed</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No staff/shift rows found for this date.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = `${row.staff_id}-${row.attendance_time_id ?? "none"}`;
                const selfLabel =
                  row.self_availability === "AVAILABLE"
                    ? "Available"
                    : row.self_availability === "NOT_AVAILABLE"
                    ? "Not Available"
                    : "—";
                return (
                  <tr key={rowKey} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.staff_name}</td>
                    <td className="px-4 py-3">{row.attendance_time_name ?? "General / No Shift Assigned"}</td>
                    <td className="px-4 py-3">{selfLabel}</td>
                    <td className="px-4 py-3">
                      {row.arrival_time ?? "—"}
                      {row.is_likely_late && (
                        <span className="ml-2 inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5">
                          Reported later than expected
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.departure_time ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.final_status as FinalStatus | null} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                      {row.self_remarks && <div>Self: {row.self_remarks}</div>}
                      {row.final_remarks && <div>Admin: {row.final_remarks}</div>}
                      {!row.self_remarks && !row.final_remarks && "—"}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                      {!row.is_finalized && canFinalize && (
                        <Button size="sm" onClick={() => openModal(row)}>
                          Finalize
                        </Button>
                      )}
                      {row.is_finalized && canEdit && (
                        <Button size="sm" variant="outline" onClick={() => openModal(row)}>
                          Edit
                        </Button>
                      )}
                      {row.is_finalized && canDelete && (
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editingRow} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRow?.is_finalized ? "Edit" : "Finalize"} Attendance — {editingRow?.staff_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Final Status</label>
              <Select value={modalStatus} onValueChange={(v) => setModalStatus(v as FinalStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {FINAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Remarks (optional)</label>
              <textarea
                value={modalRemarks}
                onChange={(e) => setModalRemarks(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Admin remarks"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Arrival Time (optional)</label>
                <input
                  type="time"
                  value={modalArrivalTime}
                  onChange={(e) => setModalArrivalTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Departure Time (optional)</label>
                <input
                  type="time"
                  value={modalDepartureTime}
                  onChange={(e) => setModalDepartureTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSaveModal()}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
