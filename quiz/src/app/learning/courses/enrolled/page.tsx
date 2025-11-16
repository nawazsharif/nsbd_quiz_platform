'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import {
  BookOpen,
  AlertCircle,
  Search,
  RefreshCw,
  Grid3x3,
  List,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Play,
  User,
  Calendar,
  XCircle
} from 'lucide-react'

type CourseEnrollment = {
  id: number
  course: {
    id: number
    title: string
    summary?: string
    cover_url?: string
    is_paid?: boolean
    price_cents?: number
    category?: {
      id: number
      name: string
    }
    owner?: {
      id: number
      name: string
    }
  }
  progress: {
    total_contents: number
    completed_contents: number
    progress_percentage: number
    status: 'not_started' | 'in_progress' | 'completed'
  }
  enrolled_at: string
}

type CourseStats = {
  totalEnrolled: number
  completed: number
  inProgress: number
  averageProgress: number
  totalLessons: number
  completedLessons: number
}

export default function EnrolledCoursesPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [stats, setStats] = useState<CourseStats>({
    totalEnrolled: 0,
    completed: 0,
    inProgress: 0,
    averageProgress: 0,
    totalLessons: 0,
    completedLessons: 0
  })

  const loadEnrollments = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')
    try {
      const response = await authAPI.getCourseEnrollments(token)
      const enrollmentData = response?.data || []
      setEnrollments(enrollmentData)
      calculateStats(enrollmentData)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load enrolled courses')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadEnrollments()
    }
  }, [token, loadEnrollments])

  const calculateStats = (enrollmentData: CourseEnrollment[]) => {
    setStats({
      totalEnrolled: enrollmentData.length,
      completed: enrollmentData.filter(e => e.progress.status === 'completed').length,
      inProgress: enrollmentData.filter(e => e.progress.status === 'in_progress').length,
      averageProgress: enrollmentData.length > 0
        ? Math.round(enrollmentData.reduce((sum, e) => sum + e.progress.progress_percentage, 0) / enrollmentData.length)
        : 0,
      totalLessons: enrollmentData.reduce((sum, e) => sum + e.progress.total_contents, 0),
      completedLessons: enrollmentData.reduce((sum, e) => sum + e.progress.completed_contents, 0)
    })
  }

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' || enrollment.progress.status === filter

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      default:
        return 'Not Started'
    }
  }

  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return 'Free'
    return formatTaka(priceCents, { fromCents: true })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="My Enrolled Courses" subtitle="Track your course progress" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Courses</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadEnrollments}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="My Enrolled Courses"
        subtitle={`Manage and access your ${enrollments.length} enrolled courses`}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{stats.totalEnrolled}</span>
          </div>
          <div className="text-sm text-slate-600">Total Enrolled</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
          </div>
          <div className="text-sm text-slate-600">Completed</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">{stats.averageProgress}%</span>
          </div>
          <div className="text-sm text-slate-600">Average Progress</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">{stats.completedLessons}/{stats.totalLessons}</span>
          </div>
          <div className="text-sm text-slate-600">Lessons</div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 border-l ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={loadEnrollments}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Course List/Grid */}
      {filteredEnrollments.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Courses Found</h3>
          <p className="text-gray-600 mb-4">
            {enrollments.length === 0
              ? "You haven't enrolled in any courses yet."
              : "No courses match your current filters."
            }
          </p>
          {enrollments.length === 0 && (
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <BookOpen className="w-4 h-4" />
              Browse Courses
            </Link>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{enrollment.course.title}</h3>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(enrollment.progress.status)}`}>
                      {enrollment.progress.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {enrollment.progress.status === 'in_progress' && <Play className="w-3 h-3 mr-1" />}
                      {enrollment.progress.status === 'not_started' && <Clock className="w-3 h-3 mr-1" />}
                      {getStatusText(enrollment.progress.status)}
                    </span>
                  </div>
                  {enrollment.course.summary && (
                    <p className="text-slate-600 mb-3">{enrollment.course.summary}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                    {enrollment.course.owner && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {enrollment.course.owner.name}
                      </div>
                    )}
                    {enrollment.course.category && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {enrollment.course.category.name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                      <span>{enrollment.progress.completed_contents} of {enrollment.progress.total_contents} lessons completed</span>
                      <span className="font-semibold">{enrollment.progress.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${enrollment.progress.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-semibold text-slate-900 mb-1">
                    {formatPrice(enrollment.course.price_cents)}
                  </div>
                  {enrollment.course.is_paid && (
                    <div className="text-sm text-slate-500">Paid Course</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/learning/courses/${enrollment.course.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  {enrollment.progress.status === 'completed' ? 'Review Course' :
                   enrollment.progress.status === 'in_progress' ? 'Continue Learning' : 'Start Course'}
                </Link>
                <Link
                  href={`/courses/${enrollment.course.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <BookOpen className="w-4 h-4" />
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
              {/* Course Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
                {enrollment.course.cover_url ? (
                  <img
                    src={enrollment.course.cover_url}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-blue-400" />
                  </div>
                )}

                {/* Progress Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="flex items-center justify-between text-white text-sm">
                    <span>{enrollment.progress.completed_contents} of {enrollment.progress.total_contents} lessons</span>
                    <span>{enrollment.progress.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${enrollment.progress.progress_percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Course Content */}
              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(enrollment.progress.status)}`}>
                    {enrollment.progress.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {enrollment.progress.status === 'in_progress' && <Play className="w-3 h-3 mr-1" />}
                    {enrollment.progress.status === 'not_started' && <Clock className="w-3 h-3 mr-1" />}
                    {getStatusText(enrollment.progress.status)}
                  </span>

                  {enrollment.course.is_paid && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {formatPrice(enrollment.course.price_cents)}
                    </span>
                  )}
                </div>

                {/* Course Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {enrollment.course.title}
                </h3>

                {/* Course Summary */}
                {enrollment.course.summary && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {enrollment.course.summary}
                  </p>
                )}

                {/* Course Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  {enrollment.course.category && (
                    <div className="flex items-center">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {enrollment.course.category.name}
                    </div>
                  )}
                  {enrollment.course.owner && (
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {enrollment.course.owner.name}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/learning/courses/${enrollment.course.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {enrollment.progress.status === 'completed' ? 'Review Course' :
                     enrollment.progress.status === 'in_progress' ? 'Continue Learning' : 'Start Course'}
                    <Play className="w-4 h-4 ml-2" />
                  </Link>

                  <Link
                    href={`/courses/${enrollment.course.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
