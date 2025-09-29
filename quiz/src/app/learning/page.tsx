'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import CourseProgressCard from '@/components/course/CourseProgressCard'
import ProgressStats from '@/components/course/ProgressStats'
import { authAPI } from '@/lib/auth-utils'
import { BookOpen, TrendingUp, AlertCircle } from 'lucide-react'

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

export default function LearningPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all')

  const loadEnrollments = async () => {
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
  }

  useEffect(() => {
    if (token) {
      loadEnrollments()
    }
  }, [token])

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
    if (filter === 'all') return true
    return enrollment.progress.status === filter
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader title="My Learning" subtitle="Track your course progress" />

        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="h-8 w-16 bg-gray-200 rounded" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>

        {/* Loading Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 rounded flex-1" />
                  <div className="h-10 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader title="My Learning" subtitle="Track your course progress" />
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
        title="My Learning"
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

          {/* Filter Tabs */}
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Your Courses</h2>
              <div className="flex items-center gap-2">
                {[
                  { key: 'all', label: 'All', count: enrollments.length },
                  { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
                  { key: 'completed', label: 'Completed', count: stats.completed },
                  { key: 'not_started', label: 'Not Started', count: enrollments.filter(e => e.progress.status === 'not_started').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Course Grid */}
            {filteredEnrollments.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No courses in this category
                </h3>
                <p className="text-gray-600">
                  {filter === 'all'
                    ? 'You haven\'t enrolled in any courses yet.'
                    : `You don't have any ${filter.replace('_', ' ')} courses.`
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEnrollments.map((enrollment) => (
                  <CourseProgressCard
                    key={enrollment.id}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
