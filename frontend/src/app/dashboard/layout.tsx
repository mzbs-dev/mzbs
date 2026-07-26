"use client";
import Sidebar from "@/components/dashboard/Sidebar";
import  ProtectedRoute  from "@/components/ProtectedRoute";
import React, { useState } from "react";
import { Menu } from "lucide-react";

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-transparent">
          <div className="md:hidden flex items-center justify-between border-b border-border/70 bg-background/80 p-4 backdrop-blur-xl z-30 no-print shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 transition-colors hover:bg-accent/60">
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              Dashboard
            </h2>
          </div>

          <div className="md:w-72 md:flex-shrink-0 fixed inset-y-0 left-0 z-30 no-print">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>

          <main className="flex-1 p-3 md:p-6 md:ml-72 md:mt-0">
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
