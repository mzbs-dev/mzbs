// import axiosIntance from "@/api/axiosInterceptorInstance";
import {GetActionDetail} from "@/utils/GetActionDetail";
import AxiosInstance from "@/api/axiosInterceptorInstance";
import { ClassTiming, CreateTiming } from "@/models/classTiming/classTiming";

// eslint-disable-next-line @typescript-eslint/no-namespace 
export namespace AttendanceTimeAPI {
  export const Get = async () => {
    try {
      
      const response = await AxiosInstance.get<ClassTiming>(
        "/attendance_time/attendance-values-all/"
      );
      console.log("API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  }

  export const Create = async (ClassName: CreateTiming) => {
    try {
      const payload: CreateTiming = {
        ...ClassName,
        ...GetActionDetail(ClassName, "create"),
      };
      const response = await AxiosInstance.post<CreateTiming>(
        "/attendance_time/add_attendance_value/",
        JSON.stringify(payload),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error; 
    }
  };

  export const Delete = async (attendance_time_id: number) => {
    try {
      const response = await AxiosInstance.delete(
        `/attendance_time/${attendance_time_id}`
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  export interface ShiftConfig {
    attendance_time_id: number;
    attendance_time: string | null;
    expected_arrival_time: string | null;
    expected_departure_time: string | null;
    updated_at: string | null;
  }

  export const getShiftConfig = async (attendanceTimeId: number) => {
    try {
      const response = await AxiosInstance.get<ShiftConfig>(
        `/attendance_time/${attendanceTimeId}/shift-config`
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  export const setShiftConfig = async (
    attendanceTimeId: number,
    data: { expected_arrival_time?: string | null; expected_departure_time?: string | null }
  ) => {
    try {
      const response = await AxiosInstance.put<ShiftConfig>(
        `/attendance_time/${attendanceTimeId}/shift-config`,
        data
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };
};