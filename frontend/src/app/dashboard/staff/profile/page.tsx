"use client";

import StaffProfile from "@/components/Staff/StaffProfile";
import { Header } from "@/components/dashboard/Header";

export default function StaffProfilePreviewPage() {
  return (
    <div className="space-y-4">
      <Header value="Staff Profile" />
      <StaffProfile />
    </div>
  );
}
