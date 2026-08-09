"use client";

import AttendanceReview from "@/components/Staff/AttendanceReview";
import { Header } from "@/components/dashboard/Header";

export default function AttendanceReviewPage() {
  return (
    <div className="space-y-4">
      <Header value="Attendance Review" />
      <AttendanceReview />
    </div>
  );
}
