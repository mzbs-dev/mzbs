"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
import { IncomeCategory, AddIncomeModel } from "@/models/income/income";
import { extractArrayData } from "@/utils/apiResponse";

const AddIncome = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddIncomeModel>();

  const [isLoading, setIsLoading] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);

  useEffect(() => {
    getCategories();
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
      setIncomeCategory(data); // Ensure this is an array
    } catch (error) {
      console.error("Error fetching income categories:", error);
      setIncomeCategory([]); // Fallback to an empty array
    } finally {
      setIsLoading(false);
    }
  };

  const AddIncomeFunction = async (data: AddIncomeModel) => {
    setIsLoading(true);
    try {
      const response = await API.AddIncome(data);
      if (response.status === 201) {
        toast.success("Income record added successfully");
        reset();
      } else {
        toast.error("Failed to add income record");
      }
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income record");
    } finally {
      setIsLoading(false);
    }
  }
  const onSubmit = async (data: AddIncomeModel) => {
    console.log("Form Data:", data);
    try {
      AddIncomeFunction(data);
      setIsLoading(true);
      // toast.success("Income record added successfully");
      reset();
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full px-1 sm:px-2">
      <Header value="Add Income Record" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-3 rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Receipt Number
              </label>
              <Input
                type="text"
                {...register("recipt_number", {
                  required: "Required",
                })}
                placeholder="Enter receipt number"
                className="h-11 text-sm"
              />
              {errors.recipt_number && (
                <span className="inline-block text-xs text-red-500">
                  {errors.recipt_number.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Date
              </label>
              <Input
                type="date"
                {...register("date", { required: "Required" })}
                className="h-11 text-sm"
              />
              {errors.date && (
                <span className="inline-block text-xs text-red-500">
                  {errors.date.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Category
              </label>
              <select
                {...register("category_id", {
                  valueAsNumber: true,
                  required: "Required",
                })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950/40"
              >
                <option disabled value="">Select Category</option>
                {incomeCategory.map((category) => (
                  <option key={category.income_cat_name_id} value={category.income_cat_name_id}>
                    {category.income_cat_name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <span className="inline-block text-xs text-red-500">
                  {errors.category_id.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Source
              </label>
              <Input
                {...register("source", { required: "Required" })}
                placeholder="e.g. Donation, Sponsorship"
                className="h-11 text-sm"
              />
              {errors.source && (
                <span className="inline-block text-xs text-red-500">
                  {errors.source.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Description
              </label>
              <Input
                {...register("description")}
                placeholder="Enter description"
                className="h-11 text-sm"
              />
              {errors.description && (
                <span className="inline-block text-xs text-red-500">
                  {errors.description.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Contact
              </label>
              <Input
                {...register("contact")}
                placeholder="Enter contact"
                className="h-11 text-sm"
              />
              {errors.contact && (
                <span className="inline-block text-xs text-red-500">
                  {errors.contact.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Amount
              </label>
              <Input
                type="number"
                {...register("amount", {
                  valueAsNumber: true,
                  required: "Required",
                  min: { value: 1, message: "Min: 1" },
                })}
                placeholder="Enter amount"
                className="h-11 text-sm"
              />
              {errors.amount && (
                <span className="inline-block text-xs text-red-500">
                  {errors.amount.message}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end sm:mt-6">
            <Button type="submit" disabled={isLoading} size="default" className="min-w-[140px]">
              {isLoading ? (
                <>
                  <div className="animate-spin h-3 w-3 mr-1 border-2 border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                "Add Income"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddIncome;
