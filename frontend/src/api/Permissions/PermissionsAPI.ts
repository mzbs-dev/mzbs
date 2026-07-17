import AxiosInstance from "@/api/axiosInterceptorInstance";
import { RolePermission, MyPermissions } from "@/models/permissions/Permission";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PermissionsAPI {
  // Full matrix — ADMIN only. Used by the ManageRolePermissions screen.
  export const GetAll = async () => {
    try {
      const response = await AxiosInstance.get<RolePermission[]>(
        "/permissions/"
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  // Current user's own resolved permissions. Used by RoleContext after
  // login, and by the sidebar to decide what to render.
  export const GetMy = async () => {
    try {
      const response = await AxiosInstance.get<MyPermissions>(
        "/permissions/me"
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  // Toggle one cell — ADMIN only.
  export const Update = async (
    role: string,
    module: string,
    action: string,
    allowed: boolean
  ) => {
    try {
      const response = await AxiosInstance.patch<RolePermission>(
        `/permissions/${role}/${module}/${action}`,
        { allowed }
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };
}
