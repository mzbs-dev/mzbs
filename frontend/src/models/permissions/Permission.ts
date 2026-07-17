export interface RolePermission {
  id: number;
  role: string;
  module: string;
  action: string; // "view" | "add" | "edit" | "delete"
  allowed: boolean;
  updated_by: number | null;
  updated_at: string;
}

// Shape returned by GET /permissions/me — resolved permissions for the
// current user, e.g. { students: { view: true, add: false, ... }, ... }
export type MyPermissions = Record<string, Record<string, boolean>>;

export interface UpdatePermissionPayload {
  allowed: boolean;
}
