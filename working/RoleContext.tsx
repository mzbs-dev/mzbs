"use client";

import React, { createContext, useState, useContext, useEffect } from "react";

interface RoleContextType {
  role: string | null;
  setRole: (role: string) => void;
  clearRole: () => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Try sessionStorage first (set by setRole() calls within the same tab)
    const storedRole = sessionStorage.getItem("userRole");

    if (storedRole) {
      setRole(storedRole);
      setIsLoading(false);
      return;
    }

    // 2. Fallback: extract role from the user object in localStorage.
    //    This handles the case where the login page saves the full user object
    //    to localStorage but doesn't separately call context.setRole().
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.role) {
          console.log("RoleContext - Recovered role from localStorage:", user.role);
          setRole(user.role);
          // Sync into sessionStorage so subsequent checks are fast
          sessionStorage.setItem("userRole", user.role);
        } else {
          console.warn("RoleContext - user object in localStorage has no role field:", user);
        }
      } catch {
        console.error("RoleContext - Failed to parse user from localStorage");
      }
    } else {
      console.warn("RoleContext - No user found in localStorage or sessionStorage");
    }

    setIsLoading(false);
  }, []);

  const setRoleAndStore = (newRole: string) => {
    setRole(newRole);
    // Write to BOTH storages so either path works on next load
    sessionStorage.setItem("userRole", newRole);
    // Also update the role field inside the stored user object
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.role = newRole;
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch {
      // Non-critical — sessionStorage is the primary source
    }
  };

  const clearRole = () => {
    setRole(null);
    sessionStorage.removeItem("userRole");
    // Note: login page / logout handler should clear localStorage too
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: setRoleAndStore,
        clearRole,
        isLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
