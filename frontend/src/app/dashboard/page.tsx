"use client";
import React from "react";
import { useRole } from "@/context/RoleContext";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { PrincipalDashboard } from "@/components/dashboard/PrincipalDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { FeeManagerDashboard } from "@/components/dashboard/FeeManagerDashboard";

export default function DashboardRouter() {
  const { role, isLoading } = useRole();
  
  // Show loading state while role is being determined
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "CHIEF_PRINCIPAL":
    case "PRINCIPAL":
      return <PrincipalDashboard />;
    case "TEACHER":
      return <TeacherDashboard />;
    case "ACCOUNTANT":
      return <AccountantDashboard />;
    case "FEE_MANAGER":
      return <FeeManagerDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-muted-foreground">Unknown role. Please log in again.</p>
          </div>
        </div>
      );
  }
}
