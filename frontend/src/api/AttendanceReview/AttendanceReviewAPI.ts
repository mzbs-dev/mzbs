import axiosInstance from "@/api/axiosInterceptorInstance";

export interface AttendanceReviewRow {
  staff_id: number;
  staff_name: string;
  staff_attendance_id: number | null;
  attendance_time_id: number | null;
  attendance_time_name: string | null;
  schedule_id: number | null;
  expected_start_time: string | null;
  expected_end_time: string | null;
  schedule_is_legacy: boolean;
  attendance_date: string;
  weekday: string;
  is_holiday: boolean;
  holiday_label: string | null;
  self_availability: string | null;
  self_remarks: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  final_status: string | null; // null => "Pending / Not Submitted"
  final_remarks: string | null;
  is_finalized: boolean;
  is_likely_late: boolean | null; // null, not false, when no hint available
  attendance_source: string | null;
}

export interface AttendanceReviewFinalizePayload {
  attendance_date: string;
  attendance_time_id: number | null;
  final_status: string; // PRESENT | LATE | ABSENT | LEAVE
  final_remarks?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface AttendanceReviewBatchRecord {
  staff_id: number;
  final_status: string;
  final_remarks?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface AttendanceReviewBatchFinalizePayload {
  attendance_date: string;
  attendance_time_id: number;
  records: AttendanceReviewBatchRecord[];
}

export interface AttendanceReviewBatchRowResult {
  staff_id: number;
  staff_name: string | null;
  finalized: boolean;
  error: string | null;
}

export interface AttendanceReviewBatchFinalizeResponse {
  attendance_date: string;
  attendance_time_id: number;
  finalized_count: number;
  failed_count: number;
  results: AttendanceReviewBatchRowResult[];
}

export interface AttendanceReviewFinalizeAllPayload {
  attendance_date: string;
  attendance_time_id?: number | null;
}

export interface AttendanceReviewFinalizeAllResponse {
  attendance_date: string;
  attendance_time_id: number | null;
  finalized_count: number;
  already_finalized_count: number;
  incomplete_staff: string[];
}

export interface AttendanceReviewEditPayload {
  attendance_date: string;
  attendance_time_id: number | null;
  final_status?: string;
  final_remarks?: string;
  self_availability?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface AttendanceReviewHistoryRow {
  staff_attendance_id: number;
  staff_id: number;
  staff_name: string;
  attendance_date: string;
  weekday: string;
  is_holiday: boolean;
  holiday_label: string | null;
  attendance_time_id: number | null;
  attendance_time_name: string | null;
  schedule_id: number | null;
  expected_start_time: string | null;
  expected_end_time: string | null;
  schedule_is_legacy: boolean;
  final_status: string | null;
  final_remarks: string | null;
  self_availability: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  is_finalized: boolean;
  finalized_at: string | null;
}

export namespace AttendanceReviewAPI {
  export const getRows = async (
    attendanceDate?: string,
    attendanceTimeId?: number | null
  ): Promise<AttendanceReviewRow[]> => {
    try {
      const params: Record<string, string | number> = {};
      if (attendanceDate) params.attendance_date = attendanceDate;
      if (attendanceTimeId != null) params.attendance_time_id = attendanceTimeId;
      const response = await axiosInstance.get<AttendanceReviewRow[]>("/attendance-review/rows", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const finalize = async (
    staffId: number,
    data: AttendanceReviewFinalizePayload
  ): Promise<AttendanceReviewRow> => {
    try {
      const response = await axiosInstance.post<AttendanceReviewRow>(
        `/attendance-review/${staffId}/finalize`,
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const finalizeAll = async (
    data: AttendanceReviewFinalizeAllPayload
  ): Promise<AttendanceReviewFinalizeAllResponse> => {
    const response = await axiosInstance.post<AttendanceReviewFinalizeAllResponse>(
      "/attendance-review/finalize-all",
      data
    );
    return response.data;
  };

  export const batchFinalize = async (
    data: AttendanceReviewBatchFinalizePayload
  ): Promise<AttendanceReviewBatchFinalizeResponse> => {
    const response = await axiosInstance.post<AttendanceReviewBatchFinalizeResponse>(
      "/attendance-review/batch-finalize",
      data
    );
    return response.data;
  };

  export const updateRecord = async (
    staffId: number,
    data: AttendanceReviewEditPayload
  ): Promise<AttendanceReviewRow> => {
    try {
      const response = await axiosInstance.patch<AttendanceReviewRow>(
        `/attendance-review/${staffId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const deleteRecord = async (
    staffId: number,
    attendanceDate: string,
    attendanceTimeId?: number | null
  ): Promise<void> => {
    try {
      const params: Record<string, string | number> = { attendance_date: attendanceDate };
      if (attendanceTimeId != null) params.attendance_time_id = attendanceTimeId;
      await axiosInstance.delete(`/attendance-review/${staffId}`, { params });
    } catch (error) {
      throw error;
    }
  };

  export const getHistory = async (filters?: {
    staff_id?: number;
    date_from?: string;
    date_to?: string;
    attendance_time_id?: number;
  }): Promise<AttendanceReviewHistoryRow[]> => {
    try {
      const response = await axiosInstance.get<AttendanceReviewHistoryRow[]>("/attendance-review/history", {
        params: filters ?? {},
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };
}
