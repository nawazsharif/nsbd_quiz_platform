'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import {
  User,
  BookOpen,
  Trophy,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  ShoppingCart,
  Award
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '@/components/dashboard/PageHeader';
import Link from 'next/link';
import { authAPI } from '@/lib/auth-utils';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await authAPI.getDashboardStats(token);
      setStats(data);
    } catch (e: any) {
      console.error('Dashboard stats error:', e);
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadStats();
  }, [token, loadStats]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Dashboard" subtitle="Overview of your activity" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Render based on role
  if (stats.role === 'superadmin') {
    return <SuperAdminDashboard stats={stats} user={user} />;
  }

  if (stats.role === 'admin') {
    return <AdminDashboard stats={stats} user={user} />;
  }

  return <UserDashboard stats={stats} user={user} />;
}

// Super Admin Dashboard
function SuperAdminDashboard({ stats, user }: any) {
  const { overview, revenue, activity, charts } = stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader
          title="Super Admin Dashboard"
          subtitle={`Welcome back, ${user.name}`}
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={overview.total_users}
            change={`+${overview.new_users_today} today`}
            icon={<Users className="w-6 h-6" />}
            color="from-blue-50 to-blue-100"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Published Quizzes"
            value={overview.published_quizzes}
            subtitle={`${overview.total_quizzes} total`}
            icon={<FileText className="w-6 h-6" />}
            color="from-green-50 to-green-100"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Published Courses"
            value={overview.published_courses}
            subtitle={`${overview.total_courses} total`}
            icon={<BookOpen className="w-6 h-6" />}
            color="from-purple-50 to-purple-100"
            iconBg="bg-purple-500"
          />
          <StatCard
            title="Pending Approvals"
            value={overview.pending_approvals}
            subtitle="Requires action"
            icon={<AlertCircle className="w-6 h-6" />}
            color="from-orange-50 to-orange-100"
            iconBg="bg-orange-500"
            link="/admin/approvals"
          />
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={`৳${revenue.total_platform_revenue.toFixed(2)}`}
            icon={<DollarSign className="w-6 h-6" />}
            color="from-emerald-50 to-emerald-100"
            iconBg="bg-emerald-500"
          />
          <StatCard
            title="This Month"
            value={`৳${revenue.revenue_this_month.toFixed(2)}`}
            subtitle="Revenue"
            icon={<TrendingUp className="w-6 h-6" />}
            color="from-blue-50 to-blue-100"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Approval Fees"
            value={`৳${revenue.approval_fees.toFixed(2)}`}
            subtitle="From approvals"
            icon={<CheckCircle className="w-6 h-6" />}
            color="from-indigo-50 to-indigo-100"
            iconBg="bg-indigo-500"
          />
          <StatCard
            title="Commission Fees"
            value={`৳${revenue.commission_fees.toFixed(2)}`}
            subtitle="From purchases"
            icon={<Package className="w-6 h-6" />}
            color="from-pink-50 to-pink-100"
            iconBg="bg-pink-500"
          />
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Quiz Attempts"
            value={activity.total_quiz_attempts}
            subtitle={`${activity.completed_attempts} completed`}
            icon={<Trophy className="w-6 h-6" />}
            color="from-yellow-50 to-yellow-100"
            iconBg="bg-yellow-500"
          />
          <StatCard
            title="Active Enrollments"
            value={activity.active_enrollments}
            subtitle="Quizzes & Courses"
            icon={<Users className="w-6 h-6" />}
            color="from-green-50 to-green-100"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Transactions Today"
            value={activity.transactions_today}
            icon={<ShoppingCart className="w-6 h-6" />}
            color="from-purple-50 to-purple-100"
            iconBg="bg-purple-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          {charts.user_growth && charts.user_growth.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">User Growth (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.user_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Trend Chart */}
          {charts.revenue_trend && charts.revenue_trend.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Content Distribution */}
        {charts.content_distribution && charts.content_distribution.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Content Distribution</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.content_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {charts.content_distribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ stats, user }: any) {
  const { overview, recent_activity, platform_activity, charts } = stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader
          title="Admin Dashboard"
          subtitle={`Welcome back, ${user.name}`}
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Pending Quiz Approvals"
            value={overview.pending_quiz_approvals}
            icon={<FileText className="w-6 h-6" />}
            color="from-orange-50 to-orange-100"
            iconBg="bg-orange-500"
            link="/admin/approvals/quizzes"
          />
          <StatCard
            title="Pending Course Approvals"
            value={overview.pending_course_approvals}
            icon={<BookOpen className="w-6 h-6" />}
            color="from-red-50 to-red-100"
            iconBg="bg-red-500"
            link="/admin/approvals/courses"
          />
          <StatCard
            title="Total Users"
            value={overview.total_users}
            subtitle={`+${overview.new_users_this_month} this month`}
            icon={<Users className="w-6 h-6" />}
            color="from-blue-50 to-blue-100"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Published Content"
            value={overview.published_quizzes + overview.published_courses}
            subtitle={`${overview.published_quizzes} quizzes, ${overview.published_courses} courses`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="from-green-50 to-green-100"
            iconBg="bg-green-500"
          />
        </div>

        {/* Platform Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="Quiz Attempts Today"
            value={platform_activity.quiz_attempts_today}
            icon={<Trophy className="w-6 h-6" />}
            color="from-yellow-50 to-yellow-100"
            iconBg="bg-yellow-500"
          />
          <StatCard
            title="New Enrollments Today"
            value={platform_activity.new_enrollments_today}
            icon={<Users className="w-6 h-6" />}
            color="from-purple-50 to-purple-100"
            iconBg="bg-purple-500"
          />
        </div>

        {/* Recent Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Quiz Submissions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Quiz Submissions</h3>
              <Link href="/admin/approvals/quizzes" className="text-sm text-emerald-600 hover:text-emerald-700">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recent_activity.recent_quiz_submissions.length > 0 ? (
                recent_activity.recent_quiz_submissions.map((quiz: any) => (
                  <div key={quiz.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{quiz.title}</p>
                      <p className="text-sm text-gray-500">by {quiz.owner?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {quiz.is_paid ? `৳${(quiz.price_cents / 100).toFixed(2)}` : 'Free'}
                      </p>
                    </div>
                    <Link
                      href="/admin/approvals/quizzes"
                      className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200"
                    >
                      Review
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No pending quiz submissions</p>
              )}
            </div>
          </div>

          {/* Recent Course Submissions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Course Submissions</h3>
              <Link href="/admin/approvals/courses" className="text-sm text-emerald-600 hover:text-emerald-700">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recent_activity.recent_course_submissions.length > 0 ? (
                recent_activity.recent_course_submissions.map((course: any) => (
                  <div key={course.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{course.title}</p>
                      <p className="text-sm text-gray-500">by {course.owner?.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {course.is_paid ? `৳${(course.price_cents / 100).toFixed(2)}` : 'Free'}
                      </p>
                    </div>
                    <Link
                      href="/admin/approvals/courses"
                      className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200"
                    >
                      Review
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No pending course submissions</p>
              )}
            </div>
          </div>
        </div>

        {/* Charts */}
        {charts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.approval_trend && charts.approval_trend.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.approval_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {charts.content_status && charts.content_status.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Content Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.content_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="status" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={100} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// User Dashboard
function UserDashboard({ stats, user }: any) {
  const { wallet, my_content, earnings, learning, recent_activity, charts } = stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader
          title="My Dashboard"
          subtitle={`Welcome back, ${user.name}`}
        />

        {/* Wallet & Earnings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Wallet Balance"
            value={`৳${wallet.balance.toFixed(2)}`}
            subtitle={wallet.pending_withdrawals > 0 ? `৳${wallet.pending_withdrawals.toFixed(2)} pending` : undefined}
            icon={<DollarSign className="w-6 h-6" />}
            color="from-emerald-50 to-emerald-100"
            iconBg="bg-emerald-500"
            link="/wallet"
          />
          <StatCard
            title="Total Earnings"
            value={`৳${earnings.total_revenue.toFixed(2)}`}
            subtitle={`৳${earnings.revenue_this_month.toFixed(2)} this month`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="from-green-50 to-green-100"
            iconBg="bg-green-500"
            link="/dashboard/revenue"
          />
          <StatCard
            title="Quiz Revenue"
            value={`৳${earnings.total_quiz_revenue.toFixed(2)}`}
            icon={<FileText className="w-6 h-6" />}
            color="from-blue-50 to-blue-100"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Course Revenue"
            value={`৳${earnings.total_course_revenue.toFixed(2)}`}
            icon={<BookOpen className="w-6 h-6" />}
            color="from-purple-50 to-purple-100"
            iconBg="bg-purple-500"
          />
        </div>

        {/* My Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Published Quizzes"
            value={my_content.published_quizzes}
            subtitle={`${my_content.total_quizzes} total`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="from-green-50 to-green-100"
            iconBg="bg-green-500"
            link="/my-content"
          />
          <StatCard
            title="Pending Quizzes"
            value={my_content.pending_quizzes}
            subtitle={`${my_content.draft_quizzes} drafts`}
            icon={<Clock className="w-6 h-6" />}
            color="from-orange-50 to-orange-100"
            iconBg="bg-orange-500"
            link="/my-content"
          />
          <StatCard
            title="Published Courses"
            value={my_content.published_courses}
            subtitle={`${my_content.total_courses} total`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="from-indigo-50 to-indigo-100"
            iconBg="bg-indigo-500"
            link="/my-content"
          />
          <StatCard
            title="Pending Courses"
            value={my_content.pending_courses}
            subtitle={`${my_content.draft_courses} drafts`}
            icon={<Clock className="w-6 h-6" />}
            color="from-pink-50 to-pink-100"
            iconBg="bg-pink-500"
            link="/my-content"
          />
        </div>

        {/* Learning Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Enrolled Quizzes"
            value={learning.enrolled_quizzes}
            icon={<FileText className="w-6 h-6" />}
            color="from-yellow-50 to-yellow-100"
            iconBg="bg-yellow-500"
          />
          <StatCard
            title="Enrolled Courses"
            value={learning.enrolled_courses}
            icon={<BookOpen className="w-6 h-6" />}
            color="from-cyan-50 to-cyan-100"
            iconBg="bg-cyan-500"
          />
          <StatCard
            title="Completed Attempts"
            value={learning.completed_attempts}
            icon={<Trophy className="w-6 h-6" />}
            color="from-amber-50 to-amber-100"
            iconBg="bg-amber-500"
          />
          <StatCard
            title="Average Score"
            value={`${learning.average_score.toFixed(1)}%`}
            icon={<Award className="w-6 h-6" />}
            color="from-rose-50 to-rose-100"
            iconBg="bg-rose-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          {charts.revenue_trend && charts.revenue_trend.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Performance Trend */}
          {charts.performance_trend && charts.performance_trend.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Trend (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.performance_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recent_activity.recent_attempts && recent_activity.recent_attempts.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Quiz Attempts</h3>
            <div className="space-y-3">
              {recent_activity.recent_attempts.map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{attempt.quiz?.title || 'Quiz'}</p>
                    <p className="text-sm text-gray-500">
                      {attempt.status === 'completed'
                        ? `Score: ${attempt.score?.toFixed(1)}%`
                        : 'In Progress'
                      }
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    attempt.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {attempt.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  change,
  icon,
  color,
  iconBg,
  link
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  link?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      {(subtitle || change) && (
        <div className="text-xs text-gray-500">{subtitle || change}</div>
      )}
    </>
  );

  if (link) {
    return (
      <Link href={link} className={`bg-gradient-to-br ${color} rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 border border-gray-200`}>
      {content}
    </div>
  );
}
