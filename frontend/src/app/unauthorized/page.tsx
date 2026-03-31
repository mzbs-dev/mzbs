"use client";

import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { getRoleDisplayName } from "@/utils/rolePermissions";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { role, clearRole } = useRole();

  const handleGoHome = () => {
    router.push("/dashboard");
  };

  const handleLogout = () => {
    // Clear role context
    clearRole();
    // Clear other auth tokens if stored
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
    // Redirect to login
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* 403 Header */}
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-red-600 mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Access Denied</h2>
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <p className="text-gray-600 mb-4">
            You do not have permission to access this page.
          </p>

          {role && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded p-3">
              Your role: <span className="font-semibold">{getRoleDisplayName(role)}</span>
            </p>
          )}

          <p className="text-sm text-gray-500 mt-4">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGoHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Return to Dashboard
          </Button>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Logout
          </Button>
        </div>

        {/* Footer Info */}
        <p className="text-xs text-gray-400 mt-6">
          If you need access to specific features, contact your administrator.
        </p>
      </div>
    </div>
  );
}
