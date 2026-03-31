# Frontend Src Folder Documentation

## Overview
The `src` folder contains the frontend application built with **Next.js** and **TypeScript/React**. It's organized into logical modules for API calls, UI components, pages, models, and utilities.

---

## 📁 Folder Structure

### 1. **API Folder** (`api/`)
Contains all API communication modules for different features.

| File | Purpose |
|------|---------|
| `axiosInterceptorInstance.ts` | Axios instance with interceptors for API calls (auth, error handling) |
| `AttendaceTime/attendanceTimeAPI.ts` | API calls for attendance time management |
| `Attendance/AttendanceAPI.ts` | API calls for attendance operations (mark, view, edit) |
| `Classname/ClassNameAPI.ts` | API calls for class name operations |
| `Dashboard/dashboardAPI.ts` | API calls for dashboard data and statistics |
| `Expense/ExpenseAPI.ts` | API calls for expense management |
| `Fees/AddFeeAPI.tsx` | API calls for fee operations |
| `Income/IncomeAPI.ts` | API calls for income management |
| `Login/Login.ts` | API calls for authentication/login |
| `Student/StudentsAPI.tsx` | API calls for student management |
| `Teacher/TeachetAPI.ts` | API calls for teacher management |

**Purpose**: Centralized API communication layer for backend integration.

---

### 2. **App Folder** (`app/`)
Next.js app directory containing routes, layouts, and pages.

#### Root Level Files
| File | Purpose |
|------|---------|
| `layout.tsx` | Root layout wrapper for all pages |
| `page.tsx` | Home page |
| `globals.css` | Global CSS styles |
| `ThemeProvider.tsx` | Theme provider component for styling context |
| `favicon.ico` | Website favicon |

#### Authentication & API Routes
| File | Purpose |
|------|---------|
| `api/auth/frontend/login/route.ts` | Backend route handler for login |
| `login/page.tsx` | Login page |

#### Dashboard Routes
| File | Purpose |
|------|---------|
| `dashboard/layout.tsx` | Dashboard layout with sidebar and header |
| `dashboard/page.tsx` | Dashboard home/overview page |

#### Dashboard - Attendance Module
| File | Purpose |
|------|---------|
| `dashboard/attendance/page.tsx` | Attendance overview page |
| `dashboard/attendance/mark_attendance/page.tsx` | Mark attendance page |
| `dashboard/attendance/view_attendance/page.tsx` | View/edit attendance page |

#### Dashboard - Expense Module
| File | Purpose |
|------|---------|
| `dashboard/expense/add_expense/page.tsx` | Add new expense page |
| `dashboard/expense/view_expense/page.tsx` | View expenses page |

#### Dashboard - Fees Module
| File | Purpose |
|------|---------|
| `dashboard/fees/add_fees/page.tsx` | Add new fees page |
| `dashboard/fees/view_fees/page.tsx` | View fees page |

#### Dashboard - Income Module
| File | Purpose |
|------|---------|
| `dashboard/income/add_income/page.tsx` | Add new income page |
| `dashboard/income/view_income/page.tsx` | View income page |

#### Dashboard - Setup/Configuration Module
| File | Purpose |
|------|---------|
| `dashboard/setup/class_name/page.tsx` | Configure class names |
| `dashboard/setup/class_timings/page.tsx` | Configure class timings |
| `dashboard/setup/expense_category/page.tsx` | Configure expense categories |
| `dashboard/setup/income_category/page.tsx` | Configure income categories |
| `dashboard/setup/teacher/page.tsx` | Configure teachers |

#### Dashboard - Students Module
| File | Purpose |
|------|---------|
| `dashboard/students/page.tsx` | View and manage students |

#### Other Pages
| File | Purpose |
|------|---------|
| `unauthorized/page.tsx` | 403 Unauthorized error page |

#### Fonts
| File | Purpose |
|------|---------|
| `fonts/GeistVF.woff` | Geist variable font file |
| `fonts/GeistMonoVF.woff` | Geist Mono variable font file |

**Purpose**: Next.js app directory structure defining all routes and pages.

---

### 3. **Components Folder** (`components/`)
Reusable React components used across pages.

#### UI Components (Shared)
| File | Purpose |
|------|---------|
| `DelConfMsg.tsx` | Delete confirmation modal |
| `Loader.tsx` | Loading spinner component |
| `Login.tsx` | Login form component |
| `ProtectedRoute.tsx` | Route protection wrapper for auth |
| `Select.tsx` | Custom select/dropdown component |

#### Dashboard Components
| File | Purpose |
|------|---------|
| `dashboard/Header.tsx` | Dashboard header/top navigation |
| `dashboard/Sidebar.tsx` | Dashboard sidebar navigation |
| `dashboard/Skeleton.tsx` | Loading skeleton component |
| `dashboard/AdminDashboard.tsx` | Admin-specific dashboard view |
| `dashboard/AccountantDashboard.tsx` | Accountant-specific dashboard view |
| `dashboard/StudentDashboard.tsx` | Student-specific dashboard view |
| `dashboard/TeacherDashboard.tsx` | Teacher-specific dashboard view |

#### Attendance Components
| File | Purpose |
|------|---------|
| `Attendance/MarkAttendance.tsx` | Mark attendance form |
| `Attendance/ViewAttendance.tsx` | View attendance records |
| `Attendance/EditAttendance.tsx` | Edit attendance records |

#### Class Management Components
| File | Purpose |
|------|---------|
| `ClassName/ClassTable.tsx` | Display class names in table |
| `ClassName/CreateClass.tsx` | Create new class form |

#### Class Timing Components
| File | Purpose |
|------|---------|
| `ClassTiming/CreateTIming.tsx` | Create class timing form |
| `ClassTiming/TimingTable.tsx` | Display class timings in table |

