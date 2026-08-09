import axiosInstance from "@/api/axiosInterceptorInstance";

export interface SelfAttendanceEntry {
  staff_attendance_id: number | null;
  attendance_time_id: number | null;
  attendance_time_name: string | null;
  attendance_date: string;
  self_availability: string | null;
  self_remarks: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  self_submitted_at: string | null;
  is_finalized: boolean;
  final_status: string | null;
  attendance_source: string | null;
  marked_by_user_id: number | null;
}

export interface SelfAttendanceSubmit {
  attendance_time_id: number | null;
  self_availability: string; // "AVAILABLE" | "NOT_AVAILABLE"
  self_remarks?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface SelfAttendanceUpdate {
  attendance_time_id: number | null;
  self_availability?: string;
  self_remarks?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface SelfAttendanceHistoryRow {
  staff_attendance_id: number;
  attendance_date: string;
  attendance_time_id: number | null;
  attendance_time_name: string | null;
  final_status: string | null;
  final_remarks: string | null;
  self_availability: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  attendance_source: string | null;
}

export namespace SelfAttendanceAPI {
  export const getToday = async (): Promise<SelfAttendanceEntry[]> => {
    try {
      const response = await axiosInstance.get<SelfAttendanceEntry[]>("/self-attendance/today");
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const submitToday = async (data: SelfAttendanceSubmit): Promise<SelfAttendanceEntry> => {
    try {
      const response = await axiosInstance.post<SelfAttendanceEntry>("/self-attendance/today", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const updateToday = async (data: SelfAttendanceUpdate): Promise<SelfAttendanceEntry> => {
    try {
      const response = await axiosInstance.patch<SelfAttendanceEntry>("/self-attendance/today", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const getHistory = async (): Promise<SelfAttendanceHistoryRow[]> => {
    try {
      const response = await axiosInstance.get<SelfAttendanceHistoryRow[]>("/self-attendance/history");
      return response.data;
    } catch (error) {
      throw error;
    }
  };
}
