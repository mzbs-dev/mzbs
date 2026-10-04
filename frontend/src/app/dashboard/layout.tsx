"use client";
import Sidebar from "@/components/dashboard/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const DESKTOP_SIDEBAR_KEY = "mzbs-dashboard-sidebar-collapsed";

function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const routeSegments = pathname.split("/").filter(Boolean).slice(1);
  const currentRoute = routeSegments.at(-1);
  const pageTitle = !currentRoute
    ? "Dashboard"
    : routeSegments.join("/") === "students/profile"
      ? "Student Profile"
      : routeSegments.join("/") === "students/deleted"
        ? "Deleted Students"
        : currentRoute
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (character) => character.toUpperCase());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedValue = window.localStorage.getItem(DESKTOP_SIDEBAR_KEY);
    if (savedValue !== null) {
      setSidebarCollapsed(savedValue === "true");
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed, isHydrated]);

  return (
    <ProtectedRoute>
      <>
        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        <div className="min-h-screen flex flex-col md:flex-row overflow-x-clip bg-transparent">
          <div className="md:hidden sticky top-0 z-40 flex w-full items-center justify-between border-b border-border/70 bg-background/80 p-4 backdrop-blur-xl no-print shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 transition-colors hover:bg-accent/60" aria-label="Open navigation menu">
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">{pageTitle}</h2>
          </div>

          <div className={`md:flex-shrink-0 fixed inset-y-0 left-0 z-30 no-print transition-all duration-300 ${sidebarCollapsed ? "md:w-20" : "md:w-72"}`}>
            <Sidebar
              isOpen={sidebarOpen}
              onClose={closeSidebar}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            />
          </div>

          <main className={`min-w-0 flex-1 p-3 md:p-6 md:mt-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-20" : "md:ml-72"}`}>
            <div className="rounded-[28px] border border-border/70 bg-card/70 p-4 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl md:p-6">
              {children}
            </div>
          </main>
        </div>
      </>
    </ProtectedRoute>
  );
}

export default Layout;
