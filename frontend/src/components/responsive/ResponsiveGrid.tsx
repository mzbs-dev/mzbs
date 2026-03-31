"use client";

import React from "react";
import { cn } from "@/libs/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: "1" | "2" | "3" | "4" | "auto";
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colsMap = {
  "1": "grid-cols-1",
  "2": "sm:grid-cols-2 md:grid-cols-2 grid-cols-1",
  "3": "sm:grid-cols-2 md:grid-cols-3 grid-cols-1",
  "4": "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-cols-1",
  auto: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-cols-fr",
};

const gapMap = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
};

/**
 * ResponsiveGrid - Mobile-first grid layout
 * Default: 1 column on mobile, responsive on larger screens
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = "2",
  gap = "md",
  className,
}) => {
  return (
    <div
      className={cn(
        "grid",
        colsMap[cols],
        gapMap[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * ResponsiveBox - Flexible box with responsive padding
 */
interface ResponsiveBoxProps {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg";
  className?: string;
}

const paddingMap = {
  sm: "p-2 sm:p-3 md:p-4",
  md: "p-3 sm:p-4 md:p-6",
  lg: "p-4 sm:p-6 md:p-8",
};

export const ResponsiveBox: React.FC<ResponsiveBoxProps> = ({
  children,
  padding = "md",
  className,
}) => {
  return (
    <div className={cn(paddingMap[padding], className)}>
      {children}
    </div>
  );
};

/**
 * ResponsiveCard - Card with responsive sizing and padding
 */
interface ResponsiveCardProps extends ResponsiveBoxProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  title,
  subtitle,
  footer,
  padding = "md",
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-950 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow hover:shadow-lg",
        className
      )}
    >
      {(title || subtitle) && (
        <div className={cn("border-b border-slate-200 dark:border-slate-800", paddingMap[padding])}>
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={paddingMap[padding]}>
        {children}
      </div>
      {footer && (
        <div className={cn("border-t border-slate-200 dark:border-slate-800", paddingMap[padding])}>
          {footer}
        </div>
      )}
    </div>
  );
};
