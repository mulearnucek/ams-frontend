"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Trash2, Edit } from "lucide-react";
import { listBatches, type Batch } from "@/lib/api/batch";
import {
  createNotification,
  deleteNotification,
  listMyNotifications,
  markNotificationRead,
  markNotificationUnread,
  updateNotification,
  type NotificationRecord
} from "@/lib/api/notification";
import { useAuth } from "@/lib/auth-context";

type TeacherNotificationsProps = {
  teacherName: string;
};

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
  const label = TYPE_UI_OPTIONS.find((option) => option.value === mapTypeToUi(typeValue))?.label || "General";
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

export default function TeacherNotifications({ teacherName }: TeacherNotificationsProps) {
  const { user, config } = useAuth();
  const notificationsEnabled = Boolean(config["feature/notifications"]);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!notificationsEnabled) return;
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

  useEffect(() => {
    if (!notificationsEnabled) return;
    fetchNotifications();
  }, [fetchNotifications, notificationsEnabled]);

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

  const parseTargetUsers = (value: string[]) => value.filter(Boolean);


  const handleCreateNotification = async () => {
    setFormError(null);

    if (!formState.title.trim() || !formState.message.trim()) {
      setFormError("Title and message are required.");
      return;
    }

    if (formState.targetGroup !== "batch") {
      setFormError("Teachers can only create batch notifications. Choose target group: Batch.");
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

      setFormState((prev) => ({
        ...prev,
        targetID: "",
        title: "",
        message: ""
      }));
      setIsCreateOpen(false);
      await fetchNotifications();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create notification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete notification");
    }
  };

  const handleOpenEdit = (notification: UiNotification) => {
    setEditingId(notification.id);
    setFormState({
      targetGroup: notification.targetGroup || "batch",
      targetID: "",
      targetUsers: ["student"],
      title: notification.title,
      message: notification.message,
      priorityLevel: notification.priorityLevel.toLowerCase(),
      notificationType: mapTypeToUi(notification.notificationType)
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditNotification = async () => {
    if (!editingId) return;
    setFormError(null);

    if (!formState.title.trim() || !formState.message.trim()) {
      setFormError("Title and message are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateNotification(editingId, {
        title: formState.title.trim(),
        message: formState.message.trim(),
        priorityLevel: mapPriorityToApi(formState.priorityLevel),
        notificationType: mapTypeToApi(formState.notificationType)
      });

      // Mark notification as unread so students see it as new
      markNotificationUnread(editingId, user?._id);

      setFormState((prev) => ({
        ...prev,
        title: "",
        message: ""
      }));
      setIsEditOpen(false);
      setEditingId(null);
      await fetchNotifications();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update notification";
      if (errorMsg.includes("403")) {
        setFormError("You can only edit your own notifications");
      } else if (errorMsg.includes("404")) {
        setFormError("Notification was deleted by another user");
      } else {
        setFormError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTargetGroupChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      targetGroup: value
    }));
  };

  const handleMarkAllRead = () => {
    notifications.forEach((notification) => {
      markNotificationRead(notification.id, user?._id);
    });
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const priorityDiff = getPriorityRank(b.priorityLevel) - getPriorityRank(a.priorityLevel);
      if (priorityDiff !== 0) return priorityDiff;
      const aTime = getNotificationCreatedTime(a.createdAt, a.id);
      const bTime = getNotificationCreatedTime(b.createdAt, b.id);
      return bTime - aTime;
    });
  }, [notifications]);

  if (!notificationsEnabled) {
    return null;
  }

  return (
    <Card className="h-auto lg:h-[560px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Notification</DialogTitle>
                <DialogDescription>
                  Post a notification for your students
                </DialogDescription>
              </DialogHeader>
              {formError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Group</Label>
                  <Input value="batch" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Target ID (batch)</Label>
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
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={formState.message}
                    onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateNotification} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Notification</DialogTitle>
                <DialogDescription>
                  Update your notification details
                </DialogDescription>
              </DialogHeader>
              {formError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
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
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={formState.message}
                    onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsEditOpen(false);
                  setEditingId(null);
                }}>Cancel</Button>
                <Button onClick={handleEditNotification} disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading notifications...</div>
        ) : sortedNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">Create one to notify your students</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1">
            <div className="space-y-3">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border rounded-lg transition-colors border-border bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate" title={notification.title}>
                          {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priorityLevel)}
                        {getTypeBadge(notification.notificationType)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1" title={notification.message}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Posted by {teacherName}</span>
                        {notification.targetGroup && (
                          <>
                            <span>•</span>
                            <span>Group: {notification.targetGroup}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(notification)}>
                        <Edit className="w-3 h-3 text-blue-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteNotification(notification.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
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
