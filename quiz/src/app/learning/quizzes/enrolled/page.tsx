'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import {
  BookOpen,
  Clock,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  User,
  Star,
  Play,
  BarChart3,
  Award,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search
} from 'lucide-react'

type QuizEnrollment = {
  id: number
  quiz: {
    id: number
    title: string
    description?: string
    difficulty?: string
    is_paid: boolean
    price_cents?: number
    timer_seconds?: number
    status: string
    category?: {
      id: number
      name: string
    }
    owner: {
      id: number
      name: string
    }
  }
  enrolled_at: string
  access_type: string
}

type QuizStats = {
  totalEnrolled: number
  completed: number
  inProgress: number
  averageScore: number
  totalTimeSpent: number
  certificates: number
}

export default function EnrolledQuizzesPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [enrollments, setEnrollments] = useState<QuizEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [stats, setStats] = useState<QuizStats>({
    totalEnrolled: 0,
    completed: 0,
    inProgress: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    certificates: 0
  })

  const loadEnrollments = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')
    try {
      const response = await authAPI.getQuizEnrollments(token)
      const enrollmentData = response?.data || []
      setEnrollments(enrollmentData)
      calculateStats(enrollmentData)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load enrolled quizzes')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadEnrollments()
    }
  }, [token, loadEnrollments])

  const calculateStats = (enrollmentData: QuizEnrollment[]) => {
    // This would ideally come from backend with attempt data
    // For now, we'll show basic enrollment stats
    setStats({
      totalEnrolled: enrollmentData.length,
      completed: 0, // Would need attempt data
      inProgress: 0, // Would need attempt data
      averageScore: 0, // Would need attempt data
      totalTimeSpent: 0, // Would need attempt data
      certificates: 0 // Would need completion data
    })
  }

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.quiz.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDifficulty = difficultyFilter === 'all' || enrollment.quiz.difficulty === difficultyFilter

    return matchesSearch && matchesDifficulty
  })

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'hard': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }


  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return 'Free'
    return formatTaka(priceCents, { fromCents: true })
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'No time limit'
    const minutes = Math.round(seconds / 60)
    return `${minutes} minutes`
  }

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
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
        <PageHeader title="My Enrolled Quizzes" subtitle="Manage and access your enrolled quizzes" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Quizzes</h2>
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
        title="My Enrolled Quizzes"
        subtitle={`Manage and access your ${enrollments.length} enrolled quizzes`}
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
            <span className="text-2xl font-bold text-yellow-600">{stats.averageScore}%</span>
          </div>
          <div className="text-sm text-slate-600">Average Score</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">{stats.certificates}</span>
          </div>
          <div className="text-sm text-slate-600">Certificates</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
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

      {/* Quiz List */}
      <div className="space-y-4">
        {filteredEnrollments.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Found</h3>
            <p className="text-gray-600 mb-4">
              {enrollments.length === 0
                ? "You haven't enrolled in any quizzes yet."
                : "No quizzes match your current filters."
              }
            </p>
            {enrollments.length === 0 && (
              <Link
                href="/quizzes"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <BookOpen className="w-4 h-4" />
                Browse Quizzes
              </Link>
            )}
          </div>
        ) : (
          filteredEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{stripHtmlTags(enrollment.quiz.title)}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(enrollment.quiz.difficulty)}`}>
                      {enrollment.quiz.difficulty || 'Unknown'}
                    </span>
                  </div>
                  {enrollment.quiz.description && (
                    <p className="text-slate-600 mb-3">{stripHtmlTags(enrollment.quiz.description)}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {enrollment.quiz.owner.name}
                    </div>
                    {enrollment.quiz.category && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {enrollment.quiz.category.name}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(enrollment.quiz.timer_seconds)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900 mb-1">
                    {formatPrice(enrollment.quiz.price_cents)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {enrollment.access_type === 'owner' ? 'Owner' :
                     enrollment.access_type === 'admin' ? 'Admin Access' : 'Enrolled'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/quiz/${enrollment.quiz.id}/take`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  Take Quiz
                </Link>
                <Link
                  href={`/quiz/${enrollment.quiz.id}/results`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Results
                </Link>
                <Link
                  href={`/quiz/${enrollment.quiz.id}/ranking`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Trophy className="w-4 h-4" />
                  Ranking
                </Link>
                <Link
                  href={`/quiz/${enrollment.quiz.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Target className="w-4 h-4" />
                  Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
