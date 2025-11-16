'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { PlatformRevenue, RevenueBreakdown } from '@/types/transaction'

export default function AdminRevenuePage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const userRole = (session as any)?.user?.role
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revenues, setRevenues] = useState<PlatformRevenue[]>([])
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 25,
    total: 0,
    last_page: 1
  })

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Check if user is admin
  useEffect(() => {
    if (session && userRole && !['admin', 'superadmin'].includes(userRole)) {
      router.push('/dashboard')
    }
  }, [session, userRole, router])

  const loadData = async (page = 1) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params: any = { page, per_page: 25 }
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      if (filterSource) params.source = filterSource

      const breakdownParams: any = {}
      if (filterFrom) breakdownParams.from = filterFrom
      if (filterTo) breakdownParams.to = filterTo

      const [revenueRes, breakdownRes] = await Promise.all([
        authAPI.getPlatformRevenue(token, params),
        authAPI.getPlatformRevenueBreakdown(token, breakdownParams)
      ])

      setRevenues(revenueRes.data || [])
      setPagination(revenueRes.meta || {
        current_page: 1,
        per_page: 25,
        total: 0,
        last_page: 1
      })
      setTotalRevenue(revenueRes.summary?.total_revenue_cents || 0)
      setBreakdown(breakdownRes.breakdown || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && ['admin', 'superadmin'].includes(userRole)) {
      loadData(currentPage)
    }
  }, [token, userRole, currentPage])

  const applyFilters = () => {
    setCurrentPage(1)
    loadData(1)
  }

  const clearFilters = () => {
    setFilterFrom('')
    setFilterTo('')
    setFilterSource('')
    setCurrentPage(1)
    setTimeout(() => loadData(1), 100)
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      quiz_purchase: 'Quiz Purchases',
      course_purchase: 'Course Purchases',
      course_approval_fee: 'Course Approval Fees'
    }
    return labels[source] || source
  }

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      quiz_purchase: 'bg-blue-100 text-blue-800',
      course_purchase: 'bg-green-100 text-green-800',
      course_approval_fee: 'bg-purple-100 text-purple-800'
    }
    return colors[source] || 'bg-gray-100 text-gray-800'
  }

  if (!['admin', 'superadmin'].includes(userRole)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Platform Revenue Analytics" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Platform Revenue</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatTaka(totalRevenue / 100)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {pagination.total} transactions
            </div>
          </div>
          {breakdown.map((item) => (
            <div key={item.source} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {getSourceLabel(item.source)}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatTaka(item.total_cents / 100)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {item.count} transactions
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">All Sources</option>
                <option value="quiz_purchase">Quiz Purchases</option>
                <option value="course_purchase">Course Purchases</option>
                <option value="course_approval_fee">Course Approval Fees</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Revenue List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold">Platform Revenue Transactions</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : revenues.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No revenue transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {revenues.map((rev) => (
                    <tr key={rev.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSourceColor(rev.source)}`}>
                          {getSourceLabel(rev.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {rev.quiz && <div>Quiz: {rev.quiz.title}</div>}
                        {rev.course && <div>Course: {rev.course.title}</div>}
                        {!rev.quiz && !rev.course && <div className="text-gray-500">N/A</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {rev.buyer ? (
                          <div>
                            <div>{rev.buyer.name}</div>
                            <div className="text-xs text-gray-500">{rev.buyer.email}</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatTaka(rev.amount_cents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pagination.last_page > 1 && (
            <div className="p-6 border-t dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.current_page} of {pagination.last_page}
              </div>
              <div className="flex gap-2">
                {pagination.current_page > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Previous
                  </button>
                )}
                {pagination.current_page < pagination.last_page && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
