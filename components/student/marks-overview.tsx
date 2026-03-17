"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, TrendingDown } from "lucide-react";

type SubjectMark = {
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade?: string;
};

type MarksOverviewProps = {
  marks: SubjectMark[];
};

export default function MarksOverview({ marks }: MarksOverviewProps) {
  const totalObtained = marks.reduce((sum, item) => sum + item.marksObtained, 0);
  const totalMarks = marks.reduce((sum, item) => sum + item.totalMarks, 0);
  const overallPercentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(1) : 0;

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    return "F";
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (percentage >= 60) return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    if (percentage >= 50) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  };

  const overallGrade = getGrade(Number(overallPercentage));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Academic Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Performance */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Performance</span>
            <div className="flex items-center gap-2">
              <Badge className={getGradeColor(Number(overallPercentage))}>
                {overallGrade}
              </Badge>
              <span className="text-2xl font-bold text-foreground">
                {overallPercentage}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalObtained} / {totalMarks} marks obtained
          </p>
        </div>

        {/* Subject-wise Marks */}
        <div className="space-y-3">
          {marks.map((subject, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium">{subject.subjectName}</p>
                <p className="text-xs text-muted-foreground">
                  {subject.marksObtained} / {subject.totalMarks} marks
                </p>
              </div>
              <div className="flex items-center gap-2">
                {subject.percentage >= 80 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : subject.percentage < 60 ? (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : null}
                <Badge className={getGradeColor(subject.percentage)}>
                  {getGrade(subject.percentage)}
                </Badge>
                <span className="text-sm font-semibold min-w-12 text-right">
                  {subject.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
