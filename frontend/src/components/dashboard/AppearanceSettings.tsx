"use client";

import React, { useEffect, useState } from "react";
import { PalettePicker } from "./PalettePicker";
import { useThemePalette } from "@/hooks/useThemePalette";
import { colorPalettes } from "@/config/colorPalettes";

/**
 * Client component for appearance settings
 * Manages palette selection and preview
 */
export const AppearanceSettings: React.FC = () => {
  const { currentPalette, isLoaded, changePalette } = useThemePalette();
  const [selectedPalette, setSelectedPalette] = useState(currentPalette);

  useEffect(() => {
    setSelectedPalette(currentPalette);
  }, [currentPalette]);

  const handlePaletteChange = (paletteId: string) => {
    setSelectedPalette(paletteId);
    changePalette(paletteId);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-sm text-muted-foreground">
            Loading appearance settings...
          </p>
        </div>
      </div>
    );
  }

  const currentPaletteData = colorPalettes.find((p) => p.id === selectedPalette);

  return (
    <div className="space-y-8">
      {/* Palette Picker */}
      <PalettePicker
        selectedPaletteId={selectedPalette}
        onPaletteChange={handlePaletteChange}
      />

      {/* Preview Section */}
      {currentPaletteData && (
        <div className="border-t border-border pt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Theme Preview
          </h3>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Card */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Primary Actions
              </h4>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  Primary Button
                </button>
                <button className="px-4 py-2 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
                  Secondary
                </button>
              </div>
            </div>

            {/* Accent Card */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Highlights
              </h4>
              <div className="h-12 rounded-md bg-accent/20 border border-accent flex items-center justify-center">
                <span className="text-sm font-medium text-accent-foreground">
                  Accent Color
                </span>
              </div>
            </div>
          </div>

          {/* Data Display Preview */}
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Data Table Preview
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold text-foreground">
                    Column 1
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">
                    Column 2
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-2 px-3 text-foreground">Sample Data</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    Secondary Text
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-accent/20 text-accent-foreground">
                      Active
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-2 px-3 text-foreground">Another Row</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    Muted Text
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Palette Details */}
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Palette Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">
                  {currentPaletteData.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Mood</p>
                <p className="font-medium text-foreground">
                  {currentPaletteData.mood}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="font-medium text-foreground">
                  {currentPaletteData.description}
                </p>
              </div>
            </div>
          </div>

          {/* Accessibility Info */}
          <div className="mt-4 rounded-lg border border-border/50 bg-accent/5 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              ✓ Accessibility
            </h4>
            <p className="text-sm text-muted-foreground">
              This palette meets WCAG AA contrast standards for body text (4.5:1)
              and UI elements (3:1), ensuring readability for all users.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
