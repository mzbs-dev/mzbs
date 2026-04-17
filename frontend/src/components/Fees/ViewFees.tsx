"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "../Select";
import { useForm } from "react-hook-form";
import { ClassNameAPI as API2 } from "@/api/Classname/ClassNameAPI";
import { FeeAPI as API3 } from "@/api/Fees/AddFeeAPI"
import { GetFeeModel} from "@/models/Fees/Fee";
import { toast } from "sonner";
import { usePrint } from "@/components/print/usePrint";
import { Printer, Edit2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "../dashboard/Header";


interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface FeeData {
  fee_id: number;
  student_name: string;
  father_name: string;
  class_name: string;
  fee_amount: number;
  fee_month: string;
  fee_year: number;
  fee_status: string;
}

const ViewFees: React.FC = () => {
  const {
    register,
    handleSubmit,
    setValue: setFormValue,
    formState: { errors },
  } = useForm<GetFeeModel>();
  const { printRecords } = usePrint();
  const [classNameList, setClassNameList] = useState<
    { id: number; title: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feesData, setFeesData] = useState<FeeData[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeData | null>(null);
  const [editFormData, setEditFormData] = useState({
    fee_amount: "",
    fee_month: "",
    fee_year: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    GetClassName();
  }, []);

  const GetClassName = async () => {                          
    setIsLoading(true);
    try {
      const response = (await API2.Get()) as { data: ClassNameResponse[] };
      if (response.data && Array.isArray(response.data)) {
        response.data.unshift({
          class_name_id: 0,
          class_name: "All",
        });
        setClassNameList(
          response.data.map((item: ClassNameResponse) => ({
            id: item.class_name_id,
            title: item.class_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching class names:", error);
    } finally {
      setIsLoading(false);
    }
  };

const handleGetFees = async (data: GetFeeModel) => {
  try {
    // Validate that year is selected (year is now mandatory)
    if (!data.fee_year) {
      toast.error("Please select a year");
      return;
    }

    // Use Filter API with Class, Month, Year, Status filters
    const response = await API3.Filter({
      // class_id: 0 is the "All" option prepended in GetClassName()
      class_id: data.class_id && Number(data.class_id) !== 0
        ? Number(data.class_id)
        : undefined,
      // "all" string = skip this filter; empty string = skip this filter
      fee_month: data.fee_month && data.fee_month !== "all"
        ? data.fee_month
        : undefined,
      // Year is now mandatory, always send it
      fee_year: data.fee_year,
      // "all" or empty string = skip fee_status filter
      fee_status: data.fee_status && data.fee_status !== "all"
        ? data.fee_status
        : undefined,
    });

    if (Array.isArray(response.data) && response.data.length === 0) {
      toast.error("No data found");
      setFeesData([]);
    } else if (Array.isArray(response.data)) {
      setFeesData(response.data as FeeData[]);
      toast.success("Fees data fetched successfully");
    } else {
      toast.error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error fetching fees:", error);
    toast.error("Failed to fetch fees");
  }
};

const handleEditClick = (fee: FeeData) => {
  setSelectedFee(fee);
  setEditFormData({
    fee_amount: fee.fee_amount.toString(),
    fee_month: fee.fee_month,
    fee_year: fee.fee_year.toString(),
  });
  setIsEditModalOpen(true);
};

const handleUpdateFee = async () => {
  try {
    if (!selectedFee) {
      toast.error("No fee selected");
      return;
    }

    if (!selectedFee.fee_id) {
      toast.error("Cannot edit this fee record - fee_id is missing");
      return;
    }

    // Validate input
    if (!editFormData.fee_amount || !editFormData.fee_month || !editFormData.fee_year) {
      toast.error("Please fill all fields");
      return;
    }

    setIsUpdating(true);

    const response = await API3.Update(selectedFee.fee_id, {
      fee_amount: parseFloat(editFormData.fee_amount),
      fee_month: editFormData.fee_month,
      fee_year: editFormData.fee_year,
    });

    toast.success("Fee record updated successfully");
    setIsEditModalOpen(false);
    setSelectedFee(null);

    // Refresh the current data by refetching
    // We'll need to keep track of current filter params for this
    // For now, just clear the data
    setFeesData([]);
  } catch (error) {
    console.error("Error updating fee:", error);
    toast.error("Failed to update fee record");
  } finally {
    setIsUpdating(false);
  }
};

  return (
    <div className="container mx-auto px-2 sm:px-4">
      <Header value="View Fees" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-3">
        <form
          onSubmit={handleSubmit(handleGetFees)}
          className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Class Name
            </label>
            <Select
              label=""
              options={classNameList}
              {...register("class_id")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Month
            </label>
            <Select
              label=""
              options={[
                { id: "all", title: "All" },
                { id: "January", title: "January" },
                { id: "February", title: "February" },
                { id: "March", title: "March" },
                { id: "April", title: "April" },
                { id: "May", title: "May" },
                { id: "June", title: "June" },
                { id: "July", title: "July" },
                { id: "August", title: "August" },
                { id: "September", title: "September" },
                { id: "October", title: "October" },
                { id: "November", title: "November" },
                { id: "December", title: "December" },
              ]}
              {...register("fee_month")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Year
            </label>
            <Select
              label=""
              options={[
                { id: "2023", title: "2023" },
                { id: "2024", title: "2024" },
                { id: "2025", title: "2025" },
                { id: "2026", title: "2026" },
              ]}
              {...register("fee_year")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Status
            </label>
            <Select
              label=""
              options={[
                { id: "all", title: "All" },
                { id: "Paid", title: "Paid" },
                { id: "Unpaid", title: "Unpaid" },
              ]}
              {...register("fee_status")}
              className="w-full"
            />
          </div>
          <Button className="w-full lg:col-span-1" type="submit">
            Get
          </Button>
        </form>

        {feesData.length > 0 && (
          <div className="p-2 sm:p-4">
            <div className="flex justify-between items-center mb-4 no-print">
              <h3 className="text-lg font-semibold">Fees Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${feesData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('fees-print-area', 'Fees Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
            <div id="fees-print-area" className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/8">Student Name</TableHead>
                    <TableHead className="w-1/8">Father Name</TableHead>
                    <TableHead className="w-1/8">Class</TableHead>
                    <TableHead className="w-1/8">Amount</TableHead>
                    <TableHead className="w-1/8">Month</TableHead>
                    <TableHead className="w-1/8">Year</TableHead>
                    <TableHead className="w-1/8">Status</TableHead>
                    <TableHead className="w-1/8 no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feesData.map((fee) => (
                    <TableRow key={fee.fee_id}>
                      <TableCell>{fee.student_name}</TableCell>
                      <TableCell>{fee.father_name}</TableCell>
                      <TableCell>{fee.class_name}</TableCell>
                      <TableCell>{fee.fee_amount}</TableCell>
                      <TableCell>{fee.fee_month}</TableCell>
                      <TableCell>{fee.fee_year}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          fee.fee_status === "Paid" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {fee.fee_status}
                        </span>
                      </TableCell>
                      <TableCell className="no-print">
                        {fee.fee_status === "Paid" && fee.fee_id ? (
                          <button
                            onClick={() => handleEditClick(fee)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                            title="Edit paid fee record"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Edit Fee Modal */}
        {isEditModalOpen && selectedFee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Fee Record</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedFee(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Read-only fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student Name</label>
                  <input
                    type="text"
                    value={selectedFee.student_name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Father Name</label>
                  <input
                    type="text"
                    value={selectedFee.father_name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Class</label>
                  <input
                    type="text"
                    value={selectedFee.class_name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <input
                    type="text"
                    value={selectedFee.fee_status}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                {/* Editable fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.fee_amount}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fee_amount: e.target.value })
                    }
                    placeholder="Enter fee amount"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Month</label>
                  <select
                    value={editFormData.fee_month}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fee_month: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Month</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Year</label>
                  <select
                    value={editFormData.fee_year}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fee_year: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Year</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedFee(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateFee}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFees;
