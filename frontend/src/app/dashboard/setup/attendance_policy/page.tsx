import AttendancePolicySettings from "@/components/Setup/AttendancePolicySettings";
import { Header } from "@/components/dashboard/Header";

export default function AttendancePolicyPage() {
  return (
    <div className="space-y-4">
      <Header value="Attendance Calendar" />
      <AttendancePolicySettings />
    </div>
  );
}
