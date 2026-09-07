"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/lib/auth-context";
import { listBatches, type Batch, type ListBatchesParams } from "@/lib/api/batch";
import { getGradeSummary } from "@/lib/api/grade-entry";
import { GradeSummary } from "@/lib/types/GradeTypes";
import { StaffProfile } from "@/lib/types/UserTypes";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Download, GraduationCap, School, Users } from "lucide-react";

function thresholdClass(total: number, max: number): string {
  if (total === 0) return "text-muted-foreground";
  if (!max) return "";
  const pct = (total / max) * 100;
  if (pct >= 70) return "text-green-700 dark:text-green-400 font-medium";
  if (pct >= 50) return "text-amber-700 dark:text-amber-400 font-medium";
  return "text-red-700 dark:text-red-400 font-medium";
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export default function SemesterGradeReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setIsLoadingBatches(true);
        setError(null);

        const params: ListBatchesParams = { limit: 100 };
        if (user.role === "hod") {
          params.department = (user.profile as StaffProfile)?.department as ListBatchesParams["department"];
        } else if (user.role === "teacher") {
          params.staff_advisor = user._id;
        }
        // admin/principal: no filter — all batches

        const data = await listBatches(params);
        setBatches(data.batches);
        if (data.batches.length > 0) setSelectedBatchId(data.batches[0]._id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load batches");
      } finally {
        setIsLoadingBatches(false);
      }
    })();
  }, [user]);

  const loadSummary = useCallback(async () => {
    if (!selectedBatchId) return;
    try {
      setIsLoadingSummary(true);
      setError(null);
      const data = await getGradeSummary(selectedBatchId);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load grade summary");
    } finally {
      setIsLoadingSummary(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const sortedStudents = useMemo(() => {
    if (!summary) return [];
    const list = [...summary.students];
    if (!sort) {
      return list.sort((a, b) =>
        (a.user.profile?.candidate_code ?? "").localeCompare(b.user.profile?.candidate_code ?? "")
      );
    }
    return list.sort((a, b) => {
      if (sort.key === "name") {
        const av = `${a.user.first_name} ${a.user.last_name}`;
        const bv = `${b.user.first_name} ${b.user.last_name}`;
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = a.totals[sort.key] ?? 0;
      const bv = b.totals[sort.key] ?? 0;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [summary, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      return prev.dir === "desc" ? { key, dir: "asc" } : null;
    });
  };

  const handleExportPdf = () => {
    if (!summary) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const batchName = batches.find((b) => b._id === selectedBatchId)?.name ?? "";
    doc.setFontSize(14);
    doc.text(`Semester Grade Report — ${batchName}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Student", "Candidate Code", ...summary.subjects.map((s) => `${s.name} (/${s.total_marks})`)]],
      body: sortedStudents.map((row) => [
        `${row.user.first_name} ${row.user.last_name}`,
        row.user.profile?.candidate_code ?? "",
        ...summary.subjects.map((s) => String(row.totals[s._id] ?? 0)),
      ]),
    });

    doc.save(`semester-grade-report-${batchName}.pdf`);
  };

  if (isLoadingBatches) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4 pt-12">
        <div className="rounded-xl border p-6 text-center space-y-3 bg-muted/20">
          <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Semester Report Not Available</h2>
          <p className="text-sm text-muted-foreground">
            {user?.role === "teacher"
              ? "You are not assigned as a staff advisor for any class. Semester grade reports are exclusively available to staff advisors for their assigned class, department HODs, and administrators."
              : "No batches were found in your access scope."}
          </p>
          <div className="pt-2">
            <Button variant="default" size="sm" onClick={() => router.push("/dashboard/grades")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Grade Sheets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentBatch = batches.find((b) => b._id === selectedBatchId) ?? batches[0];
  const isTeacher = user?.role === "teacher";

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-5">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground h-8 px-2"
          onClick={() => router.push("/dashboard/grades")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Grade Sheets
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Semester Grade Report</h1>
        <p className="text-sm text-muted-foreground">
          {isTeacher
            ? `Capped internal marks report for your advised class: ${currentBatch?.name}`
            : "Capped internal marks per subject, one row per student."}
        </p>
      </div>

      {/* Class Details Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between p-3.5 rounded-lg border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2.5">
          {isTeacher ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Class:</span>
              <span className="text-sm font-semibold text-foreground px-2 py-0.5 rounded bg-background border">
                {currentBatch?.name}
              </span>
              {batches.length > 1 && (
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="Switch class" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b._id} value={b._id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="w-64">
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b._id} value={b._id} className="text-xs">
                      {b.name} ({b.department}, {b.adm_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentBatch?.department && (
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {currentBatch.department}
            </span>
          )}
          {currentBatch?.adm_year && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              Batch {currentBatch.adm_year}
            </span>
          )}
          {currentBatch?.sem && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              Sem {currentBatch.sem}
            </span>
          )}
          {summary && (
            <span className="text-xs text-muted-foreground ml-1">
              • {summary.students.length} Students • {summary.subjects.length} Subjects
            </span>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!summary} className="shrink-0 h-8">
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingSummary || !summary ? (
        <Skeleton className="h-96 w-full" />
      ) : summary.subjects.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No grade fields have been created for this batch yet.</AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="sticky left-0 top-0 z-20 bg-background cursor-pointer"
                  onClick={() => toggleSort("name")}
                >
                  Student
                </TableHead>
                {summary.subjects.map((subject) => (
                  <TableHead
                    key={subject._id}
                    className="sticky top-0 z-10 bg-background cursor-pointer whitespace-nowrap"
                    onClick={() => toggleSort(subject._id)}
                  >
                    {subject.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((row) => (
                <TableRow key={row.user._id}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    <div className="flex flex-col">
                      <span>
                        {row.user.first_name} {row.user.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.user.profile?.candidate_code ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  {summary.subjects.map((subject) => {
                    const total = row.totals[subject._id] ?? 0;
                    return (
                      <TableCell key={subject._id} className={thresholdClass(total, subject.total_marks)}>
                        {total} / {subject.total_marks}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
