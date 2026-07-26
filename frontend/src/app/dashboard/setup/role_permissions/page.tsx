"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";
import ManageRolePermissions from "@/components/Setup/ManageRolePermissions";

export default function RolePermissionsPage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="px-1 pt-1 sm:px-0">
        <Header value="Role Permissions" />
      </div>

      <div className="px-1 py-3 sm:px-0 sm:py-4">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Control what each role can view, add, edit, or delete across the app.
            Changes take effect immediately for all users of that role.
          </p>
          <ManageRolePermissions />
        </div>
      </div>
    </div>
  );
}
