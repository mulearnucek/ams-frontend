/**
 * Notification API Service
 * Handles listing and managing notifications
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type ApiResponse<T> = {
  status_code: number;
  message: string;
  data: T;
};

export type NotificationRecord = {
  _id?: string;
  id?: string;
  targetGroup?: string;
  targetID?: string;
  targetUsers?: string[];
  title?: string;
  message?: string;
  priorityLevel?: string;
  notificationType?: string;
  Notificationtype?: string;
  createdAt?: string;
  created_at?: string;
};

export type ListNotificationsResponse = {
  notifications: NotificationRecord[];
};

export type NotificationPagination = {
  currentPage: number;
  totalPages: number;
  totalNotifications: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ListAllNotificationsResponse = {
  notifications: NotificationRecord[];
  pagination: NotificationPagination;
};

export type ListAllNotificationsParams = {
  page?: number;
  limit?: number;
  search?: string;
  targetGroup?: string;
  notificationType?: string;
  priorityLevel?: string;
  sort?: "createdAt" | "title" | "priorityLevel";
  order?: "asc" | "desc";
};

export type CreateNotificationPayload = {
  targetGroup: string;
  targetID?: string;
  targetUsers?: string[];
  title: string;
  message: string;
  priorityLevel: string;
  notificationType: string;
};

const readNotificationIdsByUser = new Map<string, Set<string>>();
const anonymousReadIds = new Set<string>();

const getStorageKey = (userId?: string) => (userId ? `ams:notifications:read:${userId}` : "");

const getReadSet = (userId?: string) => {
  if (!userId) return anonymousReadIds;
  const existing = readNotificationIdsByUser.get(userId);
  if (existing) return existing;
  const next = new Set<string>();
  readNotificationIdsByUser.set(userId, next);
  return next;
};

const loadReadIdsFromStorage = (userId?: string) => {
  if (!userId || typeof window === "undefined") return;
  const key = getStorageKey(userId);
  if (!key) return;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return;
    const readSet = getReadSet(userId);
    parsed.forEach((id) => readSet.add(id));
  } catch {
    // Ignore storage parsing errors.
  }
};

const persistReadIdsToStorage = (userId?: string) => {
  if (!userId || typeof window === "undefined") return;
  const key = getStorageKey(userId);
  if (!key) return;
  const readSet = getReadSet(userId);
  try {
    window.localStorage.setItem(key, JSON.stringify([...readSet]));
  } catch {
    // Ignore storage write errors.
  }
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = await parseJsonSafe(response);
  return payload?.message || payload?.error || fallback;
};

export const markNotificationRead = (id: string, userId?: string) => {
  const readSet = getReadSet(userId);
  readSet.add(id);
  persistReadIdsToStorage(userId);
};

export const markNotificationUnread = (id: string, userId?: string) => {
  const readSet = getReadSet(userId);
  readSet.delete(id);
  persistReadIdsToStorage(userId);
};

export const getStoredReadIds = (userId?: string): string[] => {
  loadReadIdsFromStorage(userId);
  return [...getReadSet(userId)];
};

export async function listMyNotifications(page = 1, limit = 10): Promise<NotificationRecord[]> {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append("page", page.toString());
  if (limit) queryParams.append("limit", limit.toString());

  const url = `${API_BASE}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to fetch notifications");
    throw new Error(message);
  }

  const result = (await parseJsonSafe(response)) as ApiResponse<ListNotificationsResponse> | null;
  const notifications = result?.data?.notifications || [];
  return Array.isArray(notifications) ? notifications : [];
}

export async function listAllNotifications(
  params: ListAllNotificationsParams = {}
): Promise<ListAllNotificationsResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") queryParams.append(key, String(value));
  });

  const url = `${API_BASE}/notifications/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to fetch notifications");
    throw new Error(message);
  }

  const result = (await parseJsonSafe(response)) as ApiResponse<ListAllNotificationsResponse> | null;
  return {
    notifications: Array.isArray(result?.data?.notifications) ? result!.data.notifications : [],
    pagination:
      result?.data?.pagination || {
        currentPage: params.page || 1,
        totalPages: 1,
        totalNotifications: 0,
        limit: params.limit || 10,
        hasNextPage: false,
        hasPreviousPage: false,
      },
  };
}

export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to create notification");
    throw new Error(message);
  }
}

export async function updateNotification(id: string, payload: Partial<CreateNotificationPayload>): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to update notification");
    throw new Error(message);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, "Failed to delete notification");
    throw new Error(message);
  }
}

export async function getUnreadCount(userId?: string, role?: string): Promise<number> {
  loadReadIdsFromStorage(userId);
  const notifications =
    role === "admin" ? (await listAllNotifications({ limit: 100 })).notifications : await listMyNotifications();
  const readSet = getReadSet(userId);
  const unread = notifications.filter((notification) => {
    const id = notification._id || notification.id;
    return id ? !readSet.has(id) : true;
  });
  return unread.length;
}

export async function checkIsAnyStaff(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/auth/isAnyStaff`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    return false;
  }

  const payload = await parseJsonSafe(response);
  if (typeof payload === "boolean") {
    return payload;
  }

  return Boolean(payload?.data ?? payload?.isStaff ?? payload?.allowed ?? false);
}
