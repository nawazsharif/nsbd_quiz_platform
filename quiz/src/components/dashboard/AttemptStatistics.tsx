'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { AttemptStatistics } from '@/types/quiz-attempt'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Trophy, 
  BarChart3,
  Calendar,
  Award,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  PlayCircle,
  RotateCcw
} from 'lucide-react'

interface AttemptStatisticsProps {
  userId?: string
  className?: string
}

interface TrendData {
  period: string
  attempts: number
  completedAttempts: number
  averageScore: number
  timeSpent: number
}

export default function AttemptStatisticsComponent({ 
  userId, 
  className = '' 
}: AttemptStatisticsProps) {
  const { data: session } = useSession()
  const [statistics, setStatistics] = useState<AttemptStatistics | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    fetchStatistics()
    fetchTrendData()
  }, [userId, session, timeframe])

  const fetchStatistics = async () => {
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

      const stats = await authAPI.getAttemptStatistics(
        (session as any).accessToken
      )
      
      setStatistics(stats)
    } catch (err) {
      console.error('Failed to fetch attempt statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchTrendData = async () => {
    // Mock trend data for now - in a real app, this would come from the API
    const mockTrendData: TrendData[] = [
      { period: 'Week 1', attempts: 5, completedAttempts: 4, averageScore: 78, timeSpent: 1200 },
      { period: 'Week 2', attempts: 8, completedAttempts: 7, averageScore: 82, timeSpent: 1800 },
      { period: 'Week 3', attempts: 6, completedAttempts: 5, averageScore: 85, timeSpent: 1500 },
      { period: 'Week 4', attempts: 10, completedAttempts: 9, averageScore: 88, timeSpent: 2100 },
    ]
    setTrendData(mockTrendData)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Statistics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStatistics}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
          <p className="text-gray-600">Start taking quizzes to see your progress analytics here.</p>
        </div>
      </div>
    )
  }

  const completionRate = statistics.totalAttempts > 0 
    ? (statistics.completedAttempts / statistics.totalAttempts) * 100 
    : 0

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-600" />
            Learning Analytics
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-green-600 font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-green-900">{completionRate.toFixed(0)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className={`rounded-lg p-4 border ${getScoreBgColor(statistics.averageScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(statistics.averageScore)}`}>
                  {statistics.averageScore.toFixed(1)}%
                </p>
              </div>
              <Trophy className="w-8 h-8" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Best Score</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.bestScore.toFixed(1)}%</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Performance Breakdown */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Performance Breakdown
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Completed Attempts</span>
                </div>
                <span className="font-semibold text-gray-900">{statistics.completedAttempts}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <PlayCircle className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700">In Progress</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {statistics.totalAttempts - statistics.completedAttempts}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-orange-500 mr-3" />
                  <span className="text-gray-700">Total Time Spent</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatTime(statistics.totalTimeSpent)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-yellow-500 mr-3" />
                  <span className="text-gray-700">Avg. Time per Quiz</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {statistics.completedAttempts > 0 
                    ? formatTime(Math.floor(statistics.totalTimeSpent / statistics.completedAttempts))
                    : '0m'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Progress Trends */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Progress Trends
            </h4>
            <div className="space-y-4">
              {trendData.map((data, index) => {
                const prevData = index > 0 ? trendData[index - 1] : null
                const scoreTrend = prevData ? calculateTrend(data.averageScore, prevData.averageScore) : 0
                const attemptsTrend = prevData ? calculateTrend(data.attempts, prevData.attempts) : 0
                
                return (
                  <div key={data.period} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{data.period}</span>
                      <div className="flex items-center space-x-2">
                        {scoreTrend > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : scoreTrend < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          scoreTrend > 0 ? 'text-green-600' : 
                          scoreTrend < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {scoreTrend > 0 ? '+' : ''}{scoreTrend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Attempts:</span>
                        <span className="ml-1 font-medium">{data.attempts}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Score:</span>
                        <span className="ml-1 font-medium">{data.averageScore}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <span className="ml-1 font-medium">{formatTime(data.timeSpent)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Achievements
          </h4>
          <div className="flex flex-wrap gap-3">
            {statistics.completedAttempts >= 10 && (
              <div className="flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Trophy className="w-4 h-4 mr-2" />
                Quiz Master (10+ attempts)
              </div>
            )}
            {statistics.bestScore >= 90 && (
              <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Target className="w-4 h-4 mr-2" />
                High Achiever (90%+ score)
              </div>
            )}
            {completionRate >= 80 && (
              <div className="flex items-center px-3 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                Consistent Learner (80%+ completion)
              </div>
            )}
            {statistics.totalTimeSpent >= 3600 && (
              <div className="flex items-center px-3 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4 mr-2" />
                Dedicated Student (1+ hour)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
