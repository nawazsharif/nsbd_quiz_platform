'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import {
  Trophy,
  Medal,
  Award,
  Clock,
  Target,
  Users,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import QuizNavigation from '@/components/navigation/QuizNavigation'

type QuizRankingData = {
  quiz: {
    id: number
    title: string
    description?: string
    difficulty?: string
    total_questions: number
    timer_seconds?: number
  }
  ranking: Array<{
    rank: number | null
    user: {
      id: number
      name: string
      email: string
    }
    score: number
    result?: 'Pass' | 'Fail'
    correct_answers: number
    total_questions: number
    incorrect_answers: number
    time_spent_seconds: number
    time_spent_formatted: string
    completed_at: string
    status: 'Completed' | 'In Progress' | 'Pass' | 'Fail'
  }>
  total_participants: number
  user_rank?: {
    rank: number | null
    user: {
      id: number
      name: string
      email: string
    }
    score: number
    result?: 'Pass' | 'Fail'
    correct_answers: number
    total_questions: number
    incorrect_answers: number
    time_spent_seconds: number
    time_spent_formatted: string
    completed_at: string
    status: 'Completed' | 'In Progress' | 'Pass' | 'Fail'
  }
  stats: {
    average_score: number
    highest_score: number
    lowest_score: number
    pass_rate: number
  }
}

export default function QuizRankingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const quizId = params?.id as string
  const returnTo = searchParams?.get('return') || ''

  const [rankingData, setRankingData] = useState<QuizRankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(50)

  const token = (session as any)?.accessToken as string | undefined

  const loadRanking = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await authAPI.getQuizRanking(quizId, limit, token)
      setRankingData(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load ranking')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (quizId) loadRanking()
  }, [quizId, limit])

  const getRankIcon = (rank: number | null) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    if (rank === null) return <Clock className="w-5 h-5 text-blue-500" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-600">{rank}</span>
  }

  const getRankBgColor = (rank: number | null) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-200'
    if (rank === 2) return 'bg-gray-50 border-gray-200'
    if (rank === 3) return 'bg-amber-50 border-amber-200'
    if (rank === null) return 'bg-blue-50 border-blue-200'
    return 'bg-white border-gray-200'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    if (status === 'Pass') return 'text-emerald-600 bg-emerald-50'
    if (status === 'Fail') return 'text-red-600 bg-red-50'
    if (status === 'In Progress') return 'text-blue-600 bg-blue-50'
    if (status === 'Completed') return 'text-slate-700 bg-slate-100'
    return 'text-gray-600 bg-gray-50'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="grid grid-cols-4 gap-4">
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Ranking</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!rankingData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl p-8 text-center text-slate-600">
          No ranking data available
        </div>
      </div>
    )
  }

  const { quiz, ranking, total_participants, user_rank, stats } = rankingData

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <QuizNavigation
        quizId={quizId}
        quizTitle={quiz.title}
        returnTo={returnTo}
        currentPage="ranking"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quiz Ranking</h1>
          <p className="text-slate-600">{quiz.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadRanking}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quiz Info */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {quiz.difficulty && (
              <div className="text-xs inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize mb-3">
                {quiz.difficulty}
              </div>
            )}
            {quiz.description && (
              <p className="text-slate-700 mb-4">{quiz.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                {quiz.total_questions} Questions
              </div>
              {quiz.timer_seconds && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.round(quiz.timer_seconds / 60)} Minutes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{total_participants}</span>
          </div>
          <div className="text-sm text-slate-600">Total Participants</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-600">
              {total_participants > 0 ? `${stats.average_score}%` : '—'}
            </span>
          </div>
          <div className="text-sm text-slate-600">Average Score</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-500">
              {total_participants > 0 ? `${stats.highest_score}%` : '—'}
            </span>
          </div>
          <div className="text-sm text-slate-600">Highest Score</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">
              {total_participants > 0 ? `${stats.pass_rate}%` : '—'}
            </span>
          </div>
          <div className="text-sm text-slate-600">Pass Rate</div>
        </div>
      </div>

      {/* User's Rank (if available) */}
      {user_rank && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Your Performance
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getRankIcon(user_rank.rank)}
                <span className="text-xl font-bold text-blue-900">Rank #{user_rank.rank}</span>
              </div>
              <div className="text-blue-700">
                <div className="font-semibold">{user_rank.score}%</div>
                <div className="text-sm">{user_rank.correct_answers}/{user_rank.total_questions} correct</div>
              </div>
            </div>
            <div className="text-right text-blue-700">
              <div className="text-sm">{user_rank.time_spent_formatted}</div>
              <div className={`text-sm px-2 py-1 rounded-full ${getStatusColor(user_rank.result ?? user_rank.status)}`}>
                {user_rank.result ?? user_rank.status ?? 'Completed'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Leaderboard
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Show:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wrong</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ranking.map((entry, index) => (
                <tr
                  key={`${entry.user.id}-${entry.completed_at}`}
                  className={`hover:bg-gray-50 ${getRankBgColor(entry.rank)}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {entry.rank ? (
                        <>
                          {getRankIcon(entry.rank)}
                          <span className="text-sm font-medium text-gray-900">#{entry.rank}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-blue-600">In Progress</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.user.name}</div>
                    <div className="text-sm text-gray-500">{entry.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getScoreColor(entry.score)}`}>
                      {entry.score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.result ?? entry.status)}`}>
                      {entry.result ?? entry.status ?? 'Completed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.correct_answers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.incorrect_answers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.time_spent_formatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ranking.length === 0 && (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 mb-4">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Rankings Yet</h3>
              <p className="text-gray-600">Be the first to complete this quiz and appear on the leaderboard!</p>
            </div>
            <Link
              href={`/quiz/${quiz.id}/take${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Target className="w-4 h-4" />
              Take Quiz
            </Link>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-6">
        <Link
          href={`/quiz/${quiz.id}/take${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Target className="w-4 h-4" />
          Take Quiz
        </Link>
        <Link
          href={`/quiz/${quiz.id}/results${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <BarChart3 className="w-4 h-4" />
          View Results
        </Link>
      </div>
    </div>
  )
}
