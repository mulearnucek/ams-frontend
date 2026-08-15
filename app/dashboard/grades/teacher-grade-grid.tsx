"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Download, Eye, EyeOff, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { getRecentUniqueSessions, type UniqueSession } from "@/lib/api/attendance-session";
import { getGradeMatrix, bulkUpsertGradeEntries, type UpsertGradeEntryInput } from "@/lib/api/grade-entry";
import { deleteGradeField, syncAttendanceGradeField, updateGradeField } from "@/lib/api/grade-field";
import { GradeField, GradeFieldType, GradeMatrix } from "@/lib/types/GradeTypes";
import { AddGradeFieldDialog } from "./add-grade-field-dialog";

// Column type is now shown as a colored top border on the header cell instead of a badge.
const TYPE_BORDER_COLOR: Record<GradeFieldType, string> = {
  exam: "border-t-blue-500",
  practical: "border-t-green-500",
  assignment: "border-t-amber-500",
  moderation: "border-t-orange-500",
  attendance: "border-t-gray-500",
};

// Fixed column order by type, regardless of creation order — fields of the
// same type keep their relative order (stable sort).
const TYPE_ORDER: Record<GradeFieldType, number> = {
  exam: 0,
  practical: 1,
  assignment: 2,
  attendance: 3,
  moderation: 4,
};

// Applied to every header/body cell so the grid reads like a bordered spreadsheet.
const CELL_BORDER = "border border-border";
// Distinct shade for the computed Total column, to set it apart from entry columns.
const TOTAL_COLUMN_SHADE = "bg-sky-50 dark:bg-sky-950/40";
// Individual grade-field columns are hidden on mobile — only Student + Total show there.
const FIELD_COLUMN_MOBILE_HIDDEN = "hidden sm:table-cell";

type CellState = { mark: number; is_absent: boolean };
// studentId -> gradeFieldId -> cell
type GridState = Record<string, Record<string, CellState>>;

/** Same capped-internal-marks formula as the backend summary endpoint / student view. */
function computeRowTotal(fields: GradeMatrix["gradeFields"], cellRow: Record<string, CellState> | undefined): number {
  let rawTotal = 0;
  for (const field of fields) {
    if (field.type === "moderation") {
      const moderationValue = Number(field.value);
      if (!Number.isNaN(moderationValue)) rawTotal += moderationValue;
      continue;
    }
    const cell = cellRow?.[field._id];
    if (!cell || cell.is_absent || !field.total_mark) continue;
    rawTotal += (cell.mark / field.total_mark) * field.weightage;
  }
  return rawTotal;
}

function buildBaseline(matrix: GradeMatrix): GridState {
  const state: GridState = {};
  for (const row of matrix.students) {
    state[row.user._id] = {};
    for (const field of matrix.gradeFields) {
      // Moderation fields apply their raw value directly to every student —
      // no per-student entry exists, so they're excluded from edit/dirty tracking.
      if (field.type === "moderation") continue;
      const entry = row.entries[field._id];
      state[row.user._id][field._id] = {
        mark: entry?.mark ?? 0,
        is_absent: entry?.is_absent ?? false,
      };
    }
  }
  return state;
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(key(item), item);
  return Array.from(map.values());
}

const cellKey = (studentId: string, fieldId: string) => `${studentId}::${fieldId}`;

