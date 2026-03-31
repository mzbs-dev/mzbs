"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import { ResponsiveH3, ResponsiveBody, ResponsiveLabel } from "@/components/responsive/ResponsiveTypography";

export function StudentDashboard() {
  const [studentData, setStudentData] = useState({
    name: "Loading...",
    rollNumber: "--",
    class: "--",
    attendance: 0,
    totalDue: 0,
    totalPaid: 0,
  });

  useEffect(() => {
    // TODO: Fetch student's own data from API
    // Filter data by current user's student_id
    setStudentData({
      name: "Student Name",
      rollNumber: "001",
      class: "Class Name",
      attendance: 0,
      totalDue: 0,
      totalPaid: 0,
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="My Dashboard" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Student Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Your Profile</ResponsiveH3>
            <div className="space-y-2 sm:space-y-3">
              <div>
                <ResponsiveLabel className="text-gray-600">Name</ResponsiveLabel>
                <ResponsiveBody className="!text-gray-900 font-semibold mt-1">
                  {studentData.name}
                </ResponsiveBody>
              </div>
              <div>
                <ResponsiveLabel className="text-gray-600">Roll Number</ResponsiveLabel>
                <ResponsiveBody className="!text-gray-900 font-semibold mt-1">
                  {studentData.rollNumber}
                </ResponsiveBody>
              </div>
              <div>
                <ResponsiveLabel className="text-gray-600">Class</ResponsiveLabel>
                <ResponsiveBody className="!text-gray-900 font-semibold mt-1">
                  {studentData.class}
                </ResponsiveBody>
              </div>
            </div>
          </motion.div>

          {/* Attendance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Your Attendance</ResponsiveH3>
            <div className="space-y-2 sm:space-y-4">
              <div className="text-center">
                <ResponsiveLabel className="text-gray-600 block mb-2">Attendance Rate</ResponsiveLabel>
                <p className="text-3xl sm:text-4xl font-bold text-blue-600">{studentData.attendance}%</p>
              </div>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                View Detailed Attendance
              </button>
            </div>
          </motion.div>

          {/* Fee Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow md:col-span-2"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Fee Status</ResponsiveH3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <ResponsiveLabel className="text-green-700 block mb-1 sm:mb-2">Total Paid</ResponsiveLabel>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{studentData.totalPaid}</p>
              </div>
              <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                <ResponsiveLabel className="text-red-700 block mb-1 sm:mb-2">Amount Due</ResponsiveLabel>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{studentData.totalDue}</p>
              </div>
            </div>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
              View Fee Details
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
