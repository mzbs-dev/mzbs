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
    <div className={cn('overflow-hidden rounded-[24px] border border-border/80 bg-card/80 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl', className)}>
      {(title || subtitle) && (
        <div className="border-b border-border/80 px-4 py-4 sm:px-5 sm:py-4">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
        {children}
      </div>
      {footer && (
        <div className="border-t border-border/80 px-4 py-4 sm:px-5">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 