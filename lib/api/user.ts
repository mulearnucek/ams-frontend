/**
 * User API Service
 * Handles all user-related API operations for admin management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type UserRole = 'student' | 'teacher' | 'parent' | 'principal' | 'hod' | 'staff' | 'admin';
export type Gender = 'male' | 'female' | 'other';
export type Department = 'CSE' | 'ECE' | 'IT';

export interface User {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    emailVerified?: boolean;
    first_name: string;
    last_name: string;
    role: UserRole;
    phone?: number;
    gender?: Gender;
    image?: string;
    createdAt: string;
    updatedAt: string;
  };
  // Student-specific fields
  adm_number?: string;
  adm_year?: number;
  candidate_code?: string;
  department?: Department;
  date_of_birth?: string;
  batch?: {
    _id: string;
    name: string;
    year: number;
  };
  // Teacher-specific fields
  designation?: string;
  date_of_joining?: string;
  // Parent-specific fields
  relation?: 'mother' | 'father' | 'guardian';
  child?: {
    _id: string;
    adm_number: string;
    candidate_code?: string;
    user: {
      name: string;
      first_name: string;
      last_name: string;
    };
  };
}

export interface ApiResponse<T> {
  status_code: number;
  message: string;
  data: T;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListUsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

export interface ListUsersParams {
  role: UserRole;
  page?: number;
  limit?: number;
  search?: string;
}

export interface UpdateUserData {
  name?: string;
  password?: string;
  image?: string;
  role?: UserRole;
  phone?: number;
  first_name?: string;
  last_name?: string;
  gender?: Gender;
  student?: {
    adm_number?: string;
    adm_year?: number;
    candidate_code?: string;
    department?: Department;
    date_of_birth?: string;
  };
  teacher?: {
    designation?: string;
    department?: string;
    date_of_joining?: string;
  };
  parent?: {
    relation?: 'mother' | 'father' | 'guardian';
    childID?: string;
  };
}

export interface CreateUserData {
  name: string;
  email: string;
  role?: UserRole;
  password?: string;
}

/**
 * List users with pagination, filtering, and search (admin only)
 * @param params - Query parameters for filtering and pagination
 */
export async function listUsers(params: ListUsersParams): Promise<ListUsersResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('role', params.role);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);

  const response = await fetch(`${API_BASE}/user/list?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch users');
  }

  const result: ApiResponse<ListUsersResponse> = await response.json();
  return result.data;
}

/**
 * Fetch a specific user by ID
 */
export async function getUserById(id: string): Promise<User> {
  const response = await fetch(`${API_BASE}/user/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  const result: ApiResponse<User> = await response.json();
  return result.data;
}

/**
 * Update a user by ID (admin only)
 */
export async function updateUserById(id: string, data: UpdateUserData): Promise<void> {
  const response = await fetch(`${API_BASE}/user/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update user');
  }
}

/**
 * Delete a user by ID (admin only)
 */
export async function deleteUserById(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/user/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete user');
  }
}

/**
 * Create multiple users in bulk (admin only)
 */
export async function createUsersBulk(users: CreateUserData[]): Promise<ApiResponse<any>> {
  const response = await fetch(`${API_BASE}/user/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ users }),
  });

  const result: ApiResponse<any> = await response.json();
  return result;
}
