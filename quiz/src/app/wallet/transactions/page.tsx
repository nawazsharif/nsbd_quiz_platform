'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { WalletTransaction, TransactionSummary } from '@/types/transaction'
import Link from 'next/link'

export default function TransactionHistoryPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 25,
    total: 0,
    last_page: 1
  })

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('completed') // Default to completed only
  const [filterDirection, setFilterDirection] = useState<'' | 'credit' | 'debit'>('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPending, setShowPending] = useState(false)

  const currentPage = parseInt(searchParams?.get('page') || '1', 10)

  // Filter transactions by search term (client-side)
  const filteredTransactions = searchTerm
    ? transactions.filter(tx =>
        tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.meta?.quiz_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.meta?.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : transactions

  const loadData = async (page = 1) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params: any = { page, per_page: 25 }
      if (filterType) params.type = filterType
      if (filterStatus) params.status = filterStatus
      if (filterDirection) params.direction = filterDirection
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo

      const [txResponse, summaryResponse] = await Promise.all([
        authAPI.getTransactionLogs(token, params),
        authAPI.getTransactionSummary(token, { from: filterFrom, to: filterTo })
      ])

      setTransactions(txResponse.data || [])
      setPagination({
        current_page: txResponse.current_page || txResponse.meta?.current_page || 1,
        per_page: txResponse.per_page || txResponse.meta?.per_page || 25,
        total: txResponse.total || txResponse.meta?.total || 0,
        last_page: txResponse.last_page || txResponse.meta?.last_page || 1
      })
      setSummary(summaryResponse)
    } catch (e: any) {
      setError(e.message || 'Failed to load transaction history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadData(currentPage)
  }, [token, currentPage])

  const applyFilters = () => {
    router.push('/wallet/transactions?page=1')
    loadData(1)
  }

  const clearFilters = () => {
    setFilterType('')
    setFilterStatus('completed') // Keep completed as default
    setFilterDirection('')
    setFilterFrom('')
    setFilterTo('')
    setShowPending(false)
    router.push('/wallet/transactions?page=1')
    setTimeout(() => loadData(1), 100)
  }

  const togglePendingView = () => {
    const newShowPending = !showPending
    setShowPending(newShowPending)
    setFilterStatus(newShowPending ? '' : 'completed')
    setTimeout(() => loadData(1), 100)
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      recharge: 'Recharge',
      quiz_purchase: 'Quiz Purchase',
      course_purchase: 'Course Purchase',
      quiz_sale: 'Quiz Sale',
      course_sale: 'Course Sale',
      withdrawal: 'Withdrawal',
      platform_fee: 'Platform Fee',
      publishing_fee: 'Publishing Fee',
      service_charge: 'Service Charge',
      refund: 'Refund'
    }
    return labels[type] || type
  }

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      recharge: 'bg-green-100 text-green-800',
      quiz_purchase: 'bg-red-100 text-red-800',
      course_purchase: 'bg-red-100 text-red-800',
      quiz_sale: 'bg-blue-100 text-blue-800',
      course_sale: 'bg-blue-100 text-blue-800',
      withdrawal: 'bg-yellow-100 text-yellow-800',
      platform_fee: 'bg-purple-100 text-purple-800',
      refund: 'bg-green-100 text-green-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const isCredit = (tx: WalletTransaction) => {
    return tx.meta?.direction === 'credit' ||
           ['recharge', 'quiz_sale', 'course_sale', 'platform_fee', 'refund'].includes(tx.type)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    // Show time for transactions within last 24 hours
    if (diffInHours < 24) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTransactionDescription = (tx: WalletTransaction) => {
    const parts: string[] = []

    if (tx.meta?.quiz_title) {
      parts.push(`Quiz: ${tx.meta.quiz_title}`)
    } else if (tx.meta?.quiz_id) {
      parts.push(`Quiz ID: ${tx.meta.quiz_id}`)
    }

    if (tx.meta?.course_title) {
      parts.push(`Course: ${tx.meta.course_title}`)
    } else if (tx.meta?.course_id) {
      parts.push(`Course ID: ${tx.meta.course_id}`)
    }

    if (tx.meta?.provider) {
      parts.push(`Provider: ${tx.meta.provider}`)
    }

    if (tx.meta?.error && tx.status === 'failed') {
      parts.push(`Error: ${tx.meta.error}`)
    }

    if (tx.meta?.platform_fee_cents) {
      parts.push(`Fee: ${formatTaka(tx.meta.platform_fee_cents / 100)}`)
    }

    if (tx.meta?.author_share_cents) {
      parts.push(`Share: ${formatTaka(tx.meta.author_share_cents / 100)}`)
    }

    return parts.length > 0 ? parts : ['Transaction ID: ' + tx.transaction_id.substring(0, 8) + '...']
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Transaction History" subtitle="View your wallet activity and transactions" />

        {/* Quick Actions Banner */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-6 border-2 border-emerald-200 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Transaction History</h3>
                <p className="text-sm text-gray-600">
                  {showPending ? 'Viewing all transactions including pending' : 'Viewing completed in/out transactions only'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={togglePendingView}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  showPending
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
                    : 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {showPending ? '✓ Showing Pending' : 'Show Pending'}
              </button>
              <Link
                href="/wallet"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
              >
                Back to Wallet
              </Link>
              <Link
                href="/dashboard/revenue"
                className="px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                View Revenue
              </Link>
            </div>
          </div>
        </div>
        {/* Info Banner */}
        {!showPending && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Completed Transactions Only</h4>
                <p className="text-xs text-gray-600">
                  Showing only completed in/out transactions. Pending and processing transactions are hidden.
                  Click "Show Pending" above to view all transactions.
                </p>
              </div>
            </div>
          </div>
        )}        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">↓</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTaka(summary.total_recharges_cents / 100)}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Recharges</div>
              <div className="text-xs text-gray-500">Money added to wallet</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border-2 border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">↑</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTaka(summary.total_purchases_cents / 100)}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Purchases</div>
              <div className="text-xs text-gray-500">Content purchased</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTaka(summary.total_sales_cents / 100)}
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Sales</div>
              <div className="text-xs text-gray-500">Revenue from your content</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">∑</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatTaka(summary.net_balance_cents / 100)}
              </div>
              <div className="text-sm text-gray-600 mb-2">Net Balance</div>
              <div className="text-xs text-gray-500">{summary.transaction_count} transactions</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filters & Search</h3>

          {/* Search Bar */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Transactions</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by transaction ID, quiz, or course name..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
              >
                <option value="">All Types</option>
                <option value="recharge">Recharge</option>
                <option value="quiz_purchase">Quiz Purchase</option>
                <option value="course_purchase">Course Purchase</option>
                <option value="quiz_sale">Quiz Sale</option>
                <option value="course_sale">Course Sale</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setShowPending(e.target.value !== 'completed')
                }}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
              >
                <option value="completed">Completed (Default)</option>
                <option value="">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Direction</label>
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value as '' | 'credit' | 'debit')}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
              >
                <option value="">All</option>
                <option value="credit">Credit (Money In)</option>
                <option value="debit">Debit (Money Out)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={applyFilters}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium border-2 border-gray-300"
            >
              Clear
            </button>
            <button
              onClick={() => alert('Export functionality coming soon! You can export your transactions to CSV or PDF.')}
              className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
              title="Export transactions"
            >
              <span>📥</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Transaction Statistics */}
        {summary && showPending && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction Status Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {summary.completed_count}
                </div>
                <div className="text-sm text-gray-600 mb-2">Completed</div>
                <div className="text-xs text-gray-500">Successfully processed</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">⏳</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {summary.pending_count}
                </div>
                <div className="text-sm text-gray-600 mb-2">Pending</div>
                <div className="text-xs text-gray-500">Awaiting confirmation</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border-2 border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">✗</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {summary.failed_count}
                </div>
                <div className="text-sm text-gray-600 mb-2">Failed</div>
                <div className="text-xs text-gray-500">Transaction errors</div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200">
          <div className="p-6 border-b-2 border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Transactions
                {searchTerm && ` (${filteredTransactions.length} of ${pagination.total})`}
                {!searchTerm && ` (${pagination.total})`}
              </h3>
              {!loading && transactions.length > 0 && (
                <div className="text-sm text-gray-500 font-medium">
                  Page {pagination.current_page} of {pagination.last_page}
                </div>
              )}
            </div>
          </div>          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-600 dark:text-red-400 text-5xl mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
              <button
                onClick={() => loadData(currentPage)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 dark:text-gray-600 text-6xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                {searchTerm ? 'No transactions match your search' : 'No transactions found'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {searchTerm ? 'Try adjusting your search terms' : 'Your transaction history will appear here'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date & ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-blue-50/30 transition-all duration-150">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-gray-900">
                          {formatDateTime(tx.created_at)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 font-mono">
                          {tx.transaction_id.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${getTransactionTypeColor(tx.type)}`}>
                            {getTransactionTypeLabel(tx.type)}
                          </span>
                          {isCredit(tx) ? (
                            <span className="text-green-600 text-sm font-bold">↓</span>
                          ) : (
                            <span className="text-red-600 text-sm font-bold">↑</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-md">
                        <div className="space-y-1">
                          {getTransactionDescription(tx).map((desc, idx) => (
                            <div key={idx} className="text-gray-700 font-medium">
                              {desc}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`font-bold text-lg ${isCredit(tx) ? 'text-green-600' : 'text-red-600'}`}>
                          {isCredit(tx) ? '+' : '-'}{formatTaka(tx.amount_cents / 100)}
                        </div>
                        {tx.meta?.platform_fee_cents && (
                          <div className="text-xs text-gray-500 mt-1">
                            Platform fee: {formatTaka(tx.meta.platform_fee_cents / 100)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(tx.status)}`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                          {tx.status === 'failed' && tx.meta?.error && (
                            <span className="text-xs text-red-600 font-medium" title={tx.meta.error}>
                              ⚠️ Error
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y dark:divide-gray-700">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(tx.type)}`}>
                        {getTransactionTypeLabel(tx.type)}
                      </span>
                      {isCredit(tx) ? (
                        <span className="text-green-600 dark:text-green-400 text-xs">↓</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-xs">↑</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>

                  <div className={`text-lg font-bold mb-2 ${isCredit(tx) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCredit(tx) ? '+' : '-'}{formatTaka(tx.amount_cents / 100)}
                  </div>

                  <div className="space-y-1 mb-2">
                    {getTransactionDescription(tx).map((desc, idx) => (
                      <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        {desc}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDateTime(tx.created_at)}</span>
                    <span className="truncate ml-2">ID: {tx.transaction_id.substring(0, 10)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}

          {/* Pagination */}
          {!loading && !error && pagination.last_page > 1 && (
            <div className="p-6 border-t-2 border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="text-sm text-gray-600 font-medium">
                Page {pagination.current_page} of {pagination.last_page}
              </div>
              <div className="flex gap-3">
                {pagination.current_page > 1 && (
                  <Link
                    href={`/wallet/transactions?page=${pagination.current_page - 1}`}
                    className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium shadow-sm"
                  >
                    Previous
                  </Link>
                )}
                {pagination.current_page < pagination.last_page && (
                  <Link
                    href={`/wallet/transactions?page=${pagination.current_page + 1}`}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
