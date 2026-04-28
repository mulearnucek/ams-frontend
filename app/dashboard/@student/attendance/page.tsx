"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStudentStats, type SubjectAttendanceStats } from "@/lib/api/attendance-stats";
import { listSubjects } from "@/lib/api/subject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CalendarCheck } from "lucide-react";

const normalizeSemesterNumber = (item: SubjectAttendanceStats): number | null => {
  const raw =
    (item as { sem?: string | number }).sem ??
    (item as { semester?: string | number }).semester ??
    (item as { subject?: { sem?: string | number; semester?: string | number } }).subject?.sem ??
    (item as { subject?: { sem?: string | number; semester?: string | number } }).subject?.semester;

  if (raw === null || raw === undefined) return null;
  const digits = String(raw).match(/\d+/)?.[0];
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatSemesterLabel = (sem: number | null) => {
  if (!sem) return "S-";
  return `S${sem}`;
};

const getAttendanceColor = (percentage: number) => {
  if (percentage >= 75) return "text-green-600 dark:text-green-400";
  if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<SubjectAttendanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectSemMap, setSubjectSemMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const stats = await getStudentStats();
        setAttendance(stats);
        setError(null);

        const map = new Map<string, string>();
        const department =
          (user?.profile as { department?: string })?.department ||
          (user?.profile as { dept?: string })?.dept;

        try {
          const subjectLookup = await listSubjects({ limit: 500, department });
          subjectLookup.subjects.forEach((subject) => {
            if (subject._id) map.set(subject._id, subject.sem);
          });
        } catch (subjectError) {
          console.warn("Failed to load subjects for semester mapping:", subjectError);
        }

        setSubjectSemMap(map);
      } catch (err) {
        console.error("Failed to fetch attendance stats:", err);
        setError(err instanceof Error ? err.message : "Failed to load attendance data");
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      loadAttendance();
    } else {
      setLoading(false);
    }
  }, [user?._id, user?.profile]);

  const resolveSemesterFromSubjects = (item: SubjectAttendanceStats): string | null => {
    const subjectId = item.subjectId;
    if (subjectId && subjectSemMap.has(subjectId)) {
      return subjectSemMap.get(subjectId) ?? null;
    }
    return null;
  };

  const attendanceWithSemester = useMemo(() => {
    return attendance.map((item) => {
      const derivedSem = resolveSemesterFromSubjects(item);
      return {
        ...item,
        semesterNumber:
          normalizeSemesterNumber(item) ||
          normalizeSemesterNumber({
            ...item,
            sem: derivedSem ?? item.sem,
            semester: derivedSem ?? item.semester,
          }),
      };
    });
  }, [attendance, subjectSemMap]);

  const filteredAttendance = attendanceWithSemester;

  return (
    <div className="container mx-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {filteredAttendance.length === 0 ? (
                <div className="text-sm text-muted-foreground">No attendance records found for the selected semester.</div>
              ) : (
                <div className="space-y-4">
                  {filteredAttendance
                    .slice()
                    .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
                    .map((subject) => (
                      <Card key={`${subject.subjectName}-${subject.subjectCode ?? ""}`} className="border-muted">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{subject.subjectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatSemesterLabel(subject.semesterNumber ?? null)}
                                {subject.subjectCode ? ` • ${subject.subjectCode}` : ""}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${getAttendanceColor(subject.percentage)}`}>
                              {subject.percentage}%
                            </span>
                          </div>
                          <Progress value={subject.percentage} className="h-2" />
                          <div className="flex flex-wrap justify-between text-xs text-muted-foreground">
                            <span>
                              {subject.attendedClasses} / {subject.totalClasses} classes attended
                            </span>
                            {subject.percentage >= 75 ? (
                              <span className="text-green-600 dark:text-green-400">
                                Can skip {subject.classesCanSkip} {subject.classesCanSkip === 1 ? "class" : "classes"}
                              </span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">
                                Need {subject.classesNeeded} {subject.classesNeeded === 1 ? "class" : "classes"} to reach 75%
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
