"""
Script to create files with specified content from a list of filenames and content.
Useful for bulk file creation and content population.

Usage:
    1. Define files in the FILES_DATA dictionary with paths and content
    2. Run the script: python create_files_from_list.py
    3. Files will be created in the specified base directory
"""

import os
from pathlib import Path

# Define the base directory where files will be created
BASE_DIR = "./frontend/src"

# Dictionary of files to create with their content
# Format: "relative/path/filename.ext": "file content"
FILES_DATA = {
    # API files
    "api/axiosInterceptorInstance.ts": """import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
""",
    
    "api/AttendaceTime/attendanceTimeAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getAttendanceTimes = async () => {
  const response = await axiosInstance.get('/attendance-times');
  return response.data;
};

export const createAttendanceTime = async (data: any) => {
  const response = await axiosInstance.post('/attendance-times', data);
  return response.data;
};

export const updateAttendanceTime = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/attendance-times/${id}`, data);
  return response.data;
};

export const deleteAttendanceTime = async (id: string | number) => {
  const response = await axiosInstance.delete(`/attendance-times/${id}`);
  return response.data;
};
""",
    
    "api/Attendance/AttendanceAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const markAttendance = async (data: any) => {
  const response = await axiosInstance.post('/attendance/mark', data);
  return response.data;
};

export const getAttendance = async () => {
  const response = await axiosInstance.get('/attendance');
  return response.data;
};

export const getAttendanceByStudent = async (studentId: string | number) => {
  const response = await axiosInstance.get(`/attendance/student/${studentId}`);
  return response.data;
};

export const updateAttendance = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/attendance/${id}`, data);
  return response.data;
};
""",
    
    "api/Classname/ClassNameAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getClassNames = async () => {
  const response = await axiosInstance.get('/class-names');
  return response.data;
};

export const createClassName = async (data: any) => {
  const response = await axiosInstance.post('/class-names', data);
  return response.data;
};

export const updateClassName = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/class-names/${id}`, data);
  return response.data;
};

export const deleteClassName = async (id: string | number) => {
  const response = await axiosInstance.delete(`/class-names/${id}`);
  return response.data;
};
""",
    
    "api/Dashboard/dashboardAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getDashboardData = async () => {
  const response = await axiosInstance.get('/dashboard');
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await axiosInstance.get('/dashboard/stats');
  return response.data;
};

export const getDashboardCharts = async (period: string) => {
  const response = await axiosInstance.get(`/dashboard/charts?period=${period}`);
  return response.data;
};
""",
    
    "api/Expense/ExpenseAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getExpenses = async (filters?: any) => {
  const response = await axiosInstance.get('/expenses', { params: filters });
  return response.data;
};

export const createExpense = async (data: any) => {
  const response = await axiosInstance.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id: string | number) => {
  const response = await axiosInstance.delete(`/expenses/${id}`);
  return response.data;
};
""",
    
    "api/Fees/AddFeeAPI.tsx": """import axiosInstance from '../axiosInterceptorInstance';

export const addFee = async (data: any) => {
  const response = await axiosInstance.post('/fees', data);
  return response.data;
};

export const getFees = async (filters?: any) => {
  const response = await axiosInstance.get('/fees', { params: filters });
  return response.data;
};

export const updateFee = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/fees/${id}`, data);
  return response.data;
};

export const deleteFee = async (id: string | number) => {
  const response = await axiosInstance.delete(`/fees/${id}`);
  return response.data;
};
""",
    
    "api/Income/IncomeAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getIncomes = async (filters?: any) => {
  const response = await axiosInstance.get('/incomes', { params: filters });
  return response.data;
};

export const createIncome = async (data: any) => {
  const response = await axiosInstance.post('/incomes', data);
  return response.data;
};

