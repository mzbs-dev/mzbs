import axios from 'axios';
import AxiosInstance from '@/api/axiosInterceptorInstance';

export const StudentProfileAPI = {
  getProfile: async (studentId: number, className?: string) => {
    const response = await AxiosInstance.get('/student_profile/', {
      params: {
        student_id: studentId,
        class_name: className || undefined,
      },
    });
    return response.data;
  },

  getAttendanceSummary: async (studentId: number) => {
    try {
      const response = await AxiosInstance.get('/mark_attendance/attendance_status_summary', {
        params: {
          student_id: studentId,
        },
      });
      return Array.isArray(response.data) ? response.data[0] ?? null : response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
