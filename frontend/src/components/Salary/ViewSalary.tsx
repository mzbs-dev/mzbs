"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { Search, Download, Eye, RefreshCw } from "lucide-react";
import { SalaryAPI, SalaryLedgerResponse, TeacherSalaryResponse } from "@/api/Salary/SalaryAPI";

interface TeacherSalarySummary {
  teacherId: number;
  teacherName: string;
  baseSalary: number;
  effectiveDate: string;
  totalPayable: number;
  totalAllowance: number;
  totalDeduction: number;
  netSalary: number;
  totalPaid: number;
  remainingBalance: number;
}

const ViewSalary = () => {
  const [summaries, setSummaries] = useState<TeacherSalarySummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<TeacherSalarySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<TeacherSalarySummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get number of days in a given month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  // Format date from YYYY-MM-DD to DD-MM-YY
  const formatDateToDDMMYY = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}-${month}-${year}`;
  };

  // Calculate Total Payable using Actual Days Method
  const calculateTotalPayable = (baseSalary: number, effectiveDate: string): number => {
    baseSalary = Number(baseSalary) || 0;
    if (baseSalary <= 0 || !effectiveDate) {
      return 0;
    }

    try {
      const startDate = new Date(effectiveDate);
      const endDate = new Date();
      
      if (isNaN(startDate.getTime())) {
        return 0;
      }
      
      let totalPayable = 0;

      if (startDate > endDate) {
        return 0;
      }

      let currentDate = new Date(startDate);

      while (currentDate < endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const firstDayOfMonth = new Date(year, month - 1, 1);
        const lastDayOfMonth = new Date(year, month, 0);

        let workedDaysStart = currentDate > firstDayOfMonth ? currentDate.getDate() : 1;
        let workedDaysEnd = endDate.getFullYear() === year && endDate.getMonth() + 1 === month 
          ? endDate.getDate() 
          : lastDayOfMonth.getDate();

        workedDaysStart = Math.max(1, workedDaysStart);
        workedDaysEnd = Math.min(lastDayOfMonth.getDate(), workedDaysEnd);

        const workedDaysInMonth = workedDaysEnd - workedDaysStart + 1;
        const daysInMonth = getDaysInMonth(year, month);
        const perDaySalary = baseSalary / daysInMonth;
        const monthlyPayable = perDaySalary * workedDaysInMonth;

        totalPayable += monthlyPayable;

        currentDate = new Date(year, month, 1);
      }

      return Math.round(totalPayable * 100) / 100;
    } catch (error) {
      console.error("Error calculating total payable:", error);
      return 0;
    }
  };

  // Fetch and aggregate salary data
  const fetchSalaryData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [teacherSalaries, ledgers] = await Promise.all([
        SalaryAPI.getAllTeacherSalaries(),
        SalaryAPI.getAllSalaryLedgers(),
      ]);

      console.log("Teachers with salary records:", teacherSalaries.length);
      console.log("Salary ledger entries:", ledgers.length);

      // STEP 1: Create aggregated data using LEFT JOIN pattern
      // Use Teacher/Salary table as PRIMARY SOURCE
      const aggregatedData = new Map<number, {
        teacherName: string;
        baseSalary: number;
        effectiveDate: string;
        totalAllowance: number;
        totalDeduction: number;
        totalPaid: number;
      }>();

      // STEP 1a: Initialize with ALL teachers from salary records
      teacherSalaries.forEach((salary) => {
        aggregatedData.set(salary.teacher_id, {
          teacherName: salary.teacher_name || "Unknown",
          baseSalary: Number(salary.base_salary) || 0,
          effectiveDate: salary.effective_from || new Date().toISOString(),
          totalAllowance: 0,
          totalDeduction: 0,
          totalPaid: 0,
        });
      });

      console.log("Teachers initialized in aggregated data:", aggregatedData.size);

      // STEP 1b: Merge ledger data (LEFT JOIN with ledger table)
      ledgers.forEach((ledger: SalaryLedgerResponse) => {
        if (!aggregatedData.has(ledger.teacher_id)) {
          aggregatedData.set(ledger.teacher_id, {
            teacherName: ledger.teacher_name || "Unknown",
            baseSalary: Number(ledger.base_salary) || 0,
            effectiveDate: new Date().toISOString(),
            totalAllowance: 0,
            totalDeduction: 0,
            totalPaid: 0,
          });
        }

        const existing = aggregatedData.get(ledger.teacher_id)!;
        existing.totalAllowance += (Number(ledger.allowance_total) || 0);
        existing.totalDeduction += (Number(ledger.deduction_total) || 0);
        existing.totalPaid += (Number(ledger.total_paid) || 0);
      });

      console.log("Final teacher count after ledger merge:", aggregatedData.size);

      // STEP 2: Convert aggregated data to TeacherSalarySummary objects
      const summaryList: TeacherSalarySummary[] = Array.from(aggregatedData.entries()).map(
        ([teacherId, data]) => {
          const totalPayable = calculateTotalPayable(data.baseSalary, data.effectiveDate);
          const netSalary = (totalPayable || 0) + (data.totalAllowance || 0) - (data.totalDeduction || 0);
          const remainingBalance = (netSalary || 0) - (data.totalPaid || 0);

          return {
            teacherId,
            teacherName: data.teacherName,
            baseSalary: data.baseSalary,
            effectiveDate: formatDateToDDMMYY(data.effectiveDate),
            totalPayable: isNaN(totalPayable) ? 0 : totalPayable,
            totalAllowance: data.totalAllowance,
            totalDeduction: data.totalDeduction,
            netSalary: isNaN(netSalary) ? 0 : netSalary,
            totalPaid: data.totalPaid,
            remainingBalance: isNaN(remainingBalance) ? 0 : remainingBalance,
          };
        }
      );

      summaryList.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      console.log("Final summary list:", summaryList.length);

      setSummaries(summaryList);
      setFilteredSummaries(summaryList);
    } catch (error) {
      console.error("Error fetching salary data:", error);
      toast.error("Failed to load salary information");
      setSummaries([]);
      setFilteredSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh function to manually update salary data
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchSalaryData();
      toast.success("Salary data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing salary data:", error);
      toast.error("Failed to refresh salary data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  // Filter summaries based on search
  useEffect(() => {
    let filtered = summaries.filter((summary) =>
      (summary.teacherName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredSummaries(filtered);
  }, [searchTerm, summaries]);

  const handleExport = () => {
    try {
      const headers = [
        "Serial No",
        "Teacher Name",
        "Base Salary",
        "Effective Date",
        "Total Payable",
        "Allowance",
        "Deduction",
        "Net Salary",
        "Paid Amount",
        "Remaining Balance",
      ];

      const rows = filteredSummaries.map((summary, index) => [
        index + 1,
        summary.teacherName,
        Math.round(summary.baseSalary),
        summary.effectiveDate,
        Math.round(summary.totalPayable),
        Math.round(summary.totalAllowance),
        Math.round(summary.totalDeduction),
        Math.round(summary.netSalary),
        Math.round(summary.totalPaid),
        Math.round(summary.remainingBalance),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary_view_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Salary data exported successfully!");
    } catch (error) {
      console.error("Error exporting records:", error);
      toast.error("Failed to export salary data");
    }
  };

  // Calculate summary statistics
  const calculateSummaryStats = (data: TeacherSalarySummary[]) => {
    if (!data || data.length === 0) {
      return {
        totalTeachers: 0,
        totalBaseSalary: 0,
        totalPayable: 0,
        totalAllowance: 0,
        totalDeduction: 0,
        totalNetSalary: 0,
        totalPaid: 0,
        totalRemaining: 0,
      };
    }

    return {
      totalTeachers: data.length,
      totalBaseSalary: data.reduce((sum, s) => sum + s.baseSalary, 0),
      totalPayable: data.reduce((sum, s) => sum + s.totalPayable, 0),
      totalAllowance: data.reduce((sum, s) => sum + s.totalAllowance, 0),
      totalDeduction: data.reduce((sum, s) => sum + s.totalDeduction, 0),
      totalNetSalary: data.reduce((sum, s) => sum + s.netSalary, 0),
      totalPaid: data.reduce((sum, s) => sum + s.totalPaid, 0),
      totalRemaining: data.reduce((sum, s) => sum + s.remainingBalance, 0),
    };
  };

  const summaryStats = calculateSummaryStats(filteredSummaries);

  return (
    <div className="w-full">
      <Header value="View Salary" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by teacher name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={handleExport}
                disabled={filteredSummaries.length === 0}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Showing cumulative salary data for all teachers up to today
          </p>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Teachers/Staff</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {summaryStats.totalTeachers}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-4 border border-green-200 dark:border-green-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Base Salary</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              Rs. {Math.round(summaryStats.totalBaseSalary).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Payable</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              Rs. {Math.round(summaryStats.totalPayable).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg shadow p-4 border border-orange-200 dark:border-orange-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Net Salary</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              Rs. {Math.round(summaryStats.totalNetSalary).toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {/* Second row of summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg shadow p-4 border border-emerald-200 dark:border-emerald-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Allowance</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              Rs. {Math.round(summaryStats.totalAllowance).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg shadow p-4 border border-red-200 dark:border-red-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Deduction</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
              Rs. {Math.round(summaryStats.totalDeduction).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg shadow p-4 border border-cyan-200 dark:border-cyan-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
              Rs. {Math.round(summaryStats.totalPaid).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg shadow p-4 border border-pink-200 dark:border-pink-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Remaining</p>
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">
              Rs. {Math.round(summaryStats.totalRemaining).toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading salary data...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? "No salary records match your search" : "No salary records found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Teacher Name</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Base Salary</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Effective Date</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total Payable</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Allowance</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Deduction</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Net Salary<br /><span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Cumulative)</span></th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Remaining</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredSummaries.map((summary) => (
                    <tr key={summary.teacherId} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{summary.teacherName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.baseSalary).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{summary.effectiveDate}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.totalPayable).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">+ Rs. {Math.round(summary.totalAllowance).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">- Rs. {Math.round(summary.totalDeduction).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-semibold">Rs. {Math.round(summary.netSalary).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.totalPaid).toLocaleString("en-US")}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${summary.remainingBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Rs. {Math.round(summary.remainingBalance).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSummary(summary);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSalary;
