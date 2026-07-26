import React from "react";

interface HeaderProps {
  value: string;
}

export const Header = ({ value }: HeaderProps) => {
  return (
    <div 
      className="flex items-center justify-center rounded-2xl border px-5 py-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.45)]"
      style={{
        borderColor: `hsl(var(--border))`,
        backgroundImage: `linear-gradient(to right, hsl(var(--primary) / 0.85), hsl(var(--accent) / 0.75), hsl(var(--primary) / 0.85))`,
      }}
    >
      <div 
        className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px]"
        style={{
          backgroundColor: `hsl(var(--accent))`,
          boxShadow: `0 0 12px hsl(var(--accent) / 0.6)`,
        }}
      />
      <h2 
        className="mx-3 text-xl font-semibold tracking-wide sm:text-2xl"
        style={{ color: `hsl(var(--foreground))` }}
      >
        {value}
      </h2>
      <div 
        className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px]"
        style={{
          backgroundColor: `hsl(var(--accent))`,
          boxShadow: `0 0 12px hsl(var(--accent) / 0.6)`,
        }}
      />
    </div>
  );
};