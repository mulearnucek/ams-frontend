"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Copy,
  Globe,
  Lock,
  Share2,
  AlertCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { GradeSheet } from "@/lib/types/GradeTypes";
import { getGradeSheetById, updateGradeSheet } from "@/lib/api/grade-sheet";
import { TeacherGradeGrid } from "../teacher-grade-grid";
import { ShareAccessDialog } from "../share-access-dialog";

export default function GradeSheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sheet, setSheet] = useState<GradeSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

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

  const handleCopyLink = () => {
    if (!sheet) return;
    const url = `${window.location.origin}/dashboard/grades/view/${sheet._id}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable view link copied to clipboard!");
  };

  const handleTogglePublish = async () => {
    if (!sheet) return;
    const nextPublished = !sheet.published;
    try {
      setIsTogglingPublish(true);
      const updated = await updateGradeSheet(sheet._id, { published: nextPublished });
      setSheet(updated);
      toast.success(
        nextPublished
          ? "Grade sheet published! Students can now view their marks."
          : "Grade sheet reverted to draft."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change publication status");
    } finally {
      setIsTogglingPublish(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/grades")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Grade Sheets
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Grade Sheet</AlertTitle>
          <AlertDescription>{error || "Grade sheet could not be found."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const canEdit = sheet.access === "edit";

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/grades")}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> All Grade Sheets
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-4">
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
              {sheet.shared_with && sheet.shared_with.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {sheet.shared_with.length} collaborator{sheet.shared_with.length === 1 ? "" : "s"}
                </Badge>
              )}
              {sheet.access === "view" && (
                <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300">
                  Read Only
                </Badge>
              )}
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
              {sheet.created_by && (
                <>
                  <span>•</span>
                  <span>Created by {sheet.created_by.first_name} {sheet.created_by.last_name}</span>
                </>
              )}
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {sheet.published && (
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" /> Copy Link
              </Button>
            )}

            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share Access
                </Button>

                <Button
                  variant={sheet.published ? "outline" : "default"}
                  size="sm"
                  onClick={handleTogglePublish}
                  disabled={isTogglingPublish}
                >
                  {sheet.published ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" /> Publish to Students
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grade Grid Component */}
      <TeacherGradeGrid
        sheetId={sheet._id}
        initialBatchId={sheet.batch?._id}
        initialSubjectId={sheet.subject?._id}
        readOnly={sheet.access === "view"}
        batchName={sheet.batch?.name}
        subjectName={sheet.subject?.name}
        subjectCode={sheet.subject?.subject_code}
      />

      {/* Share Access Dialog */}
      <ShareAccessDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        sheet={sheet}
        onUpdated={loadSheet}
      />
    </div>
  );
}
