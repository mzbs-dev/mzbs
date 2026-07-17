import { MyPermissions } from "@/models/permissions/Permission";

// Role-based access control mapping
export type UserRole =
  | "ADMIN"
  | "CHIEF_PRINCIPAL"
  | "PRINCIPAL"
  | "TEACHER"
  | "STAFF"
  | "ACCOUNTANT"
  | "FEE_MANAGER"
  | "STUDENT";

export type Section =
  | "dashboard"
  | "attendance"
  | "students"
  | "teachers"
  | "fees"
  | "expenses"
  | "income"
  | "salary"
  | "setup"
  | "exam"
  | "staff";

// Role to accessible sections mapping
// STATIC FALLBACK ONLY — used when the dynamic /permissions/me fetch fails.
// Do not edit this to reflect new business rules going forward; make the
// change in the role_permissions table instead (via the Setup screen).
const ROLE_PERMISSIONS: Record<UserRole, Section[]> = {
  ADMIN: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "fees",
    "expenses",
    "income",
    "salary",
    "setup",
    "exam",
    "staff",
  ],
  CHIEF_PRINCIPAL: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "fees",
    "exam",
    "staff",
  ],
  PRINCIPAL: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "fees",
    "exam",
  ],
  TEACHER: ["attendance", "students", "dashboard", "exam"],
  STAFF: ["attendance", "students", "dashboard"],
  ACCOUNTANT: ["expenses", "fees", "income", "dashboard", "salary"],
  FEE_MANAGER: ["fees", "dashboard", "students"],
  STUDENT: ["dashboard"], // Students can access own attendance & fees through filtered endpoints
};

// Maps a nav Section to the backend module name checked for its "view"
// permission. Sections not listed here (e.g. "dashboard") are always
// accessible once logged in — they aren't gated by a specific module.
const SECTION_TO_MODULE: Partial<Record<Section, string>> = {
  students: "students",
  attendance: "attendance",
  fees: "fees",
  income: "income",
  expenses: "expenses",
  salary: "salary",
  exam: "exam",
  staff: "staff",
};

// Maps specific Setup submenu paths (and a couple of other narrowly-scoped
// items like "/fees/add_fees") to their backend module + action. Anything
// not listed here falls through to the default (true) at the end of
// canAccessSubmenuItemDynamic — i.e. visible as long as its parent section
// is accessible.
const SUBMENU_MODULE_MAP: { match: string; module: string; action: string }[] = [
  { match: "/fees/add_fees", module: "fees", action: "add" },
  { match: "/students/deleted", module: "deleted_students", action: "view" },
  { match: "/setup/manage_user", module: "setup_users", action: "view" },
  { match: "/setup/class_name", module: "setup_classes", action: "view" },
  { match: "/setup/class_subject", module: "setup_class_subjects", action: "view" },
  { match: "/setup/class_timings", module: "setup_timings", action: "view" },
  { match: "/setup/teacher", module: "setup_teachers", action: "view" },
  { match: "/setup/income_category", module: "setup_income_categories", action: "view" },
  { match: "/setup/expense_category", module: "setup_expense_categories", action: "view" },
  { match: "/setup/reset_student_password", module: "setup_reset_student_password", action: "view" },
];

/**
 * Check if a user with a given role can access a section.
 * Dynamic-first: if `permissions` (from GET /permissions/me) is available,
 * resolve entirely from that. Only falls back to the static ROLE_PERMISSIONS
 * object if the fetch itself failed (permissions === null/undefined).
 */
export function canAccessSection(
  role: string | null,
  section: string,
  permissions?: MyPermissions | null
): boolean {
  if (!role) return false;
  if (!isValidRole(role)) return false;

  if (permissions) {
    return canAccessSectionDynamic(role, section, permissions);
  }
  return canAccessSectionStatic(role, section);
}

function canAccessSectionDynamic(
  role: string,
  section: string,
  permissions: MyPermissions
): boolean {
  // Dashboard has no permission gate — any authenticated user sees it.
  if (section === "dashboard") return true;

  // "setup" is a single frontend nav section, but backed by 8+ granular
  // setup_* modules. Show the Setup nav item if the role can view ANY of them.
  if (section === "setup") {
    return Object.keys(permissions).some(
      (module) => module.startsWith("setup_") && permissions[module]?.view
    );
  }

  const module = SECTION_TO_MODULE[section as Section];
  if (!module) return false; // unknown/unmapped section — deny by default

  return permissions[module]?.view ?? false;
}

function canAccessSectionStatic(role: string, section: string): boolean {
  const sections = ROLE_PERMISSIONS[role as UserRole];
  return sections.includes(section as Section);
}

