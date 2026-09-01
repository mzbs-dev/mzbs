"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Users, Eye, ClipboardList, NotebookPen, UserCheck, LucideIcon } from "lucide-react";
import { ResponsiveH3 } from "@/components/responsive/ResponsiveTypography";
import { useRole } from "@/context/RoleContext";
import { canAccessSubmenuItem } from "@/utils/rolePermissions";

type QuickActionConfig = {
  href: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
};

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    href: "/dashboard/profile/self-attendance",
    label: "Self Attendance",
    icon: UserCheck,
    colorClass: "bg-teal-500 hover:bg-teal-600",
  },
  {
    href: "/dashboard/attendance/mark_attendance",
    label: "Mark Attendance",
    icon: BookOpen,
    colorClass: "bg-blue-500 hover:bg-blue-600",
  },
  {
    href: "/dashboard/attendance/view_attendance",
    label: "View Attendance",
    icon: Eye,
    colorClass: "bg-purple-500 hover:bg-purple-600",
  },
  {
    href: "/dashboard/attendance/attendance_status_summary",
    label: "Attendance Summary",
    icon: ClipboardList,
    colorClass: "bg-fuchsia-500 hover:bg-fuchsia-600",
  },
];

export function TeacherDashboard() {
  const { role, permissions } = useRole();

  const visibleQuickActions = QUICK_ACTIONS.filter((action) =>
    canAccessSubmenuItem(role, action.href, permissions)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Teacher Dashboard" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 place-items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 sm:p-8 md:p-10 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow w-full max-w-2xl"
          >
            <ResponsiveH3 className="mb-6 sm:mb-8 text-center">Quick Actions</ResponsiveH3>
            <div className="space-y-5 sm:space-y-6">
              {visibleQuickActions.map(({ href, label, icon: Icon, colorClass }) => (
                <Link href={href} key={href}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full ${colorClass} text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg transition text-sm sm:text-base font-medium flex items-center justify-center gap-2`}
                  >
                    <Icon size={20} />
                    {label}
                  </motion.button>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
