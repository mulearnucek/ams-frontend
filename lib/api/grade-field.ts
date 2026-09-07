/**
 * Grade Field API Service
 * Column definitions (assessment components) for a batch+subject's grade sheet.
 */

import { GradeField, GradeFieldType } from "@/lib/types/GradeTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T> {
  status_code: number;
  message: string;
  data: T;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListGradeFieldsResponse {
  gradeFields: GradeField[];
  pagination: PaginationInfo;
}

export interface ListGradeFieldsParams {
  /** Optional for student/parent callers — the backend self-scopes to their own (or child's) batch regardless. */
  batch?: string;
  subject?: string;
  sheet?: string;
  type?: GradeFieldType;
  limit?: number;
}

export interface CreateGradeFieldData {
  grade_sheet?: string;
  batch?: string;
  subject?: string;
  type: GradeFieldType;
  name: string;
  /** Required for every type except moderation (which applies its raw `value` directly, uncapped). */
  total_mark?: number;
  /** Optional — if omitted, the backend splits weightage equally across all fields for this batch+subject. */
  weightage?: number;
  /** Whether students/parents can see this field yet. Defaults to false (draft) on create. */
  published?: boolean;
  value?: string;
  description?: string;
  due_date?: string;
}

export type UpdateGradeFieldData = Partial<CreateGradeFieldData>;

async function parseOrThrow<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || fallback);
  }
  return result.data as T;
}

export async function listGradeFields(params: ListGradeFieldsParams = {}): Promise<GradeField[]> {
  const query = new URLSearchParams();
  if (params.sheet) query.append("sheet", params.sheet);
  if (params.batch) query.append("batch", params.batch);
  if (params.subject) query.append("subject", params.subject);
  if (params.type) query.append("type", params.type);

  const response = await fetch(`${API_BASE}/academics/grade-field?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await parseOrThrow<ListGradeFieldsResponse>(response, "Failed to fetch grade fields");
  return data.gradeFields;
}

export async function createGradeField(data: CreateGradeFieldData): Promise<GradeField> {
  const response = await fetch(`${API_BASE}/academics/grade-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseOrThrow<GradeField>(response, "Failed to create grade field");
}

export async function updateGradeField(id: string, data: UpdateGradeFieldData): Promise<GradeField> {
  const response = await fetch(`${API_BASE}/academics/grade-field/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return parseOrThrow<GradeField>(response, "Failed to update grade field");
}

export async function deleteGradeField(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/academics/grade-field/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message || "Failed to delete grade field");
  }
}

/** Re-pulls attendance for this field's batch+subject and overwrites every student's entry. */
export async function syncAttendanceGradeField(id: string): Promise<{ count: number }> {
  const response = await fetch(`${API_BASE}/academics/grade-field/${id}/sync-attendance`, {
    method: "POST",
    credentials: "include",
  });

  return parseOrThrow<{ count: number }>(response, "Failed to sync attendance");
}
