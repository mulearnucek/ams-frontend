"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, CalendarDays, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getClassReport, type ClassReportData } from "@/lib/api/attendance-stats";
import { format } from "date-fns";

export default function ClassReportPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const batchId = params.batchId as string;

  const [data, setData] = useState<ClassReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const reportData = await getClassReport(subjectId, batchId);
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId, batchId]);

  const handleExportCsv = () => {
    if (!data) return;

    const headers = ["Roll No", "ID", "Name"];
    data.sessions.forEach(s => {
      headers.push(format(new Date(s.start_time), "dd/MM/yyyy"));
    });
    headers.push("Classes Attended", "Total Classes", "Percentage");

    const rows = data.students.map(student => {
      const row = [
        student.roll_no || "-",
        student.candidate_code || "-",
        student.name,
      ];
      
      data.sessions.forEach(s => {
        const status = student.attendance[s._id];
        let statusMarker = "-";
        if (status === "present") statusMarker = "P";
        else if (status === "absent") statusMarker = "A";
        else if (status === "late") statusMarker = "L";
        else if (status === "excused") statusMarker = "E";
        row.push(statusMarker);
      });

      row.push(student.totalPresent.toString(), student.totalSessions.toString(), `${student.percentage}%`);
      return row.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `class_report_${subjectId}_${batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Class Attendance Report</h1>
            <p className="text-muted-foreground text-sm">Detailed tabular view of attendance</p>
          </div>
          <div className="ml-auto">
            <Button onClick={handleExportCsv} disabled={!data || data.students.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      ) : !data || data.students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Data Available</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              There are no attendance sessions recorded for this specific class and batch yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border shadow-sm flex flex-col">
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse m-0 p-0">
                <thead className="text-muted-foreground font-medium text-xs">
                  <tr>
                    <th colSpan={data.sessions.length + 2} className="px-4 py-3 border-none font-normal bg-muted">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</span>
                          <span className="text-sm font-semibold text-foreground">{data.className}</span>
                          {data.classCode !== 'N/A' && <span className="text-xs text-muted-foreground">({data.classCode})</span>}
                        </div>
                        <div className="hidden md:block w-px h-4 bg-border"></div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch</span>
                          <span className="text-sm font-semibold text-foreground">{data.batchName}</span>
                        </div>
                      </div>
                    </th>
                  </tr>
                  <tr className="uppercase bg-muted">
                    <th className="px-4 py-3 border-b min-w-[200px] md:sticky md:left-0 md:z-20 md:bg-muted">Student Name</th>
                    {data?.sessions.map(session => (
                      <th key={session._id} className="px-2 py-3 border-b text-center min-w-[60px] bg-muted">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center cursor-help">
                              <span>{format(new Date(session.start_time), "dd/MM")}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{format(new Date(session.start_time), "MMM dd, yyyy")}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(session.start_time), "hh:mm a")} - {format(new Date(session.end_time), "hh:mm a")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                    <th className="px-4 py-3 border-b text-center md:sticky md:right-0 md:z-20 md:bg-muted md:shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Percentage</th>
                  </tr>
                </thead>
              <tbody className="divide-y">
                {data?.students.map(student => (
                  <tr key={student._id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium md:sticky md:left-0 md:z-10 md:bg-background md:group-hover:bg-muted/20">
                      <div className="flex flex-col">
                        <span 
                          className="hover:underline cursor-pointer text-foreground"
                          onClick={() => router.push(`/dashboard/attendance/student/${student._id}`)}
                        >
                          {student.name}
                        </span>
                        <span className="text-xs text-muted-foreground w-[120px] overflow-hidden text-ellipsis whitespace-nowrap block" dir="rtl" style={{ textAlign: "left" }}>
                          {student.candidate_code || student.roll_no}
                        </span>
                      </div>
                    </td>
                    {data.sessions.map(session => {
                      const status = student.attendance[session._id];
                      let cellClass = "text-muted-foreground";
                      let display = "-";

                      if (status === "present") {
                        cellClass = "text-green-600 dark:text-green-400 font-semibold";
                        display = "P";
                      } else if (status === "absent") {
                        cellClass = "text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/20";
                        display = "A";
                      } else if (status === "late") {
                        cellClass = "text-yellow-600 dark:text-yellow-400 font-semibold";
                        display = "L";
                      } else if (status === "excused") {
                        cellClass = "text-blue-600 dark:text-blue-400 font-semibold";
                        display = "E";
                      }

                      return (
                        <td key={session._id} className={`px-2 py-3 text-center border-l border-muted/50 ${cellClass}`}>
                          {display}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold md:sticky md:right-0 md:z-10 md:bg-background md:shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
                      <span className={student.percentage < 75 ? "text-red-600" : student.percentage >= 90 ? "text-green-600" : ""}>
                        {student.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </Card>
      )}
    </div>
  );
}
