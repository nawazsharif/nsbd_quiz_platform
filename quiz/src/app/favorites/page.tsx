'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Heart, BookOpen, Clock, DollarSign, GraduationCap, Info } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import BookmarkButton from '@/components/ui/BookmarkButton'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka, stripHtmlTags } from '@/lib/utils'

type Quiz = {
  id: number
  title: string
  description?: string
  difficulty?: string
  is_paid?: boolean
  price_cents?: number | null
  timer_seconds?: number
  questions_count?: number
  created_at?: string
}

type Bookmark = {
  id: number
  user_id: number
  quiz_id: number
  created_at: string
  updated_at: string
  quiz: Quiz
}

export default function FavoritesPage() {
  const { data: session, status } = useSession()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (status === 'loading') return
    if (!session) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const token = (session as any)?.accessToken as string
      const res = await authAPI.getBookmarkedQuizzes(token)

      // The API returns paginated data with bookmarks containing quiz objects
      const bookmarks = res?.data || []
      const quizzes = bookmarks.map((bookmark: Bookmark) => bookmark.quiz).filter(Boolean)

      setQuizzes(quizzes)
    } catch (e: any) {
      setError(e.message || 'Failed to load bookmarked quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleBookmarkRemoved = (quizId: number) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId))
  }

  useEffect(() => {
    if (session) {
      load()
    }
  }, [session, status])

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader title="My Favorites" subtitle="Your bookmarked content" />
        <div className="bg-white border rounded-xl p-6">
          <div className="text-slate-600">Loading your favorites...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Favorites" subtitle="Your bookmarked content" />
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">
          <Heart className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <div className="text-xl font-semibold text-slate-800 mb-2">Sign in to view favorites</div>
          <p className="mb-4">You need to be signed in to see your bookmarked content.</p>
          <Link href="/auth/signin" className="inline-flex h-9 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="Favorites" subtitle="Your bookmarked content" />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Course Bookmarks Section */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">Bookmarked Courses</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Course bookmarks coming soon!</p>
            <p>Course bookmark functionality is not yet implemented. For now, you can view your enrolled courses in the <Link href="/learning" className="underline hover:no-underline">My Learning</Link> section.</p>
          </div>
        </div>
      </div>

      {/* Quiz Bookmarks Section */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">Bookmarked Quizzes</h2>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <Heart className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <div className="text-lg font-medium text-slate-800 mb-2">No bookmarked quizzes yet</div>
            <p className="mb-4">Start exploring quizzes and bookmark your favorites to see them here.</p>
            <Link href="/quizzes" className="inline-flex h-9 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
              Browse Quizzes
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link href={`/quizzes/${quiz.id}`} className="text-lg font-semibold text-slate-800 hover:text-emerald-600 line-clamp-2">
                      {stripHtmlTags(quiz.title)}
                    </Link>
                    {quiz.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{stripHtmlTags(quiz.description)}</p>
                    )}
                  </div>
                  <BookmarkButton
                    quizId={quiz.id}
                    onBookmarkChange={(isBookmarked) => {
                      if (!isBookmarked) {
                        handleBookmarkRemoved(quiz.id)
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  {quiz.difficulty && (
                    <span className="capitalize">{quiz.difficulty}</span>
                  )}
                  {quiz.questions_count && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {quiz.questions_count} questions
                    </span>
                  )}
                  {quiz.timer_seconds && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(quiz.timer_seconds / 60)}min
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {quiz.is_paid ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {formatTaka(Number(quiz.price_cents || 0), { fromCents: true })}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Free</span>
                    )}
                  </div>
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View Quiz →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
