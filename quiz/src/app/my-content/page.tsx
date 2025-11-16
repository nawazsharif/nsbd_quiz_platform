'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/dashboard/PageHeader'
import { authAPI } from '@/lib/auth-utils'

interface Quiz {
  id: number
  title: string
  description: string
  status: 'draft' | 'published'
  visibility: 'public' | 'private'
  is_paid: boolean
  price_cents: number
  questions_count: number
  difficulty: string
  created_at: string
}

interface QuizRevenue {
  quiz_id: number
  revenue_cents: number
  sales_count: number
}

export default function MyContentPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizRevenue, setQuizRevenue] = useState<Record<number, QuizRevenue>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'quizzes' | 'courses'>('quizzes')

  useEffect(() => {
    if (token) {
      fetchMyContent()
    }
  }, [token])

  const fetchMyContent = async () => {
    if (!token) return

    setLoading(true)
    try {
      // Fetch user's quizzes (all pages - pass page=1, perPage=100, no search, with token)
      const quizzesResponse = await authAPI.getQuizzes(1, 100, undefined, token)
      const userQuizzes = quizzesResponse.data.filter((q: Quiz) => q)
      setQuizzes(userQuizzes)

      // Fetch revenue for each quiz
      const revenueResponse = await authAPI.getMyQuizRevenue(token, { per_page: 1000 })

      // Group revenue by quiz_id
      const revenueMap: Record<number, QuizRevenue> = {}
      if (revenueResponse.data) {
        revenueResponse.data.forEach((tx: any) => {
          const quizId = tx.meta?.quiz_id
          if (quizId) {
            if (!revenueMap[quizId]) {
              revenueMap[quizId] = {
                quiz_id: quizId,
                revenue_cents: 0,
                sales_count: 0
              }
            }
            revenueMap[quizId].revenue_cents += tx.amount_cents
            revenueMap[quizId].sales_count += 1
          }
        })
      }
      setQuizRevenue(revenueMap)
    } catch (error) {
      console.error('Failed to fetch content:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTaka = (cents: number) => {
    return `৳${(cents / 100).toFixed(2)}`
  }

  const stripHtmlTags = (html: string) => {
    // Remove HTML tags and decode common entities
    return html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace &amp; with &
      .replace(/&lt;/g, '<')   // Replace &lt; with <
      .replace(/&gt;/g, '>')   // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'")  // Replace &#39; with '
      .trim()
  }

  const totalRevenue = Object.values(quizRevenue).reduce((sum, rev) => sum + rev.revenue_cents, 0)
  const totalSales = Object.values(quizRevenue).reduce((sum, rev) => sum + rev.sales_count, 0)
  const publishedCount = quizzes.filter(q => q.status === 'published').length
  const draftCount = quizzes.filter(q => q.status === 'draft').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="My Content" subtitle="Create and manage your educational content" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border-2 border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{formatTaka(totalRevenue)}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🎯</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{quizzes.length}</div>
            <div className="text-sm text-gray-600">Total Quizzes</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{publishedCount}</div>
            <div className="text-sm text-gray-600">Published</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">📝</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{draftCount}</div>
            <div className="text-sm text-gray-600">Drafts</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quiz/create"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm"
            >
              + Create New Quiz
            </Link>
            <Link
              href="/course/create"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              + Create New Course
            </Link>
            <Link
              href="/dashboard/revenue"
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              📊 View Revenue Details
            </Link>
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
                🎯 My Quizzes ({quizzes.length})
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`px-6 py-4 font-bold border-b-4 transition-colors ${
                  activeTab === 'courses'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📚 My Courses
              </button>
            </div>
          </div>

          {/* Quizzes Tab Content */}
          {activeTab === 'quizzes' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  <p className="mt-4 text-gray-600">Loading your quizzes...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🎯</div>
                  <p className="text-gray-500 text-lg font-medium mb-4">No quizzes yet</p>
                  <p className="text-gray-400 text-sm mb-6">Create your first quiz to get started!</p>
                  <Link
                    href="/quiz/create"
                    className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Create Your First Quiz
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const revenue = quizRevenue[quiz.id]
                    return (
                      <div
                        key={quiz.id}
                        className="bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-200 p-6 hover:border-emerald-300 transition-all duration-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Quiz Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <div className="flex-1">
                                <Link
                                  href={`/quiz/builder/${quiz.id}`}
                                  className="text-xl font-bold text-gray-900 hover:text-emerald-600 transition-colors"
                                >
                                  {quiz.title}
                                </Link>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      quiz.status === 'published'
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                    }`}
                                  >
                                    {quiz.status === 'published' ? '✓ Published' : '📝 Draft'}
                                  </span>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      quiz.is_paid
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                                    }`}
                                  >
                                    {quiz.is_paid ? `💰 Paid ${formatTaka(quiz.price_cents)}` : '🆓 Free'}
                                  </span>
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                                    {quiz.questions_count} Questions
                                  </span>
                                </div>
                              </div>
                            </div>
                            {quiz.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{stripHtmlTags(quiz.description)}</p>
                            )}
                          </div>

                          {/* Revenue Stats */}
                          {quiz.is_paid && quiz.status === 'published' && (
                            <div className="flex gap-4 lg:flex-col lg:items-end">
                              <div className="text-center lg:text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  {formatTaka(revenue?.revenue_cents || 0)}
                                </div>
                                <div className="text-xs text-gray-500">Revenue Earned</div>
                              </div>
                              <div className="text-center lg:text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  {revenue?.sales_count || 0}
                                </div>
                                <div className="text-xs text-gray-500">Total Sales</div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 lg:flex-col">
                            <Link
                              href={`/quiz/builder/${quiz.id}`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              ✏️ Edit
                            </Link>
                            {quiz.status === 'published' && (
                              <Link
                                href={`/quiz/${quiz.id}`}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                              >
                                👁️ View
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Courses Tab Content */}
          {activeTab === 'courses' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <p className="text-gray-500 text-lg font-medium mb-4">Courses section coming soon</p>
                <p className="text-gray-400 text-sm mb-6">You'll be able to manage your courses here.</p>
                <Link
                  href="/dashboard/courses"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Courses Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
