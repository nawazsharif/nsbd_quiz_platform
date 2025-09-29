'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { QuizAttemptSummary, AttemptStatistics } from '@/types/quiz-attempt'
import {
  Clock,
  Trophy,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  PlayCircle,
  Pause,
  MoreHorizontal,
  Filter,
  Search,
  ArrowUpDown,
  Eye,
  RotateCcw
} from 'lucide-react'
// Using native Date methods instead of date-fns

interface AttemptHistoryProps {
  userId?: string
  quizId?: string
  limit?: number
  showStatistics?: boolean
  className?: string
}

export default function AttemptHistory({
  userId,
  quizId,
  limit,
  showStatistics = true,
  className = ''
}: AttemptHistoryProps) {
  const { data: session } = useSession()
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([])
  const [statistics, setStatistics] = useState<AttemptStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'abandoned'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAttempts()
    if (showStatistics) {
      fetchStatistics()
    }
  }, [userId, quizId, session])

  const fetchAttempts = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!(session as any)?.accessToken) {
        throw new Error('No authentication token available')
      }

      const targetUserId = userId || (session as any).user?.id
      if (!targetUserId) {
        throw new Error('No user ID available')
      }

      const { attempts } = await authAPI.getUserQuizAttempts(
        (session as any).accessToken,
        quizId ? parseInt(quizId) : undefined
      )

      setAttempts(attempts || [])
    } catch (err) {
      console.error('Failed to fetch quiz attempts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load attempts')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      if (!(session as any)?.accessToken) return

      const targetUserId = userId || (session as any).user?.id
      if (!targetUserId) return

      const stats = await authAPI.getAttemptStatistics(
        (session as any).accessToken,
        quizId ? parseInt(quizId) : undefined
      )

      setStatistics(stats)
    } catch (err) {
      console.error('Failed to fetch attempt statistics:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <PlayCircle className="w-5 h-5 text-blue-500" />
      case 'abandoned':
        return <Pause className="w-5 h-5 text-gray-500" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'abandoned':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  const filteredAndSortedAttempts = attempts
    .filter(attempt => {
      if (filter !== 'all' && attempt.status !== filter) return false
      if (searchTerm && !attempt.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
          break
        case 'score':
          const aScore = a.score || 0
          const bScore = b.score || 0
          comparison = aScore - bScore
          break
        case 'duration':
          comparison = a.timeSpent - b.timeSpent
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Attempts</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAttempts}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
            Quiz Attempt History
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {showStatistics && statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Attempts</p>
                  <p className="text-2xl font-bold text-blue-900">{statistics.totalAttempts}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{statistics.completedAttempts}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Avg Score</p>
                  <p className="text-2xl font-bold text-yellow-900">{statistics.averageScore.toFixed(1)}%</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Best Score</p>
                  <p className="text-2xl font-bold text-purple-900">{statistics.bestScore.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Attempts</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="abandoned">Abandoned</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="score">Sort by Score</option>
            <option value="duration">Sort by Duration</option>
          </select>
        </div>
      </div>

      {/* Attempts List */}
      <div className="p-6">
        {filteredAndSortedAttempts.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attempts Found</h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Start taking quizzes to see your attempt history here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {getStatusIcon(attempt.status)}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{attempt.quizTitle}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(attempt.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDuration(attempt.timeSpent)}
                      </span>
                      {attempt.difficulty && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          attempt.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          attempt.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {attempt.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    {attempt.score !== undefined ? (
                      <div className={`text-lg font-bold ${getScoreColor(attempt.score, attempt.maxScore)}`}>
                        {attempt.score}/{attempt.maxScore}
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-gray-400">-/-</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const rawCompletion =
                          typeof attempt.completionPercentage === 'number'
                            ? attempt.completionPercentage
                            : 0;

                        const completion = Number.isFinite(rawCompletion) ? rawCompletion : 0;

                        return `${completion.toFixed(0)}% complete`;
                      })()}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(attempt.status)}`}>
                    {attempt.status.replace('_', ' ')}
                  </span>

                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
