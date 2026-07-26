"use client";

import React from "react";
import { colorPalettes, type Palette } from "@/config/colorPalettes";
import { cn } from "@/libs/utils";

interface PalettePickerProps {
  selectedPaletteId: string;
  onPaletteChange: (paletteId: string) => void;
}

/**
 * Component to display and select color palettes
 * Shows a visual preview of each palette with swatches
 */
export const PalettePicker: React.FC<PalettePickerProps> = ({
  selectedPaletteId,
  onPaletteChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Color Palette
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a color palette that matches your institution's brand and
          aesthetic. All palettes are WCAG AA compliant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {colorPalettes.map((palette) => (
          <PaletteCard
            key={palette.id}
            palette={palette}
            isSelected={selectedPaletteId === palette.id}
            onSelect={onPaletteChange}
          />
        ))}
      </div>
    </div>
  );
};

interface PaletteCardProps {
  palette: Palette;
  isSelected: boolean;
  onSelect: (paletteId: string) => void;
}

/**
 * Individual palette card with color swatches and selection indicator
 */
const PaletteCard: React.FC<PaletteCardProps> = ({
  palette,
  isSelected,
  onSelect,
}) => {
  // Parse HSL values for preview
  const parseHsl = (hslString: string): { h: number; s: number; l: number } => {
    const [h, s, l] = hslString.split(" ").map((v) => parseFloat(v));
    return { h, s, l: l / 100 }; // Convert lightness from percentage
  };

  const lightTokens = palette.light;
  const primaryHsl = parseHsl(lightTokens.primary);
  const secondaryHsl = parseHsl(lightTokens.secondary);
  const accentHsl = parseHsl(lightTokens.accent);
  const destructiveHsl = parseHsl(lightTokens.destructive);

  return (
    <button
      onClick={() => onSelect(palette.id)}
      className={cn(
        "relative rounded-lg border-2 p-4 text-left transition-all duration-200 hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <svg
            className="h-4 w-4 text-primary-foreground"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">
          {palette.name}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {palette.mood}
        </p>
      </div>

      {/* Color Swatches Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* Primary */}
        <div className="group relative">
          <div
            className="h-10 rounded-md border border-border/50 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `hsl(${primaryHsl.h}, ${primaryHsl.s}%, ${primaryHsl.l * 100}%)`,
            }}
          />
          <div className="text-xs text-center text-muted-foreground mt-1 truncate">
            Primary
          </div>
        </div>

        {/* Secondary */}
        <div className="group relative">
          <div
            className="h-10 rounded-md border border-border/50 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `hsl(${secondaryHsl.h}, ${secondaryHsl.s}%, ${secondaryHsl.l * 100}%)`,
            }}
          />
          <div className="text-xs text-center text-muted-foreground mt-1 truncate">
            Secondary
          </div>
        </div>

        {/* Accent */}
        <div className="group relative">
          <div
            className="h-10 rounded-md border border-border/50 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `hsl(${accentHsl.h}, ${accentHsl.s}%, ${accentHsl.l * 100}%)`,
            }}
          />
          <div className="text-xs text-center text-muted-foreground mt-1 truncate">
            Accent
          </div>
        </div>

        {/* Destructive */}
        <div className="group relative">
          <div
            className="h-10 rounded-md border border-border/50 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `hsl(${destructiveHsl.h}, ${destructiveHsl.s}%, ${destructiveHsl.l * 100}%)`,
            }}
          />
          <div className="text-xs text-center text-muted-foreground mt-1 truncate">
            Error
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {palette.description}
      </p>
    </button>
  );
};
