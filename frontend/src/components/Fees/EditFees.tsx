"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FaRegEdit } from "react-icons/fa";
import { LoaderIcon } from "lucide-react";
import { FeeAPI as API } from "@/api/Fees/AddFeeAPI";

interface EditFeesProps {
  feeId: number;
  studentName: string;
  fatherName: string;
  className: string;
  feeStatus: string;
  feeAmount: number;
  feeMonth: string;
  feeYear: number;
  onUpdate: () => void;
}

interface APIResponse {
  status: number;
  data: {
    message?: string;
  };
}

interface UpdateFeeData {
  fee_amount?: number;
  fee_month?: string;
  fee_year?: string;
}

const EditFees = ({
  feeId,
  studentName,
  fatherName,
  className,
  feeStatus,
  feeAmount,
  feeMonth,
  feeYear,
  onUpdate,
}: EditFeesProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fee_amount: feeAmount.toString(),
    fee_month: feeMonth,
    fee_year: feeYear.toString(),
  });

  // Only show edit for paid fees
  if (feeStatus !== "Paid") {
    return <span className="text-gray-400 text-sm">N/A</span>;
  }

  const handleFormSubmit = async () => {
    setLoading(true);
    try {
      if (!editFormData.fee_amount || !editFormData.fee_month || !editFormData.fee_year) {
        toast.error("Please fill all fields", {
          position: "bottom-center",
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      const updateData: UpdateFeeData = {
        fee_amount: parseFloat(editFormData.fee_amount),
        fee_month: editFormData.fee_month,
        fee_year: editFormData.fee_year,
      };

      const response = (await API.Update(feeId, updateData)) as APIResponse;

      if (response.status === 200) {
        setOpen(false);
        toast.success("Fee record updated successfully!", {
          position: "bottom-center",
          duration: 3000,
        });
        onUpdate();
      } else {
        throw new Error(response.data.message || "Failed to update fee");
      }
    } catch (error: unknown) {
      console.error("Error updating fee:", error);
      toast.error((error as Error).message || "Failed to update fee", {
        position: "bottom-center",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
        title="Edit fee record"
      >
        <FaRegEdit className="text-lg" />
      </button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Fee Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student Name
            </label>
            <Input
              type="text"
              value={studentName}
              disabled
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Father Name
            </label>
            <Input
              type="text"
              value={fatherName}
              disabled
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class
            </label>
            <Input
              type="text"
              value={className}
              disabled
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <Input
              type="text"
              value={feeStatus}
              disabled
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
          </div>

          {/* Editable fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fee Amount
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editFormData.fee_amount}
              onChange={(e) =>
                setEditFormData({ ...editFormData, fee_amount: e.target.value })
              }
              placeholder="Enter fee amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fee Month
            </label>
            <select
              value={editFormData.fee_month}
              onChange={(e) =>
                setEditFormData({ ...editFormData, fee_month: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fee Year
            </label>
            <select
              value={editFormData.fee_year}
              onChange={(e) =>
                setEditFormData({ ...editFormData, fee_year: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Year</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFormSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditFees;
