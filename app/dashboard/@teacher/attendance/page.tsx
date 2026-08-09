"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, Trash2, ChevronDown, ChevronRight, Share2, Folder, BookOpen, Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { listAttendanceSessions, deleteAttendanceSessionById, type AttendanceSession } from "@/lib/api/attendance-session";
import CreateClassDialog from "./create-class-dialog";
import { toast } from "sonner";
import { ShareAttendanceDialog } from "./share-attendance-dialog";
import { cn } from "@/lib/utils";

type ClassGroup = {
  groupKey: string;
  subjectName: string;
  subjectCode: string;
  subjectSem: string;
  batchName: string;
  admYear: number | null;
  archived: boolean;
  sessions: AttendanceSession[];
};

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogSession, setDeleteDialogSession] = useState<AttendanceSession | null>(null);
  const [shareDialogSession, setShareDialogSession] = useState<AttendanceSession | null>(null);
  const [expandedYears, setExpandedYears] = useState<number[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.email]);

  const filterTeacherSessions = (allSessions: AttendanceSession[]): AttendanceSession[] => {
    const currentUserId = user?._id;
    const currentTeacherEmail = user?.email?.toLowerCase();
    if (!currentUserId && !currentTeacherEmail) return [];

    const filtered = allSessions.filter((session) => {
      const creator = session.created_by as unknown as
        | string
        | {
            _id?: string;
            email?: string;
            user?: {
              _id?: string;
              email?: string;
            };
          }
        | undefined;

      const createdByUserId =
        typeof creator === "string"
          ? creator
          : (creator?.user?._id || creator?._id);

      const createdByEmail =
        typeof creator === "string"
          ? undefined
          : (creator?.user?.email || creator?.email)?.toLowerCase();

      if (currentUserId && createdByUserId) {
        return createdByUserId === currentUserId;
      }
      return Boolean(currentTeacherEmail && createdByEmail === currentTeacherEmail);
    });

    // If backend doesn't include creator metadata in list response, avoid blank page.
    if (filtered.length === 0 && allSessions.length > 0) {
      const hasCreatorMetadata = allSessions.some((session) => {
        const creator = session.created_by as unknown as
          | string
          | {
              _id?: string;
              email?: string;
              user?: {
                _id?: string;
                email?: string;
              };
            }
          | undefined;

        if (typeof creator === "string") return true;
        return Boolean(creator?._id || creator?.email || creator?.user?._id || creator?.user?.email);
      });

      if (!hasCreatorMetadata) {
        return allSessions;
      }
    }

    return filtered;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let allSessions: AttendanceSession[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const sessionsData = await listAttendanceSessions({ limit: 100, page });
        allSessions = [...allSessions, ...sessionsData.sessions];
        totalPages = sessionsData.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setSessions(filterTeacherSessions(allSessions));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      let allSessions: AttendanceSession[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const data = await listAttendanceSessions({ limit: 100, page });
        allSessions = [...allSessions, ...data.sessions];
        totalPages = data.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setSessions(filterTeacherSessions(allSessions));
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  // Groups: one per (subject, batch) — the "class" a teacher actually thinks in terms of.
  // A group's sessions always share one `archived` value, since a subject is tied to a
  // fixed semester and gets archived as a whole once its batch advances past it.
  const groups = useMemo(() => {
    const map = new Map<string, ClassGroup>();

    sessions.forEach((session) => {
      const groupKey = `${session.subject._id}-${session.batch._id}`;
      const existing = map.get(groupKey);

      if (existing) {
        existing.sessions.push(session);
      } else {
        map.set(groupKey, {
          groupKey,
          subjectName: session.subject.name,
          subjectCode: session.subject.subject_code ?? "",
          subjectSem: session.subject.sem ?? session.sem ?? "N/A",
          batchName: session.batch?.name ?? "N/A",
          admYear: session.batch?.adm_year ?? null,
          archived: Boolean(session.archived),
          sessions: [session],
        });
      }
    });

    return Array.from(map.values()).map((group) => ({
      ...group,
      sessions: [...group.sessions].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ),
    }));
  }, [sessions]);

  // Year -> groups, newest year first; groups within a year ordered live-before-archived,
  // then by descending semester.
  const groupsByYear = useMemo(() => {
    const map = new Map<number, ClassGroup[]>();
    const unassigned: ClassGroup[] = [];

    groups.forEach((group) => {
      if (group.admYear == null) {
        unassigned.push(group);
        return;
      }
      const bucket = map.get(group.admYear) ?? [];
      bucket.push(group);
      map.set(group.admYear, bucket);
    });

    // `subjectSem` is a free-form string off the API and can be "N/A". A finite
    // sentinel rather than -Infinity, so that two unparseable sems subtract to 0
    // instead of NaN - a NaN out of a comparator makes the whole sort undefined.
    // Real semesters are 1-8, so -1 sinks them below every genuine value.
    const semRank = (group: ClassGroup) => {
      const parsed = Number.parseInt(group.subjectSem, 10);
      return Number.isNaN(parsed) ? -1 : parsed;
    };

    // Archived classes go last regardless of semester - a past-semester S8 is not
    // more relevant than a live S3. Within each of those two bands the highest
    // semester leads, since that is the teacher's current work. Subject and batch
    // name remain the final tiebreakers so the order stays stable across loads.
    const sortGroups = (list: ClassGroup[]) =>
      [...list].sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        const semCompare = semRank(b) - semRank(a);
        if (semCompare !== 0) return semCompare;
        const subjectCompare = a.subjectName.localeCompare(b.subjectName);
        if (subjectCompare !== 0) return subjectCompare;
        return a.batchName.localeCompare(b.batchName);
      });

    const years = [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, list]) => ({ year, groups: sortGroups(list) }));

    return { years, unassigned: sortGroups(unassigned) };
  }, [groups]);

  // Default: expand the newest year and select its first class, so the page never
  // opens on an empty detail pane.
  useEffect(() => {
    if (loading) return;
    if (groupsByYear.years.length === 0) return;
    setExpandedYears((prev) => (prev.length > 0 ? prev : [groupsByYear.years[0].year]));
    setSelectedGroupKey((prev) => prev ?? groupsByYear.years[0].groups[0]?.groupKey ?? null);
  }, [loading, groupsByYear]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const selectedGroup = groups.find((g) => g.groupKey === selectedGroupKey) ?? null;

  const handleDelete = async (sessionId: string) => {
    try {
      await deleteAttendanceSessionById(sessionId);
      await loadSessions();
      setDeleteDialogSession(null);
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete session");
    }
  };

  const getSessionTypeBadge = (type: string) => {
    const variants = {
      regular: "default",
      extra: "secondary",
      practical: "outline",
    } as const;
    return variants[type as keyof typeof variants] || "default";
  };

  const totalSessionCount = sessions.length;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Attendance Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage attendance sessions and records
          </p>
        </div>
        <CreateClassDialog onClassCreated={loadSessions} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              Create a new class to start taking attendance
            </p>
            <CreateClassDialog onClassCreated={loadSessions} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row rounded-lg border shadow-sm overflow-hidden bg-card">
          {/* Sidebar: Admission Year -> Subject/Batch classes */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r bg-muted/10 p-4 space-y-1 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
            <h3 className="text-sm font-semibold px-2 mb-2 tracking-tight text-muted-foreground uppercase">
              Your Classes
            </h3>
            {groupsByYear.years.map(({ year, groups: yearGroups }) => {
              const isExpanded = expandedYears.includes(year);
              return (
                <div key={year} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-medium text-muted-foreground"
                    onClick={() => toggleYear(year)}
                  >
                    {isExpanded ? <ChevronDown className="mr-1.5 h-4 w-4" /> : <ChevronRight className="mr-1.5 h-4 w-4" />}
                    <Folder className="mr-2 h-4 w-4" /> {year} Batch
                    <Badge variant="outline" className="ml-auto">{yearGroups.length}</Badge>
                  </Button>
                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l border-border/50 flex flex-col gap-1 my-1">
                      {yearGroups.map((group) => (
                        <Button
                          key={group.groupKey}
                          variant={selectedGroupKey === group.groupKey ? "secondary" : "ghost"}
                          className="w-full justify-start h-auto py-2 text-left"
                          onClick={() => setSelectedGroupKey(group.groupKey)}
                        >
                          <BookOpen className="mr-2 h-3.5 w-3.5 opacity-70 shrink-0 mt-0.5" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm truncate">{group.subjectName}</span>
                            <span className="block text-xs text-muted-foreground truncate">{group.batchName}</span>
                          </span>
                          <span className="flex flex-col items-end gap-1 shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground">S{group.subjectSem}</span>
                            {group.archived && <Archive className="h-3 w-3 text-muted-foreground" />}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {groupsByYear.unassigned.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 pt-2 text-xs font-medium text-muted-foreground uppercase">Other</div>
                <div className="pl-1 flex flex-col gap-1">
                  {groupsByYear.unassigned.map((group) => (
                    <Button
                      key={group.groupKey}
                      variant={selectedGroupKey === group.groupKey ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto py-2 text-left"
                      onClick={() => setSelectedGroupKey(group.groupKey)}
                    >
                      <BookOpen className="mr-2 h-3.5 w-3.5 opacity-70 shrink-0 mt-0.5" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{group.subjectName}</span>
                        <span className="block text-xs text-muted-foreground truncate">{group.batchName}</span>
                      </span>
                      {group.archived && <Archive className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Detail pane: selected class's full session list */}
          <div className="flex-1 min-w-0 flex flex-col bg-card">
            {!selectedGroup ? (
              <div className="flex-1 flex items-center justify-center p-12 text-center text-muted-foreground">
                Select a class from the list to view its sessions.
              </div>
            ) : (
              <>
                <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold truncate min-w-0 flex-1">{selectedGroup.subjectName}</h2>
                      <Badge variant="outline" className="shrink-0">S{selectedGroup.subjectSem}</Badge>
                      {selectedGroup.archived && (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                          <Archive className="h-3 w-3" />Read-only
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedGroup.batchName}
                      {selectedGroup.admYear ? ` · ${selectedGroup.admYear} Batch` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {selectedGroup.sessions.length} {selectedGroup.sessions.length === 1 ? "session" : "sessions"}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const subjectId = selectedGroup.sessions[0].subject._id;
                        const batchId = selectedGroup.sessions[0].batch._id;
                        router.push(`/dashboard/attendance/report/${subjectId}/${batchId}`);
                      }}
                    >
                      View Report
                    </Button>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="hidden sm:table-cell">Duration</TableHead>
                          <TableHead className="text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.sessions.map((session) => (
                          <TableRow
                            key={session._id}
                            className={cn(
                              "hover:bg-muted/50 cursor-pointer",
                              session.archived && "opacity-70"
                            )}
                            onClick={() => router.push(`/dashboard/attendance/session/${session._id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {format(new Date(session.start_time), "MMM dd, hh:mm a")} -{" "}
                                  {format(new Date(session.end_time), "hh:mm a")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSessionTypeBadge(session.session_type)}>
                                {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {session.hours_taken} {session.hours_taken === 1 ? "hour" : "hours"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Share"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareDialogSession(session);
                                  }}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialogSession(session);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalSessionCount} total {totalSessionCount === 1 ? "session" : "sessions"} across {groups.length} {groups.length === 1 ? "class" : "classes"}.
        </p>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Session</CardTitle>
              <CardDescription>
                Are you sure you want to delete this attendance session? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{deleteDialogSession.subject.name}</p>
                <p className="text-sm text-muted-foreground">
                  {deleteDialogSession.batch?.name ?? "N/A"} • {format(new Date(deleteDialogSession.start_time), "MMM dd, yyyy hh:mm a")}
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setDeleteDialogSession(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteDialogSession._id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share Configuration Dialog */}
      <ShareAttendanceDialog
        session={shareDialogSession}
        onClose={() => setShareDialogSession(null)}
      />
    </div>
  );
}
