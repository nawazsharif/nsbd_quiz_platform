'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/dashboard/PageHeader'
import { authAPI } from '@/lib/auth-utils'
import BookmarkButton from '@/components/ui/BookmarkButton'
import { Star, ShoppingCart, Filter, X, UserPlus, Play, LineChart, Grid3x3, List, Clock, Target, TrendingUp, ChevronDown } from 'lucide-react'
import { formatTaka, stripHtmlTags } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

type Quiz = {
  id: number
  title: string
  description?: string
  difficulty?: string
  is_paid?: boolean
  price_cents?: number | null
  category_id?: number | null
  category?: { id: number; name: string }
  rating_avg?: number | null
  rating_count?: number | null
  created_at?: string
}

export default function PublicQuizzesPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { success, error: showError } = useToast()

  const [items, setItems] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [preview, setPreview] = useState<Quiz | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [enrollmentStatuses, setEnrollmentStatuses] = useState<Record<number, boolean>>({})
  const [completedAttempts, setCompletedAttempts] = useState<Record<number, boolean>>({})
  const [enrolling, setEnrolling] = useState<Record<number, boolean>>({})

  // Filters
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priceType, setPriceType] = useState<'all'|'free'|'paid'>('all')
  const [difficulty, setDifficulty] = useState<string>('')
  const [minRating, setMinRating] = useState<number>(0)
  const [sortBy, setSortBy] = useState<'newest'|'rating'|'price_low'|'price_high'>('newest')

  // View mode
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getQuizzes(1, 40)
      const list = (res?.data?.data ?? res?.data ?? res) as any
      setItems((list?.data ?? list) as Quiz[])

      // Check enrollment statuses for logged-in users
      if (token && items.length > 0) {
        checkEnrollmentStatuses(items)
      }

      // categories (best-effort)
      try {
        const catRes = await authAPI.getCategories(undefined, 1, 100)
        const catList = (catRes?.data?.data ?? catRes?.data ?? catRes) as any
        let cats = (catList?.data ?? catList) as Array<any>
        if (Array.isArray(cats)) {
          // Normalize to {id, name}
          cats = cats.map((c:any)=>({ id: c.id, name: c.name }))
          setCategories(cats)
        }
      } catch {}
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to load quizzes'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollmentStatuses = async (quizzes: Quiz[]) => {
    if (!token) return

    const statuses: Record<number, boolean> = {}
    const enrolledQuizIds: number[] = []

    for (const quiz of quizzes) {
      try {
        const enrollment = await authAPI.checkQuizEnrollment(token, quiz.id)
        statuses[quiz.id] = enrollment.enrolled
        if (enrollment.enrolled) {
          enrolledQuizIds.push(quiz.id)
        }
      } catch (error) {
        console.warn(`Failed to check enrollment for quiz ${quiz.id}:`, error)
        statuses[quiz.id] = false
      }
    }

    setEnrollmentStatuses(statuses)

    // For enrolled quizzes, check if they have completed attempts
    if (enrolledQuizIds.length > 0) {
      checkCompletedAttempts(enrolledQuizIds)
    }
  }

  const checkCompletedAttempts = async (quizIds: number[]) => {
    if (!token) return

    const completedMap: Record<number, boolean> = {}

    for (const quizId of quizIds) {
      try {
        const { attempts } = await authAPI.getUserQuizAttempts(token, quizId)
        const completedAttempt = attempts?.find((attempt: any) => {
          const attemptQuizId = Number(attempt.quizId ?? attempt.quiz_id ?? attempt.quizID)
          return attempt.status === 'completed' && attemptQuizId === quizId
        })
        completedMap[quizId] = !!completedAttempt
      } catch (error) {
        console.warn(`Failed to check attempts for quiz ${quizId}:`, error)
        completedMap[quizId] = false
      }
    }

    setCompletedAttempts(completedMap)
  }

  const handleEnroll = async (quizId: number) => {
    if (!token) return

    setEnrolling(prev => ({ ...prev, [quizId]: true }))
    try {
      const result = await authAPI.enrollQuiz(token, quizId)
      if (result.status === 'enrolled' || result.status === 'purchased' || result.status === 'automatic_access') {
        setEnrollmentStatuses(prev => ({ ...prev, [quizId]: true }))
        success('Successfully enrolled in quiz!')

        // After enrollment, check if user has completed attempts
        checkCompletedAttempts([quizId])
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to enroll in quiz'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setEnrolling(prev => ({ ...prev, [quizId]: false }))
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (token && items.length > 0) {
      checkEnrollmentStatuses(items)
    }
  }, [token, items])

  const filtered = useMemo(() => {
    let arr = [...items]
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(it => (it.title || '').toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q))
    }
    if (categoryId) {
      const cid = Number(categoryId)
      arr = arr.filter(it => it.category_id === cid || it.category?.id === cid)
    }
    if (priceType !== 'all') {
      arr = arr.filter(it => priceType === 'free' ? !it.is_paid || !Number(it.price_cents) : (it.is_paid && Number(it.price_cents || 0) > 0))
    }
    if (difficulty) {
      arr = arr.filter(it => (it.difficulty || '').toLowerCase() === difficulty)
    }
    if (minRating > 0) {
      arr = arr.filter(it => Number(it.rating_avg || 0) >= minRating)
    }
    // sort
    arr.sort((a,b)=>{
      if (sortBy === 'rating') return (Number(b.rating_avg||0) - Number(a.rating_avg||0))
      if (sortBy === 'price_low') return (Number(a.price_cents||0) - Number(b.price_cents||0))
      if (sortBy === 'price_high') return (Number(b.price_cents||0) - Number(a.price_cents||0))
      const ad = new Date(a.created_at || 0).getTime()
      const bd = new Date(b.created_at || 0).getTime()
      return bd - ad
    })
    return arr
  }, [items, search, categoryId, priceType, difficulty, minRating, sortBy])

  const priceText = (q: Quiz) => (q.is_paid && Number(q.price_cents || 0) > 0) ? formatTaka(Number(q.price_cents || 0), { fromCents: true }) : 'Free'
  const openPreview = async (quizId: number) => {
    setPreviewLoading(true)
    try {
      const data = await authAPI.getQuiz(quizId, token)
      // Best-effort: also try to get question count
      let totalQuestions: number | undefined
      try {
        const qs = await authAPI.listQuestions(quizId, token)
        totalQuestions = Array.isArray(qs) ? qs.length : (qs?.data?.length || qs?.total || undefined)
      } catch {}
      setPreview({ ...(data as any), totalQuestions } as any)
    } catch (e) {
      // fallback: use existing item if present
      const found = items.find(i => i.id === quizId)
      if (found) setPreview(found)
    } finally { setPreviewLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Explore Quizzes</h1>
          <p className="text-slate-600 text-lg">Discover and take quizzes to test your knowledge</p>
        </div>

        {/* Unauthenticated User Banner */}
        {!token && (
          <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Sign in to unlock full features</h3>
                <p className="text-slate-600 text-sm">Create an account or sign in to enroll in quizzes, track your progress, and earn certificates.</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all shadow-sm"
                >
                  <UserPlus className="w-5 h-5" />
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium transition-all"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
        </div>}

        {/* Search and View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search quizzes by title or description..."
              className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all"
            >
              <Filter className="w-4 h-4"/>
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Grid View"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mb-6 bg-white border-2 border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Price</label>
                <select value={priceType} onChange={e=>setPriceType(e.target.value as any)} className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900">
                  <option value="all">All Quizzes</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Paid Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Difficulty</label>
                <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900">
                  <option value="">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Rating</label>
                <select value={minRating} onChange={e=>setMinRating(Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900">
                  <option value={0}>Any Rating</option>
                  <option value={4.5}>4.5★ & above</option>
                  <option value={4}>4.0★ & above</option>
                  <option value={3.5}>3.5★ & above</option>
                  <option value={3}>3.0★ & above</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-slate-600">
            <span className="font-semibold text-slate-900">{filtered.length}</span> {filtered.length === 1 ? 'quiz' : 'quizzes'} found
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Sort by:</label>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="h-10 px-3 rounded-lg border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-white">
              <option value="newest">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Quiz Display */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border-2 border-slate-200 p-6 animate-pulse">
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                <div className="h-4 w-5/6 bg-slate-200 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-slate-200 rounded" />
                  <div className="h-8 w-24 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 rounded-xl p-16 text-center">
            <Target className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No quizzes found</h3>
            <p className="text-slate-700 text-lg">Try adjusting your filters or search terms</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((q) => (
              <div key={q.id} className="group relative bg-white rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-3 right-3 z-10">
                  <BookmarkButton quizId={q.id} />
                </div>
                <div className="p-6">
                  <div className="mb-3">
                    <Link href={`/quiz/${q.id}`}>
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2 pr-8">
                        {stripHtmlTags(q.title)}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                      {q.difficulty && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                      {q.category?.name && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {q.category.name}
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${q.is_paid && Number(q.price_cents||0)>0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {priceText(q)}
                      </span>
                    </div>
                  </div>

                  {q.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {stripHtmlTags(q.description)}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center text-amber-500 font-semibold">
                      <Star className="w-4 h-4 mr-1 fill-amber-400" />
                      <span>{Number(q.rating_avg ?? 0).toFixed(1)}</span>
                      <span className="ml-1 text-slate-400 text-sm">({q.rating_count ?? 0})</span>
                    </div>
                    <button
                      onClick={()=>openPreview(q.id)}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Details →
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {!token ? (
                      <Link href="/auth/signin" className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                        <UserPlus className="w-4 h-4"/> Sign In
                      </Link>
                    ) : enrollmentStatuses[q.id] ? (
                      completedAttempts[q.id] ? (
                        <Link href={`/quiz/${q.id}/results`} className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all">
                          <LineChart className="w-4 h-4"/> Results
                        </Link>
                      ) : (
                        <Link href={`/quiz/${q.id}/take`} className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                          <Play className="w-4 h-4"/> Start
                        </Link>
                      )
                    ) : (
                      <button
                        onClick={() => handleEnroll(q.id)}
                        disabled={enrolling[q.id]}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                      >
                        {q.is_paid && Number(q.price_cents || 0) > 0 ? (
                          <><ShoppingCart className="w-4 h-4"/>{enrolling[q.id] ? 'Enrolling...' : 'Enroll'}</>
                        ) : (
                          <><UserPlus className="w-4 h-4"/>{enrolling[q.id] ? 'Enrolling...' : 'Enroll Free'}</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <div key={q.id} className="group bg-white rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/quiz/${q.id}`} className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors mb-2">
                            {stripHtmlTags(q.title)}
                          </h3>
                        </Link>
                        <div className="ml-4">
                          <BookmarkButton quizId={q.id} />
                        </div>
                      </div>

                      {q.description && (
                        <p className="text-slate-600 mb-3 line-clamp-2">
                          {stripHtmlTags(q.description)}
                        </p>
                      )}

                      <div className="flex items-center gap-4 flex-wrap">
                        {q.difficulty && (
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                            q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        )}
                        {q.category?.name && (
                          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                            {q.category.name}
                          </span>
                        )}
                        <div className="flex items-center text-amber-500 font-semibold">
                          <Star className="w-4 h-4 mr-1 fill-amber-400" />
                          <span>{Number(q.rating_avg ?? 0).toFixed(1)}</span>
                          <span className="ml-1 text-slate-400 text-sm">({q.rating_count ?? 0})</span>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${q.is_paid && Number(q.price_cents||0)>0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {priceText(q)}
                        </span>
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2 lg:w-48">
                      <button
                        onClick={()=>openPreview(q.id)}
                        className="flex-1 lg:flex-none h-10 px-4 rounded-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-all"
                      >
                        Details
                      </button>
                      {!token ? (
                        <Link href="/auth/signin" className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                          <UserPlus className="w-4 h-4"/> Sign In
                        </Link>
                      ) : enrollmentStatuses[q.id] ? (
                        completedAttempts[q.id] ? (
                          <Link href={`/quiz/${q.id}/results`} className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all">
                            <LineChart className="w-4 h-4"/> Results
                          </Link>
                        ) : (
                          <Link href={`/quiz/${q.id}/take`} className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                            <Play className="w-4 h-4"/> Start Quiz
                          </Link>
                        )
                      ) : (
                        <button
                          onClick={() => handleEnroll(q.id)}
                          disabled={enrolling[q.id]}
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                        >
                          {q.is_paid && Number(q.price_cents || 0) > 0 ? (
                            <><ShoppingCart className="w-4 h-4"/>{enrolling[q.id] ? 'Enrolling...' : 'Enroll'}</>
                          ) : (
                            <><UserPlus className="w-4 h-4"/>{enrolling[q.id] ? 'Enrolling...' : 'Enroll Free'}</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={()=>setPreview(null)} />
            <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border-2 border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between z-10">
                <div className="flex-1 pr-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{stripHtmlTags((preview as any)?.title)}</h3>
                  {(preview as any)?.description && (
                    <p className="text-slate-600">{stripHtmlTags((preview as any)?.description)}</p>
                  )}
                </div>
                <button
                  onClick={()=>setPreview(null)}
                  className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600 mb-1">Difficulty</div>
                    <div className={`text-lg font-bold capitalize ${
                      (preview as any)?.difficulty === 'easy' ? 'text-green-600' :
                      (preview as any)?.difficulty === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {(preview as any)?.difficulty || '—'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600 mb-1">Category</div>
                    <div className="text-lg font-bold text-slate-900">{(preview as any)?.category?.name || '—'}</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="text-xs font-medium text-amber-700 mb-1">Rating</div>
                    <div className="flex items-center text-lg font-bold text-amber-600">
                      <Star className="w-5 h-5 mr-1 fill-amber-400" />
                      {Number((preview as any)?.rating_avg||0).toFixed(1)}
                      <span className="ml-2 text-sm text-slate-600">({(preview as any)?.rating_count||0} reviews)</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="text-xs font-medium text-emerald-700 mb-1">Price</div>
                    <div className="text-lg font-bold text-emerald-600">{priceText(preview as any)}</div>
                  </div>
                </div>

                {((preview as any)?.totalQuestions || (preview as any)?.total_marks) && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                    <div className="text-sm font-medium text-slate-600 mb-2">Quiz Details</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {(preview as any)?.totalQuestions && (
                        <div>
                          <span className="text-slate-600">Total Questions:</span>
                          <span className="ml-2 font-bold text-slate-900">{(preview as any)?.totalQuestions}</span>
                        </div>
                      )}
                      {(preview as any)?.total_marks && (
                        <div>
                          <span className="text-slate-600">Total Marks:</span>
                          <span className="ml-2 font-bold text-slate-900">{(preview as any)?.total_marks}</span>
                        </div>
                      )}
                    </div>
                    {(preview as any)?.negative_marking && (
                      <div className="mt-2 text-sm text-slate-600">
                        ⚠️ Negative marking enabled: {(preview as any)?.negative_mark_value || 'Yes'}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/quiz/${(preview as any)?.id}`}
                    className="flex-1 h-11 px-4 rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-all flex items-center justify-center"
                  >
                    View Full Details
                  </Link>
                  {!token ? (
                    <Link href="/auth/signin" className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                      <UserPlus className="w-5 h-5"/> Sign In to Enroll
                    </Link>
                  ) : enrollmentStatuses[(preview as any)?.id] ? (
                    completedAttempts[(preview as any)?.id] ? (
                      <Link href={`/quiz/${(preview as any)?.id}/results`} className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all">
                        <LineChart className="w-5 h-5"/> View Results
                      </Link>
                    ) : (
                      <Link href={`/quiz/${(preview as any)?.id}/take`} className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition-all">
                        <Play className="w-5 h-5"/> Start Quiz
                      </Link>
                    )
                  ) : (
                    <button
                      onClick={() => handleEnroll((preview as any)?.id)}
                      disabled={enrolling[(preview as any)?.id]}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                    >
                      {preview?.is_paid && Number(preview?.price_cents || 0) > 0 ? (
                        <><ShoppingCart className="w-5 h-5"/>{enrolling[(preview as any)?.id] ? 'Enrolling...' : `Enroll for ${formatTaka(Number(preview?.price_cents || 0), { fromCents: true })}`}</>
                      ) : (
                        <><UserPlus className="w-5 h-5"/>{enrolling[(preview as any)?.id] ? 'Enrolling...' : 'Enroll Free'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
