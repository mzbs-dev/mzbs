"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import { ResponsiveH3, ResponsiveLabel, ResponsiveLarge } from "@/components/responsive/ResponsiveTypography";

export function TeacherDashboard() {
  const [studentStats, setStudentStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
  });

  useEffect(() => {
    // TODO: Fetch teacher's class statistics
    // This would call API endpoints specific to the teacher's assigned class
    setStudentStats({
      total: 0,
      present: 0,
      absent: 0,
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Teacher Dashboard" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Class Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Class Overview</ResponsiveH3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <ResponsiveLabel className="text-gray-600">Total Students:</ResponsiveLabel>
                <ResponsiveLarge className="text-blue-600">{studentStats.total}</ResponsiveLarge>
              </div>
              <div className="flex justify-between items-center">
                <ResponsiveLabel className="text-gray-600">Present Today:</ResponsiveLabel>
                <ResponsiveLarge className="text-green-600">{studentStats.present}</ResponsiveLarge>
              </div>
              <div className="flex justify-between items-center">
                <ResponsiveLabel className="text-gray-600">Absent Today:</ResponsiveLabel>
                <ResponsiveLarge className="text-red-600">{studentStats.absent}</ResponsiveLarge>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Quick Actions</ResponsiveH3>
            <div className="space-y-2">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                Mark Attendance
              </button>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                View Students
              </button>
            </div>
          </motion.div>

          {/* Attendance Report */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Attendance Report</ResponsiveH3>
            <div className="text-center">
              <ResponsiveLabel className="text-gray-600 block mb-2">Attendance Rate</ResponsiveLabel>
              <p className="text-3xl sm:text-4xl font-bold text-blue-600">--</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">No data available</p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
