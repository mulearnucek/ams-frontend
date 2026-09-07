"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Globe,
  Lock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { GradeSheet } from "@/lib/types/GradeTypes";
import { getGradeSheetById } from "@/lib/api/grade-sheet";
import { TeacherGradeGrid } from "../../teacher-grade-grid";

export default function GradeSheetViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSheet = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getGradeSheetById(id);
      setSheet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load grade sheet");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-80" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !sheet) {
    const isDraftError = error?.toLowerCase().includes("draft") || error?.toLowerCase().includes("published");

    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-xl mx-auto text-center pt-16 space-y-4">
        <div className="flex items-center justify-center mx-auto h-16 w-16 rounded-full bg-muted/60">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            {isDraftError ? "Grade Sheet Not Published" : "Grade Sheet Unavailable"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isDraftError
              ? "This grade sheet is currently saved as a draft and has not been published yet by the teacher."
              : error || "The requested grade sheet could not be found or you do not have permission to view it."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/grades")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Grades
        </Button>
      </div>
    );
  }

  const canEdit = sheet.access === "edit";

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6 max-w-7xl mx-auto">
      {/* Editor Banner for Teachers / Admins with Edit Access */}
      {canEdit && (
        <Alert className="bg-primary/5 border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <AlertTitle className="text-sm font-semibold">You have edit access to this grade sheet</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                You are currently viewing the student/read-only view. Open the editor to enter marks or add fields.
              </AlertDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/grades/${sheet._id}`)}
            className="sm:self-center shrink-0"
          >
            <Edit3 className="mr-2 h-4 w-4" /> Open in Editor
          </Button>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs uppercase px-2 py-0.5">
              {sheet.subject?.subject_code}
            </Badge>
            <Badge
              variant="secondary"
              className={
                sheet.published
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-xs"
                  : "bg-muted text-muted-foreground text-xs"
              }
            >
              {sheet.published ? (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Published
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Draft
                </span>
              )}
            </Badge>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {sheet.subject?.name}
          </h1>

          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{sheet.batch?.name}</span>
            {sheet.batch?.department && (
              <>
                <span>•</span>
                <span>{sheet.batch.department}</span>
              </>
            )}
            {sheet.sem && (
              <>
                <span>•</span>
                <span>Semester {sheet.sem}</span>
              </>
            )}
          </p>
        </div>

        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/grades")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      {/* Read-Only Grid */}
      <TeacherGradeGrid
        sheetId={sheet._id}
        initialBatchId={sheet.batch?._id}
        initialSubjectId={sheet.subject?._id}
        readOnly={true}
        batchName={sheet.batch?.name}
        subjectName={sheet.subject?.name}
        subjectCode={sheet.subject?.subject_code}
      />
    </div>
  );
}
