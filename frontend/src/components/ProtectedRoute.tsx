"use client";

import { useRole } from "@/context/RoleContext";
import { canAccessRoute } from "@/utils/rolePermissions";
import { usePathname, useRouter } from "next/navigation";


interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks if user has access to current route
 * If unauthorized, redirects to /unauthorized (403 page)
 * Derives authorization synchronously — no useEffect, no stale isAuthorized state
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { role, isLoading } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  // Show loading spinner while role is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // If no role and we're in a dashboard route, redirect to login (not unauthorized)
  if (!role && pathname.startsWith("/dashboard")) {
    router.replace("/login");
    return null;
  }

  // If role is confirmed but user is trying to access a dashboard route they don't have access to, redirect to unauthorized
  if (role && pathname.startsWith("/dashboard") && !canAccessRoute(role, pathname)) {
    router.replace("/unauthorized");
    return null;
  }

  // Allow all other routes (login, home, and dashboard routes user has access to)
  return <>{children}</>;
}
