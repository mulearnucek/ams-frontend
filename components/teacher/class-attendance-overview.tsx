"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarCheck, TrendingUp, TrendingDown, Plus } from "lucide-react";
import CreateClassDialog from "@/app/dashboard/@teacher/attendance/create-class-dialog";

type ClassAttendance = {
  className: string;
  classCode: string;
  totalClasses: number;
  averageAttendance: number;
  trend: "up" | "down" | "stable";
};

type ClassAttendanceOverviewProps = {
  attendance: ClassAttendance[];
  onClassCreated?: () => void;
};

const AttendanceGauge = ({ percentage, colorClass }: { percentage: number, colorClass: string }) => {
  const radius = 40;
  const circumference = Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative w-48 h-24 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 50">
          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-muted/20"
          />
          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-1000 ease-out ${colorClass}`}
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end h-full pb-1">
            <span className={`text-3xl font-bold ${colorClass}`}>
                {percentage}%
            </span>
        </div>
      </div>
    </div>
  );
};

export default function ClassAttendanceOverview({ attendance, onClassCreated }: ClassAttendanceOverviewProps) {
  const overallAverage = attendance.length > 0 
    ? Math.round(attendance.reduce((sum, item) => sum + item.averageAttendance, 0) / attendance.length) 
    : 0;

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAttendanceMessage = (percentage: number) => {
    if (percentage >= 75) return "Classes performing well!";
    if (percentage >= 60) return "Some classes need attention.";
    return "Multiple classes below threshold.";
  };

  const getTrendIcon = (trend: ClassAttendance["trend"]) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
    return null;
  };

  return (
    <Card className="h-auto lg:h-[560px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" />
          Class Attendance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 min-h-0 overflow-y-auto flex flex-col">
        {attendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 my-auto text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <CalendarCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="text-base font-semibold mb-1">No attendance data yet</h4>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              Attendance statistics and class performance will appear here once you conduct your first class session.
            </p>
            {onClassCreated && (
              <CreateClassDialog
                onClassCreated={onClassCreated}
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Class
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <>
            {/* Overall Gauge */}
            <div className="flex flex-col items-center">
              <AttendanceGauge 
                percentage={overallAverage} 
                colorClass={getAttendanceColor(overallAverage)} 
              />
              <p className={`text-sm font-medium mt-2 ${getAttendanceColor(overallAverage)}`}>
                Overall Average: {overallAverage}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getAttendanceMessage(overallAverage)}
              </p>
            </div>

            {/* Per-Class Breakdown */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Class-wise Performance</h4>
              {attendance.map((classItem, index) => {
                const percentage = classItem.averageAttendance;
                const colorClass = getAttendanceColor(percentage);

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{classItem.className}</span>
                        {getTrendIcon(classItem.trend)}
                      </div>
                      <span className={`font-semibold ${colorClass}`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={percentage} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-xs text-muted-foreground w-16">
                        {classItem.totalClasses} classes
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {classItem.classCode}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
