"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";

interface AdminDashboardProps {
  children: React.ReactNode;
}

export function AdminDashboard({ children }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Admin Dashboard" />
      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
