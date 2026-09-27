import axiosInstance from "@/api/axiosInterceptorInstance";

export interface AttendanceDateException {
  id: number;
  exception_date: string;
  kind: "HOLIDAY" | "WORKING_DAY";
  label: string | null;
}

export interface AttendancePolicy {
  weekly_holidays: number[];
  date_exceptions: AttendanceDateException[];
}

export namespace AttendancePolicyAPI {
  export const get = async (): Promise<AttendancePolicy> => {
    const response = await axiosInstance.get<AttendancePolicy>("/attendance-policy");
    return response.data;
  };

  export const setWeeklyHolidays = async (weekdays: number[]): Promise<AttendancePolicy> => {
    const response = await axiosInstance.put<AttendancePolicy>(
      "/attendance-policy/weekly-holidays",
      weekdays
    );
    return response.data;
  };

  export const addException = async (data: {
    exception_date: string;
    kind: "HOLIDAY" | "WORKING_DAY";
    label?: string;
  }): Promise<AttendanceDateException> => {
    const response = await axiosInstance.post<AttendanceDateException>(
      "/attendance-policy/exceptions",
      data
    );
    return response.data;
  };

  export const deleteException = async (id: number): Promise<void> => {
    await axiosInstance.delete(`/attendance-policy/exceptions/${id}`);
  };
}
