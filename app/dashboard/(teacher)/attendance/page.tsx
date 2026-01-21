"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  CheckSquare, 
  Hand, 
  FileText,
  User,
  Hash,
  Percent
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

// TODO: Replace with actual API calls
const dummyClasses = [
  {
    id: "CLS001",
    courseName: "Data Structures and Algorithms",
    courseCode: "CS301",
    batch: "IT",
    year: 3,
    section: "A",
    studentCount: 45,
  },
  {
    id: "CLS002",
    courseName: "Database Management Systems",
    courseCode: "CS302",
    batch: "CSE",
    year: 3,
    section: "B",
    studentCount: 50,
  },
];

const dummyStudents = [
  { 
    id: "STU001", 
    rollNumber: "IT21001", 
    name: "Abhishek Kumar", 
    currentAttendance: 87 
  },
  { 
    id: "STU002", 
    rollNumber: "IT21002", 
    name: "Priya Sharma", 
    currentAttendance: 92 
  },
  { 
    id: "STU003", 
    rollNumber: "IT21003", 
    name: "Rahul Verma", 
    currentAttendance: 68 
  },
  { 
    id: "STU004", 
    rollNumber: "IT21004", 
    name: "Sneha Patel", 
    currentAttendance: 95 
  },
  { 
    id: "STU005", 
    rollNumber: "IT21005", 
    name: "Arjun Singh", 
    currentAttendance: 73 
  },
  { 
    id: "STU006", 
    rollNumber: "IT21006", 
    name: "Ananya Reddy", 
    currentAttendance: 88 
  },
  { 
    id: "STU007", 
    rollNumber: "IT21007", 
    name: "Vikram Joshi", 
    currentAttendance: 81 
  },
  { 
    id: "STU008", 
    rollNumber: "IT21008", 
    name: "Divya Nair", 
    currentAttendance: 90 
  },
];

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classId = searchParams.get("classId");

  const [selectedClass, setSelectedClass] = useState<typeof dummyClasses[0] | null>(null);
  const [currentDate] = useState(new Date());
  const [currentTime] = useState(format(new Date(), "hh:mm a"));
  const [students, setStudents] = useState(dummyStudents);

  useEffect(() => {
    if (classId) {
      const classData = dummyClasses.find((c) => c.id === classId);
      setSelectedClass(classData || null);
    }
  }, [classId]);

  if (!classId || !selectedClass) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Class Selected</CardTitle>
            <CardDescription>
              Please select a class from the dashboard to take attendance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage < 75) return "text-destructive";
    if (percentage < 85) return "text-yellow-600 dark:text-yellow-500";
    return "text-green-600 dark:text-green-500";
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Take Attendance</h1>
          <p className="text-muted-foreground">
            Mark attendance for your class
          </p>
        </div>
      </div>

      {/* Class Information */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {selectedClass.courseName}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{selectedClass.courseCode}</span>
                <span>•</span>
                <span>
                  {selectedClass.batch} {selectedClass.section}
                </span>
                <span>•</span>
                <span>Year {selectedClass.year}</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-2">
              <Users className="mr-2 h-4 w-4" />
              {selectedClass.studentCount} Students
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-filled Date */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(currentDate, "EEEE, MMMM dd, yyyy")}
                </p>
              </div>
            </div>

            {/* Auto-filled Time */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-sm text-muted-foreground">{currentTime}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Marking Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Attendance Marking Method</CardTitle>
          <CardDescription>
            Select one of the three methods to mark attendance for this session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Swiping Method */}
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary"
              onClick={() => alert("Swiping method - Coming soon!")}
            >
              <Hand className="h-8 w-8" />
              <div className="text-center space-y-1">
                <p className="font-semibold">Swipe Method</p>
                <p className="text-xs text-muted-foreground">
                  Swipe left/right for each student
                </p>
              </div>
            </Button>

            {/* Tick Method */}
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary"
              onClick={() => alert("Tick method - Coming soon!")}
            >
              <CheckSquare className="h-8 w-8" />
              <div className="text-center space-y-1">
                <p className="font-semibold">Tick Method</p>
                <p className="text-xs text-muted-foreground">
                  Check boxes for present students
                </p>
              </div>
            </Button>

            {/* CSV Method */}
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary"
              onClick={() => alert("CSV method - Coming soon!")}
            >
              <FileText className="h-8 w-8" />
              <div className="text-center space-y-1">
                <p className="font-semibold">CSV Method</p>
                <p className="text-xs text-muted-foreground">
                  Enter roll numbers separated by commas
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Overview of students in this class with their current attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted rounded-lg font-medium text-sm">
              <div className="col-span-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span>Roll No.</span>
              </div>
              <div className="col-span-6 flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Name</span>
              </div>
              <div className="col-span-3 flex items-center gap-2 justify-end">
                <Percent className="h-4 w-4" />
                <span>Attendance</span>
              </div>
            </div>

            <Separator />

            {/* Student Rows */}
            <div className="space-y-1">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-3 font-mono text-sm">
                    {student.rollNumber}
                  </div>
                  <div className="col-span-6 font-medium">{student.name}</div>
                  <div className="col-span-3 text-right">
                    <span
                      className={`font-semibold ${getAttendanceColor(
                        student.currentAttendance
                      )}`}
                    >
                      {student.currentAttendance}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
