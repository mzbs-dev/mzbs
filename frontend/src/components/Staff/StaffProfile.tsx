"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { StaffProfileAPI, StaffProfileResponse } from "@/api/StaffProfile/StaffProfileAPI";
import { AttendanceTimeAPI } from "@/api/AttendanceTime/attendanceTimeAPI";
import { Select } from "@/components/Select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface StaffOption {
  staff_id: number;
  staff_name: string;
}

type TabKey = "basic" | "attendance" | "syllabus";

export default function StaffProfile() {
  const { permissions, role } = useRole();
  const isAdmin = role?.toUpperCase() === "ADMIN";
  const canView = permissions?.staff_profile?.view ?? isAdmin;
  const canEdit = permissions?.staff_profile?.edit ?? isAdmin;

  const [staffOptions, setStaffOptions] = useState<{ id: string | number; title: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [profile, setProfile] = useState<StaffProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  // Shift assignment editing state
  const [allShifts, setAllShifts] = useState<Array<{
    attendance_time_id: number;
    attendance_time: string;
    start_time: string | null;
    end_time: string | null;
  }>>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<number>>(new Set());
  const [savingShifts, setSavingShifts] = useState(false);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      try {
        const list = await StaffProfileAPI.getStaffList();
        setStaffOptions(list.map((s: StaffOption) => ({ id: s.staff_id, title: s.staff_name })));
      } catch {
        toast.error("Failed to load staff list.");
      }
    })();
    void (async () => {
      try {
        const t = await AttendanceTimeAPI.Get();
        const items = Array.isArray(t?.data) ? t.data : [];
        const now = new Date();
        const forDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;
        const shifts = await Promise.all(
          items.map(async (it: any) => {
            const timing = await AttendanceTimeAPI.getTimingVersionForDate(
              it.attendance_time_id,
              forDate
            ).catch(() => null);
            return {
              attendance_time_id: it.attendance_time_id,
              attendance_time: it.attendance_time,
              start_time: timing?.start_time ?? null,
              end_time: timing?.end_time ?? null,
            };
          })
        );
        setAllShifts(shifts);
      } catch {
        // Non-fatal — shift assignment control just stays empty
      }
    })();
  }, [canView]);

  const handleGetProfile = async () => {
    if (!selectedStaff) {
      setError("Please select a staff member first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await StaffProfileAPI.getProfile(Number(selectedStaff));
      setProfile(data);
      setSelectedShiftIds(new Set(data.assigned_shifts.map((s) => s.attendance_time_id)));
    } catch {
      setError("Unable to load staff profile. Please try again.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleShift = (id: number) => {
    setSelectedShiftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveShifts = async () => {
    if (!profile) return;
    setSavingShifts(true);
    try {
      const updated = await StaffProfileAPI.setShifts(profile.staff_id, Array.from(selectedShiftIds));
      setProfile((prev) => (prev ? { ...prev, assigned_shifts: updated } : prev));
      toast.success("Assigned shifts updated.");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update assigned shifts.");
    } finally {
      setSavingShifts(false);
    }
  };

  const previousAttendance = useMemo(() => {
    const holidayDates = new Set<string>();
    return (profile?.previous_attendance ?? []).filter((row) => {
      if (!row.is_calendar_holiday) return true;
      if (holidayDates.has(row.attendance_date)) return false;
      holidayDates.add(row.attendance_date);
      return true;
    });
  }, [profile?.previous_attendance]);

  const tabConfig = useMemo(
    () => [
      { key: "basic" as const, label: "Basic Information" },
      { key: "attendance" as const, label: "Previous Attendance" },
      { key: "syllabus" as const, label: "Syllabus" },
    ],
    []
  );

  if (!canView) {
    return <div className="p-6 text-sm text-muted-foreground">You don&apos;t have access to Staff Profile.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Filter Card */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Select Staff</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleGetProfile();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-[minmax(0,1fr)_auto] min-[480px]:items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                  Staff Member
                </label>
                <Select
                  options={staffOptions}
                  value={selectedStaff}
                  onChange={(event) => setSelectedStaff(event.target.value)}
                  className="h-10 text-sm rounded-lg w-full"
                />
              </div>
              <div>
                <Button type="submit" disabled={loading} className="h-10 w-full min-[480px]:w-36">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Get Profile"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {profile && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          {/* Basic info header */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <h4 className="text-lg font-semibold">{profile.staff_name}</h4>
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Joined {new Date(profile.joining_date).toLocaleDateString("en-GB")} • {profile.total_stay}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  activeTab === tab.key
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Staff Name", profile.staff_name],
                    ["Joining Date", new Date(profile.joining_date).toLocaleDateString("en-GB")],
                    ["Total Stay", profile.total_stay],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-background p-4 shadow-sm">
                      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                      <p className="mt-1 text-sm">{value || "N/A"}</p>
                    </div>
                  ))}
                </div>

                {/* Assigned Shifts */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Assigned Shifts</p>
                    {canEdit && (
                      <Button size="sm" disabled={savingShifts} onClick={() => void handleSaveShifts()}>
                        {savingShifts ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Save Shifts"}
                      </Button>
                    )}
                  </div>
                  {allShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shifts configured yet.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {allShifts.map((shift) => (
                        <label
                          key={shift.attendance_time_id}
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedShiftIds.has(shift.attendance_time_id)}
                            disabled={!canEdit}
                            onCheckedChange={() => toggleShift(shift.attendance_time_id)}
                          />
                          <span className="flex flex-col">
                            <span>{shift.attendance_time}</span>
                            <span className="text-xs text-muted-foreground">
                              {shift.start_time && shift.end_time
                                ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`
                                : "Timing not configured"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {!canEdit && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      You don&apos;t have permission to edit shift assignments.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div>
                {previousAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No finalized attendance records found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted text-left">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2">Shift</th>
                          <th className="px-3 py-2">Final Status</th>
                          <th className="px-3 py-2">Arrival</th>
                          <th className="px-3 py-2">Departure</th>
                          <th className="px-3 py-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousAttendance.map((row) => (
                          <tr
                            key={row.staff_attendance_id ?? `holiday-${row.attendance_date}`}
                            className={`border-t border-border ${row.is_calendar_holiday ? "bg-muted/40" : ""}`}
                          >
                            <td className="px-3 py-2">
                              {new Date(row.attendance_date).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-3 py-2">{row.weekday}</td>
                            <td className="px-3 py-2">
                              {row.is_calendar_holiday ? "—" : (
                                <>
                                  <div>{row.attendance_time_name ?? "General / No Shift Assigned"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {row.schedule_is_legacy
                                      ? "Historical timing unavailable"
                                      : row.expected_start_time && row.expected_end_time
                                      ? `${row.expected_start_time.slice(0, 5)} - ${row.expected_end_time.slice(0, 5)}`
                                      : "Timing not configured"}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.is_calendar_holiday ? (
                                <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">HOLIDAY</span>
                              ) : row.final_status ?? "—"}
                            </td>
                            <td className="px-3 py-2">{row.arrival_time ?? "—"}</td>
                            <td className="px-3 py-2">{row.departure_time ?? "—"}</td>
                            <td className="px-3 py-2">{row.holiday_label ?? row.final_remarks ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "syllabus" && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Syllabus — Coming soon
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
