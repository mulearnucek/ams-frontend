"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { listBatches, type Batch } from "@/lib/api/batch";
import {
  checkIsAnyStaff,
  createNotification,
  deleteNotification,
  getStoredReadIds,
  listMyNotifications,
  markNotificationRead,
  type NotificationRecord
} from "@/lib/api/notification";
import { useAuth } from "@/lib/auth-context";

type UiNotification = {
  id: string;
  title: string;
  message: string;
  priorityLevel: string;
  notificationType: string;
  targetGroup?: string;
  createdAt?: string;
};

const PRIORITY_UI_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

const TYPE_UI_OPTIONS = [
  { value: "general", label: "General" },
  { value: "alert", label: "Alert" },
  { value: "academic", label: "Academic" },
  { value: "system", label: "System" }
];


const TARGET_USER_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
  { value: "hod", label: "HOD" },
  { value: "principal", label: "Principal" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" }
];

const mapPriorityToApi = (value: string) => {
  switch (value) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
    case "urgent":
      return "High";
    default:
      return "Low";
  }
};

const mapTypeToApi = (value: string) => {
  switch (value) {
    case "general":
      return "announcement";
    case "alert":
      return "info";
    case "academic":
      return "results";
    case "system":
      return "info";
    default:
      return "announcement";
  }
};

const mapTypeToUi = (value: string) => {
  switch (value) {
    case "announcement":
      return "general";
    case "results":
      return "academic";
    case "info":
    default:
      return "alert";
  }
};

const normalizeNotification = (notification: NotificationRecord, index: number): UiNotification => {
  const id = notification._id || notification.id || `notification-${index}`;
  const notificationType = notification.Notificationtype || notification.notificationType || "announcement";
  const priorityLevel = notification.priorityLevel || "Low";
  const createdAt = notification.createdAt || notification.created_at;

  return {
    id,
    title: notification.title || "Untitled",
    message: notification.message || "",
    priorityLevel,
    notificationType,
    targetGroup: notification.targetGroup,
    createdAt
  };
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "High":
      return <Badge className="bg-red-500/10 text-red-700">High</Badge>;
    case "Medium":
      return <Badge className="bg-amber-500/10 text-amber-700">Medium</Badge>;
    case "Low":
    default:
      return <Badge className="bg-emerald-500/10 text-emerald-700">Low</Badge>;
  }
};

const getTypeBadge = (typeValue: string) => {
  const label = TYPE_UI_OPTIONS.find((option) => option.value === mapTypeToUi(typeValue))?.label || "Alert";
  return <Badge className="bg-blue-500/10 text-blue-700">{label}</Badge>;
};

const getNotificationCreatedTime = (createdAt?: string, id?: string) => {
  if (createdAt) {
    const createdTime = new Date(createdAt).getTime();
    if (!Number.isNaN(createdTime)) return createdTime;
  }

  if (id && /^[a-f\d]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }

  return 0;
};

