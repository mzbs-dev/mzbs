import { useEffect, useState } from "react";
import { defaultPaletteId, getPaletteById } from "@/config/colorPalettes";

const PALETTE_STORAGE_KEY = "theme-palette";

/**
 * Hook to manage color palette selection and persistence
 * Applies the palette via data-palette attribute on html element
 */
export const useThemePalette = () => {
  const [currentPalette, setCurrentPalette] = useState<string>(defaultPaletteId);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load palette from localStorage on mount
  useEffect(() => {
    const storedPalette = localStorage.getItem(PALETTE_STORAGE_KEY);
    const paletteToUse = storedPalette || defaultPaletteId;

    // Verify the palette exists
    if (getPaletteById(paletteToUse)) {
      setCurrentPalette(paletteToUse);
      applyPalette(paletteToUse);
    } else {
      // Fallback to default if stored palette is invalid
      setCurrentPalette(defaultPaletteId);
      applyPalette(defaultPaletteId);
    }

    setIsLoaded(true);
  }, []);

  /**
   * Apply palette by setting data-palette attribute on html element
   */
  const applyPalette = (paletteId: string) => {
    if (typeof window !== "undefined") {
      const htmlElement = document.documentElement;
      htmlElement.setAttribute("data-palette", paletteId);
    }
  };

  /**
   * Change the current palette and persist to localStorage
   */
  const changePalette = (paletteId: string) => {
    const palette = getPaletteById(paletteId);
    if (palette) {
      setCurrentPalette(paletteId);
      applyPalette(paletteId);
      localStorage.setItem(PALETTE_STORAGE_KEY, paletteId);
    }
  };

  /**
   * Reset to default palette
   */
  const resetPalette = () => {
    changePalette(defaultPaletteId);
  };

  return {
    currentPalette,
    isLoaded,
    changePalette,
    resetPalette,
  };
};
