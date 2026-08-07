"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { DebitAPI, DebitDetailResponse, DebitResponse, PaymentMethod } from "@/api/Debit/DebitAPI";
import { useRole } from "@/context/RoleContext";

interface AddDebitForm {
  person_name: string;
  debit_date: string;
  amount: string;
  expected_return_date: string;
  payment_method: PaymentMethod;
  receipt_no: string;
  remarks: string;
}

interface ClearDebitForm {
  debit_id: string;
  cleared_amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  receipt_no: string;
  remarks: string;
}

const ManageDebit = () => {
  const { role, permissions, permissionsLoaded } = useRole();
  const [debits, setDebits] = useState<DebitResponse[]>([]);
  const [isLoadingDebits, setIsLoadingDebits] = useState(false);
  const [isLoadingEditDebit, setIsLoadingEditDebit] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingClear, setIsSubmittingClear] = useState(false);
  const [isAddExpanded, setIsAddExpanded] = useState(true);
  const [isClearExpanded, setIsClearExpanded] = useState(false);
  const [editDebitId, setEditDebitId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDebitDetail, setEditDebitDetail] = useState<DebitDetailResponse | null>(null);

  const normalizedRole = role?.toUpperCase();
  const canAdd = normalizedRole === "ADMIN" || normalizedRole === "ACCOUNTANT" || permissions?.debit?.add === true;
  const canEdit = normalizedRole === "ADMIN" || normalizedRole === "ACCOUNTANT" || permissions?.debit?.edit === true;

  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors },
  } = useForm<AddDebitForm>({
    defaultValues: {
      person_name: "",
      debit_date: new Date().toISOString().slice(0, 10),
      amount: "",
      expected_return_date: "",
      payment_method: "CASH",
      receipt_no: "",
      remarks: "",
    },
  });

  const {
    register: registerClear,
    handleSubmit: handleClearSubmit,
    reset: resetClear,
    watch: watchClear,
    formState: { errors: clearErrors },
  } = useForm<ClearDebitForm>({
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "CASH",
    },
  });

  const selectedDebitId = watchClear("debit_id");

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as { response?: { data?: any }; message?: string };
    return apiError?.response?.data?.detail || apiError?.response?.data?.message || apiError?.message || fallback;
  };

  const selectedDebit = useMemo(
    () => debits.find((item) => item.id.toString() === selectedDebitId),
    [debits, selectedDebitId]
  );

  const fetchDebits = async () => {
    setIsLoadingDebits(true);
    try {
      const data = await DebitAPI.getDebits({
        status: "ACTIVE,PARTIALLY_CLEARED",
      });
      setDebits(data);
    } catch (error) {
      console.error("Error fetching debits:", error);
      toast.error("Failed to load active debits");
      setDebits([]);
    } finally {
      setIsLoadingDebits(false);
    }
  };

  const fetchDebitForEdit = useCallback(async (id: number) => {
    setIsLoadingEditDebit(true);
    try {
      const detail = await DebitAPI.getDebitById(id);
      resetAdd({
        person_name: detail.person_name,
        debit_date: detail.debit_date,
        amount: detail.amount.toString(),
        expected_return_date: detail.expected_return_date || "",
        payment_method: detail.payment_method,
        receipt_no: detail.receipt_no || "",
        remarks: detail.remarks || "",
      });
      setEditDebitDetail(detail);
      setEditDebitId(id);
      setIsEditing(true);
      setIsAddExpanded(true);
      setIsClearExpanded(false);
    } catch (error) {
      console.error("Error loading debit for edit:", error);
      toast.error("Unable to load debit for editing.");
      setIsEditing(false);
      setEditDebitId(null);
      setEditDebitDetail(null);
    } finally {
      setIsLoadingEditDebit(false);
    }
  }, [resetAdd]);

  useEffect(() => {
    if (!permissionsLoaded) {
      return;
    }

    fetchDebits();

    const editParam = searchParams?.get("edit");
    if (editParam) {
      const id = Number(editParam);
      if (!Number.isNaN(id)) {
        fetchDebitForEdit(id);
      }
    }
  }, [permissionsLoaded, searchParams, fetchDebitForEdit]);

  const onAddSubmit = async (data: AddDebitForm) => {
    if (isEditing) {
      if (!canEdit) {
        toast.error("You do not have permission to edit debits");
        return;
      }

      if (!editDebitId) {
        toast.error("No debit selected for editing.");
        return;
      }

      if (editDebitDetail) {
        const requestedAmount = Number(data.amount);
        if (Number.isNaN(requestedAmount)) {
          toast.error("Enter a valid amount.");
          return;
        }
        const alreadyCleared = editDebitDetail.amount - editDebitDetail.remaining_balance;
        if (requestedAmount < alreadyCleared) {
          toast.error(`Amount cannot be less than Rs ${alreadyCleared.toLocaleString()}.`);
          return;
        }
      }

      setIsSubmittingAdd(true);
      try {
        await DebitAPI.updateDebit(editDebitId, {
          person_name: data.person_name.trim(),
          debit_date: data.debit_date,
          amount: Number(data.amount),
          expected_return_date: data.expected_return_date || undefined,
          payment_method: data.payment_method,
          receipt_no: data.receipt_no || undefined,
          remarks: data.remarks || undefined,
        });

        toast.success("Debit updated successfully");
        setIsEditing(false);
        setEditDebitId(null);
        resetAdd({
          person_name: "",
          debit_date: new Date().toISOString().slice(0, 10),
          amount: "",
          expected_return_date: "",
          payment_method: "CASH",
          receipt_no: "",
          remarks: "",
        });
        await fetchDebits();
        router.replace("/dashboard/debit/manage");
      } catch (error) {
        console.error("Error updating debit:", error);
        toast.error(getApiErrorMessage(error, "Failed to update debit"));
      } finally {
        setIsSubmittingAdd(false);
      }
      return;
    }

    if (!canAdd) {
      toast.error("You do not have permission to add debits");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await DebitAPI.addDebit({
        person_name: data.person_name.trim(),
        debit_date: data.debit_date,
        amount: Number(data.amount),
        expected_return_date: data.expected_return_date || undefined,
        payment_method: data.payment_method,
        receipt_no: data.receipt_no || undefined,
        remarks: data.remarks || undefined,
      });

      toast.success("Debit added successfully");
      resetAdd({
        person_name: "",
        debit_date: new Date().toISOString().slice(0, 10),
        amount: "",
        expected_return_date: "",
        payment_method: "CASH",
        receipt_no: "",
        remarks: "",
      });
      await fetchDebits();
    } catch (error) {
      console.error("Error adding debit:", error);
      toast.error("Failed to add debit");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const onClearSubmit = async (data: ClearDebitForm) => {
    if (!canEdit) {
      toast.error("You do not have permission to clear debits");
      return;
    }

    if (!selectedDebit) {
      toast.error("Please select an active debit");
      return;
    }

    const clearedAmount = Number(data.cleared_amount);
    if (Number.isNaN(clearedAmount) || clearedAmount <= 0) {
      toast.error("Please enter a valid cleared amount");
      return;
    }

    if (clearedAmount > selectedDebit.remaining_balance) {
      toast.error("Cleared amount cannot exceed the remaining balance");
      return;
    }

    setIsSubmittingClear(true);
    try {
      await DebitAPI.clearDebit(Number(data.debit_id), {
        debit_id: Number(data.debit_id),
        cleared_amount: clearedAmount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        receipt_no: data.receipt_no || undefined,
        remarks: data.remarks || undefined,
      });

      toast.success("Debit cleared successfully");
      resetClear({
        debit_id: "",
        cleared_amount: "",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "CASH",
        receipt_no: "",
        remarks: "",
      });
      await fetchDebits();
    } catch (error) {
      console.error("Error clearing debit:", error);
      toast.error("Failed to clear debit");
    } finally {
      setIsSubmittingClear(false);
    }
  };

  if (!permissionsLoaded) {
    return <div className="p-4 text-sm text-gray-500">Loading debit management…</div>;
  }

  if (!canAdd && !canEdit) {
    return (
      <div className="p-4 text-sm text-red-600">
        You do not have permission to manage debits.
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header value="Manage Debit" />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
          <button
            onClick={() => setIsAddExpanded(!isAddExpanded)}
            className="mb-4 flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? "Edit Debit" : "Add Debit"}
            </h3>
            {isAddExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </button>

          {isAddExpanded && (
            <form onSubmit={handleAddSubmit(onAddSubmit)} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Person Name</label>
                <Input
                  {...registerAdd("person_name", { required: "Person name is required" })}
                  placeholder="Enter person name"
                  className="w-full"
                />
                {addErrors.person_name && <p className="mt-1 text-sm text-red-600">{addErrors.person_name.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Debit Date</label>
                  <Input type="date" {...registerAdd("debit_date", { required: "Debit date is required" })} className="w-full" />
                  {addErrors.debit_date && <p className="mt-1 text-sm text-red-600">{addErrors.debit_date.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Amount</label>
                  <Input type="number" step="0.01" {...registerAdd("amount", { required: "Amount is required" })} placeholder="Enter amount" className="w-full" />
                  {addErrors.amount && <p className="mt-1 text-sm text-red-600">{addErrors.amount.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Expected Return Date (Optional)</label>
                  <Input type="date" {...registerAdd("expected_return_date")} className="w-full" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Method</label>
                  <select
                    {...registerAdd("payment_method", { required: "Payment method is required" })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Receipt No (Optional)</label>
                  <Input {...registerAdd("receipt_no")} placeholder="Enter receipt number" className="w-full" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Remarks (Optional)</label>
                  <Input {...registerAdd("remarks")} placeholder="Enter remarks" className="w-full" />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                {isEditing && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditDebitId(null);
                      resetAdd({
                        person_name: "",
                        debit_date: new Date().toISOString().slice(0, 10),
                        amount: "",
                        expected_return_date: "",
                        payment_method: "CASH",
                        receipt_no: "",
                        remarks: "",
                      });
                    }}
                    className="px-6"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" disabled={isSubmittingAdd || (isEditing && !canEdit)} className="px-6">
                  {isSubmittingAdd ? "Saving..." : isEditing ? "Update Debit" : "Add Debit"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
          <button
            onClick={() => setIsClearExpanded(!isClearExpanded)}
            className="mb-4 flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear Debit</h3>
            {isClearExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </button>

          {isClearExpanded && (
            <form onSubmit={handleClearSubmit(onClearSubmit)} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Select Active Debit</label>
                <select
                  {...registerClear("debit_id", { required: "Please select a debit" })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="">{isLoadingDebits ? "Loading debits..." : "Choose a debit"}</option>
                  {debits.map((debit) => (
                    <option key={debit.id} value={debit.id.toString()}>
                      {debit.person_name} — Remaining Rs {debit.remaining_balance}
                    </option>
                  ))}
                </select>
                {clearErrors.debit_id && <p className="mt-1 text-sm text-red-600">{clearErrors.debit_id.message}</p>}
              </div>

              {selectedDebit && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-neutral-900 dark:text-slate-300">
                  <p><span className="font-medium">Selected debit:</span> {selectedDebit.person_name}</p>
                  <p><span className="font-medium">Remaining balance:</span> Rs {selectedDebit.remaining_balance}</p>
                  <p><span className="font-medium">Status:</span> {selectedDebit.status}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Cleared Amount</label>
                  <Input type="number" step="0.01" {...registerClear("cleared_amount", { required: "Cleared amount is required" })} placeholder="Enter amount" className="w-full" />
                  {clearErrors.cleared_amount && <p className="mt-1 text-sm text-red-600">{clearErrors.cleared_amount.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Date</label>
                  <Input type="date" {...registerClear("payment_date", { required: "Payment date is required" })} className="w-full" />
                  {clearErrors.payment_date && <p className="mt-1 text-sm text-red-600">{clearErrors.payment_date.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Method</label>
                  <select
                    {...registerClear("payment_method", { required: "Payment method is required" })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Receipt No (Optional)</label>
                  <Input {...registerClear("receipt_no")} placeholder="Enter receipt number" className="w-full" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Remarks (Optional)</label>
                <Input {...registerClear("remarks")} placeholder="Enter remarks" className="w-full" />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingClear || !canEdit} className="px-6">
                  {isSubmittingClear ? "Saving..." : "Clear Debit"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageDebit;
