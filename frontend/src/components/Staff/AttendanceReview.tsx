"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CalendarDays, LoaderCircle, LockKeyhole, Trash2 } from "lucide-react";
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
type AttendanceDraft = {
  final_status: FinalStatus;
  final_remarks: string;
  arrival_time: string;
  departure_time: string;
};
type RowFilter = "pending" | "finalized" | "all";
const FINAL_STATUSES: FinalStatus[] = ["PRESENT", "LATE", "ABSENT", "LEAVE"];

const getRowKey = (row: AttendanceReviewRow) =>
  `${row.staff_id}-${row.attendance_time_id ?? "none"}`;

const statusStyles: Record<FinalStatus | "PENDING", string> = {
  PRESENT: "bg-primary/10 text-primary border-primary/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  ABSENT: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  LATE: "bg-secondary text-foreground border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  LEAVE: "bg-secondary text-foreground border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  PENDING: "bg-muted text-muted-foreground border-border dark:bg-slate-700 dark:text-muted-foreground dark:border-slate-600",
};

function StatusBadge({ status }: { status: FinalStatus | null }) {
  const key = status ?? "PENDING";
  const label = status ?? "Pending";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[key]}`}>
      {label}
    </span>
  );
}

export default function AttendanceReview() {
  const { permissions } = useRole();
  const canFinalize = permissions?.attendance_review?.add ?? false;
  const canDeleteAttendanceReview = permissions?.attendance_review?.delete ?? false;

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [scopeInitialized, setScopeInitialized] = useState(false);
  const [timings, setTimings] = useState<Array<{ attendance_time_id: number; attendance_time: string }>>([]);
  const [selectedTimingId, setSelectedTimingId] = useState<number | null>(null);
  const [selectedGeneralOnly, setSelectedGeneralOnly] = useState(false);
  const [rows, setRows] = useState<AttendanceReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowFilter, setRowFilter] = useState<RowFilter>("pending");
  const [arrivalDefault, setArrivalDefault] = useState("");
  const [departureDefault, setDepartureDefault] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});

  // Modal state
  const [editingRow, setEditingRow] = useState<AttendanceReviewRow | null>(null);
  const [modalStatus, setModalStatus] = useState<FinalStatus | "">("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [modalArrivalTime, setModalArrivalTime] = useState("");
  const [modalDepartureTime, setModalDepartureTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizingBatch, setFinalizingBatch] = useState(false);
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split("-").map(Number);
  const selectedWeekday = new Date(selectedYear, selectedMonth - 1, selectedDay)
    .toLocaleDateString(undefined, { weekday: "long" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedDate = params.get("attendance_date");
      const requestedShift = params.get("attendance_time_id");
      if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        setSelectedDate(requestedDate);
      }
      try {
        const t = await AttendanceTimeAPI.Get();
        const items = Array.isArray(t?.data) ? t.data : [];
        if (cancelled) return;
        setTimings(
          items.map((it: any) => ({
            attendance_time_id: it.attendance_time_id,
            attendance_time: it.attendance_time,
          }))
        );
        if (requestedShift === "all") {
          setSelectedTimingId(null);
          setSelectedGeneralOnly(false);
        } else if (requestedShift === "none") {
          setSelectedTimingId(null);
          setSelectedGeneralOnly(true);
        } else if (requestedShift && /^\d+$/.test(requestedShift)) {
          setSelectedTimingId(Number(requestedShift));
          setSelectedGeneralOnly(false);
        } else if (items.length > 0) {
          setSelectedTimingId(items[0].attendance_time_id);
          setSelectedGeneralOnly(false);
        }
      } catch {
        // Non-fatal — filter just stays empty
      } finally {
        if (!cancelled) setScopeInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setArrivalDefault("");
    setDepartureDefault("");
    if (selectedTimingId == null) return;

    void AttendanceTimeAPI.getTimingVersionForDate(selectedTimingId, selectedDate)
      .then((timing) => {
        if (cancelled) return;
        setArrivalDefault(timing.start_time?.slice(0, 5) ?? "");
        setDepartureDefault(timing.end_time?.slice(0, 5) ?? "");
      })
      .catch(async () => {
        try {
          const { data } = await AttendanceTimeAPI.getShiftConfig(selectedTimingId);
          if (cancelled) return;
          setArrivalDefault(data.expected_arrival_time?.slice(0, 5) ?? "");
          setDepartureDefault(data.expected_departure_time?.slice(0, 5) ?? "");
        } catch {
          if (cancelled) return;
          setArrivalDefault("");
          setDepartureDefault("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedTimingId]);

  const loadRows = useCallback(async () => {
    if (!scopeInitialized) return;
    setLoading(true);
    try {
      const data = await AttendanceReviewAPI.getRows(
        selectedDate,
        selectedTimingId ?? undefined,
        selectedGeneralOnly
      );
      setRows(data);
    } catch {
      toast.error("Failed to load attendance review rows.");
    } finally {
      setLoading(false);
    }
  }, [scopeInitialized, selectedDate, selectedTimingId, selectedGeneralOnly]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const openModal = (row: AttendanceReviewRow) => {
    setEditingRow(row);
    setModalStatus((row.final_status as FinalStatus) || "");
    setModalRemarks(row.final_remarks ?? "");
    setModalArrivalTime(row.arrival_time?.slice(0, 5) ?? "");
    setModalDepartureTime(row.departure_time?.slice(0, 5) ?? "");
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

  const pendingRows = rows.filter((row) => !row.is_finalized);
  const finalizedRows = rows.filter((row) => row.is_finalized);
  const draftedCount = pendingRows.filter((row) => drafts[getRowKey(row)]).length;
  const visibleRows = rows.filter((row) => {
    if (rowFilter === "pending") return !row.is_finalized;
    if (rowFilter === "finalized") return row.is_finalized;
    return true;
  });

  const handleScopeChange = (changeScope: () => void) => {
    if (Object.keys(drafts).length > 0 && !window.confirm("Discard unsaved attendance edits and change the date or shift?")) {
      return;
    }
    setDrafts({});
    setBatchErrors({});
    changeScope();
  };

  const handleApplyDefaults = () => {
    if (selectedTimingId == null) {
      toast.error("Select a shift before applying defaults.");
      return;
    }
    if (!arrivalDefault || !departureDefault) {
      toast.error("Enter the default arrival and departure times.");
      return;
    }
    const applicableRows = pendingRows.filter(
      (row) => row.attendance_time_id === selectedTimingId
    );
    if (applicableRows.length === 0) {
      toast.error("There are no pending staff rows for this shift.");
      return;
    }
    if (Object.keys(drafts).length > 0 && !window.confirm("Replace the current draft with these defaults?")) {
      return;
    }

    const nextDrafts: Record<string, AttendanceDraft> = {};
    for (const row of applicableRows) {
      nextDrafts[getRowKey(row)] = {
        final_status: "PRESENT",
        final_remarks: row.final_remarks ?? "",
        arrival_time: arrivalDefault,
        departure_time: departureDefault,
      };
    }
    setDrafts(nextDrafts);
    setBatchErrors({});
    toast.success(`Defaults applied to ${applicableRows.length} pending staff row(s).`);
  };

  const updateDraft = (row: AttendanceReviewRow, updates: Partial<AttendanceDraft>) => {
    const key = getRowKey(row);
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...updates } }));
    setBatchErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleFinalizeBatch = async () => {
    if (selectedTimingId == null) {
      toast.error("Select a shift before finalizing.");
      return;
    }
    const batchRows = pendingRows.filter((row) => drafts[getRowKey(row)]);
    if (batchRows.length === 0) {
      toast.error("Apply defaults to pending staff before finalizing.");
      return;
    }
    if (!window.confirm(`Submit ${batchRows.length} reviewed attendance row(s)? Valid rows will be saved and locked; invalid rows will remain pending.`)) {
      return;
    }

    setFinalizingBatch(true);
    try {
      const result = await AttendanceReviewAPI.batchFinalize({
        attendance_date: selectedDate,
        attendance_time_id: selectedTimingId,
        records: batchRows.map((row) => {
          const draft = drafts[getRowKey(row)];
          return {
            staff_id: row.staff_id,
            final_status: draft.final_status,
            final_remarks: draft.final_remarks || undefined,
            arrival_time: draft.arrival_time || undefined,
            departure_time: draft.departure_time || undefined,
          };
        }),
      });

      const successfulKeys = new Set<string>();
      const errors: Record<string, string> = {};
      for (const rowResult of result.results) {
        const row = batchRows.find((item) => item.staff_id === rowResult.staff_id);
        if (!row) continue;
        const key = getRowKey(row);
        if (rowResult.finalized) successfulKeys.add(key);
        else errors[key] = rowResult.error ?? "Unable to finalize this row.";
      }
      setDrafts((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !successfulKeys.has(key))
      ));
      setBatchErrors(errors);
      if (result.failed_count > 0) {
        toast.error(`${result.finalized_count} finalized; ${result.failed_count} row(s) need correction.`);
      } else {
        toast.success(`${result.finalized_count} attendance record(s) finalized.`);
      }
      await loadRows();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Batch finalization failed. Your draft is unchanged.");
    } finally {
      setFinalizingBatch(false);
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
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_minmax(150px,180px)]">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleScopeChange(() => setSelectedDate(e.target.value))}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">{selectedWeekday}</span>
            </label>

            <Select
              value={selectedGeneralOnly ? "none" : selectedTimingId != null ? String(selectedTimingId) : "all"}
              onValueChange={(value) => handleScopeChange(() => {
                setSelectedGeneralOnly(value === "none");
                setSelectedTimingId(value === "all" || value === "none" ? null : Number(value));
              })}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                <SelectItem value="none">General / No Shift Assigned</SelectItem>
                {timings.map((t) => (
                  <SelectItem key={t.attendance_time_id} value={String(t.attendance_time_id)}>
                    {t.attendance_time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[520px]:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Default actual arrival</span>
              <input
                type="time"
                value={selectedTimingId == null ? "" : arrivalDefault}
                onChange={(e) => setArrivalDefault(e.target.value)}
                disabled={selectedTimingId == null}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Default actual departure</span>
              <input
                type="time"
                value={selectedTimingId == null ? "" : departureDefault}
                onChange={(e) => setDepartureDefault(e.target.value)}
                disabled={selectedTimingId == null}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="inline-flex rounded-md border border-border p-1" role="group" aria-label="Attendance status filter">
                {([
                  ["pending", "Pending", pendingRows.length],
                  ["finalized", "Finalized", finalizedRows.length],
                  ["all", "All", rows.length],
                ] as const).map(([filter, label, count]) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={rowFilter === filter ? "secondary" : "ghost"}
                    aria-pressed={rowFilter === filter}
                    onClick={() => setRowFilter(filter)}
                  >
                    {label} <span className="ml-1 tabular-nums">{count}</span>
                  </Button>
                ))}
              </div>
              {canFinalize && (
              <Button
                type="button"
                variant="outline"
                disabled={loading || selectedTimingId == null || pendingRows.length === 0}
                onClick={handleApplyDefaults}
              >
                Apply Defaults
              </Button>
              )}
              {canFinalize && draftedCount > 0 && (
                <Button
                  type="button"
                  disabled={finalizingBatch || loading}
                  onClick={() => void handleFinalizeBatch()}
                >
                  {finalizingBatch ? <LoaderCircle className="h-4 w-4 animate-spin" /> : `Confirm / Finalize ${draftedCount}`}
                </Button>
              )}
            </div>
            {draftedCount > 0 && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {draftedCount} pending row(s) staged for review.
              </p>
            )}
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
              <th className="px-4 py-3">Confirmed</th>
              <th className="px-4 py-3">Arrival</th>
              <th className="px-4 py-3">Departure</th>
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
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {rows.length === 0
                    ? "No staff/shift rows found for this date."
                    : `No ${rowFilter} attendance rows for this date and shift.`}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const rowKey = getRowKey(row);
                const draft = drafts[rowKey];
                const selfLabel =
                  row.self_availability === "AVAILABLE"
                    ? "Available"
                    : row.self_availability === "NOT_AVAILABLE"
                    ? "Not Available"
                    : "—";
                return (
                  <tr key={rowKey} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.staff_name}</td>
                    <td className="px-4 py-3">
                      <div>{row.attendance_time_name ?? "General / No Shift Assigned"}</div>
                    </td>
                    <td className="px-4 py-3">{selfLabel}</td>
                    <td className="px-4 py-3">
                      {draft ? (
                        <Select
                          value={draft.final_status}
                          onValueChange={(value) => {
                            const status = value as FinalStatus;
                            updateDraft(row, {
                              final_status: status,
                              ...(status === "ABSENT" || status === "LEAVE"
                                ? { arrival_time: "", departure_time: "" }
                                : {}),
                            });
                          }}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FINAL_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={row.final_status as FinalStatus | null} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {draft ? (
                        <input
                          aria-label={`${row.staff_name} arrival time`}
                          type="time"
                          value={draft.arrival_time}
                          onChange={(e) => updateDraft(row, { arrival_time: e.target.value })}
                          className="h-9 w-32 rounded-md border border-input bg-background px-2"
                        />
                      ) : row.arrival_time?.slice(0, 5) ?? "—"}
                      {!draft && row.is_likely_late && (
                        <span className="ml-2 inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5">
                          Reported later than expected
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {draft ? (
                        <input
                          aria-label={`${row.staff_name} departure time`}
                          type="time"
                          value={draft.departure_time}
                          onChange={(e) => updateDraft(row, { departure_time: e.target.value })}
                          className="h-9 w-32 rounded-md border border-input bg-background px-2"
                        />
                      ) : row.departure_time?.slice(0, 5) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                      {row.self_remarks && <div>Self: {row.self_remarks}</div>}
                      {(draft?.final_remarks || row.final_remarks) && <div>Admin: {draft?.final_remarks || row.final_remarks}</div>}
                      {!row.self_remarks && !row.final_remarks && "—"}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                      {batchErrors[rowKey] && (
                        <div className="mb-1 max-w-48 whitespace-normal text-left text-xs text-destructive">
                          {batchErrors[rowKey]}
                        </div>
                      )}
                      {!row.is_finalized && !draft && canFinalize && row.attendance_time_id != null && (
                        <Button size="sm" onClick={() => openModal(row)}>
                          Finalize
                        </Button>
                      )}
                      {!row.is_finalized && row.attendance_time_id == null && (
                        <span className="text-xs text-muted-foreground">No shift assigned</span>
                      )}
                      {!row.is_finalized && draft && (
                        <span className="text-xs font-medium text-muted-foreground">In review</span>
                      )}
                      {row.is_finalized && canDeleteAttendanceReview && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete finalized attendance for ${row.staff_name}`}
                          title="Delete finalized attendance"
                          onClick={() => void handleDelete(row)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      {row.is_finalized && !canDeleteAttendanceReview && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                          Locked
                        </span>
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
