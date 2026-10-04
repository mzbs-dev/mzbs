"use client";

import { useState } from "react";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { useRole } from "@/context/RoleContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [referencesFor, setReferencesFor] = useState<DeletedStaffItem | null>(null);
  const [references, setReferences] = useState<StaffAPI.DeletedStaffReferences | null>(null);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState<string | null>(null);

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

  const handleShowReferences = async (member: DeletedStaffItem) => {
    setReferencesFor(member);
    setReferences(null);
    setReferencesError(null);
    setReferencesLoading(true);
    try {
      const response = await StaffAPI.getDeletedStaffReferences(member.teacher_name_id);
      setReferences(response.data);
    } catch (err: any) {
      setReferencesError(err?.response?.data?.detail || "Failed to load related records.");
    } finally {
      setReferencesLoading(false);
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleShowReferences(member)}
                        title="View related records"
                        aria-label={`View related records for ${member.teacher_name}`}
                        className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(member.teacher_name_id, member.teacher_name)}
                        disabled={!canRestore || restoringId === member.teacher_name_id}
                        title={restoringId === member.teacher_name_id ? "Restoring staff" : "Restore staff"}
                        aria-label={`${restoringId === member.teacher_name_id ? "Restoring" : "Restore"} ${member.teacher_name}`}
                        className="rounded-lg p-1.5 text-success transition hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(member.teacher_name_id, member.teacher_name)}
                        disabled={!canRestore || deletingId === member.teacher_name_id}
                        title={deletingId === member.teacher_name_id ? "Deleting staff permanently" : "Permanently delete staff"}
                        aria-label={`${deletingId === member.teacher_name_id ? "Deleting" : "Permanently delete"} ${member.teacher_name}`}
                        className="rounded-lg p-1.5 text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={!!referencesFor}
        onOpenChange={(open) => {
          if (!open) setReferencesFor(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Related Records{referencesFor ? ` — ${referencesFor.teacher_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This is a read-only list of records linked to this staff member. These records are preserved.
          </p>
          {referencesLoading && (
            <p className="text-sm text-muted-foreground">Loading related records…</p>
          )}
          {referencesError && (
            <p role="alert" className="text-sm text-destructive">{referencesError}</p>
          )}
          {references && (
            <div className="space-y-3">
              {references.categories.map((category) => (
                <section key={category.label} className="rounded-lg border border-border p-3">
                  <h3 className="text-sm font-semibold">
                    {category.label} <span className="text-muted-foreground">({category.count})</span>
                  </h3>
                  {category.records.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {category.records.map((record) => (
                        <li key={`${category.label}-${record.id}`} className="break-words">
                          {record.id != null && <span className="font-medium">#{record.id}: </span>}
                          {record.details}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No records.</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
