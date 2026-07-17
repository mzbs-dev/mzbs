"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { PermissionsAPI } from "@/api/Permissions/PermissionsAPI";
import { MyPermissions } from "@/models/permissions/Permission";

interface RoleContextType {
  role: string | null;
  setRole: (role: string) => void;
  clearRole: () => void;
  isLoading: boolean;
  permissions: MyPermissions | null;
  permissionsLoaded: boolean; // true once the fetch has settled (success OR failure)
  refreshPermissions: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<MyPermissions | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      const response = await PermissionsAPI.GetMy();
      setPermissions(response.data);
    } catch {
      // Fetch failed (network issue, backend down, etc.) — leave permissions
      // null so callers fall back to the static ROLE_PERMISSIONS object.
      setPermissions(null);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Guard against SSR — storage is only available in browser
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // 1. Try sessionStorage first (set by setRole() calls within the same tab)
    const storedRole = sessionStorage.getItem("userRole");

    if (storedRole) {
      setRole(storedRole);
      setIsLoading(false);
      loadPermissions();
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
          loadPermissions();
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
  }, [loadPermissions]);

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
    // Fresh login (or role change) — fetch this role's permissions
    loadPermissions();
  };

  const clearRole = () => {
    setRole(null);
    setPermissions(null);
    setPermissionsLoaded(false);
    sessionStorage.removeItem("userRole");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: setRoleAndStore,
        clearRole,
        isLoading,
        permissions,
        permissionsLoaded,
        refreshPermissions: loadPermissions,
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
