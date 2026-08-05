"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, LoaderIcon } from "lucide-react";
import { ClassNameAPI as API } from "@/api/Classname/ClassNameAPI";
import ClassName from "@/components/ClassName/CreateClass";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClassNameModel } from "@/models/className/className";
import { useEffect, useState } from "react";
import DelConfirmMsg from "../DelConfMsg";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
};

export default function ModernStudentTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState<ClassNameModel[]>([]);
  const [loading, setLoading] = useState(true);
  const { permissions, permissionsLoaded } = useRole();

  // setup_classes is ADMIN-only by default in the seed matrix, but ADMIN can
  // open it up to other roles via Manage Role Permissions (view is already
  // opened to several roles today) — so this must read the real permission,
  // not assume ADMIN-only. Hidden while permissions are still loading to
  // avoid a flash of controls that then disappear.
  const canAddClass = permissionsLoaded && !!permissions?.setup_classes?.add;
  const canDeleteClass = permissionsLoaded && !!permissions?.setup_classes?.delete;

  const GetData = async () => {
    setLoading(true);
    try {
      const response = await API.Get();
      const classes = extractArrayData<ClassNameModel>(response);
      setData(classes);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formDeleteHandler = async (confirmed: boolean, deleteData: ClassNameModel) => {
    if (!confirmed) return;
    try {
      await API.Delete(deleteData.class_name_id);
      toast.success("Class deleted successfully", {
        position: "bottom-center",
      });
      GetData();
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data?: { detail?: string } } };
      if (axiosError.response?.status === 409) {
        toast.error(
          "Please delete related student records first before deleting this class.",
          { position: "bottom-center" }
        );
      } else {
        toast.error(
          axiosError.response?.data?.detail || "Failed to delete class.",
          { position: "bottom-center" }
        );
      }
    }
  };

  const baseColumns: ColumnDef<ClassNameModel>[] = [
    {
      id: "sr_no",
      header: "Sr. No",
      cell: ({ row }) => (
        <div className="font-semibold text-foreground dark:text-foreground">{row.index + 1}</div>
      ),
    },
    {
      accessorKey: "class_name",
      header: "Class Name",
      cell: ({ row }) => (
        <div className="text-muted-foreground dark:text-foreground font-medium">{row.getValue("class_name")}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return <div className="text-muted-foreground dark:text-foreground">{format(date, "dd/MM/yyyy")}</div>;
      },
    },
  ];

  const columns: ColumnDef<ClassNameModel>[] = canDeleteClass
    ? [
        ...baseColumns,
        {
          id: "delete",
          header: "Delete",
          cell: ({ row }) => (
            <DelConfirmMsg
              rowId={row.original.class_name_id}
              OnDelete={(confirmed) => formDeleteHandler(confirmed, row.original)}
            />
          ),
        },
      ]
    : baseColumns;

  useEffect(() => {
    GetData();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="mt-4 w-full rounded-[24px] border border-border/80 bg-card/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-border dark:bg-background/70 sm:mt-7 sm:p-6">
      {canAddClass && <ClassName onClassAdded={GetData} />}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
          <Input
            placeholder="Search Class..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-xl border-border pl-10 pr-4 py-2.5 shadow-sm transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border dark:focus:border-primary dark:focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden sm:block overflow-x-auto rounded-[20px] border border-border/80 bg-card/80 shadow-sm dark:border-border dark:bg-background/70">
        <Table className="min-w-[560px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/90 dark:bg-card/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:px-4 sm:py-3 sm:text-sm dark:text-muted-foreground"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-6"
                >
                  <LoaderIcon className="animate-spin w-6 h-6 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`transition-colors duration-200 hover:bg-muted/70 dark:hover:bg-card/80 ${
                    i % 2 === 0
                      ? "bg-card/70 dark:bg-transparent"
                      : "bg-muted/70 dark:bg-card/40"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground dark:text-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - visible only on small screens */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderIcon className="animate-spin w-6 h-6" />
          </div>
        ) : table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="rounded-[20px] border border-border/80 bg-card/90 p-3 shadow-sm dark:border-border dark:bg-card/70"
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Class Name</p>
                <p className="text-sm font-semibold text-foreground dark:text-foreground">{row.original.class_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">Created Date</p>
                <p className="text-sm text-foreground dark:text-foreground">
                  {new Date(row.original.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              {/* Delete button on mobile — gated on setup_classes.delete */}
              {canDeleteClass && (
                <div className="flex justify-end pt-1">
                  <DelConfirmMsg
                    rowId={row.original.class_name_id}
                    OnDelete={(confirmed) => formDeleteHandler(confirmed, row.original)}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-border bg-muted/70 py-8 text-center text-sm text-muted-foreground dark:border-border dark:bg-card/60">No results found.</div>
        )}
      </div>

      {/* Pagination */}
      {table.getFilteredRowModel().rows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} classes
          </span>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-2 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-2 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        </div>
      )}
    </div>
  );
}