const getPriorityRank = (priorityLevel: string) => {
  switch (priorityLevel.toLowerCase()) {
    case "urgent":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
};

export default function NotificationsPage() {
  const { user, config } = useAuth();
  const notificationsEnabled = Boolean(config["feature/notifications"]);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeNotification, setActiveNotification] = useState<UiNotification | null>(null);
  const [formState, setFormState] = useState({
    targetGroup: "batch",
    targetID: "",
    targetUsers: ["student"] as string[],
    title: "",
    message: "",
    priorityLevel: "medium",
    notificationType: "general"
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listMyNotifications();
      const normalized = response.map((notification, index) => normalizeNotification(notification, index));
      setNotifications(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIsStaff = useCallback(async () => {
    const allowed = await checkIsAnyStaff();
    setIsStaff(allowed);
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    fetchNotifications();
    fetchIsStaff();
  }, [fetchNotifications, fetchIsStaff, notificationsEnabled]);

  useEffect(() => {
    if (!user?._id) return;
    setReadIds(getStoredReadIds(user._id));
  }, [user?._id]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setBatchesLoading(true);
        setBatchesError(null);
        const response = await listBatches({ limit: 200 });
        setBatches(response.batches || []);
      } catch (err) {
        setBatchesError(err instanceof Error ? err.message : "Failed to load batches");
      } finally {
        setBatchesLoading(false);
      }
    };

    fetchBatches();
  }, []);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const priorityDiff = getPriorityRank(b.priorityLevel) - getPriorityRank(a.priorityLevel);
      if (priorityDiff !== 0) return priorityDiff;
      const aTime = getNotificationCreatedTime(a.createdAt, a.id);
      const bTime = getNotificationCreatedTime(b.createdAt, b.id);
      return bTime - aTime;
    });
  }, [notifications]);

  useEffect(() => {
    if (!notificationsEnabled) {
      window.location.replace("/dashboard");
    }
  }, [notificationsEnabled]);

  if (!notificationsEnabled) {
    return null;
  }

  const handleRetry = () => {
    fetchNotifications();
  };

  const handleMarkRead = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    markNotificationRead(id, user?._id);
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map((notification) => notification.id);
    allIds.forEach((id) => markNotificationRead(id, user?._id));
    setReadIds((prev) => Array.from(new Set([...prev, ...allIds])));
  };

  const hasUnread = notifications.some((notification) => !readIds.includes(notification.id));

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete notification");
    }
  };

  const parseTargetUsers = (value: string[]) => value.filter(Boolean);


  const handleCreateNotification = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!formState.title.trim() || !formState.message.trim()) {
      setFormError("Title and message are required.");
      return;
    }

    const targetUsers = parseTargetUsers(formState.targetUsers);
    if (targetUsers.length === 0) {
      setFormError("Target users are required.");
      return;
    }

    if (!formState.targetID.trim()) {
      setFormError("Target ID is required for batch notifications.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createNotification({
        targetGroup: "batch",
        targetID: formState.targetID.trim(),
        targetUsers,
        title: formState.title.trim(),
        message: formState.message.trim(),
        priorityLevel: mapPriorityToApi(formState.priorityLevel),
        notificationType: mapTypeToApi(formState.notificationType)
      });

      setSuccessMessage("Notification created successfully.");
      setFormState((prev) => ({
        ...prev,
        targetID: "",
        title: "",
        message: ""
      }));
      await fetchNotifications();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create notification");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={!hasUnread}>
          Mark all read
        </Button>
      </div>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Group</Label>
                <Input value="batch" disabled />
              </div>
              <div className="space-y-2">
                <Label>Target ID (optional)</Label>
                <Select
                  value={formState.targetID}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, targetID: value }))}
                  disabled={batchesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={batchesLoading ? "Loading batches..." : "Select batch"} />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch._id} value={batch._id}>
                        {batch.name}{batch.id ? ` (${batch.id})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {batchesError && <p className="text-xs text-destructive">{batchesError}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Target Users</Label>
                <Input value="student" disabled />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Notification title"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select
                  value={formState.priorityLevel}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, priorityLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_UI_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notification Type</Label>
                <Select
                  value={formState.notificationType}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, notificationType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_UI_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Message</Label>
                <Textarea
                  value={formState.message}
                  onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Write your message"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleCreateNotification} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Notification"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Target group is fixed to batch.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotifications.map((notification) => {
                const isRead = readIds.includes(notification.id);
                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveNotification(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveNotification(notification);
                      }
                    }}
                    className={`rounded-lg border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isRead ? "border-border bg-muted/20" : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate" title={notification.title}>
                            {notification.title}
                          </h3>
                          {getPriorityBadge(notification.priorityLevel)}
                          {getTypeBadge(notification.notificationType)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1" title={notification.message}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={isRead ? "text-emerald-600" : "text-amber-600"}>
                            {isRead ? "Read" : "Unread"}
                          </span>
                          {notification.targetGroup && (
                            <>
                              <span>•</span>
                              <span>Group: {notification.targetGroup}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-end">
                        {!isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-center md:w-auto"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMarkRead(notification.id);
                            }}
                          >
                            Mark as Read
                          </Button>
                        )}
                        {isStaff && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full justify-center text-destructive md:w-auto"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(notification.id);
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={Boolean(activeNotification)} onOpenChange={(open) => {
        if (!open) setActiveNotification(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeNotification?.title}</DialogTitle>
            <DialogDescription>
              {activeNotification?.notificationType ? getTypeBadge(activeNotification.notificationType) : null}
            </DialogDescription>
          </DialogHeader>
          {activeNotification && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground whitespace-pre-wrap">{activeNotification.message}</p>
              <div className="flex flex-wrap items-center gap-2">
                {getPriorityBadge(activeNotification.priorityLevel)}
                {activeNotification.targetGroup && (
                  <span className="text-xs text-muted-foreground">Group: {activeNotification.targetGroup}</span>
                )}
                {activeNotification.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    Created: {new Date(activeNotification.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}