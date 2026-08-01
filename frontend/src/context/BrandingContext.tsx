"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getTenantBranding, TenantBranding } from "@/api/Branding/BrandingAPI";

type BrandingContextType = {
  schoolName: string;
  logoUrl: string | null;
  isLoading: boolean;
};

const DEFAULT_SCHOOL_NAME = "Madrasah Management System";

const BrandingContext = createContext<BrandingContextType>({
  schoolName: DEFAULT_SCHOOL_NAME,
  logoUrl: null,
  isLoading: true,
});

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getTenantBranding()
      .then((data: TenantBranding) => {
        if (cancelled) return;
        setSchoolName(data.school_name || DEFAULT_SCHOOL_NAME);
        setLogoUrl(data.logo_url || null);
      })
      .catch(() => {
        // Fail quiet — keep defaults rather than blocking the app on a branding hiccup
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BrandingContext.Provider value={{ schoolName, logoUrl, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);