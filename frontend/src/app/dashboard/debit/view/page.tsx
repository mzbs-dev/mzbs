"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, Edit3, Trash2, ChevronFirst, ChevronLast } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/dashboard/Skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DebitAPI, DebitDetailResponse, DebitResponse, PaymentMethod } from "@/api/Debit/DebitAPI";
import { formatDateToDDMMYY } from "@/utils/dateFormatter";
import { useRole } from "@/context/RoleContext";

const getStatusRowClasses = (status: DebitResponse["status"]) => {
  switch (status) {
    case "ACTIVE":
      return "bg-red-100/80 dark:bg-red-950/20";
    case "PARTIALLY_CLEARED":
      return "bg-amber-100/90 dark:bg-amber-950/20";
    case "CLEARED":
      return "bg-emerald-100/90 dark:bg-emerald-950/20";
    default:
      return "";
  }
};

const getStatusBadgeClasses = (status: DebitResponse["status"]) => {
  switch (status) {
    case "ACTIVE":
      return "bg-red-200 text-red-900 border border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700";
    case "PARTIALLY_CLEARED":
      return "bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700";
    case "CLEARED":
      return "bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};

export default function DebitViewPage() {
  const router = useRouter();
  const { role, permissions } = useRole();
  const normalizedRole = role?.toUpperCase();
  const canEdit = normalizedRole === "ADMIN" || permissions?.debit?.edit === true;
  const canDelete = normalizedRole === "ADMIN" || permissions?.debit?.delete === true;
  const [debits, setDebits] = useState<DebitResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedDebit, setSelectedDebit] = useState<DebitDetailResponse | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<DebitDetailResponse["payments"][number] | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cleared_amount: "",
    payment_date: "",
    payment_method: "CASH" as PaymentMethod,
    receipt_no: "",
    remarks: "",
  });
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [isPaymentDeleting, setIsPaymentDeleting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatAmount = (value: number) => Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const totalPages = Math.max(1, Math.ceil(debits.length / pageSize));
  const currentPageDebits = debits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCloseDetails = () => {
    setShowDetailsDialog(false);
    setSelectedDebit(null);
  };

  useEffect(() => {
    const fetchDebits = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await DebitAPI.getDebits();
        setDebits(data);
      } catch (error) {
        console.error("Error loading debit records:", error);
        setErrorMessage("Unable to load debit records. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebits();
  }, []);

  const handleViewDebit = async (item: DebitResponse) => {
    setShowDetailsDialog(true);
    setIsDetailLoading(true);
    setSelectedDebit(null);

    try {
      const detail = await DebitAPI.getDebitById(item.id);
      setSelectedDebit(detail);
    } catch (error) {
      console.error("Error loading debit details:", error);
      toast.error("Failed to load debit details. Please try again.");
      setShowDetailsDialog(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const refreshSelectedDebit = async () => {
    if (!selectedDebit) {
      return;
    }
    try {
      const detail = await DebitAPI.getDebitById(selectedDebit.id);
      setSelectedDebit(detail);
    } catch (error) {
      console.error("Error refreshing debit details:", error);
    }
  };

  const handleEditPayment = (payment: DebitDetailResponse["payments"][number]) => {
    setEditingPayment(payment);
    setPaymentError(null);
    setPaymentForm({
      cleared_amount: payment.cleared_amount.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      receipt_no: payment.receipt_no || "",
      remarks: payment.remarks || "",
    });
  };

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null);
    setPaymentError(null);
  };

  const handleSavePayment = async () => {
    if (!editingPayment) {
      return;
    }
    const clearedAmount = Number(paymentForm.cleared_amount);
    if (Number.isNaN(clearedAmount) || clearedAmount <= 0) {
      setPaymentError("Enter a valid clearance amount greater than zero.");
      return;
    }

    setIsPaymentSaving(true);
    setPaymentError(null);
    try {
      await DebitAPI.updateDebitPayment(editingPayment.id, {
        cleared_amount: clearedAmount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        receipt_no: paymentForm.receipt_no || undefined,
        remarks: paymentForm.remarks || undefined,
      });
      toast.success("Payment updated successfully.");
      setEditingPayment(null);
      await refreshSelectedDebit();
      await handleViewDebit(selectedDebit as DebitResponse);
    } catch (error) {
      console.error("Error updating debit payment:", error);
      setPaymentError((error as any)?.response?.data?.detail || (error as any)?.message || "Unable to update payment.");
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete this payment.");
      return;
    }

    const confirmed = window.confirm("Delete this clearance payment? This will adjust the remaining balance.");
    if (!confirmed) {
      return;
    }

    setIsPaymentDeleting(true);
    try {
      await DebitAPI.deleteDebitPayment(paymentId);
      toast.success("Payment deleted successfully.");
      setEditingPayment(null);
      await refreshSelectedDebit();
      if (selectedDebit) {
        await handleViewDebit(selectedDebit);
      }
    } catch (error) {
      console.error("Error deleting debit payment:", error);
      toast.error((error as any)?.response?.data?.detail || (error as any)?.message || "Unable to delete payment.");
    } finally {
      setIsPaymentDeleting(false);
    }
  };

  const handleEditDebit = (item: DebitResponse) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit this debit.");
      return;
    }
    router.push(`/dashboard/debit/manage?edit=${item.id}`);
  };

  const handleDeleteDebit = async (id: number) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete this debit.");
      return;
    }

    const confirmed = window.confirm("Delete this debit record? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await DebitAPI.deleteDebit(id);
      setDebits((current) => current.filter((item) => item.id !== id));
      toast.success("Debit record deleted.");
    } catch (error) {
      console.error("Error deleting debit record:", error);
      const message = (error as any)?.response?.data?.detail || (error as any)?.message || "Unable to delete debit record.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Header value="View Debit" />

      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Debit records</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">View all debit entries along with status and balance details.</p>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {isLoading ? "Loading..." : `${debits.length} record${debits.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Page {currentPage} of {totalPages}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3"
                >
                  Next
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3"
                  aria-label="Last page"
                >
                  <span className="hidden sm:inline mr-1">Last</span>
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-full">
              <TableHeader className="bg-muted/80">
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Debit date</TableHead>
                  <TableHead>Return date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cleared</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8">
                      <TableSkeleton rows={6} />
                    </TableCell>
                  </TableRow>
                ) : currentPageDebits.length > 0 ? (
                  currentPageDebits.map((item) => (
                    <TableRow key={item.id} className={`${getStatusRowClasses(item.status)} hover:bg-slate-100 dark:hover:bg-slate-900`}>
                      <TableCell>{item.person_name}</TableCell>
                      <TableCell>{item.debit_date ? formatDateToDDMMYY(item.debit_date) : "-"}</TableCell>
                      <TableCell>{item.expected_return_date ? formatDateToDDMMYY(item.expected_return_date) : "-"}</TableCell>
                      <TableCell>Rs.{formatAmount(item.amount)}</TableCell>
                      <TableCell>Rs.{formatAmount(item.cleared_amount)}</TableCell>
                      <TableCell>Rs.{formatAmount(item.remaining_balance)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(item.status)}`}>
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>{item.payment_method}</TableCell>
                      <TableCell>{item.receipt_no ?? "-"}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDebit(item)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditDebit(item)}
                          className={`p-1 rounded transition ${canEdit ? "text-blue-600 hover:bg-blue-100" : "text-slate-300 cursor-not-allowed"}`}
                          title="Edit"
                          disabled={!canEdit}
                        >
                          <Edit2 size={16} />
                        </button>
                        {canDelete && item.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDebit(item.id)}
                            className="p-1 rounded transition text-red-600 hover:bg-red-100"
                            title="Delete"
                            disabled={isDeleting}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500 dark:text-slate-400">
                      No debit records available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={(open) => { if (!open) handleCloseDetails(); }}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-x-auto overflow-y-hidden">
          <DialogHeader>
            <DialogTitle>Debit Details</DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading debit details…</div>
          ) : selectedDebit ? (
            <div className="space-y-4 pt-2 text-sm text-slate-700 dark:text-slate-200 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-semibold">Person</p>
                  <p>{selectedDebit.person_name}</p>
                </div>
                <div>
                  <p className="font-semibold">Status</p>
                  <p>{selectedDebit.status.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="font-semibold">Debit Date</p>
                  <p>{selectedDebit.debit_date ? formatDateToDDMMYY(selectedDebit.debit_date) : "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">Return Date</p>
                  <p>{selectedDebit.expected_return_date ? formatDateToDDMMYY(selectedDebit.expected_return_date) : "-"}</p>
                </div>
                <div>
                  <p className="font-semibold">Amount</p>
                  <p>Rs.{formatAmount(selectedDebit.amount)}</p>
                </div>
                <div>
                  <p className="font-semibold">Cleared</p>
                  <p>Rs.{formatAmount(selectedDebit.cleared_amount)}</p>
                </div>
                <div>
                  <p className="font-semibold">Remaining</p>
                  <p>Rs.{formatAmount(selectedDebit.remaining_balance)}</p>
                </div>
                <div>
                  <p className="font-semibold">Payment Method</p>
                  <p>{selectedDebit.payment_method}</p>
                </div>
                <div>
                  <p className="font-semibold">Receipt</p>
                  <p>{selectedDebit.receipt_no ?? "-"}</p>
                </div>
                {selectedDebit.remarks && (
                  <div>
                    <p className="font-semibold">Remarks</p>
                    <p>{selectedDebit.remarks}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clearance payment history</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{selectedDebit.payments.length} record{selectedDebit.payments.length === 1 ? "" : "s"}</span>
                </div>
                {selectedDebit.payments.length > 0 ? (
                  <div className="overflow-x-auto max-h-[44vh] sm:max-h-[38vh]">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Method</th>
                              <th className="px-3 py-2">Receipt</th>
                          <th className="px-3 py-2">Remarks</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDebit.payments.map((payment) => (
                          <tr key={payment.id} className="border-t border-slate-200/80 dark:border-slate-800">
                            <td className="px-3 py-2">{payment.payment_date ? formatDateToDDMMYY(payment.payment_date) : "-"}</td>
                            <td className="px-3 py-2">Rs.{formatAmount(payment.cleared_amount)}</td>
                            <td className="px-3 py-2">{payment.payment_method}</td>
                            <td className="px-3 py-2">{payment.receipt_no ?? "-"}</td>
                            <td className="px-3 py-2">{payment.remarks ?? "-"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex items-center gap-2">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditPayment(payment)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Edit payment"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    title="Delete payment"
                                    disabled={isPaymentDeleting}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No clearance payments recorded for this debit.</p>
                )}
              </div>

              {editingPayment && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Edit Clearance Payment</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Update the cleared amount or payment details for this entry.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelPaymentEdit}
                      className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Cleared Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.cleared_amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, cleared_amount: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Date</label>
                      <input
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Method</label>
                      <select
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-900 dark:text-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Receipt No</label>
                      <input
                        type="text"
                        value={paymentForm.receipt_no}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, receipt_no: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Remarks</label>
                      <input
                        type="text"
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, remarks: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {paymentError && <p className="mt-3 text-sm text-red-600">{paymentError}</p>}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={handleCancelPaymentEdit} className="px-4">
                      Cancel
                    </Button>
                    <Button onClick={handleSavePayment} disabled={isPaymentSaving} className="px-4">
                      {isPaymentSaving ? "Saving..." : "Save Payment"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No details available.</div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDetails} className="px-4">
              Close
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="px-4">
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
