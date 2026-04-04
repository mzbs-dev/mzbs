"use client";
import Sidebar from "@/components/dashboard/Sidebar";
import  ProtectedRoute  from "@/components/ProtectedRoute";
import React, { useState } from "react";
import { Menu } from "lucide-react";

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col md:flex-row bg-secondary dark:bg-neutral-950 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-neutral-900 shadow-md z-30">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Dashboard
          </h2>
        </div>

        {/* Sidebar */}
        <div className="md:w-64 md:flex-shrink-0 fixed inset-y-0 left-0 z-30">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 md:ml-64 md:mt-0">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

export default Layout;
