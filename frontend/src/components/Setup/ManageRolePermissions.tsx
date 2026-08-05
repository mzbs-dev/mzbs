"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { PermissionsAPI } from "@/api/Permissions/PermissionsAPI";
import { RolePermission } from "@/models/permissions/Permission";

const ROLES = [
  "ADMIN",
  "CHIEF_PRINCIPAL",
  "PRINCIPAL",
  "TEACHER",
  "STAFF",
  "ACCOUNTANT",
  "FEE_MANAGER",
  "STUDENT",
] as const;

const ACTIONS = ["view", "add", "edit", "delete"] as const;

const MODULE_GROUPS: { label: string; modules: { key: string; label: string }[] }[] = [
  {
    label: "Core",
    modules: [
      { key: "students", label: "Students" },
      { key: "attendance", label: "Attendance" },
      { key: "exam", label: "Exam" },
      { key: "exam_session", label: "Exam (Bulk Session Delete)" },
      { key: "staff", label: "Staff" },
      { key: "fees", label: "Fees" },
      { key: "income", label: "Income" },
      { key: "expenses", label: "Expenses" },
      { key: "salary", label: "Salary" },
      { key: "admissions", label: "Admissions" },
      { key: "deleted_students", label: "Deleted Students" },
    ],
  },
      {
        label: "Setup",
        modules: [
          { key: "setup_classes", label: "Class Name" },
          { key: "setup_class_subjects", label: "Class Subjects" },
          { key: "setup_timings", label: "Class Timings" },
          // `Attendance Values` is hard-coded in the system and is omitted
          // from the editable permissions matrix.
          { key: "setup_teachers", label: "Teachers" },
          { key: "setup_income_categories", label: "Income Categories" },
          { key: "setup_expense_categories", label: "Expense Categories" },
          // Note: `Manage Users` and `Reset Student Password` are admin-only
          // and intentionally omitted from this permissions editing UI.
        ],
      },
];

// Nested lookup: matrix[module][role][action] = allowed
type Matrix = Record<string, Record<string, Record<string, boolean>>>;

function buildMatrix(rows: RolePermission[]): Matrix {
  const matrix: Matrix = {};
  for (const row of rows) {
    if (!matrix[row.module]) matrix[row.module] = {};
    if (!matrix[row.module][row.role]) matrix[row.module][row.role] = {};
    matrix[row.module][row.role][row.action] = row.allowed;
  }
  return matrix;
}

const ManageRolePermissions: React.FC = () => {
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openRoles, setOpenRoles] = useState<Set<string>>(new Set());
  const [pendingCell, setPendingCell] = useState<string | null>(null); // "module:role:action" while a PATCH is in flight

  useEffect(() => {
    (async () => {
      try {
        const response = await PermissionsAPI.GetAll();
        setMatrix(buildMatrix(response.data));
      } catch {
        setError(
          "Could not load the permissions matrix. Please refresh the page or try again shortly."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleRole = (role: string) => {
    setOpenRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const handleToggle = useCallback(
    async (module: string, role: string, action: string, newValue: boolean) => {
      const cellKey = `${module}:${role}:${action}`;

      // Optimistic update
      setMatrix((prev) => ({
        ...prev,
        [module]: {
          ...prev[module],
          [role]: {
            ...prev[module]?.[role],
            [action]: newValue,
          },
        },
      }));
      setPendingCell(cellKey);
      setError(null);

      try {
        await PermissionsAPI.Update(role, module, action, newValue);
      } catch {
        // Revert on failure
        setMatrix((prev) => ({
          ...prev,
          [module]: {
            ...prev[module],
            [role]: {
              ...prev[module]?.[role],
              [action]: !newValue,
            },
          },
        }));
        setError(
          `Failed to update ${role} / ${module} / ${action}. Change was not saved — please try again.`
        );
      } finally {
        setPendingCell(null);
      }
    },
    []
  );

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading permissions…</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {ROLES.map((role) => {
        const isStudent = role === "STUDENT";
        const isOpen = openRoles.has(role);
        return (
          <div
            key={role}
            className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden"
          >
            <button
              onClick={() => toggleRole(role)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
            >
              <span
                className={`font-medium text-sm ${
                  isStudent
                    ? "text-gray-400 dark:text-gray-600"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {role}
                {isStudent && (
                  <span className="ml-2 text-xs font-normal">
                    (fixed — not editable here)
                  </span>
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {isOpen &&
              MODULE_GROUPS.map((group) => (
                <div key={group.label}>
                  <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-3 pt-3 pb-1">
                    {group.label}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        {ACTIONS.map((action) => (
                          <TableHead key={action} className="text-center capitalize">
                            {action}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.modules.map(({ key: moduleKey, label: moduleLabel }) => (
                        <TableRow key={moduleKey}>
                          <TableCell className="font-medium text-sm">
                            {moduleLabel}
                          </TableCell>
                          {ACTIONS.map((action) => {
                            const cellKey = `${moduleKey}:${role}:${action}`;
                            const allowed =
                              matrix[moduleKey]?.[role]?.[action] ?? false;
                            return (
                              <TableCell key={action} className="text-center">
                                <Checkbox
                                  checked={allowed}
                                  disabled={isStudent || pendingCell === cellKey}
                                  onCheckedChange={(checked) =>
                                    handleToggle(
                                      moduleKey,
                                      role,
                                      action,
                                      checked === true
                                    )
                                  }
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
};

export default ManageRolePermissions;
