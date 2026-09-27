"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AttendancePolicyAPI, AttendancePolicy, AttendanceDateException } from "@/api/AttendancePolicy/AttendancePolicyAPI";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AttendancePolicySettings() {
  const [policy, setPolicy] = useState<AttendancePolicy>({ weekly_holidays: [], date_exceptions: [] });
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"HOLIDAY" | "WORKING_DAY">("HOLIDAY");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPolicy(await AttendancePolicyAPI.get());
    } catch {
      toast.error("Unable to load attendance calendar settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const toggleDay = async (day: number) => {
    const next = policy.weekly_holidays.includes(day)
      ? policy.weekly_holidays.filter((item) => item !== day)
      : [...policy.weekly_holidays, day].sort();
    setSaving(true);
    try {
      setPolicy(await AttendancePolicyAPI.setWeeklyHolidays(next));
    } catch {
      toast.error("Unable to save weekly holidays.");
    } finally {
      setSaving(false);
    }
  };

  const addException = async () => {
    if (!date) {
      toast.error("Select an exception date.");
      return;
    }
    try {
      const created = await AttendancePolicyAPI.addException({
        exception_date: date,
        kind,
        label: label || undefined,
      });
      setPolicy((current) => ({ ...current, date_exceptions: [...current.date_exceptions, created].sort((a, b) => a.exception_date.localeCompare(b.exception_date)) }));
      setDate("");
      setLabel("");
      toast.success("Calendar exception added.");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Unable to add exception.");
    }
  };

  const removeException = async (exception: AttendanceDateException) => {
    try {
      await AttendancePolicyAPI.deleteException(exception.id);
      setPolicy((current) => ({ ...current, date_exceptions: current.date_exceptions.filter((item) => item.id !== exception.id) }));
    } catch {
      toast.error("Unable to remove exception.");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><LoaderCircle className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Weekly Holidays</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure shared weekly holidays and date exceptions for students and staff.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((day, index) => (
            <label key={day} htmlFor={`weekly-holiday-${index}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50">
              <Checkbox
                id={`weekly-holiday-${index}`}
                checked={policy.weekly_holidays.includes(index)}
                disabled={saving}
                onCheckedChange={() => void toggleDay(index)}
              />
              {day}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Date Exceptions</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Select value={kind} onValueChange={(value) => setKind(value as "HOLIDAY" | "WORKING_DAY")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOLIDAY">Holiday</SelectItem>
              <SelectItem value="WORKING_DAY">Working Day</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Label (optional)" value={label} onChange={(event) => setLabel(event.target.value)} />
          <Button type="button" onClick={() => void addException()}>Add Exception</Button>
        </div>
        <div className="mt-4 divide-y divide-border rounded-md border border-border">
          {policy.date_exceptions.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No date exceptions configured.</p> : policy.date_exceptions.map((exception) => (
            <div key={exception.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>{exception.exception_date} - {exception.label || exception.kind.replace("_", " ")}</span>
              <Button type="button" size="icon" variant="ghost" title="Remove exception" aria-label="Remove exception" onClick={() => void removeException(exception)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
