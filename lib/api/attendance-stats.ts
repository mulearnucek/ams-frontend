
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface SubjectAttendanceStats {
  subjectId?: string;
  subjectName: string;
  subjectCode?: string;
  sem?: string | number;
  semester?: string | number;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  classesNeeded: number;
  classesCanSkip: number;
}

export interface TeacherAttendanceOverview {
  className: string;
  classCode: string;
  totalClasses: number;
  averageAttendance: number;
  trend: "up" | "down" | "stable";
}

export interface ClassReportSession {
  _id: string;
  start_time: string;
  end_time: string;
  session_type: string;
}

export interface ClassReportStudent {
  _id: string;
  name: string;
  email: string;
  candidate_code?: string;
  roll_no: string;
  attendance: Record<string, string>;
  totalPresent: number;
  totalSessions: number;
  percentage: number;
}

export interface ClassReportData {
  className: string;
  classCode: string;
  batchName: string;
  sessions: ClassReportSession[];
  students: ClassReportStudent[];
}

export async function getStudentStats(studentId?: string): Promise<SubjectAttendanceStats[]> {
  const queryParams = studentId ? `?student=${studentId}` : "";
  const response = await fetch(`${API_BASE}/attendance/stats${queryParams}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch student attendance stats");
  }

  const data = await response.json();
  return data.data;
}

export async function getTeacherOverview(): Promise<TeacherAttendanceOverview[]> {
  const response = await fetch(`${API_BASE}/attendance/overview`, {
    method: "GET",
    headers: {"Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch teacher attendance overview");
  }

  const data = await response.json();
  return data.data;
}

export async function getClassReport(subjectId: string, batchId: string): Promise<ClassReportData> {
  const response = await fetch(`${API_BASE}/attendance/report?subject=${subjectId}&batch=${batchId}`, {
    method: "GET",
    headers: {"Content-Type": "application/json" },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch class attendance report");
  }

  const data = await response.json();
  return data.data;
}
