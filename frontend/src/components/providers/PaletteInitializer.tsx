"use client";

import { useEffect } from "react";
import { useThemePalette } from "@/hooks/useThemePalette";

/**
 * Component that initializes the color palette on app load
 * Must be placed in a client component
 */
export function PaletteInitializer() {
  const { isLoaded } = useThemePalette();

  // Just using the hook to initialize the palette
  // The actual palette application happens in the hook
  useEffect(() => {
    // Palette is already applied in the hook's useEffect
  }, [isLoaded]);

  return null;
}
