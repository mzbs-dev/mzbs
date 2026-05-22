"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { AttendanceAPI as API } from "@/api/Attendance/AttendanceAPI";
import { FaRegEdit } from "react-icons/fa";
import { MarkAttUpdate } from "@/models/markattendace/markattendance";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditAttendanceProps {
  attendanceId: number;
  onUpdate: () => void;
}

interface APIResponse {
  status: number;
  data: { message?: string };
}

// FIX 6: form shape now includes the radio field so RHF owns its value
interface EditForm {
  attendanceStatus: "present" | "absent" | "late" | "leave";
}

const ATTENDANCE_VALUE_MAP: Record<EditForm["attendanceStatus"], number> = {
  present: 1,
  absent:  2,
  late:    3,
  leave:   4,
};

const RADIO_OPTIONS: {
  value: EditForm["attendanceStatus"];
  label: string;
  color: string;
}[] = [
  { value: "present", label: "Present", color: "text-emerald-600" },
  { value: "absent",  label: "Absent",  color: "text-red-600"     },
  { value: "late",    label: "Late",    color: "text-amber-500"   },
  { value: "leave",   label: "Leave",   color: "text-orange-500"  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const EditAttendance = ({ attendanceId, onUpdate }: EditAttendanceProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    reset(); // clear previous selection each time dialog opens
    setOpen(true);
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  // FIX 6: data.attendanceStatus comes directly from RHF — no DOM query needed
  const onSubmit = async (data: EditForm) => {
    setLoading(true);
    try {
      const updateData: MarkAttUpdate = {
        attendance_id: attendanceId,
        attendance_value_id: ATTENDANCE_VALUE_MAP[data.attendanceStatus],
        updated_at: new Date(),
      };

      const response = (await API.Update(
        updateData.attendance_id,
        updateData
      )) as APIResponse;

      if (response.status === 200) {
        handleClose();
        toast.success("Attendance Updated Successfully!", {
          position: "bottom-center",
          duration: 3000,
        });
        onUpdate();
      } else {
        throw new Error(response.data.message || "Failed to update attendance");
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to update attendance", {
        position: "bottom-center",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FaRegEdit
        onClick={handleOpen}
        className="w-4 h-4 cursor-pointer hover:text-blue-500 transition-colors"
      />

      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-center font-semibold">
              Edit Attendance
            </DialogTitle>
            <hr className="border-t border-gray-300" />
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* FIX 6: radio inputs registered with RHF — required validation included */}
            <div className="flex justify-center items-center flex-wrap gap-4 mt-2">
              {RADIO_OPTIONS.map(({ value, label, color }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={value}
                    className={`form-radio h-4 w-4 ${color}`}
                    {...register("attendanceStatus", {
                      required: "Please select an attendance status",
                    })}
                  />
                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                </label>
              ))}
            </div>

            {/* Validation error shown below the radio group */}
            {errors.attendanceStatus && (
              <p className="text-red-500 text-xs text-center">
                {errors.attendanceStatus.message}
              </p>
            )}

            <div className="flex justify-end gap-4 mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoaderIcon className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditAttendance;
