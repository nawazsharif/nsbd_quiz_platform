import { UserRole, Permission, USER_ROLES, ROLE_PERMISSIONS } from './auth';

const normalizeAttempt = (attempt: any) => {
  if (!attempt || typeof attempt !== 'object') return attempt;

  const progress = attempt.progress || {};
  const answers = progress.answers ? { ...progress.answers } : {};

  return {
    ...attempt,
    id: attempt.id != null ? String(attempt.id) : attempt.id,
    quizId: attempt.quizId ?? attempt.quiz_id ?? attempt.quizID ?? null,
    quiz_id: attempt.quiz_id ?? attempt.quizId ?? attempt.quizID ?? null,
    userId: attempt.userId ?? attempt.user_id ?? null,
    user_id: attempt.user_id ?? attempt.userId ?? null,
    current_question_index: attempt.current_question_index ?? attempt.currentQuestionIndex ?? 0,
    total_questions: attempt.total_questions ?? attempt.totalQuestions ?? 0,
    time_spent_seconds: attempt.time_spent_seconds ?? attempt.timeSpentSeconds ?? 0,
    score: attempt.score != null ? Number(attempt.score) : attempt.score,
    earned_points: attempt.earned_points != null ? Number(attempt.earned_points) : attempt.earned_points,
    penalty_points: attempt.penalty_points != null ? Number(attempt.penalty_points) : attempt.penalty_points,
    started_at: attempt.started_at ?? attempt.startedAt ?? null,
    completed_at: attempt.completed_at ?? attempt.completedAt ?? null,
    created_at: attempt.created_at ?? attempt.createdAt ?? null,
    updated_at: attempt.updated_at ?? attempt.updatedAt ?? null,
    progress: {
      currentQuestionIndex: progress.currentQuestionIndex ?? attempt.current_question_index ?? 0,
      totalQuestions: progress.totalQuestions ?? attempt.total_questions ?? 0,
      answeredQuestions: progress.answeredQuestions ?? Object.keys(answers).length,
      answers,
      timeSpent: progress.timeSpent ?? attempt.time_spent_seconds ?? 0,
      lastActivityAt: progress.lastActivityAt ?? attempt.updated_at ?? new Date().toISOString(),
      completionPercentage: progress.completionPercentage ?? 0,
    },
  };
};

const normalizeAttemptArray = (attempts: any[] | undefined | null) => {
  if (!Array.isArray(attempts)) return [];
  return attempts.map(normalizeAttempt);
};

// Prefer explicit API URL when provided; fallback to proxy
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/backend'

