"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBulkAttendanceRecords, updateBulkAttendanceRecords, type AttendanceStatus } from "@/lib/api/attendance-record";
import type { User } from "@/lib/types/UserTypes";
import type { AttendanceSession, EmbeddedAttendanceRecord } from "@/lib/api/attendance-session";

interface CsvAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AttendanceSession;
  students: User[];
  existingRecords: Map<string, EmbeddedAttendanceRecord>;
  onSuccess?: () => void;
}

export default function CsvAttendanceDialog({
  open,
  onOpenChange,
  session,
  students,
  existingRecords,
  onSuccess,
}: CsvAttendanceDialogProps) {
  const [mode, setMode] = useState<"present" | "absent">("present");
  const [rollInput, setRollInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const normalizedRollMap = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string }>();
    students.forEach((student) => {
      const p = (student.profile ?? {}) as any;
      const candidateCode = p.candidate_code?.trim();
      if (!candidateCode || !student._id) return;
      const lastThreeDigits = candidateCode.slice(-3).padStart(3, '0');
      map.set(lastThreeDigits, { studentId: student._id, studentName: student.name || '' });
    });
    return map;
  }, [students]);

  const parsedRolls = useMemo(() => {
    return rollInput
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [rollInput]);

  const latestEnteredRoll = useMemo(() => {
    if (parsedRolls.length === 0) return null;
    return parsedRolls[parsedRolls.length - 1].padStart(3, "0");
  }, [parsedRolls]);

  const latestEnteredStudent = useMemo(() => {
    if (!latestEnteredRoll) return null;
    return normalizedRollMap.get(latestEnteredRoll) ?? null;
  }, [latestEnteredRoll, normalizedRollMap]);

  const latestEnteredRollDisplay = useMemo(() => {
    if (!latestEnteredRoll) return null;
    const withoutLeadingZeros = latestEnteredRoll.replace(/^0+/, "");
    return withoutLeadingZeros || "0";
  }, [latestEnteredRoll]);

  const uniqueParsedRolls = useMemo(() => {
    const unique = new Set<string>();
    parsedRolls.forEach((roll) => {
      const normalized = roll.padStart(3, '0');
      unique.add(normalized);
    });
    return unique;
  }, [parsedRolls]);

  const matchingStudentIds = useMemo(() => {
    const ids = new Set<string>();
    uniqueParsedRolls.forEach((roll) => {
      const match = normalizedRollMap.get(roll);
      if (match) ids.add(match.studentId);
    });
    return ids;
  }, [normalizedRollMap, uniqueParsedRolls]);

  const matchedStudents = useMemo(() => {
    const matched: { studentId: string; studentName: string; rollNo: string }[] = [];
    uniqueParsedRolls.forEach((roll) => {
      const match = normalizedRollMap.get(roll);
      if (match) {
        matched.push({
          studentId: match.studentId,
          studentName: match.studentName,
          rollNo: roll,
        });
      }
    });
    return matched.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [normalizedRollMap, uniqueParsedRolls]);

  const unknownRolls = useMemo(() => {
    const unknown: string[] = [];
    uniqueParsedRolls.forEach((roll) => {
      if (!normalizedRollMap.has(roll)) unknown.push(roll);
    });
    return unknown;
  }, [normalizedRollMap, uniqueParsedRolls]);

  const presentCount = useMemo(() => {
    if (mode === "present") return matchingStudentIds.size;
    return Math.max(0, students.length - matchingStudentIds.size);
  }, [matchingStudentIds.size, mode, students.length]);

  const absentCount = useMemo(() => {
    if (mode === "absent") return matchingStudentIds.size;
    return Math.max(0, students.length - matchingStudentIds.size);
  }, [matchingStudentIds.size, mode, students.length]);

  const handleSave = async () => {
    if (!session || students.length === 0) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const createRecords: Array<{ student: string; status: AttendanceStatus }> = [];
      const updateRecordsList: Array<{ recordId: string; status: AttendanceStatus }> = [];

      students.forEach((student) => {
        if (!student._id) return;

        const isListed = matchingStudentIds.has(student._id);
        const status: AttendanceStatus =
          mode === "present"
            ? isListed
              ? "present"
              : "absent"
            : isListed
              ? "absent"
              : "present";

        const existingRecord = existingRecords.get(student._id);
        if (existingRecord) {
          updateRecordsList.push({ recordId: existingRecord._id, status });
        } else {
          createRecords.push({ student: student._id, status });
        }
      });

      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      if (createRecords.length > 0) {
        const result = await createBulkAttendanceRecords({
          session: session._id,
          records: createRecords,
        });
        createdCount = (result.created ?? []).length;
        errorCount += (result.errors ?? []).length;
      }

      if (updateRecordsList.length > 0) {
        const result = await updateBulkAttendanceRecords({
          session: session._id,
          updates: updateRecordsList,
        });
        updatedCount = (result.updated ?? []).length;
        errorCount += (result.errors ?? []).length;
      }

      const totalSaved = createdCount + updatedCount;
      setSaveMessage(
        errorCount > 0
          ? `Saved ${totalSaved} records (${createdCount} new, ${updatedCount} updated) with ${errorCount} errors.`
          : `Saved ${totalSaved} records successfully (${createdCount} new, ${updatedCount} updated).`
      );

      if (errorCount === 0) {
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save attendance:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save attendance records");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setMode("present");
    setRollInput("");
    setSaveMessage(null);
    setSaveError(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Attendance with Roll Numbers</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <Button
                variant={mode === "present" ? "default" : "outline"}
                onClick={() => setMode("present")}
                className="flex-1"
              >
                Present
              </Button>
              <Button
                variant={mode === "absent" ? "default" : "outline"}
                onClick={() => setMode("absent")}
                className="flex-1"
              >
                Absent
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "present"
                ? "Listed students will be marked present, others absent"
                : "Listed students will be marked absent, others present"}
            </p>
          </div>

          {/* Roll Input */}
          <div className="space-y-3">
            <Label htmlFor="rollInput" className="text-base font-semibold">
              Roll Numbers
            </Label>
            <Textarea
              id="rollInput"
              placeholder="Enter roll numbers separated by spaces, commas, or new lines (e.g., 1 2 4 55 23 or 001, 005)"
              value={rollInput}
              onChange={(e) => setRollInput(e.target.value)}
              className="min-h-32 font-sans text-sm"
              disabled={saving}
            />
            {latestEnteredRoll && (
              <div className="text-xs text-muted-foreground">
                {latestEnteredRollDisplay} : {latestEnteredStudent?.studentName || "No matching student"}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-xl font-bold">{presentCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-xl font-bold">{absentCount}</p>
            </div>
          </div>

          {/* Matched Students */}
          {matchedStudents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Matched Students ({matchedStudents.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                {matchedStudents.map((student) => {
                  const roll = student.rollNo.replace(/^0+/, "") || "0";
                  return (
                    <div
                      key={student.studentId}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs shadow-xs"
                    >
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-5 px-1.5 text-[11px] font-bold rounded",
                          mode === "present"
                            ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                        )}
                      >
                        {roll}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {student.studentName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unknown Rolls */}
          {unknownRolls.length > 0 && (
            <Alert variant="destructive" className="py-2 px-3">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs">
                <span className="font-semibold">Unknown roll numbers: </span>
                <span>{unknownRolls.join(", ")} (not found in batch)</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {saveMessage && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{saveMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || students.length === 0}>
            {saving ? "Saving..." : "Mark Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
