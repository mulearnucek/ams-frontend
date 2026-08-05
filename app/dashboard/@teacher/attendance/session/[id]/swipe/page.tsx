"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, RotateCcw, Save } from "lucide-react";
import { getAttendanceSessionById, type AttendanceSession, type EmbeddedAttendanceRecord } from "@/lib/api/attendance-session";
import { listUsers } from "@/lib/api/user";
import { createBulkAttendanceRecords, updateBulkAttendanceRecords, type AttendanceStatus } from "@/lib/api/attendance-record";
import type { User } from "@/lib/types/UserTypes";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useAttendance, AttendanceProvider } from "@/app/context/AttendanceContext";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const SMOOTH_SPRING = { type: "spring" as const, stiffness: 300, damping: 32, mass: 0.8 };

// Requirement 1: All cards have the exact same unified background color & theme
const CARD_GRADIENT = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
const CARD_ACCENT = "#818cf8";

// Requirement 2: Same colors as used in tick method
const COLOR_PRESENT = "#10b981"; // Emerald/Green from tick method
const COLOR_ABSENT = "#ef4444"; // Red from tick method

function SwipeCard({
  student,
  isTop,
  stackIndex,
  onSwipe,
  programmaticDir,
  statusDir,
  enterFrom,
}: {
  student: User;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (dir: "left" | "right") => void;
  programmaticDir?: string | null;
  statusDir?: "left" | "right" | null;
  enterFrom?: "left" | "right" | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-20, 0, 20]);

  const DEAD_ZONE = 8;
  const rawGreenOpacity = useTransform(x, [0, DEAD_ZONE, 120], [0, 0.25, 1]);
  const rawRedOpacity = useTransform(x, [-120, -DEAD_ZONE, 0], [1, 0.25, 0]);

  const isGreen = programmaticDir === "right" || statusDir === "right";
  const isRed = programmaticDir === "left" || statusDir === "left";
  const greenOpacity = isGreen ? 1 : rawGreenOpacity;
  const redOpacity = isRed ? 1 : rawRedOpacity;

  const behindScale = 1 - stackIndex * 0.05;
  const behindY = stackIndex * 12;

  const candidateCode = (student.profile as any)?.candidate_code || (student.profile as any)?.adm_number || "";
  const lastThreeDigits = candidateCode.slice(-3) || `${student.first_name?.charAt(0) ?? ""}${student.last_name?.charAt(0) ?? ""}`.toUpperCase();

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number } }) => {
    if (!isTop) return;
    const threshold = 80;
    if (info.offset.x > threshold || info.velocity.x > 350) {
      onSwipe("right");
    } else if (info.offset.x < -threshold || info.velocity.x < -350) {
      onSwipe("left");
    }
  };

  const enterInitial = enterFrom
    ? {
      x: enterFrom === "right" ? 340 : -340,
      rotate: enterFrom === "right" ? 25 : -25,
      opacity: 0,
    }
    : undefined;

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
      initial={enterInitial}
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : behindY,
        rotate: isTop ? rotate : 0,
        scale: isTop ? 1 : behindScale,
        zIndex: 100 - stackIndex,
        transformOrigin: "bottom center",
        borderRadius: 28,
        boxShadow: isTop
          ? "0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)"
          : "0 8px 24px rgba(0,0,0,0.18)",
        pointerEvents: isTop ? "auto" : "none",
        touchAction: isTop ? "none" : "auto",
      }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.95} // High elasticity allowing card to move freely anywhere on the screen!
      onDragEnd={handleDragEnd}
      animate={
        programmaticDir === "right"
          ? { x: 600, rotate: 25, opacity: 0 }
          : programmaticDir === "left"
            ? { x: -600, rotate: -25, opacity: 0 }
            : { x: 0, y: isTop ? 0 : behindY, rotate: 0, scale: isTop ? 1 : behindScale, opacity: 1 }
      }
      transition={SMOOTH_SPRING}
    >
      {/* Same base card gradient background for all cards */}
      <div className="absolute inset-0" style={{ background: CARD_GRADIENT, borderRadius: 28 }} />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          borderRadius: 28,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 28,
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${CARD_ACCENT}18 0%, transparent 70%)`,
        }}
      />

      {/* GREEN present overlay (Right drag) — Tick method green color */}
      {isTop && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            opacity: greenOpacity,
            background: `linear-gradient(135deg, ${COLOR_PRESENT} 0%, #059669 100%)`,
            borderRadius: 28,
          }}
        />
      )}

      {/* RED absent overlay (Left drag) — Tick method red color */}
      {isTop && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            opacity: redOpacity,
            background: `linear-gradient(135deg, ${COLOR_ABSENT} 0%, #dc2626 100%)`,
            borderRadius: 28,
          }}
        />
      )}

      {/* Card content */}
      <div className="relative z-20 flex flex-col w-full h-full px-5 pt-5 pb-5 max-sm:px-4 max-sm:pt-4 max-sm:pb-4 sm:px-5 sm:pt-5 sm:pb-5" style={{ color: "white" }}>
        {isTop && (
          <div className="flex justify-between mb-4 opacity-60 max-sm:mb-2 sm:mb-3">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#fca5a5" }}>← ABSENT</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#86efac" }}>PRESENT →</span>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center max-sm:py-1">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-[64px] h-[64px] rounded-full sm:w-[76px] sm:h-[76px]"
              style={{
                background: `radial-gradient(circle, ${CARD_ACCENT}30 0%, transparent 70%)`,
                filter: "blur(16px)",
              }}
            />
            <div
              className="flex items-center justify-center rounded-full border w-[52px] h-[52px] sm:w-[62px] sm:h-[62px]"
              style={{
                borderColor: `${CARD_ACCENT}55`,
                background: `radial-gradient(circle at 35% 35%, ${CARD_ACCENT}22, transparent 65%)`,
                backdropFilter: "blur(4px)",
                fontSize: 26,
                fontWeight: 700,
                color: CARD_ACCENT,
                letterSpacing: "-0.02em",
                textShadow: `0 0 24px ${CARD_ACCENT}88`,
              }}
            >
              {lastThreeDigits}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1 max-sm:mt-2">
          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", marginBottom: 10 }} />
          <p className="max-sm:text-[16px]" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>
            {student.name}
          </p>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500, letterSpacing: "0.06em" }}>
              {(student.profile as any)?.adm_number || "—"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>
              {(student.profile as any)?.department || ""}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SwipeAttendanceContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { initSession, setStudentStatus, setMultiple } = useAttendance();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [existingRecords, setExistingRecords] = useState<Map<string, EmbeddedAttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [markedRecords, setMarkedRecords] = useState<Array<{ studentId: string; status: AttendanceStatus }>>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [lastSwipeDir, setLastSwipeDir] = useState<string | null>(null);
  const [restoringCardId, setRestoringCardId] = useState<string | null>(null);
  const [programmaticDir, setProgrammaticDir] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const sessionData = await getAttendanceSessionById(sessionId);
        setSession(sessionData);

        const recordsMap = new Map<string, EmbeddedAttendanceRecord>();
        (sessionData.records ?? []).forEach((record: any) => {
          const studentId = typeof record.student === 'string'
            ? record.student
            : record.student._id;
          recordsMap.set(studentId, record);
        });
        setExistingRecords(recordsMap);
        const sessionBatchId = typeof sessionData.batch === "string"
          ? sessionData.batch
          : sessionData.batch?._id;

        let allStudents: User[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const usersResponse = await listUsers({ role: "student", batch: sessionBatchId, limit: 100, page });
          allStudents = [...allStudents, ...usersResponse.users];
          totalPages = usersResponse.pagination?.totalPages || 1;
          page++;
        } while (page <= totalPages);

        // Sort allStudents by roll number
        allStudents.sort((a, b) => {
          const profileA = (a.profile as any) || {};
          const profileB = (b.profile as any) || {};
          const rollA = String(profileA.adm_number || profileA.candidate_code || '').trim();
          const rollB = String(profileB.adm_number || profileB.candidate_code || '').trim();

          if (rollA && rollB) {
            return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        // Reverse so the first roll number is at the END (rendered on TOP of the stack)
        allStudents.reverse();

        setStudents(allStudents);
        setMarkedRecords([]);                        // always start clean
        setCurrentIndex(allStudents.length - 1);

        // Clear any stale localStorage for this session so the context
        // doesn't pre-populate overlays with old data
        localStorage.removeItem(`attendance_session_${sessionId}`);
        initSession(sessionId);                      // fresh session, no server records
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load session or students.");
      } finally {
        setLoading(false);
      }
    };
    if (sessionId) loadData();
  }, [sessionId]);

  const canGoBack = currentIndex < students.length - 1;
  const canSwipe = currentIndex >= 0;

  const handleSwipe = useCallback((direction: "left" | "right") => {
    if (currentIndex < 0) return;
    const currentStudent = students[currentIndex];
    if (!currentStudent) return;

    const studentId = currentStudent._id!;
    const status: AttendanceStatus = direction === "right" ? "present" : "absent";

    setLastSwipeDir(direction);
    setStudentStatus(studentId, status);
    setMarkedRecords((prev) => {
      const existing = prev.filter((r) => r.studentId !== studentId);
      return [...existing, { studentId, status }];
    });
    setProgrammaticDir(null);
    setCurrentIndex((prev) => prev - 1);
  }, [currentIndex, students, setStudentStatus]);

  const triggerButtonSwipe = async (dir: "left" | "right") => {
    if (!canSwipe) return;
    setProgrammaticDir(dir);
    // Allow state to trigger card color shift & animation before completing swipe
    setTimeout(() => {
      handleSwipe(dir);
    }, 280);
  };

  const goBack = async () => {
    if (!canGoBack) return;
    const newIndex = currentIndex + 1;
    const restoredStudent = students[newIndex];
    setRestoringCardId(restoredStudent._id!);
    setCurrentIndex(newIndex);
    setMarkedRecords((prev) => {
      const newArray = [...prev];
      const removed = newArray.pop();
      if (removed) setStudentStatus(removed.studentId, undefined as any);
      return newArray;
    });
    setTimeout(() => setRestoringCardId(null), 500);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!session) throw new Error("No session found");

      // Split into creates and updates
      const toCreate: Array<{ student: string; status: AttendanceStatus }> = [];
      const toUpdate: Array<{ recordId: string; status: AttendanceStatus }> = [];

      markedRecords.forEach((r) => {
        const existing = existingRecords.get(r.studentId);
        if (existing) {
          toUpdate.push({ recordId: existing._id, status: r.status });
        } else {
          toCreate.push({ student: r.studentId, status: r.status });
        }
      });

      // Create new records
      if (toCreate.length > 0) {
        const createRes: any = await createBulkAttendanceRecords({
          session: session._id,
          records: toCreate,
        });
        if (createRes?.errors && createRes.errors.length > 0) {
          console.error("createBulkAttendanceRecords errors:", createRes.errors);
          toast.error(`${createRes.errors.length} record(s) failed to create. Please retry.`);
          return;
        }
      }

      // Update existing records
      if (toUpdate.length > 0) {
        const updateRes: any = await updateBulkAttendanceRecords({
          session: session._id,
          updates: toUpdate,
        });
        if (updateRes?.errors && updateRes.errors.length > 0) {
          console.error("updateBulkAttendanceRecords errors:", updateRes.errors);
          const sample = updateRes.errors
            .slice(0, 5)
            .map((e: any) => e.recordId ?? e.student ?? e.message ?? JSON.stringify(e))
            .join(", ");
          toast.error(`${updateRes.errors.length} update(s) failed: ${sample}`);
          return;
        }
      }

      toast.success("Attendance successfully marked!");
      window.location.href = `/dashboard/attendance/session/${sessionId}`;
    } catch (error: any) {
      toast.error(error.message || "Failed to submit attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = markedRecords.filter((r) => r.status === "present").length;
  const absentCount = markedRecords.filter((r) => r.status === "absent").length;
  const remaining = students.length - presentCount - absentCount;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-[440px] w-full max-w-sm rounded-[28px]" />
      </div>
    );
  }

  if (!session || students.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold mb-4">No Students Found</h2>
        <Button onClick={() => window.location.href = `/dashboard/attendance/session/${sessionId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col gap-2 pt-3 pb-2 px-3 md:px-8 select-none overflow-hidden overscroll-none max-sm:pt-2 max-sm:pb-1 max-sm:px-2">

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Header */}
        <div className="flex items-center gap-3 max-sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = `/dashboard/attendance/session/${sessionId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Swipe Attendance</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session.subject.name} · {session.batch?.name || "N/A"}
            </p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex justify-center gap-3 max-sm:gap-2 max-sm:flex-wrap md:justify-end">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {presentCount} Present
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {absentCount} Absent
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
            style={{ background: "rgba(128,128,128,0.06)", border: "1px solid rgba(128,128,128,0.15)" }}>
            {remaining} Left
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-start max-w-[88%] sm:max-w-[20rem] mx-auto w-full max-sm:max-w-[96%] max-sm:justify-start md:pt-0 lg:pt-0 md:-mt-8 lg:-mt-10">

        {/* Done state */}
        <AnimatePresence>
          {currentIndex === -1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={SMOOTH_SPRING}
              className="w-full"
            >
              <Card className="w-full text-center shadow-2xl border">
                <CardHeader>
                  <CardTitle className="text-2xl">All Done 🎉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-5" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <p className="text-4xl font-black" style={{ color: "#10b981" }}>{presentCount}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Present</p>
                    </div>
                    <div className="rounded-2xl p-5" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="text-4xl font-black text-red-500">{absentCount}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Absent</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Button className="w-full h-11" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Submit Attendance</>}
                    </Button>
                    <Button variant="outline" className="w-full h-11" onClick={goBack} disabled={submitting}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Review Last Card
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Stack */}
        {currentIndex >= 0 && (
          <div className="relative w-full max-sm:h-[42svh] sm:h-[320px]" style={{ isolation: "isolate", zIndex: 40 }}>
            {students.map((student, idx) => {
              if (idx > currentIndex) return null;
              const stackIndex = currentIndex - idx;
              if (stackIndex > 1) return null;

              const isTop = stackIndex === 0;
              const isRestoring = student._id === restoringCardId;

              return (
                <AnimatePresence key={student._id}>
                  <SwipeCard
                    key={student._id}
                    student={student}
                    isTop={isTop}
                    stackIndex={stackIndex}
                    onSwipe={handleSwipe}
                    programmaticDir={isTop ? programmaticDir : null}
                    statusDir={isTop && isRestoring ? (lastSwipeDir as "left" | "right") : null}
                    enterFrom={isTop && isRestoring ? (lastSwipeDir as "left" | "right") : null}
                  />
                </AnimatePresence>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        {currentIndex >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...SMOOTH_SPRING }}
            className="flex items-center justify-center gap-4 mt-4 pb-3 max-sm:gap-3 max-sm:mt-4"
          >
            <motion.button
              whileTap={{ scale: 0.86 }}
              whileHover={{ scale: 1.07 }}
              onClick={() => triggerButtonSwipe("left")}
              className="h-11 w-11 rounded-full flex items-center justify-center max-sm:h-10 max-sm:w-10"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1.5px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
                boxShadow: "0 4px 20px rgba(239,68,68,0.15)",
              }}
            >
              <X className="h-7 w-7" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.86 }}
              whileHover={{ scale: 1.07 }}
              onClick={goBack}
              disabled={!canGoBack}
              className="h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-25 max-sm:h-10 max-sm:w-10"
              style={{
                background: "rgba(128,128,128,0.07)",
                border: "1px solid rgba(128,128,128,0.2)",
                color: "var(--muted-foreground)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.86 }}
              whileHover={{ scale: 1.07 }}
              onClick={() => triggerButtonSwipe("right")}
              className="h-11 w-11 rounded-full flex items-center justify-center max-sm:h-10 max-sm:w-10"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1.5px solid rgba(16,185,129,0.3)",
                color: "#10b981",
                boxShadow: "0 4px 20px rgba(16,185,129,0.15)",
              }}
            >
              <Check className="h-7 w-7" />
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      {currentIndex >= 0 && (
        <div className="mt-2 w-full max-w-sm mx-auto max-sm:mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{students.length - 1 - currentIndex} marked</span>
            <span>{students.length} total</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(128,128,128,0.12)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #10b981, #6ee7b7)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((students.length - 1 - currentIndex) / students.length) * 100}%` }}
              transition={SMOOTH_SPRING}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SwipeAttendancePage() {
  return (
    <AttendanceProvider>
      <SwipeAttendanceContent />
    </AttendanceProvider>
  );
}