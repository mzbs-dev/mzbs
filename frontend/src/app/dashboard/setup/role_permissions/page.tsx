"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";
import ManageRolePermissions from "@/components/Setup/ManageRolePermissions";

export default function RolePermissionsPage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        <Header value="Role Permissions" />
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Control what each role can view, add, edit, or delete across the app.
          Changes take effect immediately for all users of that role.
        </p>
        <ManageRolePermissions />
      </div>
    </div>
  );
}
