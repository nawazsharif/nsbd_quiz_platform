'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/dashboard/PageHeader'
import { authAPI } from '@/lib/auth-utils'
import BookmarkButton from '@/components/ui/BookmarkButton'
import { Star, ShoppingCart, Filter, X, UserPlus, Play, LineChart } from 'lucide-react'
import { formatTaka, stripHtmlTags } from '@/lib/utils'

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
      setError(e.message || 'Failed to load quizzes')
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

        // After enrollment, check if user has completed attempts
        checkCompletedAttempts([quizId])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to enroll in quiz')
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Quizzes" subtitle="Explore available quizzes" />
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-medium"><Filter className="w-4 h-4"/> Filters</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quizzes..." className="h-10 px-3 rounded-md border text-gray-900 flex-1 min-w-[200px]" />
          <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="h-10 px-3 rounded-md border text-gray-900">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={priceType} onChange={e=>setPriceType(e.target.value as any)} className="h-10 px-3 rounded-md border text-gray-900">
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
          <select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="h-10 px-3 rounded-md border text-gray-900">
            <option value="">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select value={minRating} onChange={e=>setMinRating(Number(e.target.value))} className="h-10 px-3 rounded-md border text-gray-900">
            <option value={0}>Any Rating</option>
            <option value={4.5}>4.5+</option>
            <option value={4}>4.0+</option>
            <option value={3.5}>3.5+</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="h-10 px-3 rounded-md border text-gray-900">
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-xl p-6">
          <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-full bg-slate-200 rounded mb-2" />
                <div className="h-3 w-5/6 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">No quizzes found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((q) => (
            <div key={q.id} className="group relative bg-white rounded-2xl border border-gray-200 hover:shadow-xl transition-all overflow-hidden">
              <div className="absolute top-3 right-3 z-10"><BookmarkButton quizId={q.id} /></div>
              <div className="p-4 pr-14">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/quiz/${q.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">{stripHtmlTags(q.title)}</h3>
                  </Link>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${q.is_paid && Number(q.price_cents||0)>0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{priceText(q)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  {q.difficulty && <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 capitalize">{q.difficulty}</span>}
                  {q.category?.name && <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100">{q.category.name}</span>}
                </div>
                {q.description && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{stripHtmlTags(q.description)}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center text-amber-500 text-sm">
                    <Star className="w-4 h-4 mr-1 fill-amber-400" />
                    <span>{Number(q.rating_avg ?? 0).toFixed(1)}</span>
                    <span className="ml-1 text-gray-500">({q.rating_count ?? 0})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>openPreview(q.id)} className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Details</button>
                    {!token ? (
                      <Link href="/auth/signin" className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                        <UserPlus className="w-4 h-4 mr-1"/> Sign In
                      </Link>
                    ) : enrollmentStatuses[q.id] ? (
                      completedAttempts[q.id] ? (
                        <Link href={`/quiz/${q.id}/results`} className="inline-flex items-center h-9 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                          <LineChart className="w-4 h-4 mr-1"/> Results
                        </Link>
                      ) : (
                        <Link href={`/quiz/${q.id}/take`} className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                          <Play className="w-4 h-4 mr-1"/> Start
                        </Link>
                      )
                    ) : q.is_paid && Number(q.price_cents || 0) > 0 ? (
                      <button
                        onClick={() => handleEnroll(q.id)}
                        disabled={enrolling[q.id]}
                        className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1"/>
                    {enrolling[q.id] ? 'Enrolling...' : `Enroll ${formatTaka(Number(q.price_cents || 0), { fromCents: true })}`}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(q.id)}
                        disabled={enrolling[q.id]}
                        className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <UserPlus className="w-4 h-4 mr-1"/>
                        {enrolling[q.id] ? 'Enrolling...' : 'Enroll (Free)'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setPreview(null)} />
          <div className="relative bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-xl border p-6">
            <button onClick={()=>setPreview(null)} className="absolute top-3 right-3 h-8 w-8 rounded-full border hover:bg-gray-50 flex items-center justify-center"><X className="w-4 h-4"/></button>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-gray-900">{stripHtmlTags((preview as any)?.title)}</h3>
              <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${preview?.is_paid && Number(preview?.price_cents||0)>0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{priceText(preview as any)}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">{stripHtmlTags((preview as any)?.description)}</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-slate-600 text-xs font-medium">Difficulty</div>
                <div className="font-semibold text-slate-900 capitalize mt-1">{(preview as any)?.difficulty || '—'}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-slate-600 text-xs font-medium">Category</div>
                <div className="font-semibold text-slate-900 mt-1">{(preview as any)?.category?.name || '—'}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-slate-600 text-xs font-medium">Rating</div>
                <div className="font-semibold flex items-center text-amber-500 mt-1"><Star className="w-4 h-4 mr-1 fill-amber-400"/>{Number((preview as any)?.rating_avg||0).toFixed(1)} <span className="ml-1 text-slate-600">({(preview as any)?.rating_count||0})</span></div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-slate-600 text-xs font-medium">Total Questions</div>
                <div className="font-semibold text-slate-900 mt-1">{(preview as any)?.totalQuestions ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-3 col-span-2">
                <div className="text-slate-600 text-xs font-medium">Marking Scheme</div>
                <div className="font-semibold text-slate-900 mt-1">Total Marks: {(preview as any)?.total_marks ?? '—'} {((preview as any)?.negative_marking) ? `• Negative marking enabled (${(preview as any)?.negative_mark_value ?? ''})` : '• No negative marking'}</div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Link href={`/quiz/${(preview as any)?.id}`} className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Full Details</Link>
              {!token ? (
                <Link href="/auth/signin" className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                  <UserPlus className="w-4 h-4 mr-1"/> Sign In
                </Link>
              ) : enrollmentStatuses[(preview as any)?.id] ? (
                completedAttempts[(preview as any)?.id] ? (
                  <Link href={`/quiz/${(preview as any)?.id}/results`} className="inline-flex items-center h-9 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                    <LineChart className="w-4 h-4 mr-1"/> View Results
                  </Link>
                ) : (
                  <Link href={`/quiz/${(preview as any)?.id}/take`} className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                    <Play className="w-4 h-4 mr-1"/> Start
                  </Link>
                )
              ) : preview?.is_paid && Number(preview?.price_cents || 0) > 0 ? (
                <button
                  onClick={() => handleEnroll((preview as any)?.id)}
                  disabled={enrolling[(preview as any)?.id]}
                  className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-1"/>
                  {enrolling[(preview as any)?.id] ? 'Enrolling...' : `Enroll ${formatTaka(Number(preview?.price_cents || 0), { fromCents: true })}`}
                </button>
              ) : (
                <button
                  onClick={() => handleEnroll((preview as any)?.id)}
                  disabled={enrolling[(preview as any)?.id]}
                  className="inline-flex items-center h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 mr-1"/>
                  {enrolling[(preview as any)?.id] ? 'Enrolling...' : 'Enroll (Free)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
