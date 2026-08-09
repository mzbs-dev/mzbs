"use client";

import { Header } from "@/components/dashboard/Header";
import SelfAttendance from "@/components/Profile/SelfAttendance";

export default function SelfAttendancePage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="px-1 pt-1 sm:px-0">
        <Header value="Self Attendance" />
      </div>
      <div className="px-1 py-3 sm:px-0">
        <SelfAttendance />
      </div>
    </div>
  );
}
