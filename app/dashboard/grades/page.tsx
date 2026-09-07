"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ParentProfile } from "@/lib/types/UserTypes";
import { GradeSheet } from "@/lib/types/GradeTypes";
import { listGradeSheets, updateGradeSheet, deleteGradeSheet } from "@/lib/api/grade-sheet";
import { listBatches } from "@/lib/api/batch";
import { StudentGradeView } from "./student-grade-view";
import { CreateGradeSheetDialog } from "./create-grade-sheet-dialog";
import { ShareAccessDialog } from "./share-access-dialog";

export default function GradesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [sheets, setSheets] = useState<GradeSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "shared" | "published" | "drafts">("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareTargetSheet, setShareTargetSheet] = useState<GradeSheet | null>(null);
  const [deleteTargetSheet, setDeleteTargetSheet] = useState<GradeSheet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isStaff =
    user?.role === "teacher" ||
    user?.role === "hod" ||
    user?.role === "admin" ||
    user?.role === "principal" ||
    user?.role === "staff";

  const [isStaffAdvisor, setIsStaffAdvisor] = useState(false);

  useEffect(() => {
    if (user?.role === "teacher" && user?._id) {
      listBatches({ staff_advisor: user._id, limit: 1 })
        .then((data) => {
          setIsStaffAdvisor((data?.batches?.length ?? 0) > 0);
        })
        .catch(() => {
          setIsStaffAdvisor(false);
        });
    } else {
      setIsStaffAdvisor(false);
    }
  }, [user]);

  const canViewSemesterReport =
    user?.role === "admin" ||
    user?.role === "principal" ||
    user?.role === "hod" ||
    (user?.role === "teacher" && isStaffAdvisor);

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const data = await listGradeSheets();
      setSheets(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load grade sheets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      fetchSheets();
    }
  }, [isStaff]);

  const handleTogglePublish = async (sheet: GradeSheet) => {
    const nextPublished = !sheet.published;
    try {
      const updated = await updateGradeSheet(sheet._id, { published: nextPublished });
      setSheets((prev) => prev.map((s) => (s._id === sheet._id ? updated : s)));
      toast.success(nextPublished ? "Grade sheet published! View link is now active." : "Grade sheet moved to draft.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update publication status");
    }
  };

  const handleCopyLink = (sheetId: string) => {
    const url = `${window.location.origin}/dashboard/grades/view/${sheetId}`;
    navigator.clipboard.writeText(url);
    toast.success("Viewable link copied to clipboard!");
  };

  const handleDeleteSheet = async () => {
    if (!deleteTargetSheet) return;
    setIsDeleting(true);
    try {
      await deleteGradeSheet(deleteTargetSheet._id);
      setSheets((prev) => prev.filter((s) => s._id !== deleteTargetSheet._id));
      toast.success("Grade sheet deleted successfully.");
      setDeleteTargetSheet(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete grade sheet");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered sheets
  const filteredSheets = useMemo(() => {
    return sheets.filter((sheet) => {
      const subjectName = sheet.subject?.name?.toLowerCase() || "";
      const subjectCode = sheet.subject?.subject_code?.toLowerCase() || "";
      const batchName = sheet.batch?.name?.toLowerCase() || "";
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || subjectName.includes(q) || subjectCode.includes(q) || batchName.includes(q);
      if (!matchesSearch) return false;

      const isMine = String(sheet.created_by?._id) === String(user?._id);
      const isShared = sheet.shared_with?.some((s) => String(s.user?._id) === String(user?._id));

      if (activeTab === "mine") return isMine;
      if (activeTab === "shared") return isShared;
      if (activeTab === "published") return sheet.published;
      if (activeTab === "drafts") return !sheet.published;
      return true;
    });
  }, [sheets, search, activeTab, user]);

  if (!user) return null;

  // Student view
  if (user.role === "student") {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grades</h1>
          <p className="text-sm text-muted-foreground">Your marks and assignments this semester.</p>
        </div>
        <StudentGradeView />
      </div>
    );
  }

  // Parent view
  if (user.role === "parent") {
    const child = (user.profile as ParentProfile)?.child;
    if (!child?._id) {
      return (
        <div className="p-4 md:p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No child is linked to your account yet. Contact the school admin to get this set up.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grades</h1>
          <p className="text-sm text-muted-foreground">
            {child.first_name ? `${child.first_name}'s` : "Your child's"} marks and assignments this semester.
          </p>
        </div>
        <StudentGradeView />
      </div>
    );
  }

  // Staff (Teacher / HOD / Admin / Principal) View
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Grade Sheets</h1>
          <p className="text-sm text-muted-foreground">
            Enter, manage, and share internal marks for the subjects you teach.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {canViewSemesterReport && (
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/grades/report")}>
              <GraduationCap className="mr-2 h-4 w-4" /> Semester Report
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Grade Sheet
          </Button>
        </div>
      </div>

      {/* Search & Tabs Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-5 sm:flex h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="mine" className="text-xs">Mine</TabsTrigger>
            <TabsTrigger value="shared" className="text-xs">Shared</TabsTrigger>
            <TabsTrigger value="published" className="text-xs">Published</TabsTrigger>
            <TabsTrigger value="drafts" className="text-xs">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sheets Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3 bg-muted/10">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold">No grade sheets found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? "No grade sheets matched your search filter. Try clearing the search or switching tabs."
              : "You haven't created any grade sheets yet. Click below to create a grade sheet for a class you teach."}
          </p>
          {!search && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" /> Create Grade Sheet
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSheets.map((sheet) => {
            const isOwner = String(sheet.created_by?._id) === String(user?._id);
            const canEdit = sheet.access === "edit" || isOwner;

            return (
              <Card
                key={sheet._id}
                onClick={() => router.push(`/dashboard/grades/${sheet._id}`)}
                className="group relative flex flex-col justify-between p-3.5 sm:p-4 hover:shadow-md hover:border-primary/50 transition-all border cursor-pointer gap-2.5"
              >
                {/* Top Badges & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase px-1.5 py-0.5 shrink-0">
                      {sheet.subject?.subject_code}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={
                        sheet.published
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[10px] px-1.5 py-0.5 shrink-0"
                          : "bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 shrink-0"
                      }
                    >
                      {sheet.published ? (
                        <span className="flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" /> Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Draft
                        </span>
                      )}
                    </Badge>
                    {isOwner ? (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 px-1.5 py-0.5 shrink-0">
                        Owner
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0">
                        {canEdit ? "Can Edit" : "View Only"}
                      </Badge>
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/grades/${sheet._id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> Open Sheet
                        </DropdownMenuItem>

                        {sheet.published && (
                          <DropdownMenuItem onClick={() => handleCopyLink(sheet._id)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy Link
                          </DropdownMenuItem>
                        )}

                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => setShareTargetSheet(sheet)}>
                              <Share2 className="mr-2 h-4 w-4" /> Share Access
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePublish(sheet)}>
                              {sheet.published ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" /> Unpublish
                                </>
                              ) : (
                                <>
                                  <Globe className="mr-2 h-4 w-4" /> Publish
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}

                        {(isOwner || user?.role === "admin") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTargetSheet(sheet)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Sheet
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Subject & Class Info */}
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                    {sheet.subject?.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    <span>{sheet.batch?.name}</span>
                    {sheet.batch?.department && (
                      <>
                        <span> • </span>
                        <span>{sheet.batch.department}</span>
                      </>
                    )}
                    {sheet.sem && (
                      <>
                        <span> • </span>
                        <span>Sem {sheet.sem}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                  <span>
                    <strong className="font-semibold text-foreground">{sheet.field_count ?? 0}</strong>{" "}
                    {sheet.field_count === 1 ? "column" : "columns"}
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setShareTargetSheet(sheet)}
                        title="Share access"
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    )}
                    {sheet.published && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopyLink(sheet._id)}
                        title="Copy view link"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2 font-medium text-primary hover:text-primary hover:bg-primary/10 ml-0.5"
                      onClick={() => router.push(`/dashboard/grades/${sheet._id}`)}
                    >
                      {canEdit ? "Open" : "View"} &rarr;
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateGradeSheetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchSheets}
      />

      {/* Share Dialog */}
      <ShareAccessDialog
        open={!!shareTargetSheet}
        onOpenChange={(open) => !open && setShareTargetSheet(null)}
        sheet={shareTargetSheet}
        onSuccess={(updated) => {
          setSheets((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTargetSheet} onOpenChange={(open) => !open && setDeleteTargetSheet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grade Sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the grade sheet for{" "}
              <strong>{deleteTargetSheet?.subject?.name}</strong> ({deleteTargetSheet?.batch?.name})? All assessment
              columns and student mark entries will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSheet}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
