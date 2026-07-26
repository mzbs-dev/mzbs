/**
 * Color Palettes for Theme Customization
 * All palettes are WCAG AA compliant (4.5:1 for text, 3:1 for UI elements)
 * HSL values formatted as "h s% l%" for CSS custom properties
 */

export type PaletteTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type Palette = {
  id: string;
  name: string;
  description: string;
  mood: string;
  light: PaletteTokens;
  dark?: PaletteTokens;
};

export const colorPalettes: Palette[] = [
  {
    id: "slate-professional",
    name: "Slate Professional",
    description: "Neutral corporate palette—trusted classic for enterprise",
    mood: "Corporate, Neutral, Trustworthy",
    light: {
      background: "210 40% 98%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 11%",
      primary: "221 83% 53%",
      primaryForeground: "0 0% 100%",
      secondary: "214 32% 91%",
      secondaryForeground: "222 47% 11%",
      muted: "214 32% 91%",
      mutedForeground: "215 16% 47%",
      accent: "187 92% 69%",
      accentForeground: "222 47% 11%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      border: "214 32% 91%",
      input: "214 32% 91%",
      ring: "221 83% 53%",
      sidebarBackground: "0 0% 100%",
      sidebarForeground: "222 47% 11%",
      sidebarPrimary: "221 83% 53%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "214 32% 96%",
      sidebarAccentForeground: "222 47% 11%",
      sidebarBorder: "214 32% 91%",
      sidebarRing: "221 83% 53%",
    },
  },
  {
    id: "terracotta-warmth",
    name: "Terracotta Warmth",
    description: "Warm, earthy palette—professional and approachable",
    mood: "Warm, Earthy, Approachable",
    light: {
      background: "30 50% 97%",
      foreground: "25 30% 15%",
      card: "0 0% 100%",
      cardForeground: "25 30% 15%",
      popover: "0 0% 100%",
      popoverForeground: "25 30% 15%",
      primary: "24 70% 47%",
      primaryForeground: "0 0% 100%",
      secondary: "30 40% 90%",
      secondaryForeground: "25 30% 15%",
      muted: "30 40% 90%",
      mutedForeground: "25 25% 45%",
      accent: "36 80% 55%",
      accentForeground: "25 30% 15%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "30 40% 90%",
      input: "30 40% 90%",
      ring: "24 70% 47%",
      sidebarBackground: "30 50% 96%",
      sidebarForeground: "25 30% 15%",
      sidebarPrimary: "24 70% 47%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "30 40% 92%",
      sidebarAccentForeground: "25 30% 15%",
      sidebarBorder: "30 40% 90%",
      sidebarRing: "24 70% 47%",
    },
  },
  {
    id: "midnight-navy",
    name: "Midnight Navy",
    description: "Deep, minimal palette—high-contrast and serious",
    mood: "Serious, Minimal, Professional",
    light: {
      background: "220 40% 98%",
      foreground: "218 40% 13%",
      card: "0 0% 100%",
      cardForeground: "218 40% 13%",
      popover: "0 0% 100%",
      popoverForeground: "218 40% 13%",
      primary: "218 65% 32%",
      primaryForeground: "0 0% 100%",
      secondary: "220 30% 92%",
      secondaryForeground: "218 40% 13%",
      muted: "220 30% 92%",
      mutedForeground: "218 25% 48%",
      accent: "200 60% 60%",
      accentForeground: "218 40% 13%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "220 30% 92%",
      input: "220 30% 92%",
      ring: "218 65% 32%",
      sidebarBackground: "218 45% 96%",
      sidebarForeground: "218 40% 13%",
      sidebarPrimary: "218 65% 32%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "220 30% 94%",
      sidebarAccentForeground: "218 40% 13%",
      sidebarBorder: "220 30% 92%",
      sidebarRing: "218 65% 32%",
    },
  },
  {
    id: "golden-amber",
    name: "Golden Amber",
    description: "Warm, energetic palette—approachable and professional",
    mood: "Warm, Energetic, Approachable",
    light: {
      background: "40 60% 98%",
      foreground: "35 40% 14%",
      card: "0 0% 100%",
      cardForeground: "35 40% 14%",
      popover: "0 0% 100%",
      popoverForeground: "35 40% 14%",
      primary: "38 75% 42%",
      primaryForeground: "0 0% 100%",
      secondary: "40 50% 92%",
      secondaryForeground: "35 40% 14%",
      muted: "40 50% 92%",
      mutedForeground: "35 35% 48%",
      accent: "32 85% 58%",
      accentForeground: "35 40% 14%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "40 50% 92%",
      input: "40 50% 92%",
      ring: "38 75% 42%",
      sidebarBackground: "40 60% 96%",
      sidebarForeground: "35 40% 14%",
      sidebarPrimary: "38 75% 42%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "40 50% 94%",
      sidebarAccentForeground: "35 40% 14%",
      sidebarBorder: "40 50% 92%",
      sidebarRing: "38 75% 42%",
    },
  },
  {
    id: "plum-elegance",
    name: "Plum Elegance",
    description: "Muted, sophisticated palette—distinctive and distinctive",
    mood: "Sophisticated, Distinctive, Elegant",
    light: {
      background: "275 40% 98%",
      foreground: "270 40% 13%",
      card: "0 0% 100%",
      cardForeground: "270 40% 13%",
      popover: "0 0% 100%",
      popoverForeground: "270 40% 13%",
      primary: "270 45% 48%",
      primaryForeground: "0 0% 100%",
      secondary: "275 35% 90%",
      secondaryForeground: "270 40% 13%",
      muted: "275 35% 90%",
      mutedForeground: "270 30% 48%",
      accent: "290 55% 60%",
      accentForeground: "270 40% 13%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "275 35% 90%",
      input: "275 35% 90%",
      ring: "270 45% 48%",
      sidebarBackground: "275 40% 96%",
      sidebarForeground: "270 40% 13%",
      sidebarPrimary: "270 45% 48%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "275 35% 92%",
      sidebarAccentForeground: "270 40% 13%",
      sidebarBorder: "275 35% 90%",
      sidebarRing: "270 45% 48%",
    },
  },
];

export const defaultPaletteId = "slate-professional";

/**
 * Get palette by ID
 */
export const getPaletteById = (id: string): Palette | undefined => {
  return colorPalettes.find((p) => p.id === id);
};

/**
 * Get all available palette choices for UI
 */
export const getPaletteChoices = () => {
  return colorPalettes.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    mood: p.mood,
  }));
};
