// src/api/Dashboard/dashboardAPI.ts
//
// CHANGE FROM BEFORE:
//   Previously this file likely imported plain `axios` or a public instance.
//   Every function now uses `axiosInstance` — the interceptor-equipped client
//   that automatically attaches the Bearer token from your auth store.
//
// If the backend /dashboard/* endpoints return 401, check that:
//   1. The backend router now has Depends(get_current_user) (see dashboard_router.py)
//   2. The user is logged in before any dashboard page renders
//   3. axiosInstance is correctly injecting the Authorization header

import axiosInstance from "../axiosInterceptorInstance";

// ─── Response types (mirror the backend schemas exactly) ──────────────────────

export interface Dataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[] | null;
  borderWidth?: number | null;
}

export interface GraphData {
  labels: string[];
  datasets: Dataset[];
  title: string;
}

export interface UserLoginSummary {
  Roll: string;
  Total: number;
}

export interface AttendanceSummary {
  date: string;
  class_name: string;
  attendance_values: Record<string, number>;
}

export interface StudentSummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  sick: number;
  leave: number;
}

export interface IncomeExpenseCategorySummary {
  year: number;
  month: number;
  category_summary: Record<string, number>;
}

// Top-level response shapes
export interface LoginGraphData {
  summary: UserLoginSummary[];
  graph: GraphData;
}

export interface AttendanceGraphData {
  summary: AttendanceSummary[];
  graph: GraphData;
}

export interface StudentGraphData {
  summary: StudentSummary;
  graph: GraphData;
}

export interface CategoryGraphData {
  summary: IncomeExpenseCategorySummary[];
  graph: GraphData;
  total: number;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * User role distribution (for admin/principal dashboards).
 * GET /dashboard/user-roles — requires auth
 */
export const getUserRoleSummary = async (): Promise<LoginGraphData> => {
  const { data } = await axiosInstance.get<LoginGraphData>(
    "/dashboard/user-roles"
  );
  return data;
};

/**
 * Today's attendance summary across all classes.
 * GET /dashboard/attendance-summary — requires auth
 */
export const getAttendanceSummary = async (): Promise<AttendanceGraphData> => {
  const { data } = await axiosInstance.get<AttendanceGraphData>(
    "/dashboard/attendance-summary"
  );
  return data;
};

/**
 * Student present/absent/late/sick/leave counts for a given date.
 * GET /dashboard/student-summary — requires auth
 * @param date  ISO date string e.g. "2026-03-29". Defaults to today on the backend.
 */
export const getStudentSummary = async (
  date?: string
): Promise<StudentGraphData> => {
  const { data } = await axiosInstance.get<StudentGraphData>(
    "/dashboard/student-summary",
    { params: date ? { date } : undefined }
  );
  return data;
};

/**
 * Income breakdown by category for a month/year.
 * GET /dashboard/income-summary — requires auth
 */
export const getIncomeSummary = async (
  year?: number,
  month?: number
): Promise<CategoryGraphData> => {
  const { data } = await axiosInstance.get<CategoryGraphData>(
    "/dashboard/income-summary",
    { params: { ...(year && { year }), ...(month && { month }) } }
  );
  return data;
};

/**
 * Expense breakdown by category for a month/year.
 * GET /dashboard/expense-summary — requires auth
 */
export const getExpenseSummary = async (
  year?: number,
  month?: number
): Promise<CategoryGraphData> => {
  const { data } = await axiosInstance.get<CategoryGraphData>(
    "/dashboard/expense-summary",
    { params: { ...(year && { year }), ...(month && { month }) } }
  );
  return data;
};

/**
 * Total student count.
 * GET /dashboard/total-students — requires auth
 */
export const getTotalStudents = async (): Promise<number> => {
  const { data } = await axiosInstance.get<number>(
    "/dashboard/total-students"
  );
  return data;
};

/**
 * List of student IDs whose attendance is not yet marked for a given date.
 * GET /dashboard/unmarked-students — requires auth
 * @param date  ISO date string. Defaults to today on the backend.
 */
export const getUnmarkedStudents = async (date?: string): Promise<number[]> => {
  const { data } = await axiosInstance.get<number[]>(
    "/dashboard/unmarked-students",
    { params: date ? { date } : undefined }
  );
  return data;
};

/**
 * Combined income + expense comparison for a full year.
 * GET /dashboard/income-expense-summary — requires auth
 */
export const getIncomeExpenseSummary = async (year?: number): Promise<unknown> => {
  const { data } = await axiosInstance.get(
    "/dashboard/income-expense-summary",
    { params: year ? { year } : undefined }
  );
  return data;
};

/**
 * Monthly fee collection summary for a year.
 * GET /dashboard/fee-summary — requires auth
 */
export const getFeeSummary = async (year?: number): Promise<unknown> => {
  const { data } = await axiosInstance.get(
    "/dashboard/fee-summary",
    { params: year ? { year } : undefined }
  );
  return data;
};
