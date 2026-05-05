"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Info, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { FLAGS } from "@/lib/flags";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "announcement";
  postedBy: string;
  postedAt: Date;
  priorityLevel?: string;
  isRead?: boolean;
};

type NotificationsListProps = {
  notifications: Notification[];
  hasUnread?: boolean;
  onMarkAllRead?: () => void;
};

export default function NotificationsList({ notifications, hasUnread, onMarkAllRead }: NotificationsListProps) {
  const { config } = useAuth();
  const canMarkAllRead = Boolean(onMarkAllRead) && Boolean(hasUnread);

  if (!config[FLAGS.NOTIFICATIONS]) return null;

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getNotificationBadge = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400">Warning</Badge>;
      case "success":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Success</Badge>;
      case "info":
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Info</Badge>;
      default:
        return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400">Announcement</Badge>;
    }
  };

  const getPriorityRank = (priorityLevel?: string) => {
    switch (priorityLevel?.toLowerCase()) {
      case "urgent":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 0;
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityDiff = getPriorityRank(b.priorityLevel) - getPriorityRank(a.priorityLevel);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  return (
    <Card className="h-auto lg:h-[560px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkAllRead}
            disabled={!canMarkAllRead}
          >
            Mark all read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {sortedNotifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1">
            <div className="space-y-3">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    notification.isRead
                      ? "border-border bg-muted/20"
                      : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate" title={notification.title}>
                          {notification.title}
                        </h4>
                        {getNotificationBadge(notification.type)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1" title={notification.message}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Posted by {notification.postedBy}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(notification.postedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