export const updateIncome = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/incomes/${id}`, data);
  return response.data;
};

export const deleteIncome = async (id: string | number) => {
  const response = await axiosInstance.delete(`/incomes/${id}`);
  return response.data;
};
""",
    
    "api/Login/Login.ts": """import axiosInstance from '../axiosInterceptorInstance';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: any;
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await axiosInstance.post('/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post('/logout');
  return response.data;
};

export const refreshToken = async () => {
  const response = await axiosInstance.post('/refresh-token');
  return response.data;
};
""",
    
    "api/Student/StudentsAPI.tsx": """import axiosInstance from '../axiosInterceptorInstance';

export const getStudents = async (filters?: any) => {
  const response = await axiosInstance.get('/students', { params: filters });
  return response.data;
};

export const createStudent = async (data: any) => {
  const response = await axiosInstance.post('/students', data);
  return response.data;
};

export const getStudentById = async (id: string | number) => {
  const response = await axiosInstance.get(`/students/${id}`);
  return response.data;
};

export const updateStudent = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id: string | number) => {
  const response = await axiosInstance.delete(`/students/${id}`);
  return response.data;
};
""",
    
    "api/Teacher/TeachetAPI.ts": """import axiosInstance from '../axiosInterceptorInstance';

export const getTeachers = async (filters?: any) => {
  const response = await axiosInstance.get('/teachers', { params: filters });
  return response.data;
};

export const createTeacher = async (data: any) => {
  const response = await axiosInstance.post('/teachers', data);
  return response.data;
};

export const getTeacherById = async (id: string | number) => {
  const response = await axiosInstance.get(`/teachers/${id}`);
  return response.data;
};

export const updateTeacher = async (id: string | number, data: any) => {
  const response = await axiosInstance.put(`/teachers/${id}`, data);
  return response.data;
};

export const deleteTeacher = async (id: string | number) => {
  const response = await axiosInstance.delete(`/teachers/${id}`);
  return response.data;
};
""",
    
    # App files
    "app/ThemeProvider.tsx": """'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
""",
    
    "app/api/auth/frontend/login/route.ts": """import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate credentials against backend
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const data = await backendResponse.json();
    
    const response = NextResponse.json({ success: true, user: data.user });
    response.cookies.set('authToken', data.access_token, {
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
""",
    
    "app/dashboard/attendance/mark_attendance/page.tsx": """'use client';

import { useState } from 'react';
import { markAttendance } from '@/api/Attendance/AttendanceAPI';

export default function MarkAttendancePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await markAttendance(data);
      // Handle success
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Mark Attendance</h1>
      {/* Mark attendance form */}
    </div>
  );
}
""",
    
    "app/dashboard/attendance/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getAttendance } from '@/api/Attendance/AttendanceAPI';

export default function AttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAttendance();
        setData(result);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance</h1>
      {/* Attendance list */}
    </div>
  );
}
""",
    
    "app/dashboard/attendance/view_attendance/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getAttendance } from '@/api/Attendance/AttendanceAPI';

export default function ViewAttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAttendance();
        setData(result);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">View Attendance</h1>
      {/* View attendance */}
    </div>
  );
}
""",
    
    "app/dashboard/expense/add_expense/page.tsx": """'use client';

import { useState } from 'react';
import { createExpense } from '@/api/Expense/ExpenseAPI';

export default function AddExpensePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createExpense(data);
      // Handle success
    } catch (error) {
      console.error('Error creating expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Add Expense</h1>
      {/* Expense form */}
    </div>
  );
}
""",
    
    "app/dashboard/expense/view_expense/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getExpenses } from '@/api/Expense/ExpenseAPI';

export default function ViewExpensePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getExpenses();
        setData(result);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">View Expenses</h1>
      {/* Expenses list */}
    </div>
  );
}
""",
    
    "app/dashboard/fees/add_fees/page.tsx": """'use client';

import { useState } from 'react';
import { addFee } from '@/api/Fees/AddFeeAPI';

export default function AddFeesPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await addFee(data);
      // Handle success
    } catch (error) {
      console.error('Error adding fee:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Add Fees</h1>
      {/* Fees form */}
    </div>
  );
}
""",
    
    "app/dashboard/fees/view_fees/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getFees } from '@/api/Fees/AddFeeAPI';

export default function ViewFeesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getFees();
        setData(result);
      } catch (error) {
        console.error('Error fetching fees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">View Fees</h1>
      {/* Fees list */}
    </div>
  );
}
""",
    
    "app/dashboard/income/add_income/page.tsx": """'use client';

import { useState } from 'react';
import { createIncome } from '@/api/Income/IncomeAPI';

export default function AddIncomePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createIncome(data);
      // Handle success
    } catch (error) {
      console.error('Error adding income:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Add Income</h1>
      {/* Income form */}
    </div>
  );
}
""",
    
    "app/dashboard/income/view_income/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getIncomes } from '@/api/Income/IncomeAPI';

export default function ViewIncomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getIncomes();
        setData(result);
      } catch (error) {
        console.error('Error fetching incomes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">View Incomes</h1>
      {/* Incomes list */}
    </div>
  );
}
""",
    
    "app/dashboard/layout.tsx": """'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
""",
    
    "app/dashboard/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getDashboardData } from '@/api/Dashboard/dashboardAPI';
import { useRole } from '@/context/RoleContext';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { role } = useRole();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getDashboardData();
        setData(result);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {/* Dashboard content based on role */}
    </div>
  );
}
""",
    
    "app/dashboard/setup/class_name/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getClassNames } from '@/api/Classname/ClassNameAPI';

export default function ClassNameSetupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getClassNames();
        setData(result);
      } catch (error) {
        console.error('Error fetching class names:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Class Names</h1>
      {/* Class names setup */}
    </div>
  );
}
""",
    
    "app/dashboard/setup/class_timings/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getAttendanceTimes } from '@/api/AttendaceTime/attendanceTimeAPI';

export default function ClassTimingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAttendanceTimes();
        setData(result);
      } catch (error) {
        console.error('Error fetching timings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Class Timings</h1>
      {/* Class timings setup */}
    </div>
  );
}
""",
    
    "app/dashboard/setup/expense_category/page.tsx": """'use client';

import { useState } from 'react';

export default function ExpenseCategoryPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Expense Categories</h1>
      {/* Expense category setup */}
    </div>
  );
}
""",
    
    "app/dashboard/setup/income_category/page.tsx": """'use client';

import { useState } from 'react';

export default function IncomeCategoryPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Income Categories</h1>
      {/* Income category setup */}
    </div>
  );
}
""",
    
    "app/dashboard/setup/teacher/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getTeachers } from '@/api/Teacher/TeachetAPI';

export default function TeacherSetupPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getTeachers();
        setData(result);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Teachers</h1>
      {/* Teacher setup */}
    </div>
  );
}
""",
    
    "app/dashboard/students/page.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getStudents } from '@/api/Student/StudentsAPI';

export default function StudentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getStudents();
        setData(result);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Students</h1>
      {/* Students list */}
    </div>
  );
}
""",
    
    "app/favicon.ico": """
""",
    
    "app/fonts/GeistMonoVF.woff": """
""",
    
    "app/fonts/GeistVF.woff": """
""",
    
    "app/globals.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}

a {
  @apply text-blue-600 hover:text-blue-700;
}

button {
  @apply transition-colors duration-200;
}
""",
    
    "app/layout.tsx": """import type { Metadata } from 'next';
import { ThemeProvider } from './ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'MMS - School Management System',
  description: 'Management system for schools',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
""",
    
    "app/login/page.tsx": """'use client';

import { useState } from 'react';
import Login from '@/components/Login';

export default function LoginPage() {
  return <Login />;
}
""",
    
    "app/page.tsx": """'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return null;
}
""",
    
    "app/unauthorized/page.tsx": """'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">401 - Unauthorized</h1>
        <p className="text-gray-600 mb-6">You do not have permission to access this page.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
""",
    
    # Components - Attendance
    "components/Attendance/EditAttendance.tsx": """'use client';

import { useState } from 'react';
import { updateAttendance } from '@/api/Attendance/AttendanceAPI';

interface EditAttendanceProps {
  attendanceId: string | number;
  onClose: () => void;
}

export default function EditAttendance({ attendanceId, onClose }: EditAttendanceProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await updateAttendance(attendanceId, data);
      onClose();
    } catch (error) {
      console.error('Error updating attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Edit Attendance</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Attendance/MarkAttendance.tsx": """'use client';

import { useState } from 'react';
import { markAttendance } from '@/api/Attendance/AttendanceAPI';

export default function MarkAttendance() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await markAttendance(data);
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Mark Attendance</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Attendance/ViewAttendance.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getAttendance } from '@/api/Attendance/AttendanceAPI';

export default function ViewAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAttendance();
        setData(result);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Attendance Records</h2>
      {/* Table */}
    </div>
  );
}
""",
    
    # Components - ClassName
    "components/ClassName/ClassTable.tsx": """'use client';

export default function ClassTable({ classes }: { classes: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Class Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((cls) => (
          <tr key={cls.id}>
            <td>{cls.name}</td>
            <td>Edit | Delete</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
""",
    
    "components/ClassName/CreateClass.tsx": """'use client';

import { useState } from 'react';
import { createClassName } from '@/api/Classname/ClassNameAPI';

export default function CreateClass({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createClassName(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating class:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Class</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    # Components - ClassTiming
    "components/ClassTiming/CreateTIming.tsx": """'use client';

import { useState } from 'react';
import { createAttendanceTime } from '@/api/AttendaceTime/attendanceTimeAPI';

export default function CreateTiming({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createAttendanceTime(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating timing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Class Timing</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/ClassTiming/TimingTable.tsx": """'use client';

export default function TimingTable({ timings }: { timings: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {timings.map((timing) => (
          <tr key={timing.id}>
            <td>{timing.startTime}</td>
            <td>{timing.endTime}</td>
            <td>Edit | Delete</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
""",
    
    # Components - Other
    "components/DelConfMsg.tsx": """'use client';

interface DeleteConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmation({ onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
        <p className="mb-6">Are you sure you want to delete this item?</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>
    </div>
  );
}
""",
    
    # Components - Expense
    "components/Expense/CreateExpenseCat.tsx": """'use client';

import { useState } from 'react';

export default function CreateExpenseCat({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Create expense category
      onSuccess();
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Expense Category</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Expense/ExpenseCat.tsx": """'use client';

export default function ExpenseCat({ categories }: { categories: any[] }) {
  return (
    <div>
      <h2>Expense Categories</h2>
      {/* List */}
    </div>
  );
}
""",
    
    "components/Expense/viewExpense.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getExpenses } from '@/api/Expense/ExpenseAPI';

export default function ViewExpense() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getExpenses();
        setData(result);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Expenses</h2>
      {/* Table */}
    </div>
  );
}
""",
    
    # Components - Fees
    "components/Fees/AddFees.tsx": """'use client';

import { useState } from 'react';
import { addFee } from '@/api/Fees/AddFeeAPI';

export default function AddFees({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await addFee(data);
      onSuccess();
    } catch (error) {
      console.error('Error adding fee:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Fees</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Fees/ViewFees.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getFees } from '@/api/Fees/AddFeeAPI';

export default function ViewFees() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getFees();
        setData(result);
      } catch (error) {
        console.error('Error fetching fees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Fees</h2>
      {/* Table */}
    </div>
  );
}
""",
    
    # Components - Income
    "components/Income/CreateIncomeCat.tsx": """'use client';

import { useState } from 'react';

export default function CreateIncomeCat({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Create income category
      onSuccess();
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Income Category</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Income/IncomeCat.tsx": """'use client';

export default function IncomeCat({ categories }: { categories: any[] }) {
  return (
    <div>
      <h2>Income Categories</h2>
      {/* List */}
    </div>
  );
}
""",
    
    "components/Income/ViewIncome.tsx": """'use client';

import { useEffect, useState } from 'react';
import { getIncomes } from '@/api/Income/IncomeAPI';

export default function ViewIncome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getIncomes();
        setData(result);
      } catch (error) {
        console.error('Error fetching incomes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Incomes</h2>
      {/* Table */}
    </div>
  );
}
""",
    
    "components/Loader.tsx": """export default function Loader() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
""",
    
    "components/Login.tsx": """'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/api/Login/Login';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login({ email, password });
      localStorage.setItem('authToken', response.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 mb-4 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 mb-4 border rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
""",
    
    "components/ProtectedRoute.tsx": """'use client';

import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return <>{children}</>;
}
""",
    
    "components/Select.tsx": """'use client';

interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function Select({ options, value, onChange, placeholder }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 border rounded"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
""",
    
    # Components - Students
    "components/Students/AddNewStudent.tsx": """'use client';

import { useState } from 'react';
import { createStudent } from '@/api/Student/StudentsAPI';

export default function AddNewStudent({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createStudent(data);
      onSuccess();
    } catch (error) {
      console.error('Error adding student:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add New Student</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Students/CreateStudent.tsx": """'use client';

import { useState } from 'react';
import { createStudent } from '@/api/Student/StudentsAPI';

export default function CreateStudent({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createStudent(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating student:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Student</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/Students/StudentTable.tsx": """'use client';

export default function StudentTable({ students }: { students: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Roll No</th>
          <th>Class</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td>{student.name}</td>
            <td>{student.rollNo}</td>
            <td>{student.className}</td>
            <td>Edit | Delete</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
""",
    
    # Components - Dashboard
    "components/dashboard/AccountantDashboard.tsx": """'use client';

export default function AccountantDashboard() {
  return (
    <div>
      <h1>Accountant Dashboard</h1>
      {/* Accountant specific content */}
    </div>
  );
}
""",
    
    "components/dashboard/AdminDashboard.tsx": """'use client';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin specific content */}
    </div>
  );
}
""",
    
    "components/dashboard/Header.tsx": """'use client';

import { useState } from 'react';

export default function Header() {
  return (
    <header className="bg-white shadow p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">MMS</h1>
        <div>{/* User menu */}</div>
      </div>
    </header>
  );
}
""",
    
    "components/dashboard/Sidebar.tsx": """'use client';

import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="bg-gray-800 text-white w-64 p-6">
      <nav className="space-y-4">
        <Link href="/dashboard" className="block hover:bg-gray-700 p-2 rounded">Dashboard</Link>
        <Link href="/dashboard/students" className="block hover:bg-gray-700 p-2 rounded">Students</Link>
        <Link href="/dashboard/attendance" className="block hover:bg-gray-700 p-2 rounded">Attendance</Link>
      </nav>
    </aside>
  );
}
""",
    
    "components/dashboard/Skeleton.tsx": """'use client';

export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded"></div>
      <div className="h-4 bg-gray-300 rounded"></div>
    </div>
  );
}
""",
    
    "components/dashboard/StudentDashboard.tsx": """'use client';

export default function StudentDashboard() {
  return (
    <div>
      <h1>Student Dashboard</h1>
      {/* Student specific content */}
    </div>
  );
}
""",
    
    "components/dashboard/TeacherDashboard.tsx": """'use client';

export default function TeacherDashboard() {
  return (
    <div>
      <h1>Teacher Dashboard</h1>
      {/* Teacher specific content */}
    </div>
  );
}
""",
    
    # Components - Responsive
    "components/responsive/ResponsiveGrid.tsx": """'use client';

interface ResponsiveGridProps {
  children: React.ReactNode;
}

export default function ResponsiveGrid({ children }: ResponsiveGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  );
}
""",
    
    "components/responsive/ResponsiveTable.tsx": """'use client';

interface ResponsiveTableProps {
  children: React.ReactNode;
}

export default function ResponsiveTable({ children }: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto">
      {children}
    </div>
  );
}
""",
    
    "components/responsive/ResponsiveTypography.tsx": """'use client';

interface ResponsiveTypographyProps {
  children: React.ReactNode;
  level?: 'h1' | 'h2' | 'h3' | 'p';
}

export default function ResponsiveTypography({ children, level = 'p' }: ResponsiveTypographyProps) {
  const Tag = level;
  const sizeClasses = {
    h1: 'text-2xl md:text-4xl lg:text-5xl',
    h2: 'text-xl md:text-3xl lg:text-4xl',
    h3: 'text-lg md:text-2xl lg:text-3xl',
    p: 'text-sm md:text-base lg:text-lg',
  };

  return <Tag className={`${sizeClasses[level]} font-semibold`}>{children}</Tag>;
}
""",
    
    # Components - Teacher
    "components/teacher/CreateTeacher.tsx": """'use client';

import { useState } from 'react';
import { createTeacher } from '@/api/Teacher/TeachetAPI';

export default function CreateTeacher({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createTeacher(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating teacher:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Teacher</h2>
      {/* Form */}
    </div>
  );
}
""",
    
    "components/teacher/TeacherTable.tsx": """'use client';

export default function TeacherTable({ teachers }: { teachers: any[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((teacher) => (
          <tr key={teacher.id}>
            <td>{teacher.name}</td>
            <td>{teacher.email}</td>
            <td>Edit | Delete</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
""",
    
    # UI Components
    "components/ui/alert-dialog.tsx": """'use client';

interface AlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AlertDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}
""",
    
    "components/ui/animated-modal.tsx": """'use client';

interface AnimatedModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AnimatedModal({ open, onClose, children }: AnimatedModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="float-right p-2 text-gray-600 hover:text-gray-900"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
""",
    
    "components/ui/button.tsx": """'use client';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const baseClass = 'font-semibold rounded transition-colors';
  const variantClass = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-300 text-gray-900 hover:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClass = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]}`}
      {...props}
    />
  );
}
""",
    
    "components/ui/calendar.tsx": """'use client';

