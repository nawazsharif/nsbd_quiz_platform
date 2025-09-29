'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import CourseProgressCard from '@/components/course/CourseProgressCard'
import ProgressStats from '@/components/course/ProgressStats'
import { authAPI } from '@/lib/auth-utils'
import { BookOpen, AlertCircle, Search, RefreshCw } from 'lucide-react'

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

export default function EnrolledCoursesPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const loadEnrollments = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')
    try {
      const response = await authAPI.getCourseEnrollments(token)
      const enrollmentData = response?.data || []
      setEnrollments(enrollmentData)
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

  // Calculate statistics
  const stats = {
    totalEnrolled: enrollments.length,
    inProgress: enrollments.filter(e => e.progress.status === 'in_progress').length,
    completed: enrollments.filter(e => e.progress.status === 'completed').length,
    totalLessons: enrollments.reduce((sum, e) => sum + e.progress.total_contents, 0),
    completedLessons: enrollments.reduce((sum, e) => sum + e.progress.completed_contents, 0),
    averageProgress: enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + e.progress.progress_percentage, 0) / enrollments.length
      : 0,
    timeSpent: 0, // This would come from backend tracking
    certificates: enrollments.filter(e => e.progress.status === 'completed').length
  }

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' || enrollment.progress.status === filter

    return matchesSearch && matchesFilter
  })

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
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader title="My Enrolled Courses" subtitle="Track your course progress" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium mb-1">Error Loading Courses</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={loadEnrollments}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="My Enrolled Courses"
        subtitle={`Track your progress across ${enrollments.length} enrolled courses`}
      />

      {enrollments.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No enrolled courses yet</h3>
          <p className="text-gray-600 mb-6">
            Start your learning journey by enrolling in courses that interest you.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Browse Courses
          </Link>
        </div>
      ) : (
        <>
          {/* Progress Statistics */}
          <ProgressStats stats={stats} />

          {/* Search and Filter */}
          <div className="bg-white border rounded-xl p-6">
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
                  <option value="all">All Courses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
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

          {/* Course List */}
          <div className="space-y-4">
            {filteredEnrollments.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
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
            ) : (
              filteredEnrollments.map((enrollment) => (
                <CourseProgressCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  onContinue={() => {
                    // Navigate to course learning page
                    window.location.href = `/learning/courses/${enrollment.course.id}`
                  }}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
