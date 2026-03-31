"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
import { CreateIncomeCat } from "@/models/income/income";

const AddIncomeCategory = ({
  onIncomeCatAdd,
}: {
  onIncomeCatAdd: () => void;
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateIncomeCat>();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (data: CreateIncomeCat) => {
    setLoading(true);
    try {
      const response = await CreateIncomeCatAPI(data);
      if (response) {
        setOpen(false);
        reset();
        toast("Income Category Added Successfully!");
        onIncomeCatAdd(); // Call the function to refresh the table
      }
    } catch (error) {
      console.error("Error creating income category:", error);
      toast("Failed to add income category");
    } finally {
      setLoading(false);
    }
  };

  const CreateIncomeCatAPI = async (data: CreateIncomeCat) => {
    try {
      const response = await API.AddIncomeCategory(data);
      console.log("API Response:", response.data);
      return response.data;
    } catch (error: unknown) {
      console.error("API Error:", error);
      throw error;
    }
  };

  return (
    <div>
      <div className="flex justify-end my-4  mr-2">
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900"
        >
          + Create
        </Button>
      </div>
      {/* Dialog for the form */}
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            {/* Dialog Title */}
            <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Add Income Category
            </DialogTitle>
            <hr className="bg-gray-400 dark:bg-gray-200" />

            <DialogDescription>
              {/* Form starts here */}
              <form
                onSubmit={handleSubmit(handleFormSubmit)}
                className="dark:bg-card dark:text-card-foreground max-w-3xl mx-auto"
              >
                {/* Category Name Field */}
                <div className="py-2 space-y-1">
                  <label className="text-gray-700 dark:text-gray-400">
                    Category Name
                  </label>
                  <Input
                    placeholder="Enter Category Name"
                    {...register("income_cat_name", {
                      required: "Field is required",
                    })}
                  />
                  <p className="text-red-500">
                    {errors.income_cat_name?.message}
                  </p>
                </div>

                {/* Form Buttons: Cancel and Save */}
                <div className="flex justify-end gap-4 mt-5">
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    variant="ghost"
                    className="bg-gray-200 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:bg-secondary dark:hover:bg-gray-800"
                  >
                    Cancel {/* Cancel button */}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900"
                  >
                    {loading ? <LoaderIcon className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddIncomeCategory;
