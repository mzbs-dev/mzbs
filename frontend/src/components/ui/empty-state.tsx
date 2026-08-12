"use client";

import { CalendarDays } from "lucide-react";
import React from "react";

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
      <CalendarDays className="w-10 h-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
