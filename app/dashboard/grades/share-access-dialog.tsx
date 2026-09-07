"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, Copy, Link2, Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { GradeSheet } from "@/lib/types/GradeTypes";
import { shareGradeSheet } from "@/lib/api/grade-sheet";
import { listUsers } from "@/lib/api/user";
import { User } from "@/lib/types/UserTypes";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface ShareAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: GradeSheet | null;
  onSuccess?: (updatedSheet: GradeSheet) => void;
  onUpdated?: (updatedSheet: GradeSheet) => void;
}

export function ShareAccessDialog({
  open,
  onOpenChange,
  sheet,
  onSuccess,
  onUpdated,
}: ShareAccessDialogProps) {
  const { user: currentUser } = useAuth();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedAccess, setSelectedAccess] = useState<"view" | "edit">("edit");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentSheet, setCurrentSheet] = useState<GradeSheet | null>(sheet);

  useEffect(() => {
    setCurrentSheet(sheet);
  }, [sheet]);

  useEffect(() => {
    if (!open) {
      setSelectedTeacherId("");
      setError(null);
      return;
    }

    (async () => {
      setLoadingTeachers(true);
      try {
        const res = await listUsers({ role: "teacher", limit: 100 });
        setTeachers(res.users);
      } catch (e) {
        // Teachers list optional fallback
      } finally {
        setLoadingTeachers(false);
      }
    })();
  }, [open]);

  if (!currentSheet) return null;

  // Filter out the sheet owner and already shared teachers from the selection dropdown
  const availableTeachers = teachers.filter(
    (t) =>
      t._id !== currentSheet.created_by?._id &&
      !currentSheet.shared_with?.some((s) => s.user?._id === t._id)
  );

  const handleGrantAccess = async () => {
    if (!selectedTeacherId) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await shareGradeSheet(currentSheet._id, {
        userId: selectedTeacherId,
        access: selectedAccess,
        action: "add",
      });
      setCurrentSheet(updated);
      setSelectedTeacherId("");
      onSuccess?.(updated);
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant access");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAccess = async (userId: string, access: "view" | "edit") => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await shareGradeSheet(currentSheet._id, {
        userId,
        access,
        action: "add",
      });
      setCurrentSheet(updated);
      onSuccess?.(updated);
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    setRemovingId(userId);
    setError(null);
    try {
      const updated = await shareGradeSheet(currentSheet._id, {
        userId,
        access: "view",
        action: "remove",
      });
      setCurrentSheet(updated);
      onSuccess?.(updated);
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    } finally {
      setRemovingId(null);
    }
  };

  const viewUrl =
    typeof window !== "undefined" && currentSheet
      ? `${window.location.origin}/dashboard/grades/view/${currentSheet._id}`
      : "";

  const handleCopyLink = () => {
    if (!viewUrl) return;
    navigator.clipboard.writeText(viewUrl);
    setCopied(true);
    toast.success("View link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share Grade Sheet
          </DialogTitle>
          <DialogDescription>
            Grant additional teachers edit or view access to {currentSheet.subject?.name || "this grade sheet"}.
          </DialogDescription>
        </DialogHeader>

        {/* Shareable View Link */}
        <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-2">
            <Link2 className="h-7 w-7 text-primary" />
            <Input
              readOnly
              value={viewUrl}
              className="h-8 text-xs font-mono bg-background select-all"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-2.5"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Add Teacher Form */}
        <div className="space-y-3 pt-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add Collaborator
          </Label>
          <div className="flex items-center gap-2">
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={loadingTeachers ? "Loading teachers..." : "Select teacher..."} />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {availableTeachers.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name || `${t.first_name} ${t.last_name}`}
                  </SelectItem>
                ))}
                {availableTeachers.length === 0 && (
                  <div className="py-2 px-3 text-xs text-muted-foreground">
                    No additional teachers available
                  </div>
                )}
              </SelectContent>
            </Select>

            <Select value={selectedAccess} onValueChange={(val: "view" | "edit") => setSelectedAccess(val)}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit">Can edit</SelectItem>
                <SelectItem value="view">Can view</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={handleGrantAccess}
              disabled={!selectedTeacherId || submitting}
              className="shrink-0"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Current Collaborators List */}
        <div className="space-y-2 pt-3 border-t">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            People with access
          </Label>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {/* Owner */}
            <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium text-xs sm:text-sm">
                  {currentSheet.created_by?.name || `${currentSheet.created_by?.first_name || ""} ${currentSheet.created_by?.last_name || ""}`.trim() || "Owner"}
                </p>
                <p className="text-[11px] text-muted-foreground">{currentSheet.created_by?.email}</p>
              </div>
              <Badge variant="secondary" className="text-[11px] font-semibold">
                Owner
              </Badge>
            </div>

            {/* Shared teachers */}
            {currentSheet.shared_with?.map((share) => (
              <div
                key={share.user?._id}
                className="flex items-center justify-between p-2 rounded-lg border bg-background text-sm"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-medium text-xs sm:text-sm truncate">
                    {share.user?.name || `${share.user?.first_name || ""} ${share.user?.last_name || ""}`.trim()}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{share.user?.email}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Select
                    value={share.access}
                    onValueChange={(val: "view" | "edit") => handleUpdateAccess(share.user._id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edit">Can edit</SelectItem>
                      <SelectItem value="view">Can view</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevokeAccess(share.user._id)}
                    disabled={removingId === share.user._id}
                  >
                    {removingId === share.user._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {(!currentSheet.shared_with || currentSheet.shared_with.length === 0) && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No additional teachers added. Only you and institutional staff can access.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
