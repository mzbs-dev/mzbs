import { Header } from "@/components/dashboard/Header";
import ModernStudentTable from "@/components/Students/StudentTable";
import React from "react";

const page = () => {
  return (
    <div className="w-full min-h-0 overflow-y-auto overflow-x-hidden bg-bg-light-secondary/60 dark:bg-bg-dark-primary">
      <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-4">
        <Header value="Students List" />
        <div className="mt-4">
          <ModernStudentTable />
        </div>
      </div>
    </div>
  );
};

export default page;