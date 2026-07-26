import { Metadata } from "next";
import { Header } from "@/components/dashboard/Header";
import { AppearanceSettings } from "@/components/dashboard/AppearanceSettings";

export const metadata: Metadata = {
  title: "Appearance | Setup",
  description: "Customize the appearance and theme of your dashboard",
};

export default function AppearancePage() {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="px-1 pt-1 sm:px-0">
        <Header value="Appearance" />
      </div>
      <div className="px-1 py-3 sm:px-0 sm:py-4">
        <div className="rounded-[24px] border border-border/80 bg-card/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4">
          <AppearanceSettings />
        </div>
      </div>
    </div>
  );
}
