import AttendanceTable from "@/components/Attendance/ViewAttendance";
import React from "react";
import { Header } from "@/components/dashboard/Header";

const page = () => {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="px-1 pt-1 sm:px-0">
        <Header value="View Attendance" />
      </div>
      <div className="px-1 py-3 sm:px-0 sm:py-4">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-4">
          <AttendanceTable />
        </div>
      </div>
    </div>
  );
};

export default page;