/**
 * Get all accessible sections for a role (static fallback list only —
 * used for things like initial nav skeletons before permissions load).
 */
export function getAccessibleSections(role: string | null): Section[] {
  if (!role || !isValidRole(role)) return [];
  return ROLE_PERMISSIONS[role as UserRole];
}

/**
 * Check if a user can access a given route path (unchanged — still purely
 * a path-to-section mapper, section access itself now goes through
 * canAccessSection above).
 */
export function canAccessRoute(role: string | null, pathname: string): boolean {
  if (!role) return false;

  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "dashboard") {
    return true;
  }

  if (parts.length === 1) {
    return canAccessSection(role, "dashboard");
  }

  const sectionMap: Record<string, string> = { expense: "expenses" };
  const raw = parts[1];
  const section = sectionMap[raw] ?? raw;
  return canAccessSection(role, section);
}

/**
 * Validate if a string is a valid role
 */
export function isValidRole(role: string): boolean {
  return ["ADMIN", "CHIEF_PRINCIPAL", "PRINCIPAL", "TEACHER", "STAFF", "ACCOUNTANT", "FEE_MANAGER", "STUDENT"].includes(
    role
  );
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string | null): string {
  if (!role) return "Unknown";

  const displayNames: Record<UserRole, string> = {
    ADMIN: "Administrator",
    CHIEF_PRINCIPAL: "Chief Principal",
    PRINCIPAL: "Principal",
    TEACHER: "Teacher",
    STAFF: "Staff",
    ACCOUNTANT: "Accountant",
    FEE_MANAGER: "Fee Manager",
    STUDENT: "Student",
  };

  return displayNames[role as UserRole] || role;
}

/**
 * Check if a submenu item should be visible for a given role.
 * Dynamic-first, same rule as canAccessSection.
 */
export function canAccessSubmenuItem(
  role: string | null,
  submenuPath: string,
  permissions?: MyPermissions | null
): boolean {
  if (!role) return false;

  if (permissions) {
    return canAccessSubmenuItemDynamic(role, submenuPath, permissions);
  }
  return canAccessSubmenuItemStatic(role, submenuPath);
}

function canAccessSubmenuItemDynamic(
  role: string,
  submenuPath: string,
  permissions: MyPermissions
): boolean {
  // TEACHER/STAFF nav-narrowing: this is a UX scoping rule (which submenu
  // items make sense to show), not a security boundary — the backend
  // already enforces the real permission on every endpoint regardless.
  // Preserved here so the nav doesn't get noisier than before for these
  // two roles once dynamic permissions come online.
  if (role === "TEACHER" || role === "STAFF") {
    const allowed =
      submenuPath.includes("/attendance/mark_attendance") ||
      submenuPath.includes("/attendance/view_attendance") ||
      submenuPath.includes("/exam") ||
      (submenuPath.includes("/students") && !submenuPath.includes("/deleted"));
    if (!allowed) return false;
  }

  // The Role Permissions screen itself is gated by a hardcoded require_admin()
  // on the backend (deliberately outside the dynamic system — see Phase 1
  // guardrails), so it's always ADMIN-only here too, never toggle-able.
  if (submenuPath.includes("/setup/role_permissions")) {
    return role === "ADMIN";
  }

  const mapping = SUBMENU_MODULE_MAP.find((m) => submenuPath.includes(m.match));
  if (mapping) {
    return permissions[mapping.module]?.[mapping.action] ?? false;
  }

  // No specific mapping — visible as long as its parent section is accessible
  // (already checked separately by the Sidebar before this function runs).
  return true;
}

function canAccessSubmenuItemStatic(role: string, submenuPath: string): boolean {
  const isPrincipalLikeRole = role === "PRINCIPAL" || role === "CHIEF_PRINCIPAL";

  if (isPrincipalLikeRole && submenuPath.includes("/fees/add_fees")) {
    return false;
  }

  if (submenuPath.includes("/students/deleted")) {
    return role === "ADMIN" || isPrincipalLikeRole;
  }

  if (submenuPath.includes("/setup/manage_user")) {
    return role === "ADMIN";
  }

  if (submenuPath.includes("/setup/role_permissions")) {
    return role === "ADMIN";
  }

  if (role === "TEACHER" || role === "STAFF") {
    return (
      submenuPath.includes("/attendance/mark_attendance") ||
      submenuPath.includes("/attendance/view_attendance") ||
      submenuPath.includes("/exam") ||
      (submenuPath.includes("/students") && !submenuPath.includes("/deleted"))
    );
  }

  return true;
}
