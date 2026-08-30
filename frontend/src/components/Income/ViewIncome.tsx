"use client";

import { IncomeCategory } from "@/models/income/income";
import React, { useEffect, useState } from "react";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
import { usePrint } from "@/components/print/usePrint";
import { useRole } from "@/context/RoleContext";
import { formatDateToDDMMYY } from "@/utils/dateFormatter";
import { extractArrayData } from "@/utils/apiResponse";
import { Printer, Edit2, Trash2, X, ChevronFirst, ChevronLast } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "../dashboard/Header";
import { TableSkeleton } from "@/components/dashboard/Skeleton";

interface IncomeFormValues {
  category_id: number;
}

interface IncomeDataItem {
  id: number;
  recipt_number?: string | null;
  date: string;
  category: string;
  source: string;
  description: string;
  contact: string;
  amount: number;
  source_type?: string | null;
}

const sortByDateDesc = <T extends { date: string }>(records: T[]) =>
  [...records].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;

    return rightTime - leftTime;
  });

const getIncomeCategoryIdByName = (
  categories: IncomeCategory[],
  categoryName: string
) =>
  categories.find((category) => category.income_cat_name === categoryName)
    ?.income_cat_name_id;

const ViewIncome = () => {
  const { printRecords } = usePrint();
  const { role } = useRole();

  const [isLoading, setIsLoading] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeDataItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [sourceSearch, setSourceSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  // Holds the FULL filtered dataset (not just the current page) built right
  // before printing, so the report includes every matching record instead
  // of only the 10 rows currently visible on screen.
  const [printData, setPrintData] = useState<IncomeDataItem[]>([]);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeDataItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    recipt_number: "",
    date: "",
    category_id: "",
    source: "",
    description: "",
    contact: "",
    amount: "",
  });

  // Load categories on first mount and get all income records
  useEffect(() => {
    getCategories();
    getAllIncome(); // Load all income records by default
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = await API.GetIncomeCategory();
      const data = extractArrayData<IncomeCategory>(res).map((item) => ({
        income_cat_name_id: item.income_cat_name_id,
        income_cat_name: item.income_cat_name,
        created_at: item.created_at,
      }));
      setIncomeCategory(data);
    } catch (error) {
      setIncomeCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllIncome = async (page = 1, source = sourceSearch) => {
    setIsLoading(true);
    try {
      const res = await API.GetAllIncomeData(page, pageSize, source);
      const payload = res?.data;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : extractArrayData<IncomeDataItem>(res);
      setIncomeData(sortByDateDesc(items as IncomeDataItem[]));
      setCurrentPage(Number(payload?.page ?? page));
      setTotalPages(Number(payload?.total_pages ?? 1));
    } catch (error) {
      setIncomeData([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncome = async (CategoryId: number, page = 1, source = sourceSearch) => {
    if (CategoryId === 0) {
      getAllIncome(page, source);
      return;
    }
    setIsLoading(true);
    try {
      const res = await API.GetIncomeData(CategoryId, page, pageSize, source);
      const payload = res?.data;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : extractArrayData<IncomeDataItem>(res);
      setIncomeData(sortByDateDesc(items as IncomeDataItem[]));
      setCurrentPage(Number(payload?.page ?? page));
      setTotalPages(Number(payload?.total_pages ?? 1));
    } catch (error) {
      setIncomeData([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceSearch = () => {
    getIncome(selectedCategory, 1, sourceSearch);
  };

  const clearSourceSearch = () => {
    setSourceSearch("");
    getIncome(selectedCategory, 1, "");
  };

  const handleDeleteIncome = async (incomeId: number) => {
    if (!confirm("Are you sure you want to delete this income record?")) {
      return;
    }

    setIsLoading(true);
    try {
      await API.DeleteIncome(incomeId);
      // Refresh the data
      getIncome(selectedCategory, 1, sourceSearch);
    } catch (error) {
      alert("Failed to delete income record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (income: IncomeDataItem) => {
    const matchedCategoryId = getIncomeCategoryIdByName(incomeCategory, income.category);
    setEditingIncome(income);
    setEditFormData({
      recipt_number: income.recipt_number ? String(income.recipt_number) : "",
      date: income.date.split("T")[0], // Format: YYYY-MM-DD
      category_id: matchedCategoryId ? String(matchedCategoryId) : "",
      source: income.source,
      description: income.description || "",
      contact: income.contact || "",
      amount: String(income.amount),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateIncome = async () => {
    if (!editingIncome) return;

    setIsLoading(true);
    try {
      const updateData = {
        recipt_number: editFormData.recipt_number || null,
        date: editFormData.date,
        source: editFormData.source,
        description: editFormData.description || null,
        contact: editFormData.contact || null,
        amount: parseFloat(editFormData.amount),
        ...(editFormData.category_id
          ? { category_id: Number(editFormData.category_id) }
          : {}),
      };

      await API.UpdateIncome(editingIncome.id, updateData);
      toast.success("Income record updated successfully");
      setIsEditModalOpen(false);
      setEditingIncome(null);
      
      // Refresh the data based on current selection
      getIncome(selectedCategory, 1, sourceSearch);
    } catch (error) {
      console.error("Error updating income:", error);
      toast.error("Failed to update income record");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches every record matching the current filters (not just the current
  // page) so the printed report is complete. Reuses the same endpoints and
  // filters already in effect on screen; on-screen pagination is untouched.
  const handlePrintClick = async () => {
    setIsPreparingPrint(true);
    try {
      // Fetch first page to get total_pages
      const firstPageRes =
        selectedCategory === 0
          ? await API.GetAllIncomeData(1, 50, sourceSearch)
          : await API.GetIncomeData(selectedCategory, 1, 50, sourceSearch);
      const payload = firstPageRes?.data;
      const totalPages = payload?.total_pages || 1;
      
      // Collect all records from all pages
      let allItems: IncomeDataItem[] = [];
      for (let page = 1; page <= totalPages; page++) {
        const res =
          selectedCategory === 0
            ? await API.GetAllIncomeData(page, 50, sourceSearch)
            : await API.GetIncomeData(selectedCategory, page, 50, sourceSearch);
        const pagePayload = res?.data;
        const items = Array.isArray(pagePayload?.data)
          ? pagePayload.data
          : extractArrayData<IncomeDataItem>(res);
        allItems = [...allItems, ...items];
      }
      setPrintData(sortByDateDesc(allItems as IncomeDataItem[]));
    } catch (error) {
      console.error("Failed to prepare print data", error);
      toast.error("Failed to prepare print data");
      setIsPreparingPrint(false);
    }
  };

  // Once the full dataset lands, print it, then clear it out again.
  useEffect(() => {
    if (printData.length === 0) return;
    const meta = `Total records: ${printData.length} · Printed: ${new Date().toLocaleDateString()}`;
    printRecords('income-print-area-full', 'Income Report', meta);
    setPrintData([]);
    setIsPreparingPrint(false);
  }, [printData, printRecords]);

  const getSourceBadgeClasses = (sourceType: string | null | undefined): string => {
    switch (sourceType) {
      case "Fee":
        return "bg-primary/10 text-primary";
      case "SalaryPayment":
        return "bg-blue-100 text-primary";
      case "Allowance":
        return "bg-amber-100 text-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="container mx-auto">
      <Header value="View Income" />

      <form className="space-y-4 border w-full my-2">
        <div className="flex flex-wrap items-center gap-2 px-2 py-2 rounded-md">
          <label className="font-bold text-sm dark:text-foreground">Category: </label>
          <select
            className="h-10 w-[14rem] border bg-card rounded-md px-3 py-2 focus:ring focus:ring-primary/20 dark:bg-background dark:text-foreground"
            value={selectedCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const value = Number(e.target.value);
              setSelectedCategory(value);
              getIncome(value, 1);
            }}
          >
            <option value={0}>All</option>
            {incomeCategory.map((category) => (
              <option
                key={category.income_cat_name_id}
                value={category.income_cat_name_id}
              >
                {category.income_cat_name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSourceSearch();
                }
              }}
              placeholder="Search source"
              aria-label="Search income source"
              className="h-10 w-[14rem] border bg-card rounded-md px-3 py-2 focus:ring focus:ring-primary/20 dark:bg-background dark:text-foreground"
            />
            <Button
              type="button"
              onClick={handleSourceSearch}
              disabled={isLoading}
              className="h-10 gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Search
            </Button>
            {sourceSearch && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearSourceSearch}
                disabled={isLoading}
                aria-label="Clear source search"
                title="Clear source search"
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-4 container mx-auto bg-card dark:bg-background rounded-md">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : incomeData.length > 0 ? (
          <>
            <div className="flex justify-between items-center p-4 no-print">
              <h3 className="text-lg font-semibold">Income Data</h3>
              <button
                onClick={handlePrintClick}
                disabled={isPreparingPrint}
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                {isPreparingPrint ? 'Preparing...' : 'Print'}
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 no-print">
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getIncome(Number(selectedCategory), 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="px-2 sm:px-3"
                  aria-label="First page"
                >
                  <ChevronFirst className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">First</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getIncome(Number(selectedCategory), Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-2 sm:px-3"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getIncome(Number(selectedCategory), Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-2 sm:px-3"
                >
                  Next
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getIncome(Number(selectedCategory), totalPages)}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-2 sm:px-3"
                  aria-label="Last page"
                >
                  <span className="hidden sm:inline mr-1">Last</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div id="income-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Amount</TableHead>
                    {(role === "ADMIN" || role === "ACCOUNTANT") && (
                      <TableHead className="no-print">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.recipt_number ?? "-"}</TableCell>
                      <TableCell>{formatDateToDDMMYY(item.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{item.category}</span>
                          {item.source_type && (
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${getSourceBadgeClasses(item.source_type)}`}>
                              Auto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.contact}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                      {(role === "ADMIN" || role === "ACCOUNTANT") && (
                        <TableCell className="no-print flex gap-2 items-center">
                          {!item.source_type && (
                            <>
                              <button
                                onClick={() => handleEditClick(item)}
                                className="p-1 text-primary hover:bg-blue-100 rounded transition"
                                title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {role === "ADMIN" && (
                            <button
                              onClick={() => handleDeleteIncome(item.id)}
                              className="p-1 text-destructive hover:bg-red-100 rounded transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div id="income-print-area-full" style={{ display: "none" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.recipt_number ?? "-"}</TableCell>
                      <TableCell>{formatDateToDDMMYY(item.date)}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.contact}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p>No income records available.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Income Record</DialogTitle>
          </DialogHeader>
          {editingIncome && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Receipt Number</label>
                <Input
                  type="text"
                  value={editFormData.recipt_number}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, recipt_number: e.target.value })
                  }
                  placeholder="Enter receipt number"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={editFormData.category_id}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, category_id: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 bg-card dark:bg-background dark:text-foreground"
                >
                  <option value="">Select Category</option>
                  {incomeCategory.map((category) => (
                    <option
                      key={category.income_cat_name_id}
                      value={category.income_cat_name_id}
                    >
                      {category.income_cat_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Source</label>
                <Input
                  value={editFormData.source}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, source: e.target.value })
                  }
                  placeholder="Enter source"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Contact</label>
                <Input
                  value={editFormData.contact}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contact: e.target.value })
                  }
                  placeholder="Enter contact"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded"
            >
              Cancel
            </button>
            <Button
              onClick={handleUpdateIncome}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewIncome;

