import React from 'react';
import { cn } from '@/libs/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, children, title, subtitle, footer }) => {
  return (
    <div className={cn('border border-slate-200 dark:border-slate-800 rounded-lg shadow-md bg-white dark:bg-slate-950 overflow-hidden', className)}>
      {(title || subtitle) && (
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800">
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
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {children}
      </div>
      {footer && (
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-800">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 