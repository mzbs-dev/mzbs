"use client";
import { ExpenseCategory } from "@/models/expense/expense";
import React, { useEffect, useState } from "react";
import { ExpenseAPI as API } from "@/api/Expense/ExpenseAPI";
import { useForm } from "react-hook-form";
import { usePrint } from "@/components/print/usePrint";
import { Printer } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "../dashboard/Header";
import Loader from "../Loader";

// Form values interface
interface ExpenseFormValues {
  category_id: number;
}

// Generic API response interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Interface for expense data items
interface ExpenseDataItem {
  id: number;
  date: string;
  category: string;
  to_whom: string;
  description: string;
  amount: number;
}

const ViewExpense = () => {
  const {
    register,
    formState: { errors },
  } = useForm<ExpenseFormValues>();
  const { printRecords } = usePrint();
  const [isLoading, setIsLoading] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseDataItem[]>([]);

  // Load categories + all expenses on first mount
  useEffect(() => {
    getCategories();
    getAllExpense();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = (await API.GetExpenseCategory()) as ApiResponse<
        ExpenseCategory[]
      >;
      setExpenseCategory(res.data);
    } catch (error) {
      console.error("Error fetching Expense categories:", error);
      setExpenseCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllExpense = async () => {
    setIsLoading(true);
    try {
      // Try wrapper first (existing behavior)
      const res = (await API.GetExpenseData(0)) as ApiResponse<ExpenseDataItem[]>;
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setExpenseData(res.data);
        return;
      }

      // Fallback: call backend endpoint directly to verify wrapper behavior
      const fallbackUrl = `/expenses/filter_expense?category_id=0`;
      const fallbackRes = await fetch(fallbackUrl, { credentials: "include" });
      if (!fallbackRes.ok) {
        console.error("Fallback request failed:", fallbackRes.status, await fallbackRes.text());
        setExpenseData([]);
        return;
      }
      const fallbackJson = await fallbackRes.json();
      setExpenseData(Array.isArray(fallbackJson) ? fallbackJson : []);
    } catch (error) {
      console.error("Error fetching all Expense data:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpense = async (CategoryId: number) => {
    if (CategoryId === 0) {
      getAllExpense();
      return;
    }
    setIsLoading(true);
    try {
      // Try wrapper first
      const res = (await API.GetExpenseData(CategoryId)) as ApiResponse<ExpenseDataItem[]>;
      if (res && Array.isArray(res.data)) {
        setExpenseData(res.data);
        return;
      }

      // Fallback to direct fetch with query param
      const fallbackUrl = `/expenses/filter_expense?category_id=${CategoryId}`;
      const fallbackRes = await fetch(fallbackUrl, { credentials: "include" });
      if (!fallbackRes.ok) {
        console.error("Fallback request failed:", fallbackRes.status, await fallbackRes.text());
        setExpenseData([]);
        return;
      }
      const fallbackJson = await fallbackRes.json();
      setExpenseData(Array.isArray(fallbackJson) ? fallbackJson : []);
    } catch (error) {
      console.error("Error fetching Expense data:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header value="View Expense" />
      <Loader isActive={isLoading} />
      <form className="space-y-4 border w-full my-2">
        <div className="space-y-4 px-2 rounded-md">
          <label className="font-bold text-sm dark:text-gray-300">
            Category:{" "}
          </label>
          <select
            {...register("category_id", { valueAsNumber: true })}
            className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
            onChange={(e) => getExpense(Number(e.target.value))}
          >
            <option value={0}>All</option>
            {expenseCategory.map((category) => (
              <option
                key={category.expense_cat_name_id}
                value={category.expense_cat_name_id}
              >
                {category.expense_cat_name}
              </option>
            ))}
          </select>
          <p className="text-red-500 text-xs">
            {typeof errors.category_id?.message === "string" &&
              errors.category_id?.message}
          </p>
        </div>
      </form>

      {/* Table to display Expense data */}
      <div className="mt-4 bg-white dark:bg-background rounded-md">
        {expenseData.length > 0 ? (
          <>
            <div className="flex justify-between items-center p-4 no-print">
              <h3 className="text-lg font-semibold">Expense Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${expenseData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('expense-print-area', 'Expense Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
            <div id="expense-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead className="text-gray-100">ID</TableHead>
                    <TableHead className="text-gray-100">Date</TableHead>
                    <TableHead className="text-gray-100">Category</TableHead>
                    <TableHead className="text-gray-100">To Whom</TableHead>
                    <TableHead className="text-gray-100">Description</TableHead>
                    <TableHead className="text-gray-100">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.to_whom}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p>No expense records available.</p>
        )}
      </div>
    </div>
  );
};

export default ViewExpense;