#### Expense Components
| File | Purpose |
|------|---------|
| `Expense/CreateExpenseCat.tsx` | Create expense category form |
| `Expense/ExpenseCat.tsx` | Display expense categories |
| `Expense/viewExpense.tsx` | Display expenses in table/view |

#### Fees Components
| File | Purpose |
|------|---------|
| `Fees/AddFees.tsx` | Add fees form |
| `Fees/ViewFees.tsx` | View fees records |

#### Income Components
| File | Purpose |
|------|---------|
| `Income/CreateIncomeCat.tsx` | Create income category form |
| `Income/IncomeCat.tsx` | Display income categories |
| `Income/ViewIncome.tsx` | View income records |

#### Student Components
| File | Purpose |
|------|---------|
| `Students/AddNewStudent.tsx` | Add new student form |
| `Students/CreateStudent.tsx` | Create student form |
| `Students/StudentTable.tsx` | Display students in table |

#### Teacher Components
| File | Purpose |
|------|---------|
| `teacher/CreateTeacher.tsx` | Create teacher form |
| `teacher/TeacherTable.tsx` | Display teachers in table |

#### UI Library Components (Shadcn/ui)
| File | Purpose |
|------|---------|
| `ui/alert-dialog.tsx` | Alert dialog component |
| `ui/animated-modal.tsx` | Animated modal component |
| `ui/button.tsx` | Button component |
| `ui/calendar.tsx` | Calendar picker component |
| `ui/card.tsx` | Card layout component |
| `ui/checkbox.tsx` | Checkbox input component |
| `ui/command.tsx` | Command/search component |
| `ui/dialog.tsx` | Dialog/modal component |
| `ui/input.tsx` | Input field component |
| `ui/label.tsx` | Label component |
| `ui/pagination.tsx` | Pagination control component |
| `ui/popover.tsx` | Popover component |
| `ui/select.tsx` | Select dropdown component |
| `ui/sonner.tsx` | Toast notification component |
| `ui/table.tsx` | Table component |
| `ui/toast.tsx` | Toast notification component |

**Purpose**: Reusable React components for UI building.

---

### 4. **Context Folder** (`context/`)
React context providers for state management.

| File | Purpose |
|------|---------|
| `RoleContext.tsx` | User role/permission context for app-wide access control |

**Purpose**: React context for managing global state (user roles, permissions).

---

### 5. **Hooks Folder** (`hooks/`)
Custom React hooks for reusable logic.

| File | Purpose |
|------|---------|
| `use-mobile.tsx` | Hook to detect mobile device |

**Purpose**: Custom React hooks for component logic.

---

### 6. **Libs Folder** (`libs/`)
Utility libraries and helper functions.

| File | Purpose |
|------|---------|
| `utils.ts` | General utility functions |

**Purpose**: Shared utility/helper functions.

---

### 7. **Models Folder** (`models/`)
TypeScript type definitions and data models.

| File | Purpose |
|------|---------|
| `EntityBase.ts` | Base entity type/interface |
| `Fees/Fee.ts` | Fee data model |
| `className/className.ts` | Class name data model |
| `classTiming/classTiming.ts` | Class timing data model |
| `expense/expense.ts` | Expense data model |
| `income/income.ts` | Income data model |
| `markattendace/markattendance.ts` | Mark attendance data model |
| `students/Student.ts` | Student data model |
| `teacher/Teacher.ts` | Teacher data model |

**Purpose**: TypeScript interfaces and types for type safety.

---

### 8. **Utils Folder** (`utils/`)
Application utility functions.

| File | Purpose |
|------|---------|
| `GetActionDetail.ts` | Function to get action/operation details |
| `rolePermissions.ts` | Role-based permission logic and checks |

**Purpose**: Helper functions for application logic.

---

## 🏗️ Architecture Overview

```
Frontend Structure (Next.js + React + TypeScript)
├── API Layer (api/)
│   └── Centralized API calls for backend communication
├── Pages & Routes (app/)
│   ├── Authentication (login)
│   ├── Dashboard (main application)
│   └── Feature modules (attendance, expenses, fees, income, students, etc.)
├── Components (components/)
│   ├── Feature components (Attendance, Fees, Expenses, etc.)
│   ├── Dashboard layout components
│   └── Reusable UI library (ui/)
├── State Management (context/)
│   └── Role-based access context
├── Type Definitions (models/)
│   └── TypeScript interfaces for all entities
├── Utilities (hooks/, libs/, utils/)
│   └── Reusable logic and helper functions
```

---

## 🔄 Module Dependencies

### Core Modules
1. **Authentication** → Controls access to all pages
2. **Dashboard** → Main hub for all features
3. **Role Context** → Manages user permissions

### Feature Modules
- **Attendance** - Mark and view attendance records
- **Fees** - Manage fees and financial records
- **Expenses** - Track and manage expenses
- **Income** - Track and manage income
- **Students** - Manage student information
- **Teachers** - Manage teacher information
- **Class Setup** - Configure class names and timings

---

## 📊 Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React + Shadcn/ui
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Package Manager**: pnpm

---

## 🔐 Key Features

✅ Role-based access control (Admin, Teacher, Student, Accountant)
✅ Protected routes for authentication
✅ Responsive dashboard layout
✅ Modular component architecture
✅ Type-safe TypeScript implementation
✅ Centralized API communication layer
✅ Custom hooks and utilities
✅ Reusable UI components

---

## 📝 File Statistics

- **Total Files**: ~120
- **API Modules**: 11
- **UI Components**: 80+
- **Pages/Routes**: 30+
- **Data Models**: 9

