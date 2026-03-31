"use client";

import React, { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import { ResponsiveH3, ResponsiveLabel } from "@/components/responsive/ResponsiveTypography";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function AccountantDashboard() {
  const [financialData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    totalFees: 0,
    balance: 0,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Accountant Dashboard" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          {/* Financial Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveLabel className="text-gray-600 block mb-2 sm:mb-3">Total Income</ResponsiveLabel>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{financialData.totalIncome}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveLabel className="text-gray-600 block mb-2 sm:mb-3">Total Expenses</ResponsiveLabel>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{financialData.totalExpense}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveLabel className="text-gray-600 block mb-2 sm:mb-3">Total Fees Collected</ResponsiveLabel>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{financialData.totalFees}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveLabel className="text-gray-600 block mb-2 sm:mb-3">Net Balance</ResponsiveLabel>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{financialData.balance}</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <ResponsiveH3 className="mb-3 sm:mb-4">Quick Actions</ResponsiveH3>
            <div className="space-y-2">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                Add Income
              </button>
              <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                Add Expense
              </button>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base font-medium">
                Manage Fees
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
