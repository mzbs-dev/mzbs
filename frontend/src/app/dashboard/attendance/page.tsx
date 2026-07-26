import { Header } from "@/components/dashboard/Header";
import React from "react";

const page = () => {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="px-1 pt-1 sm:px-0">
        <Header value="Attendance" />
      </div>
      <div className="px-1 py-3 sm:px-0 sm:py-4">
        <div className="rounded-[24px] border border-border/80 bg-card/80 p-6 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Attendance tools are available from the sidebar navigation.</p>
        </div>
      </div>
    </div>
  );
};

export default page;
