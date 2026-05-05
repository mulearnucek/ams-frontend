"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import GreetingHeader from "@/components/student/greeting-header";
import AttendanceOverview from "@/components/student/attendance-overview";
import NotificationsList from "@/components/student/notifications-list";
import { getStudentStats, type SubjectAttendanceStats } from "@/lib/api/attendance-stats";
import { getStoredReadIds, listMyNotifications, markNotificationRead, type NotificationRecord } from "@/lib/api/notification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";


const mapNotificationType = (notificationType: string) => {
  switch (notificationType) {
    case "results":
      return "success" as const;
    case "info":
      return "info" as const;
    case "announcement":
    default:
      return "announcement" as const;
  }
};

const getNotificationCreatedTime = (createdAt?: string, id?: string) => {
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!Number.isNaN(createdTime)) return createdTime;
  }

  if (id && /^[a-f\d]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }

  return Date.now();
};

const normalizeNotification = (notification: NotificationRecord, index: number) => {
  const id = notification._id || notification.id || `notification-${index}`;
  const typeValue = notification.Notificationtype || notification.notificationType || "announcement";
  const createdAtValue = notification.createdAt || notification.created_at;
  const createdTime = getNotificationCreatedTime(createdAtValue, id);

  return {
    id,
    title: notification.title || "Untitled",
    message: notification.message || "",
    type: mapNotificationType(typeValue),
    postedBy: "System",
    postedAt: new Date(createdTime),
    priorityLevel: notification.priorityLevel,
    isRead: false
  };
};

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<SubjectAttendanceStats[]>([]);
  const [notifications, setNotifications] = useState<ReturnType<typeof normalizeNotification>[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        if (!user?._id) {
          throw new Error("User information not available");
        }

        const stats = await getStudentStats();
        setAttendance(stats);
        setError(null);
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        setError(err instanceof Error ? err.message : "Failed to load attendance data");
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchAttendanceData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        setNotificationsError(null);
        const data = await listMyNotifications();
        const readIds = getStoredReadIds(user?._id);
        const normalized = data.map((notification, index) => {
          const normalizedNotification = normalizeNotification(notification, index);
          return {
            ...normalizedNotification,
            isRead: readIds.includes(normalizedNotification.id)
          };
        });
        setNotifications(normalized);
      } catch (err) {
        setNotificationsError(err instanceof Error ? err.message : "Failed to load notifications");
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
  }, [user?._id]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      prev.forEach((notification) => {
        markNotificationRead(notification.id, user?._id);
      });
      return prev.map((notification) => ({ ...notification, isRead: true }));
    });
  };

  const hasUnread = notifications.some((notification) => !notification.isRead);

  return (
    <div className="container mx-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* Greeting Header */}
      <GreetingHeader userName={user?.first_name || user?.name || "Student"} />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
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
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ) : attendance.length > 0 ? (
            <AttendanceOverview attendance={attendance} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No attendance data available yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {notificationsLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : notificationsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{notificationsError}</AlertDescription>
            </Alert>
          ) : (
            <NotificationsList
              notifications={notifications}
              hasUnread={hasUnread}
              onMarkAllRead={handleMarkAllRead}
            />
          )}
        </div>
      </div>
    </div>
  );
}