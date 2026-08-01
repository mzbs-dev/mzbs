"use client";

import React, { useEffect, useState } from "react";
import { GoDotFill } from "react-icons/go";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Hand,
  LayoutDashboard,
  Moon,
  Sun,
  UserCog2,
  LogOut,
  ChevronDown,
  Banknote,
  BookOpen,
} from "lucide-react";
import { RiCashLine } from "react-icons/ri";
import { BsCashCoin } from "react-icons/bs";
import { GiExpense } from "react-icons/gi";
import { useRole } from "@/context/RoleContext";
import { canAccessSection, canAccessSubmenuItem } from "@/utils/rolePermissions";
import axiosInstance from "@/api/axiosInterceptorInstance";
import { useBranding } from "@/context/BrandingContext";

type MenuItem = {
  id: number;
  name: string;
  icon: React.ElementType;
  path: string;
  hasSubmenu?: boolean;
  submenu?: {
    id: number;
    name: string;
    path: string;
    icon: React.ElementType;
  }[];
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const menuList: MenuItem[] = [
  { id: 1, name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    id: 2,
    name: "Student",
    icon: GraduationCap,
    path: "/dashboard/students",
    hasSubmenu: true,
    submenu: [
      {
        id: 21,
        name: "All Students",
        icon: GoDotFill,
        path: "/dashboard/students",
      },
      {
        id: 22,
        name: "Student Profile",
        icon: GoDotFill,
        path: "/dashboard/students/profile",
      },
      {
        id: 23,
        name: "Deleted Students",
        icon: GoDotFill,
        path: "/dashboard/students/deleted",
      },
    ],
  },
  {
    id: 3,
    name: "Attendance",
    icon: Hand,
    path: "/dashboard/attendance",
    hasSubmenu: true,
    submenu: [
      {
        id: 8,
        name: "Mark Attendance",
        icon: GoDotFill,
        path: "/dashboard/attendance/mark_attendance",
      },
      {
        id: 9,
        name: "View Attendance",
        icon: GoDotFill,
        path: "/dashboard/attendance/view_attendance",
      },
      {
        id: 31,
        name: "Attendance Summary",
        icon: GoDotFill,
        path: "/dashboard/attendance/attendance_status_summary",
      },
    ],
  },
  {
    id: 36,
    name: "Exam",
    icon: BookOpen,
    path: "/dashboard/exam",
    hasSubmenu: true,
    submenu: [
      {
        id: 361,
        name: "Enter Marks",
        icon: GoDotFill,
        path: "/dashboard/exam/enter_marks",
      },
      {
        id: 362,
        name: "View Marks",
        icon: GoDotFill,
        path: "/dashboard/exam/view_marks",
      },
      {
        id: 363,
        name: "Edit Marks",
        icon: GoDotFill,
        path: "/dashboard/exam/edit_marks",
      },
      {
        id: 364,
        name: "Class Result",
        icon: GoDotFill,
        path: "/dashboard/exam/class_result",
      },
      {
        id: 365,
        name: "Exam Sheet",
        icon: GoDotFill,
        path: "/dashboard/exam/exam_sheet",
      },
    ],
  },
  {
    id: 10,
    name: "Fees",
    icon: RiCashLine,
    path: "/dashboard/fees",
    hasSubmenu: true,
    submenu: [
      {
        id: 11,
        name: "Add Fees",
        icon: GoDotFill,
        path: "/dashboard/fees/add_fees",
      },
      {
        id: 12,
        name: "View Fees",
        icon: GoDotFill,
        path: "/dashboard/fees/view_fees",
      },
    ],
  },
  {
    id: 37,
    name: "Staff",
    icon: UserCog2,
    path: "/dashboard/staff",
    hasSubmenu: true,
    submenu: [
      {
        id: 371,
        name: "View Staff",
        icon: GoDotFill,
        path: "/dashboard/staff/view_staff",
      },
      {
        id: 372,
        name: "Staff Attendance",
        icon: GoDotFill,
        path: "/dashboard/staff/attendance",
      },
    ],
  },
  {
    id: 32,
    name: "Salary",
    icon: Banknote,
    path: "/dashboard/salary",
    hasSubmenu: true,
    submenu: [
      {
        id: 33,
        name: "Set Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/set",
      },
      {
        id: 34,
        name: "Manage Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/manage",
      },
      {
        id: 35,
        name: "Salary Logs",
        icon: GoDotFill,
        path: "/dashboard/salary/logs",
      },
      {
        id: 32.1,
        name: "View Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/index",
      },
    ],
  },
  {
    id: 13,
    name: "Income",
    icon: BsCashCoin,
    path: "/dashboard/income",
    hasSubmenu: true,
    submenu: [
      {
        id: 14,
        name: "Add Income",
        icon: GoDotFill,
        path: "/dashboard/income/add_income",
      },
      {
        id: 15,
        name: "View Income",
        icon: GoDotFill,
        path: "/dashboard/income/view_income",
      },
    ],
  },
  {
    id: 17,
    name: "Expense",
    icon: GiExpense,
    path: "/dashboard/Expense",
    hasSubmenu: true,
    submenu: [
      {
        id: 18,
        name: "Add Expense",
        icon: GoDotFill,
        path: "/dashboard/expense/add_expense",
      },
      {
        id: 19,
        name: "View Expense",
        icon: GoDotFill,
        path: "/dashboard/expense/view_expense",
      },
    ],
  },
  {
    id: 4,
    name: "Setup",
    icon: UserCog2,
    path: "/dashboard/settings",
    hasSubmenu: true,
    submenu: [
      {
        id: 5,
        name: "Class Name",
        icon: GoDotFill,
        path: "/dashboard/setup/class_name",
      },
      {
        id: 23,
        name: "Role Permissions",
        icon: GoDotFill,
        path: "/dashboard/setup/role_permissions",
      },
      {
        id: 6,
        name: "Class Subjects",
        icon: GoDotFill,
        path: "/dashboard/setup/class_subject",
      },
      {
        id: 7,
        name: "Class Timings",
        icon: GoDotFill,
        path: "/dashboard/setup/class_timings",
      },
      {
        id: 8,
        name: "Teacher",
        icon: GoDotFill,
        path: "/dashboard/setup/teacher",
      },
      {
        id: 16,
        name: "Income Category",
        icon: GoDotFill,
        path: "/dashboard/setup/income_category",
      },
      {
        id: 17,
        name: "Expense Category",
        icon: GoDotFill,
        path: "/dashboard/setup/expense_category",
      },
      {
        id: 21,
        name: "Manage User",
        icon: GoDotFill,
        path: "/dashboard/setup/manage_user",
      },
      {
        id: 22,
        name: "Student Password",
        icon: GoDotFill,
        path: "/dashboard/setup/reset_student_password",
      },
      {
        id: 24,
        name: "Appearance",
        icon: GoDotFill,
        path: "/dashboard/setup/appearance",
      },
    ],
  },
  { id: 5, name: "Logout", icon: LogOut, path: "/login" },
];

// Map menu item paths to role access sections
const getMenuItemSection = (path: string): string => {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("/students")) return "students";
  if (lowerPath.includes("/attendance")) return "attendance";
  if (lowerPath.includes("/fees")) return "fees";
  if (lowerPath.includes("/salary")) return "salary";
  if (lowerPath.includes("/income")) return "income";
  if (lowerPath.includes("/expense")) return "expenses";
  if (lowerPath.includes("/setup") || lowerPath.includes("/settings")) return "setup";
  if (lowerPath.includes("/exam")) return "exam";
  if (lowerPath.includes("/staff")) return "staff";
  if (lowerPath.includes("/dashboard")) return "dashboard";
  return "dashboard";
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading, clearRole, permissions } = useRole();
  const { schoolName } = useBranding();
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userData, setUserData] = useState<string | null>(null);
  
  
  useEffect(() => {
    // This runs only in the browser
    const storedUser = localStorage.getItem("user");
    setUserData(storedUser);
  }, []);

  // Filter menu items based on user role
  const visibleMenuItems = menuList.filter((item) => {
    // Logout is always visible
    if (item.name === "Logout") return true;

    // Check if role can access this section
    const section = getMenuItemSection(item.path);
    return canAccessSection(role, section, permissions);
  });

  const toggleSubmenu = (id: number) =>
    setOpenSubmenu(openSubmenu === id ? null : id);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");  // clears HTTPOnly cookies server-side
    } catch {
      // proceed with local cleanup even if the call fails
    } finally {
      clearRole();            // clears sessionStorage + localStorage via context
      localStorage.clear();   // belt-and-suspenders
      sessionStorage.clear();
      router.replace("/login");
    }
  };

  // Helper function to safely check if pathname starts with a path
  const isActivePath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname.startsWith(path);
  };

  // Helper function to check if pathname exactly matches a path
  const isExactPath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname === path;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-70 z-40 md:hidden transition-opacity ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible -z-10"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed z-50 top-0 left-0 h-screen w-72 bg-white/90 dark:bg-neutral-950/90 border-r border-slate-200/80 dark:border-neutral-800 p-4 flex flex-col transform transition-all duration-300 shadow-[12px_0_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl
          ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:static md:z-auto`}
      >
        <div 
          className="rounded-2xl border p-3 shadow-lg"
          style={{
            borderColor: `hsl(var(--sidebar-border))`,
            backgroundImage: `linear-gradient(to bottom right, hsl(var(--sidebar-primary) / 0.9), hsl(var(--sidebar-accent) / 0.8))`,
            color: `hsl(var(--foreground))`,
          }}
        >
        <div className="flex flex-col items-center gap-2 text-center">
          <Image
              src="/logo.png"
              alt="Logo"
              width={56}
              height={56}
              className="rounded-full bg-white/90 p-1 object-cover"
              unoptimized
            />
            <div>
              <h2 className="text-sm font-semibold leading-tight" style={{ color: `hsl(var(--foreground))` }}>
                Madrasah Management System
              </h2>
              <p className="mt-0.5 text-xs font-medium opacity-80" style={{ color: `hsl(var(--foreground))` }}>
                 {schoolName}
              </p>
            </div>
        </div>
          {/* <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo"
              width={44}
              height={44}
              className="rounded-xl bg-white/90 p-1 dark:invert"
              unoptimized
            />
            <div>
              <h2 className="text-sm font-semibold leading-tight" style={{ color: `hsl(var(--foreground))` }}>
                Madrasah Management System
              </h2>
            </div>
          </div> */}
        </div>

        <div 
          className="mt-4 rounded-2xl border p-3 shadow-sm"
          style={{
            borderColor: `hsl(var(--sidebar-border))`,
            backgroundColor: `hsl(var(--sidebar-background) / 0.8)`,
          }}
        >
          <div className="flex items-center space-x-3">
            <Image
              src="/image.png"
              alt="User"
              width={42}
              height={42}
              className="rounded-full border"
              style={{
                borderColor: `hsl(var(--sidebar-border))`,
              }}
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold uppercase" style={{ color: `hsl(var(--sidebar-foreground))` }}>
                {userData ? JSON.parse(userData).username : "Guest"}
              </h2>
              <p className="truncate text-xs font-medium uppercase" style={{ color: `hsl(var(--muted-foreground))` }}>
                {role || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleMenuItems.map((item) => (
            <div key={item.id}>
              {item.hasSubmenu ? (
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  className="group flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all"
                  style={{
                    borderColor: isActivePath(item.path) ? `hsl(var(--sidebar-ring) / 0.3)` : 'transparent',
                    backgroundColor: isActivePath(item.path) ? `hsl(var(--sidebar-primary) / 0.15)` : 'transparent',
                    color: isActivePath(item.path) ? `hsl(var(--sidebar-primary))` : `hsl(var(--sidebar-foreground))`,
                    boxShadow: isActivePath(item.path) ? `0 1px 3px hsl(var(--sidebar-ring) / 0.1)` : 'none',
                  }}
                >
                  <div className="flex items-center">
                    <span 
                      className="mr-3 rounded-lg p-1.5"
                      style={{
                        backgroundColor: isActivePath(item.path) ? `hsl(var(--sidebar-primary) / 0.25)` : `hsl(var(--muted) / 0.5)`,
                        color: isActivePath(item.path) ? `hsl(var(--sidebar-primary))` : `hsl(var(--muted-foreground))`,
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      openSubmenu === item.id ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
              ) : item.name === "Logout" ? (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-destructive/30 hover:bg-destructive/10"
                  style={{
                    color: `hsl(var(--sidebar-foreground))`,
                  }}
                >
                  <span 
                    className="mr-3 rounded-lg p-1.5"
                    style={{
                      backgroundColor: `hsl(var(--destructive) / 0.15)`,
                      color: `hsl(var(--destructive))`,
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.name}</span>
                </button>
              ) : (
                <Link
                  href={item.path}
                  className="flex items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all"
                  style={{
                    borderColor: isExactPath(item.path) ? `hsl(var(--sidebar-ring) / 0.3)` : 'transparent',
                    backgroundColor: isExactPath(item.path) ? `hsl(var(--sidebar-primary) / 0.15)` : 'transparent',
                    color: isExactPath(item.path) ? `hsl(var(--sidebar-primary))` : `hsl(var(--sidebar-foreground))`,
                    boxShadow: isExactPath(item.path) ? `0 1px 3px hsl(var(--sidebar-ring) / 0.1)` : 'none',
                  }}
                >
                  <span 
                    className="mr-3 rounded-lg p-1.5"
                    style={{
                      backgroundColor: isExactPath(item.path) ? `hsl(var(--sidebar-primary) / 0.25)` : `hsl(var(--muted) / 0.5)`,
                      color: isExactPath(item.path) ? `hsl(var(--sidebar-primary))` : `hsl(var(--muted-foreground))`,
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>{item.name}</span>
                </Link>
              )}
              {item.hasSubmenu && openSubmenu === item.id && (
                <div 
                  className="ml-6 mt-1 space-y-1 border-l pl-3"
                  style={{
                    borderColor: `hsl(var(--sidebar-border))`,
                  }}
                >
                  {item.submenu
                    ?.filter((subItem) => {
                      const section = getMenuItemSection(subItem.path);
                      return canAccessSection(role, section, permissions) && canAccessSubmenuItem(role, subItem.path, permissions);
                    })
                    .map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.path}
                        className="flex rounded-lg px-2 py-2 text-sm transition hover:bg-sidebar-accent/50"
                        style={{
                          color: `hsl(var(--sidebar-accent-foreground))`,
                        }}
                      >
                        <subItem.icon className="mr-2 mt-0.5 h-3.5 w-3.5" />
                        {subItem.name}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <button
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            document.documentElement.classList.toggle("dark");
          }}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition"
          style={{
            borderColor: `hsl(var(--sidebar-border))`,
            backgroundColor: `hsl(var(--sidebar-background))`,
            color: `hsl(var(--sidebar-foreground))`,
          }}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