// Authentication API functions
export const authAPI = {
  // Resolve user permissions without relying on a non-existent endpoint
  async getUserPermissions(token: string) {
    // Fetch the authenticated profile, then map role -> permissions via ROLE_PERMISSIONS
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch profile')

    // Normalize role from response
    const rawUser = data?.user || data
    const rawRole: string | undefined = rawUser?.role || rawUser?.roles?.[0]?.name
    const normalizedRole =
      rawRole === 'superadmin' || rawRole === 'super_admin' ? USER_ROLES.SUPER_ADMIN
      : rawRole === 'admin' ? USER_ROLES.ADMIN
      : USER_ROLES.USER

    const permissions = ROLE_PERMISSIONS[normalizedRole] || []
    return { permissions }
  },

  // Categories
  async getCategories(token?: string, page = 1, perPage = 20, search?: string) {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))
    if (search) sp.set('search', search)
    const response = await fetch(`${API_BASE_URL}/categories?${sp.toString()}`, {
      method: 'GET', headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to fetch categories')
    return data
  },
  async createCategory(payload: { name: string; slug?: string; parent_id?: number | null }, token: string) {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to create category')
    return data
  },
  async updateCategory(id: number | string, payload: { name?: string; slug?: string; parent_id?: number | null }, token: string) {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to update category')
    return data
  },
  async deleteCategory(id: number | string, token: string) {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    if (response.status === 204) return { success: true } as any
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to delete category')
    return data
  },

  // Fetch role permissions from API
  async getRolePermissions(role: string | number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles/${role}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch role permissions');
    }

    // Normalize: backend returns { permissions: [...] }
    if (Array.isArray((data as any).permissions)) return (data as any).permissions
    if (Array.isArray((data as any).data)) return (data as any).data
    if (Array.isArray(data)) return data
    return []
  },

  // Fetch all available roles from API
  async getAllRoles(token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle permission errors gracefully
      if (response.status === 403) {
        throw new Error('Insufficient permissions to view roles');
      }
      throw new Error(data.message || 'Failed to fetch roles');
    }

    return data;
  },

  // Assign role to user (superadmin only)
  async assignRoleToUser(roleId: string | number, userId: string | number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ user_id: Number(userId) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to assign role');
    return data;
  },

  // Revoke role from user (superadmin only)
  async revokeRoleFromUser(roleId: string | number, userId: string | number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ user_id: Number(userId) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to revoke role');
    return data;
  },

  // Fetch all available permissions from API
  async getAllPermissions(token?: string) {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle permission errors gracefully
      if (response.status === 403) {
        throw new Error('Insufficient permissions to view permissions');
      }
      throw new Error(data.message || 'Failed to fetch permissions');
    }

    return data;
  },
  async createRole(name: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, guard_name: 'sanctum' }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Failed to create role')
    return data
  },

  // Update role permissions (superadmin/admin depending on backend policy)
  async updateRolePermissions(role: string | number, permissionNames: string[], token?: string) {
    const response = await fetch(`${API_BASE_URL}/roles/${role}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ permissions: permissionNames }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update role permissions');
    return data;
  },

  // Users API (admin/superadmin)
  async getUsers(token?: string, page = 1, limit = 50) {
    const response = await fetch(`${API_BASE_URL}/users?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch users');
    return data;
  },
  async deleteUser(userId: string | number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 204) return { success: true } as any
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  },

  // Permissions CRUD (superadmin)
  async createPermission(name: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, guard_name: 'sanctum' }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create permission');
    return data;
  },
  async deletePermission(id: string | number, token?: string) {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 204) return { success: true } as any
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete permission');
    return data;
  },
  // Register new user
  async register(userData: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data;
  },

  // Forgot password
  async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email');
    }

    return data;
  },

  // Reset password
  async resetPassword(resetData: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(resetData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed');
    }

    return data;
  },

  // Update profile
  async updateProfile(token: string, userData: {
    name?: string;
    email?: string;
    avatar?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Profile update failed');
    }

    return data;
  },

  // Change password
  async changePassword(token: string, passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password change failed');
    }

    return data;
  },

  // Logout
  async logout(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Logout failed');
    }

    return data;
  },

  // Wallet
  async getWalletBalance(token: string) {
    const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch wallet balance')
    return data
  },

  // Settings (superadmin)
  async getQuizSettings(token: string) {
    const res = await fetch(`${API_BASE_URL}/settings/quiz`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to load quiz settings')
    return data
  },
  async updateQuizSettings(token: string, payload: { paid_quiz_approval_amount_cents: number; platform_commission_percent?: number }) {
    const res = await fetch(`${API_BASE_URL}/settings/quiz`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update quiz settings')
    return data
  },
  async getCourseSettings(token: string) {
    const res = await fetch(`${API_BASE_URL}/settings/course`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to load course settings')
    return data
  },
  async updateCourseSettings(token: string, payload: { course_approval_fee_cents: number; course_platform_commission_percent?: number }) {
    const res = await fetch(`${API_BASE_URL}/settings/course`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update course settings')
    return data
  },
  // Course CRUD
  async createCourse(token: string, payload: {
    title: string
    summary?: string
    description?: string
    cover_url?: string
    is_paid?: boolean
    price_cents?: number | null
    visibility?: 'public'|'private'
    category_id?: number | null
  }) {
    const res = await fetch(`${API_BASE_URL}/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to create course')
    return data
  },
  async updateCourse(token: string, id: string|number, payload: Partial<{
    title: string
    summary: string
    description: string
    cover_url: string
    is_paid: boolean
    price_cents: number | null
    visibility: 'public'|'private'
    status: 'draft'|'submitted'|'approved'|'rejected'
    category_id: number | null
  }>) {
    const res = await fetch(`${API_BASE_URL}/courses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update course')
    return data
  },
  async listCourseContents(token: string, courseId: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/contents`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch contents')
    return data
  },
  async createCourseContent(token: string, courseId: string|number, payload: {
    type: 'pdf'|'text'|'video'|'quiz'|'certificate'
    title: string
    order_index?: number
    duration_seconds?: number | null
    payload?: Record<string, any>
  }) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/contents`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to add content')
    return data
  },
  async updateCourseContent(token: string, courseId: string|number, contentId: string|number, payload: Partial<{
    title: string
    order_index: number
    duration_seconds: number | null
    payload: Record<string, any>
  }>) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/contents/${contentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update content')
    return data
  },
  async deleteCourseContent(token: string, courseId: string|number, contentId: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/contents/${contentId}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    if (res.status === 204) return { success: true } as any
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to delete content')
    return data
  },
  async submitCourse(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${id}/submit`, { method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to submit course')
    return data
  },

  // Payment providers (superadmin)
  async getPaymentProviders(token: string) {
    const res = await fetch(`${API_BASE_URL}/settings/payments`, { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to load payment providers')
    return data
  },
  async updatePaymentProvider(token: string, provider: string, payload: { enabled?: boolean; config?: Record<string, any> }) {
    const res = await fetch(`${API_BASE_URL}/settings/payments/${provider}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update provider')
    return data
  },
  async rechargeWallet(token: string, amount_cents: number, provider: 'bkash'|'sslcommerz') {
    const res = await fetch(`${API_BASE_URL}/wallet/recharge`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount_cents, provider }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to initiate recharge')
    return data
  },
  async confirmRecharge(token: string, transaction_id: string, status: 'completed'|'failed' = 'completed') {
    const res = await fetch(`${API_BASE_URL}/wallet/recharge/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ transaction_id, status }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to confirm recharge')
    return data
  },
  async requestWithdrawal(token: string, amount_cents: number) {
    const res = await fetch(`${API_BASE_URL}/wallet/withdrawals`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount_cents }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to request withdrawal')
    return data
  },

  // Quizzes
  async getQuizzes(page = 1, perPage = 50, search?: string) {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))
    if (search) sp.set('search', search)
    const res = await fetch(`${API_BASE_URL}/quizzes?${sp.toString()}`, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quizzes')
    return data
  },
  // Courses (public list)
  async getCourses(page = 1, perPage = 50, status?: string) {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))
    if (status) sp.set('status', status)
    const res = await fetch(`${API_BASE_URL}/courses?${sp.toString()}`, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch courses')
    return data
  },
  async createQuiz(token: string, payload: {
    title: string;
    description?: string;
    category_id?: number | null;
    difficulty?: 'easy'|'medium'|'hard';
    is_paid?: boolean;
    price_cents?: number | null;
    timer_seconds?: number | null;
    randomize_questions?: boolean;
    randomize_answers?: boolean;
    allow_multiple_attempts?: boolean;
    max_attempts?: number | null;
    visibility?: 'public'|'private';
    // Include approval workflow states per product requirements
    status?: 'draft'|'waiting'|'approved'|'rejected'|'published';
    negative_marking?: boolean;
    negative_mark_value?: number | null;
  }) {
    const res = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to create quiz')
    return data
  },
  async updateQuiz(token: string, id: string|number, payload: Partial<{
    title: string;
    description: string;
    category_id: number | null;
    difficulty: 'easy'|'medium'|'hard';
    is_paid: boolean;
    price_cents: number | null;
    timer_seconds: number | null;
    randomize_questions: boolean;
    randomize_answers: boolean;
    allow_multiple_attempts: boolean;
    max_attempts: number | null;
    visibility: 'public'|'private';
    // Approval workflow states
    status: 'draft'|'waiting'|'approved'|'rejected'|'published';
    negative_marking: boolean;
    negative_mark_value: number | null;
  }>) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update quiz')
    return data
  },
  async deleteQuiz(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
      method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    if (res.status === 204) return { success: true } as any
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to delete quiz')
    return data
  },
  async getQuiz(id: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quiz')
    return data
  },
  async getCourse(id: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${id}`, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch course')
    return data
  },
  async submitQuiz(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${id}/submit`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to submit quiz for approval')
    return data
  },
  async approveQuiz(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes/${id}/approve`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to approve quiz')
    return data
  },
  async rejectQuiz(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/admin/quizzes/${id}/reject`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to reject quiz')
    return data
  },

  // Courses admin approvals
  async approveCourse(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/admin/courses/${id}/approve`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to approve course')
    return data
  },
  async rejectCourse(token: string, id: string|number, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/admin/courses/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ reason })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to reject course')
    return data
  },

  // Questions
  async listQuestions(quizId: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, { headers: { 'Accept': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch questions')
    return data
  },
  async createQuestion(token: string, quizId: string|number, payload: any) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to create question')
    return data
  },
  async updateQuestion(token: string, quizId: string|number, questionId: string|number, payload: any) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update question')
    return data
  },
  async deleteQuestion(token: string, quizId: string|number, questionId: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions/${questionId}`, {
      method: 'DELETE', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    if (res.status === 204) return { success: true } as any
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to delete question')
    return data
  },

  // Course enroll/purchase (backend handles free vs paid)
  async enrollCourse(token: string, id: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${id}/enroll`, {
      method: 'POST', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to enroll course')
    return data
  },

  // Course enrollment and progress tracking
  async getCourseEnrollments(token: string) {
    const res = await fetch(`${API_BASE_URL}/course-enrollments`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch course enrollments')
    return data
  },

  async checkCourseEnrollment(token: string, courseId: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/enrollment-status`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to check enrollment status')
    return data
  },

  // Quiz enrollment and access
  async enrollQuiz(token: string, quizId: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/enroll`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to enroll quiz')
    return data
  },

  async checkQuizEnrollment(token: string, quizId: string|number) {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/enrollment-status`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to check quiz enrollment status')
    return data
  },

  async getQuizEnrollments(token: string) {
    const res = await fetch(`${API_BASE_URL}/quiz-enrollments`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quiz enrollments')
    return data
  },

  // Quiz ranking and leaderboard
  async getQuizRanking(quizId: string|number, limit?: number, token?: string) {
    const url = new URL(`${API_BASE_URL}/quizzes/${quizId}/ranking`, window.location.origin)
    if (limit) url.searchParams.set('limit', String(limit))

    const headers: HeadersInit = { 'Accept': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(url.toString(), { headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quiz ranking')
    return data
  },

  async getUserQuizRankings(token: string) {
    const res = await fetch(`${API_BASE_URL}/user/quiz-rankings`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch user quiz rankings')
    return data
  },

  async getCourseProgress(token: string, courseId: string|number) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/progress`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch course progress')
    return data
  },

  async updateCourseContentProgress(token: string, courseId: string|number, contentId: string|number, progress: {
    progress_percentage?: number;
    status?: 'not_started' | 'in_progress' | 'completed';
  }) {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/content/${contentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(progress)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to update content progress')
    return data
  },

  // Quiz Attempt Tracking
  async startQuizAttempt(token: string, quizId: string|number, options?: { forceNew?: boolean }) {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/attempts`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: options?.forceNew ? JSON.stringify({ force_new: true }) : undefined,
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Too many quiz attempt requests. Please wait a moment before trying again.')
        }
        throw new Error(data?.message || 'Failed to start quiz attempt')
      }

      return {
        status: data?.status || 'created',
        attempt: data?.attempt ? normalizeAttempt(data.attempt) : null,
        quiz: data?.quiz,
      }
    } catch (error: any) {
      // Rethrow the error with a clear message
      if (error.message) {
        throw new Error(error.message)
      } else {
        throw new Error('Failed to start quiz attempt. Please try again later.')
      }
    }
  },

  async saveQuizProgress(token: string, attemptId: string, progress: {
    currentQuestionIndex?: number;
    answers?: Record<string, any>;
    timeSpent?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(progress)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to save quiz progress')
    return normalizeAttempt(data?.attempt ?? data)
  },

  async submitQuizAttempt(token: string, attemptId: string, finalAnswers: Record<string, any>, timeSpentSeconds?: number) {
    const res = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        answers: finalAnswers,
        time_spent_seconds: timeSpentSeconds
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to submit quiz attempt')
    return {
      status: data?.status,
      attempt: data?.attempt ? normalizeAttempt(data.attempt) : null,
      results: data?.results,
      quiz: data?.quiz,
      answers: data?.answers,
    }
  },

  async getQuizAttempt(token: string, attemptId: string) {
    const res = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quiz attempt')
    return {
      attempt: data?.attempt ? normalizeAttempt(data.attempt) : null,
      quiz: data?.quiz,
      answers: data?.answers,
      results: data?.results,
    }
  },

  async getUserQuizAttempts(token: string, quizId?: string|number, page = 1, perPage = 20) {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))
    if (quizId) sp.set('quiz_id', String(quizId))

    const res = await fetch(`${API_BASE_URL}/user/quiz-attempts?${sp.toString()}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch quiz attempts')
    const attemptsList = normalizeAttemptArray(data?.attempts ?? data?.data)
    return {
      attempts: attemptsList,
      meta: data?.meta,
      links: data?.links,
    }
  },

  async getAttemptStatistics(token: string, quizId?: string|number) {
    const sp = new URLSearchParams()
    if (quizId) sp.set('quiz_id', String(quizId))

    const res = await fetch(`${API_BASE_URL}/user/attempt-statistics?${sp.toString()}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch attempt statistics')
    return data
  },

  async resumeQuizAttempt(token: string, attemptId: string) {
    const res = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/resume`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Failed to resume quiz attempt')
    return {
      status: data?.status,
      attempt: data?.attempt ? normalizeAttempt(data.attempt) : null,
      quiz: data?.quiz,
    }
  },

  async abandonQuizAttempt(token: string, attemptId: string) {
    const response = await fetch(`${API_BASE_URL}/quiz-attempts/${attemptId}/abandon`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to abandon attempt')
    return {
      status: data?.status,
      attempt: data?.attempt ? normalizeAttempt(data.attempt) : null,
    }
  },

  // Reviews
  async getQuizReviews(quizId: string|number, page = 1, perPage = 15) {
    const sp = new URLSearchParams()
    sp.set('per_page', String(perPage))
    if (page > 1) sp.set('page', String(page))

    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/reviews?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to fetch reviews')
    return data
  },

  async createQuizReview(token: string, quizId: string|number, payload: {
    rating: number;
    comment?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to create review')
    return data
  },

  async updateQuizReview(token: string, quizId: string|number, reviewId: string|number, payload: {
    rating?: number;
    comment?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to update review')
    return data
  },

  async deleteQuizReview(token: string, quizId: string|number, reviewId: string|number) {
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    if (response.status === 204) return { success: true }
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to delete review')
    return data
  },

  // Bookmark functions
  async getBookmarkedQuizzes(token: string, page = 1, perPage = 20) {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('per_page', String(perPage))

    const response = await fetch(`${API_BASE_URL}/bookmarks?${sp.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to fetch bookmarked quizzes')
    return data
  },

  async toggleQuizBookmark(token: string, quizId: string|number) {
    const response = await fetch(`${API_BASE_URL}/bookmarks/toggle/${quizId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to toggle quiz bookmark')
    return data
  },

  async checkQuizBookmark(token: string, quizId: string|number) {
    const response = await fetch(`${API_BASE_URL}/bookmarks/check/${quizId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to check quiz bookmark')
    return data
  },

  async removeQuizBookmark(token: string, quizId: string|number) {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${quizId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Failed to remove quiz bookmark')
    return data
  }
};

// Permission checking utilities
export const permissionUtils = {
  // Check if user has specific permission
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.includes(permission);
  },

  // Check if user has any of the specified permissions
  hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.some(permission => rolePermissions.includes(permission));
  },

  // Check if user has all specified permissions
  hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.every(permission => rolePermissions.includes(permission));
  },

  // Get all permissions for a role
  getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  },

  // Check if role is admin or higher
  isAdminRole(role: UserRole): boolean {
    return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
  },

  // Check if role is super admin
  isSuperAdminRole(role: UserRole): boolean {
    return role === USER_ROLES.SUPER_ADMIN;
  },
};

// Role hierarchy utilities
export const roleUtils = {
  // Get role hierarchy level (higher number = more permissions)
  getRoleLevel(role: UserRole): number {
    const levels = {
      [USER_ROLES.GUEST]: 0,
      [USER_ROLES.USER]: 1,
      [USER_ROLES.ADMIN]: 2,
      [USER_ROLES.SUPER_ADMIN]: 3,
    };
    return levels[role] || 0;
  },

  // Check if role has higher or equal level than target role
  hasRoleLevelOrHigher(userRole: UserRole, targetRole: UserRole): boolean {
    return roleUtils.getRoleLevel(userRole) >= roleUtils.getRoleLevel(targetRole);
  },

  // Get all roles with equal or lower level
  getRolesAtOrBelowLevel(targetRole: UserRole): UserRole[] {
    const targetLevel = roleUtils.getRoleLevel(targetRole);
    return Object.values(USER_ROLES).filter(role =>
      roleUtils.getRoleLevel(role) <= targetLevel
    );
  },
};

// Session utilities
export const sessionUtils = {
  // Check if user session is valid
  isSessionValid(session: unknown): boolean {
    const s = session as { user?: unknown; accessToken?: string };
    return !!(s && s.user && s.accessToken);
  },

  // Get user role from session
  getUserRole(session: unknown): UserRole {
    const s = session as { user?: { role?: UserRole } };
    return s?.user?.role || USER_ROLES.GUEST;
  },

  // Get user permissions from session
  getUserPermissions(session: unknown): Permission[] {
    const s = session as { user?: { permissions?: Permission[] } };
    return s?.user?.permissions || [];
  },
};
