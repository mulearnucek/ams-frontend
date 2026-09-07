/**
 * Grade Sheet API Service
 * Handles grade sheets, permissions, sharing, and publication.
 */

import { GradeSheet } from "@/lib/types/GradeTypes";

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

export interface ListGradeSheetsResponse {
  gradeSheets: GradeSheet[];
  pagination: PaginationInfo;
}

export interface ListGradeSheetsParams {
  batch?: string;
  subject?: string;
  published?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateGradeSheetInput {
  batch: string;
  subject: string;
}

export interface ShareGradeSheetInput {
  userId: string;
  access: "view" | "edit";
  action?: "add" | "remove";
}

export async function listGradeSheets(params: ListGradeSheetsParams = {}): Promise<GradeSheet[]> {
  const queryParams = new URLSearchParams();
  if (params.batch) queryParams.append("batch", params.batch);
  if (params.subject) queryParams.append("subject", params.subject);
  if (params.published !== undefined) queryParams.append("published", String(params.published));
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));

  const url = `${API_BASE}/academics/grade-sheet${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch grade sheets");
  }

  const result: ApiResponse<ListGradeSheetsResponse> = await response.json();
  return result.data.gradeSheets;
}

export async function getGradeSheetById(id: string): Promise<GradeSheet> {
  const response = await fetch(`${API_BASE}/academics/grade-sheet/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch grade sheet");
  }

  const result: ApiResponse<GradeSheet> = await response.json();
  return result.data;
}

export async function createGradeSheet(input: CreateGradeSheetInput): Promise<GradeSheet> {
  const response = await fetch(`${API_BASE}/academics/grade-sheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create grade sheet");
  }

  const result: ApiResponse<GradeSheet> = await response.json();
  return result.data;
}

export async function updateGradeSheet(id: string, input: { published?: boolean }): Promise<GradeSheet> {
  const response = await fetch(`${API_BASE}/academics/grade-sheet/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update grade sheet");
  }

  const result: ApiResponse<GradeSheet> = await response.json();
  return result.data;
}

export async function shareGradeSheet(id: string, input: ShareGradeSheetInput): Promise<GradeSheet> {
  const response = await fetch(`${API_BASE}/academics/grade-sheet/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update grade sheet permissions");
  }

  const result: ApiResponse<GradeSheet> = await response.json();
  return result.data;
}

export async function deleteGradeSheet(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/academics/grade-sheet/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete grade sheet");
  }
}
