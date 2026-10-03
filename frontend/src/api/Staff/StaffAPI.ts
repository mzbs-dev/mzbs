import AxiosInstance from "@/api/axiosInterceptorInstance";

export namespace StaffAPI {
  export interface DeletedStaffReferenceRecord {
    id: number | null;
    details: string;
  }

  export interface DeletedStaffReferenceCategory {
    label: string;
    count: number;
    records: DeletedStaffReferenceRecord[];
  }

  export interface DeletedStaffReferences {
    teacher_id: number;
    teacher_name: string;
    categories: DeletedStaffReferenceCategory[];
  }

  export const getStaff = async (search?: string) => {
    const params = search ? { search } : {};
    return AxiosInstance.get("/staff/list", { params });
  };

  export const getAttendanceRows = async (attendanceDate?: string, attendanceTimeId?: number | null) => {
    const params: Record<string, string | number> = {};
    if (attendanceDate) params.attendance_date = attendanceDate;
    if (attendanceTimeId != null) params.attendance_time_id = attendanceTimeId;
    return AxiosInstance.get("/staff/attendance", { params });
  };

  export const submitAttendance = async (
    attendanceDate: string,
    records: Array<{ staff_id: number; attendance_status: string }>,
    attendanceTimeId?: number | null
  ) => {
    const payload: any = {
      attendance_date: attendanceDate,
      records,
    };
    if (attendanceTimeId != null) payload.attendance_time_id = attendanceTimeId;
    return AxiosInstance.post("/staff/attendance", payload);
  };

  export const getAttendanceHistory = async (staffId?: number, attendanceDate?: string) => {
    const params: Record<string, string | number> = {};
    if (staffId) params.staff_id = staffId;
    if (attendanceDate) params.attendance_date = attendanceDate;
    return AxiosInstance.get("/staff/attendance/history", { params });
  };

  export const updateAttendance = async (attendanceId: number, status: string) => {
    return AxiosInstance.put(`/staff/attendance/${attendanceId}`, { attendance_status: status });
  };

  export const deleteAttendance = async (attendanceId: number) => {
    return AxiosInstance.delete(`/staff/attendance/${attendanceId}`);
  };

  export const getDeletedStaff = async () => {
    return AxiosInstance.get('/deleted-staff/');
  };

  export const getDeletedStaffReferences = async (teacherId: number) => {
    return AxiosInstance.get<DeletedStaffReferences>(`/deleted-staff/${teacherId}/references`);
  };

  export const restoreDeletedStaff = async (teacherId: number) => {
    return AxiosInstance.post(`/deleted-staff/${teacherId}/restore`);
  };

  export const permanentlyDeleteDeletedStaff = async (teacherId: number) => {
    return AxiosInstance.delete(`/deleted-staff/${teacherId}/permanent`);
  };
}
