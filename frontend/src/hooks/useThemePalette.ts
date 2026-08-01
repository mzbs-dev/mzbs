import { useCallback, useEffect, useState } from "react";
import { defaultPaletteId, getPaletteById } from "@/config/colorPalettes";
import { getAppearance, updateAppearance } from "@/api/Appearance/AppearanceAPI";

/**
 * Hook to manage color palette selection and persistence.
 *
 * Persistence moved from localStorage to the tenant's own database
 * (GET/PATCH /appearance) so that:
 *  - the theme is shared by every role at a school (single row per tenant)
 *  - it survives logout (it was never tied to the browser session)
 *  - it's consistent across devices/browsers for that school
 *
 * Pre-login pages (e.g. /login) have no valid session, so GET /appearance
 * will fail there -- that's expected and handled by falling back to
 * defaultPaletteId, same "fail quiet" pattern as BrandingContext.
 */
export const useThemePalette = () => {
  const [currentPalette, setCurrentPalette] = useState<string>(defaultPaletteId);
  const [isLoaded, setIsLoaded] = useState(false);

  const applyPalette = (paletteId: string) => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-palette", paletteId);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Apply the neutral default immediately to avoid a flash of unstyled
    // content while the fetch is in flight.
    applyPalette(defaultPaletteId);

    getAppearance()
      .then((data) => {
        if (cancelled) return;
        const paletteToUse = getPaletteById(data.theme_palette)
          ? data.theme_palette
          : defaultPaletteId;
        setCurrentPalette(paletteToUse);
        applyPalette(paletteToUse);
      })
      .catch(() => {
        // Not logged in yet, or the request failed -- stay on default.
        setCurrentPalette(defaultPaletteId);
        applyPalette(defaultPaletteId);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Change the current palette and persist it via the API.
   * Applies optimistically for a snappy UI; reverts if the save fails
   * (e.g. non-ADMIN somehow reaches this, or a network error).
   */
  const changePalette = useCallback(
    async (paletteId: string) => {
      const palette = getPaletteById(paletteId);
      if (!palette) return;

      const previousPalette = currentPalette;
      setCurrentPalette(paletteId);
      applyPalette(paletteId);

      try {
        await updateAppearance(paletteId);
      } catch (err) {
        setCurrentPalette(previousPalette);
        applyPalette(previousPalette);
        throw err;
      }
    },
    [currentPalette]
  );

  const resetPalette = () => changePalette(defaultPaletteId);

  return {
    currentPalette,
    isLoaded,
    changePalette,
    resetPalette,
  };
};
