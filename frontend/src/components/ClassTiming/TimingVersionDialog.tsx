"use client";

import { useEffect, useState } from "react";
import { LoaderIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AttendanceTimeAPI } from "@/api/AttendanceTime/attendanceTimeAPI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimingVersionDialogProps {
  attendanceTimeId: number;
  attendanceTime: string;
  canEdit: boolean;
}

export default function TimingVersionDialog({
  attendanceTimeId,
  attendanceTime,
  canEdit,
}: TimingVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<AttendanceTimeAPI.TimingVersion[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const loadedVersions = await AttendanceTimeAPI.getTimingVersions(attendanceTimeId);
      setVersions(loadedVersions);

      const today = new Date().toISOString().slice(0, 10);
      const applicableVersion =
        loadedVersions.find((version) => version.effective_from <= today) ?? loadedVersions[0];
      if (applicableVersion) {
        setStartTime(applicableVersion.start_time.slice(0, 5));
        setEndTime(applicableVersion.end_time.slice(0, 5));
      }
    } catch {
      toast.error("Unable to load timing history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVersions();
  }, []);

  const currentVersion = versions.find(
    (version) => version.effective_from <= new Date().toISOString().slice(0, 10)
  );

  const saveVersion = async () => {
    if (!startTime || !endTime || !effectiveFrom) {
      toast.error("Start time, end time, and effective date are required.");
      return;
    }
    setSaving(true);
    try {
      await AttendanceTimeAPI.createTimingVersion(attendanceTimeId, {
        start_time: startTime,
        end_time: endTime,
        effective_from: effectiveFrom,
      });
      toast.success("Timing version created.");
      setStartTime("");
      setEndTime("");
      setEffectiveFrom("");
      await loadVersions();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Unable to create timing version.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium whitespace-nowrap">
          {currentVersion
            ? `${currentVersion.start_time.slice(0, 5)} - ${currentVersion.end_time.slice(0, 5)}`
            : loading
            ? "Loading..."
            : "Not configured"}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!canEdit}
          onClick={() => setOpen(true)}
          title={`Edit staff hours for ${attendanceTime}`}
          aria-label={`Edit staff hours for ${attendanceTime}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Timing Versions: {attendanceTime}</DialogTitle>
            <DialogDescription>
              Create a new version. Existing versions remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span>Start Time</span>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span>End Time</span>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span>Effective From</span>
                <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </label>
            </div>
            <div className="rounded-md border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold">History</div>
              {loading ? (
                <div className="flex justify-center p-4"><LoaderIcon className="h-4 w-4 animate-spin" /></div>
              ) : versions.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No timing versions configured.</p>
              ) : (
                <div className="divide-y divide-border">
                  {versions.map((version) => (
                    <div key={version.schedule_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{version.start_time.slice(0, 5)} - {version.end_time.slice(0, 5)}</span>
                      <span className="text-muted-foreground">From {version.effective_from}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
              {canEdit && <Button type="button" disabled={saving} onClick={() => void saveVersion()}>{saving ? <LoaderIcon className="h-4 w-4 animate-spin" /> : "Create Version"}</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