import { useState } from 'react';

export default function Calendar() {
  const [date, setDate] = useState(new Date());

  return (
    <div className="p-4 border rounded">
      <input
        type="date"
        value={date.toISOString().split('T')[0]}
        onChange={(e) => setDate(new Date(e.target.value))}
        className="w-full px-3 py-2 border rounded"
      />
    </div>
  );
}
""",
    
    "components/ui/card.tsx": """'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {children}
    </div>
  );
}
""",
    
    "components/ui/checkbox.tsx": """'use client';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Checkbox(props: CheckboxProps) {
  return <input type="checkbox" className="w-4 h-4" {...props} />;
}
""",
    
    "components/ui/command.tsx": """'use client';

interface CommandProps {
  children: React.ReactNode;
}

export default function Command({ children }: CommandProps) {
  return <div className="space-y-2">{children}</div>;
}
""",
    
    "components/ui/dialog.tsx": """'use client';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">{children}</div>
    </div>
  );
}
""",
    
    "components/ui/input.tsx": """'use client';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Input(props: InputProps) {
  return (
    <input
      className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
      {...props}
    />
  );
}
""",
    
    "components/ui/label.tsx": """'use client';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export default function Label(props: LabelProps) {
  return <label className="block text-sm font-medium text-gray-700" {...props} />;
}
""",
    
    "components/ui/pagination.tsx": """'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 border rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span className="px-4 py-2">{currentPage} / {totalPages}</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
