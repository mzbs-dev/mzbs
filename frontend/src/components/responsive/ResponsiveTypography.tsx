"use client";

import React from "react";
import { cn } from "@/libs/utils";

/**
 * Responsive Typography Utilities
 * All text sizes scale appropriately for mobile-first design
 */

interface ResponsiveHeadingProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveH1 - Page title
 * Mobile: text-2xl | Tablet: text-3xl | Desktop: text-4xl
 */
export const ResponsiveH1: React.FC<ResponsiveHeadingProps> = ({
  children,
  className,
}) => (
  <h1
    className={cn(
      "text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight",
      className
    )}
  >
    {children}
  </h1>
);

/**
 * ResponsiveH2 - Section heading
 * Mobile: text-xl | Tablet: text-2xl | Desktop: text-3xl
 */
export const ResponsiveH2: React.FC<ResponsiveHeadingProps> = ({
  children,
  className,
}) => (
  <h2
    className={cn(
      "text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-snug",
      className
    )}
  >
    {children}
  </h2>
);

/**
 * ResponsiveH3 - Card/subsection heading
 * Mobile: text-lg | Tablet: text-xl | Desktop: text-2xl
 */
export const ResponsiveH3: React.FC<ResponsiveHeadingProps> = ({
  children,
  className,
}) => (
  <h3
    className={cn(
      "text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-white leading-snug",
      className
    )}
  >
    {children}
  </h3>
);

/**
 * ResponsiveH4 - Small heading
 * Mobile: text-base | Tablet: text-lg | Desktop: text-xl
 */
export const ResponsiveH4: React.FC<ResponsiveHeadingProps> = ({
  children,
  className,
}) => (
  <h4
    className={cn(
      "text-base sm:text-lg md:text-xl font-semibold text-slate-900 dark:text-white",
      className
    )}
  >
    {children}
  </h4>
);

interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveBody - Body text
 * Mobile: text-sm | Tablet: text-base
 */
export const ResponsiveBody: React.FC<ResponsiveTextProps> = ({
  children,
  className,
}) => (
  <p
    className={cn(
      "text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed",
      className
    )}
  >
    {children}
  </p>
);

/**
 * ResponsiveSmall - Small text/metadata
 * Mobile: text-xs | Tablet: text-sm
 */
export const ResponsiveSmall: React.FC<ResponsiveTextProps> = ({
  children,
  className,
}) => (
  <p
    className={cn(
      "text-xs sm:text-sm text-slate-600 dark:text-slate-400",
      className
    )}
  >
    {children}
  </p>
);

/**
 * ResponsiveLarge - Large text/emphasis
 * Mobile: text-lg | Tablet: text-xl
 */
export const ResponsiveLarge: React.FC<ResponsiveTextProps> = ({
  children,
  className,
}) => (
  <p
    className={cn(
      "text-lg sm:text-xl text-slate-800 dark:text-slate-200 font-medium",
      className
    )}
  >
    {children}
  </p>
);

/**
 * ResponsiveLabel - Form label text
 * Mobile: text-xs | Tablet: text-sm
 */
export const ResponsiveLabel: React.FC<ResponsiveTextProps> = ({
  children,
  className,
}) => (
  <label
    className={cn(
      "text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide",
      className
    )}
  >
    {children}
  </label>
);
