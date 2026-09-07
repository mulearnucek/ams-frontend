/**
 * Config API Service
 * Wraps the /config backend endpoints for admin management.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface ConfigItem {
    _id: string;
    key: string;
    value: ConfigValue;
    description: string;
    createdAt: string;
    updatedAt: string;
}

// Widened to allow object values (e.g. departments array: [{code,name},...])
export type ConfigValue = string | number | boolean | object | Array<unknown>;

export interface ConfigMap {
    [key: string]: ConfigValue;
}

interface ApiResponse<T> {
    status_code: number;
    message: string;
    data: T;
}

/** Fetch all config vars as a flat key→value map. No auth required. */
export async function getPublicConfig(): Promise<ConfigMap> {
    const response = await fetch(`${API_BASE}/config`, {
        method: "GET",
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch config");
    const result: ApiResponse<ConfigMap> = await response.json();
    return result.data;
}

/** Fetch full config list with pagination (admin only). */
export async function listConfigItems(params?: { page?: number; limit?: number }): Promise<{
    items: ConfigItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", params.page.toString());
    if (params?.limit) qs.append("limit", params.limit.toString());

    const response = await fetch(`${API_BASE}/config/list?${qs}`, {
        method: "GET",
        credentials: "include",
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to fetch config");
    }
    const result: ApiResponse<{ items: ConfigItem[]; pagination: any }> = await response.json();
    return result.data;
}

/** Create a new config var (admin only). */
export async function createConfigItem(data: {
    key: string;
    value: ConfigValue;
    description?: string;
}): Promise<ConfigItem> {
    const response = await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create config");
    }
    const result: ApiResponse<ConfigItem> = await response.json();
    return result.data;
}

/** Update a config var by key (admin only). */
export async function updateConfigItem(
    key: string,
    data: { value?: ConfigValue; description?: string }
): Promise<ConfigItem> {
    const response = await fetch(`${API_BASE}/config/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update config");
    }
    const result: ApiResponse<ConfigItem> = await response.json();
    return result.data;
}

/** Delete a config var by key (admin only). */
export async function deleteConfigItem(key: string): Promise<void> {
    const response = await fetch(`${API_BASE}/config/${encodeURIComponent(key)}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete config");
    }
}
