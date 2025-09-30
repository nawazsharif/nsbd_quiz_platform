'use client';

import { getSession } from 'next-auth/react';
import { buildApiUrl, getApiBaseUrl } from '@/lib/apiBase';

const API_BASE_URL = getApiBaseUrl();

export interface Course {
  id: number;
  title: string;
  summary?: string;
  description?: string;
  cover_url?: string;
  is_paid: boolean;
  price_cents?: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rating_avg?: number;
  rating_count?: number;
  created_at?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type CourseContentItem = {
  id: number;
  type: 'pdf' | 'text' | 'video' | 'quiz' | 'certificate' | string;
  title: string;
  order_index: number;
  duration_seconds?: number | null;
  payload?: Record<string, unknown> | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  // Try common locations for token
  const maybeToken = (session as unknown as { token?: unknown; user?: { token?: unknown }; accessToken?: unknown }) || {};
  const tokenCandidate = (maybeToken.token ?? maybeToken.user?.token ?? maybeToken.accessToken);
  const token = typeof tokenCandidate === 'string' ? tokenCandidate : undefined;
  return token
    ? { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' }
    : { Accept: 'application/json', 'Content-Type': 'application/json' };
}

export const coursesAPI = {
  async list(params?: { page?: number; per_page?: number; status?: string }): Promise<Paginated<Course>> {
    const url = new URL(buildApiUrl('/courses'), window.location.origin);
    if (params?.page) url.searchParams.set('page', String(params.page));
    if (params?.per_page) url.searchParams.set('per_page', String(params.per_page));
    if (params?.status) url.searchParams.set('status', params.status);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch courses');
    return data as Paginated<Course>;
  },

  async get(courseId: number | string): Promise<Course> {
    const res = await fetch(buildApiUrl(`/courses/${courseId}`));
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch course');
    return data as Course;
  },

  async enroll(courseId: number | string): Promise<{ status?: string; message?: string; access_type?: string }> {
    const headers = await authHeaders();
    const res = await fetch(buildApiUrl(`/courses/${courseId}/enroll`), {
      method: 'POST',
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    const message = (data as { message?: string })?.message;
    if (!res.ok) throw new Error(message || 'Failed to enroll');
    return (data as { status?: string; message?: string; access_type?: string });
  },

  async contents(courseId: number | string): Promise<CourseContentItem[]> {
    const headers = await authHeaders();
    const res = await fetch(buildApiUrl(`/courses/${courseId}/contents`), {
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data?.message as string) || 'Failed to fetch contents');
    return data as CourseContentItem[];
  }
};
