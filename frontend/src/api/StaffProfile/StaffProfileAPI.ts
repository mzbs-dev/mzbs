import axiosInstance from "@/api/axiosInterceptorInstance";

export interface StaffListItem {
  staff_id: number;
  staff_name: string;
  joining_date: string;
  total_stay: string;
}

export interface StaffShiftAssignmentResponse {
  id: number;
  staff_id: number;
  attendance_time_id: number;
  attendance_time: string | null;
  assigned_by: number | null;
  created_at: string;
}

export interface PreviousAttendanceRow {
  staff_attendance_id: number | null;
  is_calendar_holiday: boolean;
  holiday_label: string | null;
  attendance_date: string;
  weekday: string;
  attendance_time_id: number | null;
  attendance_time_name: string | null;
  schedule_id: number | null;
  expected_start_time: string | null;
  expected_end_time: string | null;
  schedule_is_legacy: boolean;
  final_status: string | null;
  final_remarks: string | null;
  arrival_time: string | null;
  departure_time: string | null;
}

export interface StaffProfileResponse {
  staff_id: number;
  staff_name: string;
  joining_date: string;
  total_stay: string;
  assigned_shifts: StaffShiftAssignmentResponse[];
  previous_attendance: PreviousAttendanceRow[];
}

export namespace StaffProfileAPI {
  export const getStaffList = async (): Promise<StaffListItem[]> => {
    try {
      const response = await axiosInstance.get<StaffListItem[]>("/staff-profile/list");
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const getProfile = async (staffId: number): Promise<StaffProfileResponse> => {
    try {
      const response = await axiosInstance.get<StaffProfileResponse>(`/staff-profile/${staffId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const setShifts = async (
    staffId: number,
    attendanceTimeIds: number[]
  ): Promise<StaffShiftAssignmentResponse[]> => {
    try {
      const response = await axiosInstance.put<StaffShiftAssignmentResponse[]>(
        `/staff-profile/${staffId}/shifts`,
        { attendance_time_ids: attendanceTimeIds }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };
}