export function TeacherGradeGrid() {
  const [sessions, setSessions] = useState<UniqueSession[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [matrix, setMatrix] = useState<GradeMatrix | null>(null);
  const [baseline, setBaseline] = useState<GridState>({});
  const [draft, setDraft] = useState<GridState>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editFieldTarget, setEditFieldTarget] = useState<GradeField | null>(null);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<GradeField | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);
  const [syncFieldTarget, setSyncFieldTarget] = useState<GradeField | null>(null);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);

  // Keyed by cellKey(studentId, fieldId) — lets Enter move focus straight down a column.
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Filter option derivation — all sourced from the teacher's own recent
  // sessions, never a global batch/subject list. ──────────────────────────
  const years = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.batch.adm_year))).sort((a, b) => b - a),
    [sessions]
  );

  const classOptions = useMemo(() => {
    const scoped = selectedYear === "" ? sessions : sessions.filter((s) => s.batch.adm_year === selectedYear);
    return uniqueBy(scoped.map((s) => s.batch), (b) => b._id).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, selectedYear]);

  const subjectOptions = useMemo(() => {
    const scoped = sessions.filter((s) => !selectedBatchId || s.batch._id === selectedBatchId);
    return uniqueBy(scoped.map((s) => s.subject), (sub) => sub._id).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, selectedBatchId]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.batch._id === selectedBatchId && s.subject._id === selectedSubjectId) ?? null,
    [sessions, selectedBatchId, selectedSubjectId]
  );

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingSessions(true);
        const recent = await getRecentUniqueSessions();
        setSessions(recent);
        if (recent.length > 0) {
          setSelectedYear(recent[0].batch.adm_year);
          setSelectedBatchId(recent[0].batch._id);
          setSelectedSubjectId(recent[0].subject._id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your classes");
      } finally {
        setIsLoadingSessions(false);
      }
    })();
  }, []);

  const handleYearChange = (value: string) => {
    const year = Number(value);
    setSelectedYear(year);

    const classesForYear = uniqueBy(
      sessions.filter((s) => s.batch.adm_year === year).map((s) => s.batch),
      (b) => b._id
    );
    const nextBatchId = classesForYear.some((b) => b._id === selectedBatchId)
      ? selectedBatchId
      : classesForYear[0]?._id ?? "";
    setSelectedBatchId(nextBatchId);

    const subjectsForBatch = uniqueBy(
      sessions.filter((s) => s.batch._id === nextBatchId).map((s) => s.subject),
      (sub) => sub._id
    );
    setSelectedSubjectId(
      subjectsForBatch.some((sub) => sub._id === selectedSubjectId) ? selectedSubjectId : subjectsForBatch[0]?._id ?? ""
    );
  };

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const subjectsForBatch = uniqueBy(
      sessions.filter((s) => s.batch._id === batchId).map((s) => s.subject),
      (sub) => sub._id
    );
    setSelectedSubjectId(
      subjectsForBatch.some((sub) => sub._id === selectedSubjectId) ? selectedSubjectId : subjectsForBatch[0]?._id ?? ""
    );
  };

  const loadMatrix = useCallback(async () => {
    if (!selectedSession) return;
    try {
      setIsLoadingMatrix(true);
      setError(null);
      const data = await getGradeMatrix(selectedSession.batch._id, selectedSession.subject._id);
      setMatrix(data);
      const base = buildBaseline(data);
      setBaseline(base);
      setDraft(base);
      setIsEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load grade matrix");
    } finally {
      setIsLoadingMatrix(false);
    }
  }, [selectedSession]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const handleTogglePublish = async (field: GradeField) => {
    try {
      setTogglingPublishId(field._id);
      await updateGradeField(field._id, { published: !field.published });
      toast.success(field.published ? `"${field.name}" unpublished` : `"${field.name}" published to students`);
      await loadMatrix();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update publish status");
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleConfirmSyncAttendance = async () => {
    if (!syncFieldTarget) return;
    try {
      setIsSyncingAttendance(true);
      const result = await syncAttendanceGradeField(syncFieldTarget._id);
      toast.success(`Attendance synced for ${result.count} student(s)`);
      setSyncFieldTarget(null);
      await loadMatrix();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sync attendance");
    } finally {
      setIsSyncingAttendance(false);
    }
  };

  const handleConfirmDeleteField = async () => {
    if (!deleteFieldTarget) return;
    try {
      setIsDeletingField(true);
      await deleteGradeField(deleteFieldTarget._id);
      toast.success(`"${deleteFieldTarget.name}" deleted`);
      setDeleteFieldTarget(null);
      await loadMatrix();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete grade field");
    } finally {
      setIsDeletingField(false);
    }
  };

  const isCellDirty = (studentId: string, fieldId: string) => {
    const b = baseline[studentId]?.[fieldId];
    const d = draft[studentId]?.[fieldId];
    if (!b || !d) return false;
    return b.mark !== d.mark || b.is_absent !== d.is_absent;
  };

  // Columns always render in a fixed type order, regardless of creation order.
  const orderedGradeFields = useMemo(() => {
    if (!matrix) return [];
    return [...matrix.gradeFields].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  }, [matrix]);

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const studentId of Object.keys(draft)) {
      for (const fieldId of Object.keys(draft[studentId] ?? {})) {
        if (isCellDirty(studentId, fieldId)) count += 1;
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, baseline]);

  // Warn before closing/refreshing the tab while there are unsaved edits.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyCount]);

  /** Enter moves focus to the same column on the next row, Excel-style. */
  const focusNextRow = (studentId: string, fieldId: string) => {
    if (!matrix) return;
    const idx = matrix.students.findIndex((s) => s.user._id === studentId);
    const nextStudent = matrix.students[idx + 1];
    if (!nextStudent) return;
    const el = inputRefs.current[cellKey(nextStudent.user._id, fieldId)];
    el?.focus();
    el?.select();
  };

  const updateCell = (studentId: string, fieldId: string, next: Partial<CellState>) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [fieldId]: { ...prev[studentId][fieldId], ...next },
      },
    }));
  };

  const handleCancelEdit = () => {
    setDraft(baseline);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!matrix) return;
    const entries: UpsertGradeEntryInput[] = [];
    for (const studentId of Object.keys(draft)) {
      for (const fieldId of Object.keys(draft[studentId] ?? {})) {
        if (!isCellDirty(studentId, fieldId)) continue;
        const cell = draft[studentId][fieldId];
        entries.push({
          user: studentId,
          grade_field: fieldId,
          mark: cell.mark,
          is_absent: cell.is_absent,
        });
      }
    }

    if (entries.length === 0) {
      setIsEditMode(false);
      return;
    }

    try {
      setIsSaving(true);
      const response = await bulkUpsertGradeEntries(entries);
      const rejected = response.data?.rejected ?? [];
      if (rejected.length > 0) {
        toast.error(`${entries.length - rejected.length} saved, ${rejected.length} failed`, {
          description: rejected[0]?.reason,
        });
      } else {
        toast.success(`Saved ${entries.length} change${entries.length === 1 ? "" : "s"}`);
      }
      await loadMatrix();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save grade entries");
    } finally {
      setIsSaving(false);
    }
  };

  const subjectTotalMarks = matrix?.gradeFields.find((f) => f.subject?.total_marks != null)?.subject?.total_marks;
  const subjectPassMark = matrix?.gradeFields.find((f) => f.subject?.pass_mark != null)?.subject?.pass_mark;

  /** Total-column shading: red if failing, amber if exactly at the pass mark, normal otherwise. */
  function totalCellShade(total: number): string {
    if (subjectPassMark == null) return TOTAL_COLUMN_SHADE;
    if (total < subjectPassMark) return "bg-red-100 dark:bg-red-950/50";
    if (total === subjectPassMark) return "bg-amber-100 dark:bg-amber-950/50";
    return TOTAL_COLUMN_SHADE;
  }

  const handleExportPdf = () => {
    if (!matrix || !selectedSession) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${selectedSession.subject.name} — ${selectedSession.batch.name}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

    const hasFields = matrix.gradeFields.length > 0;

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Student",
          "Candidate Code",
          ...orderedGradeFields.map((f) => (f.type === "moderation" ? f.name : `${f.name} (/${f.total_mark})`)),
          ...(hasFields ? [subjectTotalMarks != null ? `Total (/${subjectTotalMarks})` : "Total"] : []),
        ],
      ],
      body: matrix.students.map((row) => [
        `${row.user.first_name} ${row.user.last_name}`,
        row.user.profile?.candidate_code ?? "",
        ...orderedGradeFields.map((f) => {
          if (f.type === "moderation") return f.value ?? "—";
          const entry = row.entries[f._id];
          if (!entry) return "—";
          if (entry.is_absent) return "AB";
          return f.type === "attendance" && entry.remarks
            ? `${entry.mark} (${entry.remarks})`
            : String(entry.mark);
        }),
        ...(hasFields
          ? [
              (() => {
                const raw = computeRowTotal(matrix.gradeFields, baseline[row.user._id]);
                const capped = subjectTotalMarks != null ? Math.min(raw, subjectTotalMarks) : raw;
                return String(Math.round(capped * 100) / 100);
              })(),
            ]
          : []),
      ]),
    });

    doc.save(`${selectedSession.subject.subject_code}-${selectedSession.batch.name}-grades.pdf`);
  };

  if (isLoadingSessions) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (sessions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You haven&apos;t taken any attendance sessions yet — teach a class first, then its subject will appear here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 max-w-xl">
          <Select value={selectedYear === "" ? "" : String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Admission Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBatchId} onValueChange={handleBatchChange}>
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((sub) => (
                <SelectItem key={sub._id} value={sub._id}>
                  {sub.name} ({sub.subject_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!matrix}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddFieldOpen(true)}
            disabled={!selectedSession}
            className="hidden sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Field
          </Button>
          {!isEditMode ? (
            matrix &&
            matrix.gradeFields.length > 0 && (
              <Button size="sm" onClick={() => setIsEditMode(true)} className="hidden sm:inline-flex">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || dirtyCount === 0}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingMatrix || !matrix ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="relative">
        <div className="rounded-md border overflow-auto max-h-[70vh]">
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead className={`${CELL_BORDER} sticky top-0 z-20 bg-muted min-w-45 sm:left-0`}>
                  Student
                </TableHead>
                {orderedGradeFields.map((field) => (
                  <TableHead
                    key={field._id}
                    className={`${CELL_BORDER} ${FIELD_COLUMN_MOBILE_HIDDEN} sticky top-0 z-10 bg-muted min-w-40 align-middle border-t-4 ${TYPE_BORDER_COLOR[field.type]}`}
                  >
                    <div className="flex flex-col gap-2 p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold leading-none">{field.name}</span>
                        <span className="font-light">({field.type === "moderation" ? field.value : `${field.total_mark}`})</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(field)}
                          disabled={togglingPublishId === field._id}
                          className={
                            field.published
                              ? "text-green-600 hover:text-green-700 cursor-pointer dark:text-green-400"
                              : "text-muted-foreground hover:text-foreground cursor-pointer"
                          }
                          title={field.published ? "Published, click to unpublish" : "Draft, click to publish"}
                        >
                          {field.published ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                        </button>
                        {field.type === "attendance" && (
                          <button
                            type="button"
                            onClick={() => setSyncFieldTarget(field)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Refresh from attendance records"
                          >
                            <RefreshCw className="h-4.5 w-4.5" />
                          </button>
                        )}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => setEditFieldTarget(field)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit grade field"
                          >
                            <Pencil className="h-4.5 w-4.5" />
                          </button>
                        )}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => setDeleteFieldTarget(field)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete grade field"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </TableHead>
                ))}
                {matrix.gradeFields.length > 0 && (
                  <TableHead
                    className={`${CELL_BORDER} sticky top-0 z-10 ${TOTAL_COLUMN_SHADE} min-w-24 text-center font-semibold`}
                  >
                    Total
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.students.length === 0 ? (
                <TableRow>
                  <TableCell
                    className={`${CELL_BORDER} text-center text-muted-foreground`}
                    colSpan={matrix.gradeFields.length + (matrix.gradeFields.length > 0 ? 1 : 0) + 1}
                    >
                    No students found in this batch yet.
                  </TableCell>
                </TableRow>
              ) : (
                matrix.students.map((row) => {
                  const rawTotal = computeRowTotal(matrix.gradeFields, draft[row.user._id]);
                  const cappedTotal =
                    subjectTotalMarks != null ? Math.min(rawTotal, subjectTotalMarks) : rawTotal;
                  const roundedTotal = Math.round(cappedTotal * 100) / 100;

                  return (
                  <TableRow key={row.user._id}>
                    <TableCell className={`${CELL_BORDER} z-10 bg-background font-medium sm:sticky sm:left-0`}>
                      <div className="flex flex-col">
                        <span>
                          {row.user.first_name} {row.user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.user.profile?.candidate_code ?? row.user.profile?.adm_number ?? ""}
                        </span>
                      </div>
                    </TableCell>
                    {orderedGradeFields.map((field) => {
                      if (field.type === "moderation") {
                        return (
                          <TableCell key={field._id} className={`${CELL_BORDER} ${FIELD_COLUMN_MOBILE_HIDDEN}`}>
                            <span className="text-muted-foreground">{field.value}</span>
                          </TableCell>
                        );
                      }

                      const cell = draft[row.user._id]?.[field._id] ?? { mark: 0, is_absent: false };
                      const dirty = isCellDirty(row.user._id, field._id);
                      const entry = row.entries[field._id];
                      const hasEntry = Boolean(entry);

                      return (
                        <TableCell
                          key={field._id}
                          className={`${CELL_BORDER} ${FIELD_COLUMN_MOBILE_HIDDEN} ${dirty ? "bg-amber-100 dark:bg-amber-950/60" : ""}`}
                        >
                          {isEditMode ? (
                            <div className="flex items-center gap-2">
                              <Input
                                ref={(el) => {
                                  inputRefs.current[cellKey(row.user._id, field._id)] = el;
                                }}
                                type="number"
                                min={0}
                                max={field.total_mark}
                                disabled={cell.is_absent}
                                value={cell.is_absent ? "" : cell.mark}
                                onChange={(e) =>
                                  updateCell(row.user._id, field._id, {
                                    mark: Math.min(Number(e.target.value) || 0, field.total_mark!),
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    focusNextRow(row.user._id, field._id);
                                  }
                                }}
                                className="w-16 h-8"
                              />
                              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Checkbox
                                  checked={cell.is_absent}
                                  onCheckedChange={(checked) =>
                                    updateCell(row.user._id, field._id, {
                                      is_absent: Boolean(checked),
                                      mark: checked ? 0 : cell.mark,
                                    })
                                  }
                                  />
                                AB
                              </label>
                            </div>
                          ) : !hasEntry ? (
                            <span className="text-muted-foreground">—</span>
                          ) : cell.is_absent ? (
                            <Badge variant="destructive">AB</Badge>
                          ) : (
                            <span>
                              {cell.mark}
                              {field.type === "attendance" && entry?.remarks && (
                                <span className="text-muted-foreground"> ({entry.remarks})</span>
                              )}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                    {matrix.gradeFields.length > 0 && (
                      <TableCell className={`${CELL_BORDER} ${totalCellShade(roundedTotal)} text-center font-medium`}>
                        {subjectTotalMarks != null ? `${roundedTotal} / ${subjectTotalMarks}` : roundedTotal}
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {matrix.gradeFields.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 whitespace-nowrap rounded-lg border bg-background/80 px-4 py-3 shadow-lg">
            <div className="mx-auto flex flex-col items-center gap-3 whitespace-nowrap rounded-lg bg-background px-4 py-3">
              <span className="text-sm text-muted-foreground">No grade fields yet</span>
              <Button size="lg" onClick={() => setAddFieldOpen(true)} disabled={!selectedSession}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Field
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {selectedSession && (
        <AddGradeFieldDialog
        open={addFieldOpen || editFieldTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddFieldOpen(false);
            setEditFieldTarget(null);
          }
        }}
        batchId={selectedSession.batch._id}
        subjectId={selectedSession.subject._id}
        editingField={editFieldTarget}
        onSaved={loadMatrix}
        />
      )}

      <AlertDialog open={deleteFieldTarget !== null} onOpenChange={(open) => !open && setDeleteFieldTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteFieldTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this grade field and every student&apos;s mark recorded against it. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingField}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteField}
              disabled={isDeletingField}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={syncFieldTarget !== null} onOpenChange={(open) => !open && setSyncFieldTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh &quot;{syncFieldTarget?.name}&quot; from attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              This re-pulls attendance for this batch and subject and overwrites every student&apos;s mark in this
              column. Any manual changes already made to this field will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncingAttendance}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSyncAttendance} disabled={isSyncingAttendance}>
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
