"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { UserAPI, UserResponse, UserCreate, UserUpdate } from "@/api/User/UserAPI";
import { useRole } from "@/context/RoleContext";
import { UserPlus, Edit2, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { TeacherNameAPI } from "@/api/Teacher/TeacherAPI";
import { StaffAPI } from "@/api/Staff/StaffAPI";

interface TeacherOption {
  teacher_name_id: number;
  teacher_name: string;
  is_deleted?: boolean;
}

interface ManageUserForm {
  username: string;
  email: string;
  password: string;
  role: string;
  teacher_name_id: string;
}

const getErrorMessage = (error: any, fallback: string): string => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === "string") return item;
        return item?.msg || item?.message || "Validation error";
      })
      .join(". ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  return error?.message || fallback;
};

const suggestUsername = (teacherName: string): string => {
  if (/[^\x00-\x7F]/.test(teacherName)) return "";
  const slug = teacherName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^[a-z0-9_]{3,20}$/.test(slug) ? slug : "";
};

const ManageUser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useRole();
  const isAdmin = role === "ADMIN";
  const isTeacherCreateFlow = searchParams.get("from") === "teacher-create";
  const teacherCreateId = searchParams.get("teacher_name_id") || "";
  const teacherCreateName = searchParams.get("teacher_name") || "";

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    setValue: setValueCreate,
    formState: { errors: errorsCreate },
  } = useForm<ManageUserForm>();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<ManageUserForm>();

  const fetchUsers = async () => {
    try {
      setIsFetchingUsers(true);
      const usersData = await UserAPI.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const fetchTeacherOptions = async () => {
    try {
      const [activeResponse, deletedResponse] = await Promise.all([
        TeacherNameAPI.Get(),
        StaffAPI.getDeletedStaff(),
      ]);
      const activeTeachers = Array.isArray(activeResponse.data) ? activeResponse.data : [];
      const deletedTeachers = Array.isArray(deletedResponse.data) ? deletedResponse.data : [];
      setTeacherOptions([...activeTeachers, ...deletedTeachers]);
    } catch (error) {
      console.error("Error fetching teacher options:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchTeacherOptions();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isTeacherCreateFlow) {
      setShowCreateModal(true);
      setSelectedTeacherId(teacherCreateId);
      setValueCreate("role", "TEACHER");
      setValueCreate("username", suggestUsername(teacherCreateName));
    }
  }, [isTeacherCreateFlow, teacherCreateId, teacherCreateName, setValueCreate]);

  const visibleUsers = users.filter((user) =>
    activeTab === "active" ? user.is_active !== false : user.is_active === false
  );

  const onCreateSubmit = async (data: ManageUserForm) => {
    if (isTeacherCreateFlow && (!teacherCreateId || selectedTeacherId !== teacherCreateId)) {
      toast.error("The teacher link is missing. Return to the teacher page and start user creation again.");
      return;
    }

    if (selectedTeacherId && data.role === "ADMIN") {
      toast.error("A teacher-linked account cannot use the ADMIN role.");
      return;
    }

    setIsLoading(true);
    try {
      const teacherNameId = selectedTeacherId ? Number(selectedTeacherId) : undefined;
      const userData: UserCreate = {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        teacher_name_id: teacherNameId,
      };

      await UserAPI.createUser(userData);
      toast.success("User created successfully!");
      setShowCreateModal(false);
      resetCreate();
      setSelectedTeacherId("");
      if (isTeacherCreateFlow) router.replace("/dashboard/setup/manage_user");
      await fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(getErrorMessage(error, "Failed to create user"));
    } finally {
      setIsLoading(false);
    }
  };

  const cancelCreate = () => {
    setShowCreateModal(false);
    setShowCreatePassword(false);
    resetCreate();
    setSelectedTeacherId("");
    if (isTeacherCreateFlow) router.replace("/dashboard/setup/manage_user");
  };

  const onEditSubmit = async (data: ManageUserForm) => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const userData: UserUpdate = {
        username: data.username,
        email: data.email,
        password: data.password || undefined, // Only update if provided
        role: data.role,
        teacher_name_id: data.teacher_name_id ? Number(data.teacher_name_id) : null,
      };

      await UserAPI.updateUser(editingUser.id, userData);
      toast.success("User updated successfully!");
      setShowEditModal(false);
      setEditingUser(null);
      resetEdit();
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(getErrorMessage(error, "Failed to update user"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserResponse) => {
    setEditingUser(user);
    setValueEdit("username", user.username);
    setValueEdit("email", user.email);
    setValueEdit("password", ""); // Don't show current password
    setValueEdit("role", user.role);
    setValueEdit("teacher_name_id", user.teacher_name_id ? String(user.teacher_name_id) : "");
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const handleDelete = async (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        setIsDeleting(true);
        await UserAPI.deleteUser(userId);
        toast.success("User deleted successfully!");
        await fetchUsers();
      } catch (error: any) {
        console.error("Error deleting user:", error);
        toast.error(getErrorMessage(error, "Failed to delete user"));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRoleChange = async (userId: number, username: string, newRole: string) => {
    const targetUser = users.find((user) => user.id === userId);
    if (targetUser?.is_active === false) {
      toast.info("Inactive teacher-linked users are read-only.");
      return;
    }

    try {
      await UserAPI.updateUserRole(username, newRole);
      toast.success("User role updated successfully!");
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast.error(getErrorMessage(error, "Failed to update user role"));
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full">
        <Header value="Manage User" />
        <div className="p-4 sm:p-6">
          <div className="bg-destructive/10 dark:bg-red-900/20 border border-destructive/20 dark:border-red-700 rounded-lg p-4">
            <p className="text-destructive dark:text-red-400">
              Access denied. Only administrators can manage users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header value="Manage User" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Create User Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
            User Management
          </h3>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              disabled={isFetchingUsers}
              className="p-2 text-primary hover:bg-primary/10 dark:hover:bg-blue-900 rounded transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetchingUsers ? "animate-spin" : ""}`} />
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card dark:bg-card rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                activeTab === "active"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-foreground border-border hover:bg-muted/80"
              }`}
            >
              Active Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inactive")}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                activeTab === "inactive"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-foreground border-border hover:bg-muted/80"
              }`}
            >
              Inactive / Deleted Users
            </button>
          </div>

          {isFetchingUsers ? (
            <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
              Loading users...
            </div>
          ) : visibleUsers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border">
                  <th className="text-left py-3 px-2 font-semibold text-foreground dark:text-foreground">
                    Serial No.
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground dark:text-foreground">
                    Username
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground dark:text-foreground">
                    Password
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground dark:text-foreground">
                    Role
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-foreground dark:text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user, index) => {
                  const isReadOnly = user.is_active === false;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-border hover:bg-muted dark:hover:bg-neutral-800"
                    >
                      <td className="py-3 px-2 text-foreground dark:text-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 px-2 text-foreground dark:text-foreground">
                        {user.username}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground dark:text-muted-foreground">
                        <span>********</span>
                      </td>
                      <td className="py-3 px-2">
                        <select
                          value={user.role}
                          disabled={isReadOnly}
                          onChange={(e) => handleRoleChange(user.id, user.username, e.target.value)}
                          className="px-2 py-1 border border-border dark:border-border rounded text-sm bg-card dark:bg-card text-foreground dark:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="CHIEF_PRINCIPAL">CHIEF_PRINCIPAL</option>
                          <option value="PRINCIPAL">PRINCIPAL</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="STAFF">STAFF</option>
                          <option value="STUDENT">STUDENT</option>
                          <option value="ACCOUNTANT">ACCOUNTANT</option>
                          <option value="FEE_MANAGER">FEE_MANAGER</option>
                        </select>
                      </td>
                      <td className="py-3 px-2 flex gap-2">
                        <button
                          onClick={() => !isReadOnly && handleEdit(user)}
                          disabled={isReadOnly}
                          className="p-2 text-primary hover:bg-primary/10 dark:hover:bg-blue-900 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isReadOnly ? "Inactive users are read-only" : "Edit"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={isDeleting}
                          className="p-2 text-destructive hover:bg-destructive/10 dark:hover:bg-red-900 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
              {activeTab === "active" ? "No active users found." : "No inactive or deleted users found."}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card dark:bg-card rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-foreground">
              Create New User
            </h3>
            {isTeacherCreateFlow && (
              <p className="mb-4 text-sm text-muted-foreground">
                Creating a TEACHER account for <strong>{teacherCreateName}</strong> (Teacher ID: {teacherCreateId}).
              </p>
            )}
            <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Linked Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    if (e.target.value) setValueCreate("role", "TEACHER");
                  }}
                  disabled={isTeacherCreateFlow}
                  required={isTeacherCreateFlow}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {!isTeacherCreateFlow && <option value="">Select a teacher (optional)</option>}
                  {isTeacherCreateFlow && selectedTeacherId && !teacherOptions.some(
                    (teacher) => String(teacher.teacher_name_id) === selectedTeacherId
                  ) && <option value={selectedTeacherId}>Teacher #{selectedTeacherId}</option>}
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.teacher_name_id} value={teacher.teacher_name_id}>
                      {teacher.teacher_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Username
                </label>
                <Input
                  {...registerCreate("username", {
                    required: "Username is required",
                    minLength: { value: 3, message: "Username must be at least 3 characters" },
                  })}
                  placeholder="Enter username"
                />
                {errorsCreate.username && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsCreate.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  {...registerCreate("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="Enter email"
                />
                {errorsCreate.email && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsCreate.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showCreatePassword ? "text" : "password"}
                    {...registerCreate("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" },
                    })}
                    placeholder="Enter password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                    aria-label={showCreatePassword ? "Hide password" : "Show password"}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errorsCreate.password && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsCreate.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Role
                </label>
                <select
                  {...registerCreate("role", { required: "Role is required" })}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card text-foreground dark:text-foreground"
                >
                  <option value="">Select role</option>
                  {!selectedTeacherId && <option value="ADMIN">ADMIN</option>}
                  <option value="CHIEF_PRINCIPAL">CHIEF_PRINCIPAL</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="FEE_MANAGER">FEE_MANAGER</option>
                </select>
                {errorsCreate.role && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsCreate.role.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelCreate}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card dark:bg-card rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-foreground">
              Edit User: {editingUser.username}
            </h3>
            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Username
                </label>
                <Input
                  {...registerEdit("username", {
                    required: "Username is required",
                    minLength: { value: 3, message: "Username must be at least 3 characters" },
                  })}
                  placeholder="Enter username"
                />
                {errorsEdit.username && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsEdit.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  {...registerEdit("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="Enter email"
                />
                {errorsEdit.email && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsEdit.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  New Password (leave empty to keep current)
                </label>
                <div className="relative">
                  <Input
                    type={showEditPassword ? "text" : "password"}
                    {...registerEdit("password", {
                      minLength: { value: 6, message: "Password must be at least 6 characters" },
                    })}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                    aria-label={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errorsEdit.password && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsEdit.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Linked Teacher
                </label>
                <select
                  {...registerEdit("teacher_name_id")}
                  onChange={(event) => {
                    setValueEdit("teacher_name_id", event.target.value);
                    if (event.target.value) setValueEdit("role", "TEACHER");
                  }}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card text-foreground dark:text-foreground"
                >
                  <option value="">No teacher linked</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.teacher_name_id} value={teacher.teacher_name_id}>
                      {teacher.teacher_name}{teacher.is_deleted ? " (Deleted)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground dark:text-foreground">
                  Role
                </label>
                <select
                  {...registerEdit("role", { required: "Role is required" })}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card text-foreground dark:text-foreground"
                >
                  <option value="">Select role</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CHIEF_PRINCIPAL">CHIEF_PRINCIPAL</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="FEE_MANAGER">FEE_MANAGER</option>
                </select>
                {errorsEdit.role && (
                  <p className="mt-1 text-sm text-destructive dark:text-red-400">
                    {errorsEdit.role.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setShowEditPassword(false);
                    resetEdit();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUser;