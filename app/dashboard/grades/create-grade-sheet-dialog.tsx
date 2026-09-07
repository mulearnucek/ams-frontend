"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, Check, Layers, Loader2, Sparkles } from "lucide-react";
import { getRecentUniqueSessions, type UniqueSession } from "@/lib/api/attendance-session";
import { listBatches, type Batch } from "@/lib/api/batch";
import { listSubjects, type Subject } from "@/lib/api/subject";
import { createGradeSheet } from "@/lib/api/grade-sheet";
import { useAuth } from "@/lib/auth-context";

interface CreateGradeSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateGradeSheetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGradeSheetDialogProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Taken sessions (classes the teacher actually taught)
  const [taughtSessions, setTaughtSessions] = useState<UniqueSession[]>([]);
  // Fallback / institutional lists for Admin / HOD
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Selected values
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const isElevated = user?.role === "admin" || user?.role === "principal" || user?.role === "hod";

  useEffect(() => {
    if (!open) {
      setSelectedSubjectId("");
      setSelectedBatchId("");
      setError(null);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const taught = await getRecentUniqueSessions().catch(() => []);
        if (isMounted) setTaughtSessions(taught);

        // If elevated role or teacher has no recorded attendance sessions yet, fetch all batches/subjects
        if (isElevated || taught.length === 0) {
          const [batchesRes, subjectsRes] = await Promise.all([
            listBatches({ limit: 100 }).catch(() => ({ batches: [] })),
            listSubjects({ limit: 100 }).catch(() => ({ subjects: [] })),
          ]);
          if (isMounted) {
            setAllBatches(batchesRes.batches);
            setAllSubjects(subjectsRes.subjects);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load subjects and classes");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, isElevated]);

  // Derived subject options
  const subjectOptions = useMemo(() => {
    if (taughtSessions.length > 0) {
      const map = new Map<string, { _id: string; name: string; code: string }>();
      taughtSessions.forEach((s) => {
        if (s.subject?._id && !map.has(s.subject._id)) {
          map.set(s.subject._id, {
            _id: s.subject._id,
            name: s.subject.name || s.subject.subject_code,
            code: s.subject.subject_code,
          });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    return allSubjects.map((s) => ({
      _id: s._id,
      name: s.name,
      code: s.subject_code,
    }));
  }, [taughtSessions, allSubjects]);

  // Derived batch options based on selected subject
  const batchOptions = useMemo(() => {
    if (!selectedSubjectId) return [];

    if (taughtSessions.length > 0) {
      const matchingSessions = taughtSessions.filter((s) => s.subject?._id === selectedSubjectId);
      if (matchingSessions.length > 0) {
        const map = new Map<string, { _id: string; name: string }>();
        matchingSessions.forEach((s) => {
          if (s.batch?._id && !map.has(s.batch._id)) {
            map.set(s.batch._id, { _id: s.batch._id, name: s.batch.name });
          }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return allBatches.map((b) => ({ _id: b._id, name: b.name }));
  }, [selectedSubjectId, taughtSessions, allBatches]);

  // When subject changes, reset batch if not in options
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedBatchId("");
  };

  const handleCreate = async () => {
    if (!selectedSubjectId || !selectedBatchId) {
      setError("Please select both a subject and a batch");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const sheet = await createGradeSheet({
        batch: selectedBatchId,
        subject: selectedSubjectId,
      });

      onOpenChange(false);
      onSuccess?.();
      router.push(`/dashboard/grades/${sheet._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create grade sheet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create Grade Sheet
          </DialogTitle>
          <DialogDescription>
            Select the subject and class batch you teach to start entering assessment grades.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : subjectOptions.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No teaching classes found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              You haven't recorded any attendance sessions for classes yet. Once you take attendance or are assigned to a batch, your classes will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="subject-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </Label>
              <Select value={selectedSubjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger id="subject-select" className="w-full">
                  <SelectValue placeholder="Choose a subject you teach..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {subjectOptions.map((sub) => (
                    <SelectItem key={sub._id} value={sub._id}>
                      <span className="font-medium">{sub.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">({sub.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="batch-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class / Batch
              </Label>
              <Select
                value={selectedBatchId}
                onValueChange={setSelectedBatchId}
                disabled={!selectedSubjectId}
              >
                <SelectTrigger id="batch-select" className="w-full">
                  <SelectValue placeholder={selectedSubjectId ? "Choose class batch..." : "Select a subject first"} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {batchOptions.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      <span className="font-medium">{b.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubjectId && selectedBatchId && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Ready to create grade sheet for this class. Existing marks and fields will be preserved if previously created.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedSubjectId || !selectedBatchId || submitting || loading}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Grade Sheet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
