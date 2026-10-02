"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { useRole } from "@/context/RoleContext";

interface DeletedStaffItem {
  teacher_name_id: number;
  teacher_name: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
  is_deleted: boolean;
}

interface DeletedStaffTableProps {
  staff: DeletedStaffItem[];
  onRefresh: () => void;
}

export default function DeletedStaffTable({ staff, onRefresh }: DeletedStaffTableProps) {
  const { role, permissions, permissionsLoaded } = useRole();
  const canRestore = permissionsLoaded
    ? !!permissions?.deleted_staff?.edit
    : ["ADMIN", "CHIEF_PRINCIPAL"].includes(role ?? "");

  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const handleRestore = async (teacherId: number, name: string) => {
    const confirmed = window.confirm(`Restore "${name}" to the active staff list?`);
    if (!confirmed) return;

    setError(null);
    setRestoringId(teacherId);
    try {
      await StaffAPI.restoreDeletedStaff(teacherId);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to restore deleted staff.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (teacherId: number, name: string) => {
    const confirmed = window.confirm(
      `Permanently delete "${name}" and remove the linked inactive user record? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setDeletingId(teacherId);
    try {
      await StaffAPI.permanentlyDeleteDeletedStaff(teacherId);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to permanently delete deleted staff.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deleted staff found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Teacher Name</th>
                <th className="px-4 py-3 font-semibold">Created At</th>
                <th className="px-4 py-3 font-semibold">Deleted At</th>
                <th className="px-4 py-3 font-semibold">Deleted By</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, index) => (
                <tr key={member.teacher_name_id} className="border-t border-border/70">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{member.teacher_name}</td>
                  <td className="px-4 py-3">{formatDate(member.created_at)}</td>
                  <td className="px-4 py-3">{formatDate(member.deleted_at)}</td>
                  <td className="px-4 py-3">{member.deleted_by ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(member.teacher_name_id, member.teacher_name)}
                        disabled={!canRestore || restoringId === member.teacher_name_id}
                        className="inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success transition hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoringId === member.teacher_name_id ? "Restoring..." : "Restore"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(member.teacher_name_id, member.teacher_name)}
                        disabled={!canRestore || deletingId === member.teacher_name_id}
                        className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === member.teacher_name_id ? "Deleting..." : "Permanent Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