""",
    
    "components/ui/popover.tsx": """'use client';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export default function Popover({ open, onOpenChange, children }: PopoverProps) {
  return (
    <button onClick={() => onOpenChange(!open)}>
      {open && <div className="absolute bg-white border rounded shadow mt-2">{children}</div>}
    </button>
  );
}
""",
    
    "components/ui/select.tsx": """'use client';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export default function Select({ options, ...props }: SelectProps) {
  return (
    <select className="px-4 py-2 border rounded" {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
""",
    
    "components/ui/sonner.tsx": """'use client';

export default function Sonner() {
  return null;
}
""",
    
    "components/ui/table.tsx": """'use client';

interface TableProps {
  children: React.ReactNode;
}

export default function Table({ children }: TableProps) {
  return <table className="w-full border-collapse">{children}</table>;
}
""",
    
    "components/ui/toast.tsx": """'use client';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({ message, type = 'info' }: ToastProps) {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${bgColor[type]} text-white p-4 rounded fixed bottom-4 right-4`}>
      {message}
    </div>
  );
}
""",
    
    # Context
    "context/RoleContext.tsx": """'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

interface RoleContextType {
  role: string | null;
  setRole: (role: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}
""",
    
    # Hooks
    "hooks/use-mobile.tsx": """import { useEffect, useState } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
""",
    
    # Libs
    "libs/utils.ts": """export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
""",
    
    # Models
    "models/EntityBase.ts": """export interface EntityBase {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
}
""",
    
    "models/Fees/Fee.ts": """import { EntityBase } from '../EntityBase';

export interface Fee extends EntityBase {
  studentId: string | number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  category?: string;
}
""",
    
    "models/className/className.ts": """import { EntityBase } from '../EntityBase';

export interface ClassName extends EntityBase {
  name: string;
  level: string;
  capacity?: number;
}
""",
    
    "models/classTiming/classTiming.ts": """import { EntityBase } from '../EntityBase';

export interface ClassTiming extends EntityBase {
  startTime: string;
  endTime: string;
  classId?: string | number;
}
""",
    
    "models/expense/expense.ts": """import { EntityBase } from '../EntityBase';

export interface Expense extends EntityBase {
  category: string;
  amount: number;
  description: string;
  date: Date;
}
""",
    
    "models/income/income.ts": """import { EntityBase } from '../EntityBase';

export interface Income extends EntityBase {
  category: string;
  amount: number;
  description: string;
  date: Date;
}
""",
    
    "models/markattendace/markattendance.ts": """import { EntityBase } from '../EntityBase';

export interface MarkAttendance extends EntityBase {
  studentId: string | number;
  date: Date;
  status: 'present' | 'absent' | 'late';
}
""",
    
    "models/students/Student.ts": """import { EntityBase } from '../EntityBase';

export interface Student extends EntityBase {
  name: string;
  email: string;
  rollNo: string;
  className: string;
  status: 'active' | 'inactive';
  fatherName?: string;
  motherName?: string;
}
""",
    
    "models/teacher/Teacher.ts": """import { EntityBase } from '../EntityBase';

export interface Teacher extends EntityBase {
  name: string;
  email: string;
  subject?: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
}
""",
    
    # Utils
    "utils/GetActionDetail.ts": """export interface ActionDetail {
  action: string;
  timestamp: Date;
  userId?: string | number;
  details?: any;
}

export function logAction(detail: ActionDetail): void {
  console.log('[Action Log]', detail);
}

export function getActionDetail(action: string, details?: any): ActionDetail {
  return {
    action,
    timestamp: new Date(),
    details,
  };
}
""",
    
    "utils/rolePermissions.ts": """export const ROLE_PERMISSIONS = {
  admin: ['read', 'create', 'update', 'delete', 'manage_users'],
  teacher: ['read', 'create', 'update', 'mark_attendance'],
  accountant: ['read', 'create', 'update', 'manage_fees', 'manage_expenses'],
  student: ['read'],
} as const;

export function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
  return permissions.includes(permission as any);
}
""",
}


def create_files(base_dir: str = BASE_DIR, files: dict = FILES_DATA) -> None:
    """
    Create files with specified content.
    
    Args:
        base_dir: Base directory where files will be created
        files: Dictionary with file paths and content
    """
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"Creating files in: {base_dir}\n")
    
    for file_path, content in files.items():
        full_path = os.path.join(base_dir, file_path)
        
        try:
            # Create directory structure if it doesn't exist
            directory = os.path.dirname(full_path)
            if directory:
                Path(directory).mkdir(parents=True, exist_ok=True)
            
            # Check if file already exists
            if os.path.exists(full_path):
                print(f"⚠️  SKIPPED: {file_path} (already exists)")
                skipped_count += 1
                continue
            
            # Create and write file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ CREATED: {file_path}")
            created_count += 1
            
        except Exception as e:
            print(f"❌ ERROR: {file_path} - {str(e)}")
            error_count += 1
    
    # Print summary
    print(f"\n" + "="*60)
    print(f"Summary:")
    print(f"  Created: {created_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors:  {error_count}")
    print(f"="*60)


def create_files_from_input() -> None:
    """
    Interactive mode: Create files from user input.
    Allows manual file path and content entry.
    """
    print("Interactive File Creator")
    print("="*60)
    print("Enter file paths and content. Type 'done' when finished.\n")
    
    files = {}
    
    while True:
        file_path = input("Enter file path (or 'done' to finish): ").strip()
        
        if file_path.lower() == 'done':
            break
        
        if not file_path:
            print("⚠️  File path cannot be empty. Try again.\n")
            continue
        
        print("Enter file content (type 'END' on a new line when done):")
        content_lines = []
        while True:
            line = input()
            if line == 'END':
                break
            content_lines.append(line)
        
        content = '\n'.join(content_lines)
        files[file_path] = content
        print(f"✓ Added: {file_path}\n")
    
    if files:
        create_files(files=files)
    else:
        print("No files to create.")


if __name__ == "__main__":
    import sys
    
    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == '--interactive':
        create_files_from_input()
    else:
        # Use predefined FILES_DATA
        create_files()
