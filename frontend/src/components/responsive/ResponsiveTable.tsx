"use client";

import React from "react";
import { cn } from "@/libs/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveTable - Mobile-first responsive table wrapper
 * Features:
 * - Horizontal scroll on mobile with sticky header
 * - Full width on tablets and up
 * - Maintains readability on all screen sizes
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("w-full overflow-x-auto -mx-2 sm:mx-0", className)}>
      <div className="inline-block min-w-full px-2 sm:px-0">
        {children}
      </div>
    </div>
  );
};

/**
 * ResponsiveTableHeader - Sticky header for responsive tables
 */
export const ResponsiveTableHeader: React.FC<ResponsiveTableProps> = ({
  children,
  className,
}) => {
  return (
    <thead
      className={cn(
        "sticky top-0 bg-slate-100 dark:bg-slate-800 z-10",
        className
      )}
    >
      {children}
    </thead>
  );
};

/**
 * ResponsiveTableRow - Row with responsive padding
 */
export const ResponsiveTableRow: React.FC<ResponsiveTableProps> = ({
  children,
  className,
}) => {
  return (
    <tr
      className={cn(
        "border-b hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors",
        className
      )}
    >
      {children}
    </tr>
  );
};

/**
 * ResponsiveTableCell - Cell with responsive text sizing
 */
interface ResponsiveTableCellProps extends ResponsiveTableProps {
  isHeader?: boolean;
  className?: string;
}

export const ResponsiveTableCell: React.FC<ResponsiveTableCellProps> = ({
  children,
  isHeader = false,
  className,
}) => {
  const Element = isHeader ? "th" : "td";

  return (
    <Element
      className={cn(
        "px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm",
        isHeader
          ? "font-semibold text-left align-middle"
          : "align-middle whitespace-nowrap",
        className
      )}
    >
      {children}
    </Element>
  );
};

/**
 * TableMobileCard - Alternative mobile-first card view for tables on small screens
 * Use alongside ResponsiveTable and hide with sm:hidden
 */
interface MobileCardProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const MobileTableCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 mb-3",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileCardField: React.FC<MobileCardProps> = ({
  label,
  value,
  className,
}) => {
  return (
    <div className={cn("mb-2 last:mb-0", className)}>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-1">
        {value}
      </p>
    </div>
  );
};
