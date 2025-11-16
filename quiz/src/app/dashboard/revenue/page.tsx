'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { WalletTransaction } from '@/types/transaction'
import Link from 'next/link'

export default function CreatorRevenuePage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'quizzes' | 'courses'>('quizzes')

  const [quizRevenue, setQuizRevenue] = useState<any>(null)
  const [courseRevenue, setCourseRevenue] = useState<any>(null)

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params: any = {}
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo

      const [quizRes, courseRes] = await Promise.all([
        authAPI.getMyQuizRevenue(token, params),
        authAPI.getMyCourseRevenue(token, params)
      ])

      setQuizRevenue(quizRes)
      setCourseRevenue(courseRes)
    } catch (e: any) {
      setError(e.message || 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadData()
  }, [token])

  const applyFilters = () => {
    loadData()
  }

  const clearFilters = () => {
    setFilterFrom('')
    setFilterTo('')
    setTimeout(() => loadData(), 100)
  }

  const currentData = activeTab === 'quizzes' ? quizRevenue : courseRevenue

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="My Revenue" subtitle="Track your earnings from quizzes and courses" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🎯</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatTaka((quizRevenue?.summary?.total_revenue_cents || 0) / 100)}
            </div>
            <div className="text-sm text-gray-600 mb-2">Quiz Revenue</div>
            <div className="text-xs text-gray-500">
              {quizRevenue?.meta?.total || 0} sales
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">📚</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatTaka((courseRevenue?.summary?.total_revenue_cents || 0) / 100)}
            </div>
            <div className="text-sm text-gray-600 mb-2">Course Revenue</div>
            <div className="text-xs text-gray-500">
              {courseRevenue?.meta?.total || 0} sales
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatTaka(
                ((quizRevenue?.summary?.total_revenue_cents || 0) +
                 (courseRevenue?.summary?.total_revenue_cents || 0)) / 100
              )}
            </div>
            <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
            <div className="text-xs text-gray-500">
              {(quizRevenue?.meta?.total || 0) + (courseRevenue?.meta?.total || 0)} total sales
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filter by Date Range</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium border-2 border-gray-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 mb-6">
          <div className="border-b-2 border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`px-6 py-4 font-bold border-b-4 transition-colors ${
                  activeTab === 'quizzes'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                🎯 Quiz Sales ({quizRevenue?.meta?.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`px-6 py-4 font-bold border-b-4 transition-colors ${
                  activeTab === 'courses'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📚 Course Sales ({courseRevenue?.meta?.total || 0})
              </button>
            </div>
          </div>

          {/* Sales List */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-gray-600">Loading sales data...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : !currentData?.data || currentData.data.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <p className="text-gray-500 text-lg font-medium">
                No {activeTab === 'quizzes' ? 'quiz' : 'course'} sales yet
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Your sales will appear here once someone purchases your content
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {activeTab === 'quizzes' ? 'Quiz' : 'Course'} Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Amount Earned
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.data.map((tx: WalletTransaction) => (
                    <tr key={tx.id} className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-blue-50/30 transition-all duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {tx.meta?.quiz_title || tx.meta?.course_title || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tx.user?.name || `User #${tx.meta?.buyer_id || 'N/A'}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-green-600">
                        +{formatTaka(tx.amount_cents / 100)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {tx.transaction_id.substring(0, 12)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Link to view purchase details */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl">💡</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Want more details?</h3>
              <p className="text-sm text-gray-600 mb-4">
                View detailed purchase logs for each quiz or course from your content management pages.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/my-content"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  Go to My Content
                </Link>
                <Link
                  href="/wallet/transactions"
                  className="px-5 py-2.5 bg-white border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors font-medium"
                >
                  View All Transactions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
