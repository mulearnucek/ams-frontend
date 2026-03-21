"use client";

import { useState, useEffect, useCallback, useMemo, createRef, useRef } from "react";
import TinderCard from "react-tinder-card";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, RotateCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getAttendanceSessionById, type AttendanceSession } from "@/lib/api/attendance-session";
import { createBulkAttendanceRecords, type AttendanceStatus } from "@/lib/api/attendance-record";
import { listUsers } from "@/lib/api/user";
import type { User } from "@/lib/types/UserTypes";

interface TinderCardAPI {
  swipe(dir?: "left" | "right" | "up" | "down"): Promise<void>;
  restoreCard(): Promise<void>;
}

interface HistoryItem {
  studentId: string;
  status: AttendanceStatus;
  originalIndex: number;
}

const CARD_GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-cyan-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-amber-700",
  "from-rose-500 to-pink-700",
  "from-indigo-500 to-blue-700",
  "from-yellow-500 to-orange-600",
  "from-teal-500 to-green-700",
];

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default function SwipeAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [cardsLeftScreen, setCardsLeftScreen] = useState(0);
  const [markedStatuses, setMarkedStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dragDir, setDragDir] = useState<"left" | "right" | null>(null);
  const autoSwipeInProgressRef = useRef<number | null>(null);
  const autoSwipeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // childRefs[i] maps to students[i]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const childRefs = useMemo(() => students.map(() => createRef<TinderCardAPI>()), [students.length]);

  const loadBatchStudents = useCallback(async (batchId: string) => {
    setLoadingStudents(true);
    try {
      const batchStudents: User[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const response = await listUsers({ role: "student", page, limit: 100 });
        totalPages = response.pagination.totalPages;

        const matchedStudents = response.users.filter((s) => s.batch?._id === batchId);

        if (matchedStudents.length > 0) {
          batchStudents.push(...matchedStudents);
        } else {
          // If API fallback data does not carry the current session batch id, use the returned students.
          const looksLikeFallbackData = response.users.some((s) => s.batch?._id === "dummy-batch");
          if (looksLikeFallbackData) {
            batchStudents.push(...response.users);
          }
        }

        page++;
      }
      setStudents(batchStudents);
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAttendanceSessionById(sessionId);
      setSession(data);
      await loadBatchStudents(data.batch._id);
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }, [loadBatchStudents, sessionId]);

  useEffect(() => {
    if (sessionId) loadSession();
  }, [loadSession, sessionId]);

  const handleSwipe = (dir: string, studentId: string, originalIndex: number) => {
    if (autoSwipeTimeoutRef.current) {
      clearTimeout(autoSwipeTimeoutRef.current);
      autoSwipeTimeoutRef.current = null;
    }
    const status: AttendanceStatus = dir === "right" ? "present" : "absent";
    setMarkedStatuses((prev) => ({ ...prev, [studentId]: status }));
    setHistory((prev) => [...prev, { studentId, status, originalIndex }]);
    setSwipeIndex(originalIndex + 1);
    if (autoSwipeInProgressRef.current === originalIndex) {
      autoSwipeInProgressRef.current = null;
    }
    setDragDir(null);
    setSaveSuccess(false);
  };

  const handleCardLeftScreen = (dir: string, studentId: string, originalIndex: number) => {
    setCardsLeftScreen((prev) => Math.max(prev, originalIndex + 1));
  };

  // Programmatically swipe the current top card
  const swipe = async (dir: "left" | "right") => {
    if (swipeIndex >= students.length) return;
    await childRefs[swipeIndex]?.current?.swipe(dir);
  };

  // Undo the last swiped card using restoreCard()
  const handleUndo = async () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    if (autoSwipeTimeoutRef.current) {
      clearTimeout(autoSwipeTimeoutRef.current);
      autoSwipeTimeoutRef.current = null;
    }
    autoSwipeInProgressRef.current = null;
    
    // Decrement left screen index instantly so we unmount summary if active
    setCardsLeftScreen(last.originalIndex);
    // Move the active index back
    setSwipeIndex(last.originalIndex);
    setSaveSuccess(false);
    
    setMarkedStatuses((prev) => {
      const updated = { ...prev };
      delete updated[last.studentId];
      return updated;
    });
    setHistory((prev) => prev.slice(0, -1));

    // Delay restoreCard specifically so the DOM renders the card first
    setTimeout(() => {
      childRefs[last.originalIndex]?.current?.restoreCard();
    }, 50);
  };

  const submitAttendance = async () => {
    if (!session || students.length === 0) return;
    const records = students.map((student) => ({
      student: student._id,
      status: markedStatuses[student._id] ?? "absent",
    }));
    setSaving(true);
    try {
      await createBulkAttendanceRecords({ session: session._id, records });
      setSaveSuccess(true);
    } catch (err) {
      console.error("Failed to save:", err);
      alert(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(markedStatuses).filter((s) => s === "present").length;
  const absentCount = Object.values(markedStatuses).filter((s) => s === "absent").length;
  // allDone triggers ONLY when the final card has finished animating off screen
  const allDone = students.length > 0 && cardsLeftScreen >= students.length;
  // Use visible cards to ensure shadows wait for animation to complete
  const visibleRemaining = students.length - cardsLeftScreen;

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mx-auto w-full max-w-sm rounded-3xl" style={{ height: 440 }} />
        <Skeleton className="mx-auto h-16 w-48 rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/attendance")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.push(`/dashboard/attendance/session/${sessionId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{session.subject.name}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {session.batch.name} · {format(new Date(session.start_time), "MMM dd, hh:mm a")}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {swipeIndex} / {students.length}
        </Badge>
      </div>

      {/* ── Body ── */}
      {loadingStudents ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-4">
            <Skeleton className="w-full rounded-3xl" style={{ height: 440 }} />
            <Skeleton className="h-16 w-full rounded-full" />
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No Students Found</h3>
          <p className="text-muted-foreground text-sm">This batch has no students available for attendance marking.</p>
        </div>
      ) : allDone ? (
        /* ── Summary screen ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 max-w-sm mx-auto w-full">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">All Done!</h2>
            <p className="text-muted-foreground">Reviewed all {students.length} students.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="rounded-2xl border p-5 text-center">
              <p className="text-4xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Present</p>
            </div>
            <div className="rounded-2xl border p-5 text-center">
              <p className="text-4xl font-bold text-red-500">{absentCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Absent</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button variant="outline" onClick={handleUndo} disabled={history.length === 0 || saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Undo Last
            </Button>
            <Button size="lg" onClick={submitAttendance} disabled={saving}>
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
          {saveSuccess && (
            <div className="rounded-xl border border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300 p-4 text-sm text-center w-full">
              Attendance saved successfully!
            </div>
          )}
        </div>
      ) : (
        /* ── Swipe screen ── */
        <div className="flex-1 flex flex-col items-center gap-5 px-4 pb-6 pt-2">

          {/* Card stack */}
          <div
            className="relative w-full max-w-sm"
            style={{ height: 440 }}
          >
            {/* Static depth shadow cards - these use visibleRemaining so they don't vanish prematurely */}
            {visibleRemaining > 1 && (
              <div
                className="absolute inset-0 rounded-3xl border bg-muted/50 dark:bg-muted/20"
                style={{ transform: "scale(0.94) translateY(12px)", zIndex: 0 }}
              />
            )}
            {visibleRemaining > 2 && (
              <div
                className="absolute inset-0 rounded-3xl border bg-muted/30 dark:bg-muted/10"
                style={{ transform: "scale(0.88) translateY(24px)", zIndex: -1 }}
              />
            )}

            {/*
              TinderCards rendered in REVERSE order so that students[0] is at the
              end of the DOM → highest implicit z-index → appears on top.
              childRefs[i] always maps to students[i].
            */}
            {[...students].reverse().map((student, reversedIdx) => {
              const originalIdx = students.length - 1 - reversedIdx;
              const gradient = CARD_GRADIENTS[originalIdx % CARD_GRADIENTS.length];
              const initial = (
                student.user.first_name?.[0] ?? student.user.name?.[0] ?? "?"
              ).toUpperCase();

              const isActive = originalIdx === swipeIndex;
              const isGone = originalIdx < swipeIndex;

              const markedStatus = markedStatuses[student._id];
              const showAbsent = markedStatus === "absent" || (isActive && dragDir === "left");
              const showPresent = markedStatus === "present" || (isActive && dragDir === "right");

              return (
                <TinderCard
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ref={childRefs[originalIdx] as any}
                  key={student._id}
                  className={cn(
                    "absolute inset-0",
                    isGone ? "opacity-0 pointer-events-none" : "",
                    isActive ? "pointer-events-auto" : "pointer-events-none"
                  )}
                  onSwipe={(dir) => handleSwipe(dir, student._id, originalIdx)}
                  onCardLeftScreen={(dir) => handleCardLeftScreen(dir, student._id, originalIdx)}
                  onSwipeRequirementFulfilled={(dir) =>
                    {
                      const swipeDir = dir === "left" ? "left" : dir === "right" ? "right" : null;
                      setDragDir(swipeDir);

                      if (
                        isActive &&
                        swipeDir &&
                        autoSwipeInProgressRef.current !== originalIdx
                      ) {
                        autoSwipeInProgressRef.current = originalIdx;
                        autoSwipeTimeoutRef.current = setTimeout(() => {
                          void childRefs[originalIdx]?.current?.swipe(swipeDir);
                          autoSwipeTimeoutRef.current = null;
                        }, 120);
                      }
                    }
                  }
                  onSwipeRequirementUnfulfilled={() => {
                    setDragDir(null);
                    if (autoSwipeTimeoutRef.current) {
                      clearTimeout(autoSwipeTimeoutRef.current);
                      autoSwipeTimeoutRef.current = null;
                    }
                    if (autoSwipeInProgressRef.current === originalIdx) {
                      autoSwipeInProgressRef.current = null;
                    }
                  }}
                  preventSwipe={["up", "down"]}
                  swipeRequirementType="position"
                  swipeThreshold={30}
                >
                  {/* Card content — explicit height determines the TinderCard div's height */}
                  <div
                    className={cn(
                      "relative w-full rounded-3xl overflow-hidden select-none touch-none",
                      "shadow-2xl",
                      isActive ? "cursor-grab active:cursor-grabbing" : ""
                    )}
                    style={{ height: 440 }}
                  >
                    {/* Gradient background */}
                    <div className={cn("absolute inset-0 bg-linear-to-br", gradient)} />

                    {/* Giant initial letter */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="font-black text-white/20 leading-none" style={{ fontSize: 160 }} aria-hidden>
                        {initial}
                      </span>
                    </div>

                    {/* ABSENT stamp — shows when dragging left */}
                    <div
                      className={cn(
                        "absolute top-7 left-5 border-4 border-red-500 rounded-xl px-3 py-1 -rotate-18 transition-opacity duration-150",
                        showAbsent ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <span className="text-red-500 font-black text-xl uppercase tracking-widest">Absent</span>
                    </div>

                    {/* PRESENT stamp — shows when dragging right */}
                    <div
                      className={cn(
                        "absolute top-7 right-5 border-4 border-green-400 rounded-xl px-3 py-1 rotate-18 transition-opacity duration-150",
                        showPresent ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <span className="text-green-400 font-black text-xl uppercase tracking-widest">Present</span>
                    </div>

                    {/* Bottom info overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-5 pt-16 pb-5">
                      <h3 className="text-white text-xl font-bold leading-tight">{student.user.name}</h3>
                      <p className="text-white/70 text-sm mt-0.5">{student.user.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {student.adm_number && (
                          <span className="text-xs text-white/80 bg-white/20 px-2.5 py-0.5 rounded-full">
                            {student.adm_number}
                          </span>
                        )}
                        {student.department && (
                          <span className="text-xs text-white/80 bg-white/20 px-2.5 py-0.5 rounded-full">
                            {student.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TinderCard>
              );
            })}
          </div>

          {/* Swipe hints */}
          <div className="flex items-center justify-between w-full max-w-sm text-sm text-muted-foreground px-2">
            <span className="flex items-center gap-1.5">
              <X className="h-4 w-4 text-red-500" />
              Swipe left · Absent
            </span>
            <span className="flex items-center gap-1.5">
              Present · Swipe right
              <Check className="h-4 w-4 text-green-600" />
            </span>
          </div>

          {/* Action buttons: undo · absent · present */}
          <div className="flex items-center justify-center gap-5">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo last swipe"
            >
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full border-0 shadow-lg shadow-red-500/30"
              style={{ backgroundColor: "#ef4444" }}
              onClick={() => swipe("left")}
              title="Mark absent"
            >
              <X className="h-7 w-7 text-white" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full border-0 shadow-lg shadow-green-500/30"
              style={{ backgroundColor: "#22c55e" }}
              onClick={() => swipe("right")}
              title="Mark present"
            >
              <Check className="h-7 w-7 text-white" />
            </Button>
          </div>

          {/* Live counters */}
          <div className="flex gap-3">
            <Badge variant="outline" className="text-red-600 border-red-200 dark:border-red-900">
              Absent: {absentCount}
            </Badge>
            <Badge variant="secondary" className="text-green-700 dark:text-green-400">
              Present: {presentCount}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
