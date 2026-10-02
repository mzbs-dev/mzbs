"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import DeletedStaffTable from "@/components/Staff/DeletedStaffTable";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { useRole } from "@/context/RoleContext";

export default function DeletedStaffPage() {
  const router = useRouter();
  const { role, permissions, permissionsLoaded } = useRole();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewDeletedStaff = permissionsLoaded
    ? !!permissions?.deleted_staff?.view
    : ["ADMIN", "CHIEF_PRINCIPAL"].includes(role ?? "");

  const fetchDeletedStaff = async () => {
    setLoading(true);
    try {
      const response = await StaffAPI.getDeletedStaff();
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching deleted staff:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoaded) return;

    if (!canViewDeletedStaff) {
      router.replace("/unauthorized");
      return;
    }

    fetchDeletedStaff();
  }, [permissionsLoaded, canViewDeletedStaff, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Header value="Deleted Staff" />
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading deleted staff…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header value="Deleted Staff" />
      <div className="rounded-[24px] border border-border bg-card/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
        <DeletedStaffTable staff={records} onRefresh={fetchDeletedStaff} />
      </div>
    </div>
  );
}
