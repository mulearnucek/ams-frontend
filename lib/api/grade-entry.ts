/**
 * Grade Entry API Service
 * Per-student marks against a Grade Field, plus the pivoted matrix/summary
 * views and the bulk-upsert used by the teacher grade grid's single save button.
 */

import { GradeMatrix, GradeSummary, PopulatedGradeEntry } from "@/lib/types/GradeTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface ApiResponse<T> {
  status_code: number;
  message: string;
  data: T;
}

async function parseOrThrow<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json();
  if (!response.ok && response.status !== 207) {
    throw new Error(result.message || fallback);
  }
  return result.data as T;
}

export async function getGradeMatrix(batch?: string, subject?: string, sheet?: string): Promise<GradeMatrix> {
  const query = new URLSearchParams();
  if (sheet) query.append("sheet", sheet);
  if (batch) query.append("batch", batch);
  if (subject) query.append("subject", subject);
  const response = await fetch(`${API_BASE}/academics/grade-entry/matrix?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  return parseOrThrow<GradeMatrix>(response, "Failed to fetch grade matrix");
}

export async function getGradeSummary(batch: string): Promise<GradeSummary> {
  const query = new URLSearchParams({ batch });
  const response = await fetch(`${API_BASE}/academics/grade-entry/summary?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  return parseOrThrow<GradeSummary>(response, "Failed to fetch grade summary");
}

export interface UpsertGradeEntryInput {
  user: string;
  grade_field: string;
  mark: number;
  is_absent: boolean;
  remarks?: string;
}

export interface BulkUpsertResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  rejected: Array<{ data: UpsertGradeEntryInput; reason: string }>;
}

export type BulkUpsertResponse = ApiResponse<BulkUpsertResult> & { httpStatus: number };

/** Create-or-update every changed cell in one request/DB round trip. */
export async function bulkUpsertGradeEntries(entries: UpsertGradeEntryInput[]): Promise<BulkUpsertResponse> {
  const response = await fetch(`${API_BASE}/academics/grade-entry/bulk-upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ entries }),
  });

  const result = (await response.json()) as ApiResponse<BulkUpsertResult>;
  if (!response.ok && response.status !== 207) {
    throw new Error(result.message || "Failed to save grade entries");
  }
  return { ...result, httpStatus: response.status };
}

export interface ListGradeEntriesParams {
  user?: string;
  grade_field?: string;
  is_absent?: boolean;
  limit?: number;
}

/**
 * Lists grade entries. For a student/parent caller, the backend ignores
 * `params.user` and self-scopes to the caller's own (or linked child's)
 * entries — this endpoint is what powers the student/parent grade view.
 */
export async function listGradeEntries(params: ListGradeEntriesParams = {}): Promise<PopulatedGradeEntry[]> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 200) });
  if (params.user) query.append("user", params.user);
  if (params.grade_field) query.append("grade_field", params.grade_field);
  if (params.is_absent !== undefined) query.append("is_absent", String(params.is_absent));

  const response = await fetch(`${API_BASE}/academics/grade-entry?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = await parseOrThrow<{ gradeEntries: PopulatedGradeEntry[] }>(response, "Failed to fetch grade entries");
  return data.gradeEntries;
}
