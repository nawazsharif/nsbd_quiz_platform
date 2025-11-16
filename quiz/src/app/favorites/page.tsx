'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Heart, BookOpen, Clock, DollarSign, GraduationCap, Info, Play, Star } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import BookmarkButton from '@/components/ui/BookmarkButton'
import CourseBookmarkButton from '@/components/ui/CourseBookmarkButton'
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

type Course = {
  id: number
  title: string
  summary?: string
  cover_url?: string
  is_paid?: boolean
  price_cents?: number | null
  rating_avg?: number
  rating_count?: number
}

export default function FavoritesPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<'quizzes' | 'courses'>('quizzes')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadQuizzes = async () => {
    if (status === 'loading' || !session) return

    setLoading(true)
    setError('')
    try {
      const token = (session as any)?.accessToken as string
      const res = await authAPI.getBookmarkedQuizzes(token)
      const bookmarks = res?.data || []
      const quizzes = bookmarks.map((bookmark: Bookmark) => bookmark.quiz).filter(Boolean)
      setQuizzes(quizzes)
    } catch (e: any) {
      setError(e.message || 'Failed to load bookmarked quizzes')
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    if (status === 'loading' || !session) return

    setLoading(true)
    setError('')
    try {
      const token = (session as any)?.accessToken as string
      const res = await authAPI.getBookmarkedCourses(token)
      const bookmarks = res?.data || []
      const courses = bookmarks.map((bookmark: any) => bookmark.course).filter(Boolean)
      setCourses(courses)
    } catch (e: any) {
      setError(e.message || 'Failed to load bookmarked courses')
    } finally {
      setLoading(false)
    }
  }

  const handleQuizBookmarkRemoved = (quizId: number) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId))
  }

  const handleCourseBookmarkRemoved = (courseId: number) => {
    setCourses(prev => prev.filter(course => course.id !== courseId))
  }

  useEffect(() => {
    if (session) {
      if (activeTab === 'quizzes') {
        loadQuizzes()
      } else {
        loadCourses()
      }
    }
  }, [session, status, activeTab])

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
                <div className="bg-white border rounded-xl p-8 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Sign in to view favorites</h2>
          <p className="text-slate-600 mb-4">Save your favorite quizzes for quick access later</p>
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

      {/* Tabs */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'quizzes'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span>Quizzes ({quizzes.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'courses'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              <span>Courses ({courses.length})</span>
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'quizzes' ? (
            /* Quiz Bookmarks Section */
            <div>
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
                        handleQuizBookmarkRemoved(quiz.id)
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
          ) : (
            /* Course Bookmarks Section */
            <div>
              {courses.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <Play className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <div className="text-lg font-medium text-slate-800 mb-2">No bookmarked courses yet</div>
                  <p className="mb-4">Start exploring courses and bookmark your favorites to see them here.</p>
                  <Link href="/courses" className="inline-flex h-9 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                    Browse Courses
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => {
                    const isPaid = course.is_paid && Number(course.price_cents ?? 0) > 0;
                    const priceText = isPaid ? formatTaka(Number(course.price_cents ?? 0), { fromCents: true }) : 'Free';

                    return (
                      <div key={course.id} className="group bg-white rounded-xl border border-gray-200 hover:shadow-xl transition-all overflow-hidden">
                        <Link href={`/courses/${course.id}`} className="block">
                          <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={course.cover_url || '/window.svg'}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
                              <CourseBookmarkButton
                                courseId={course.id}
                                onBookmarkChange={(isBookmarked) => {
                                  if (!isBookmarked) {
                                    handleCourseBookmarkRemoved(course.id)
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
                              <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                {priceText}
                              </span>
                            </div>
                            {course.summary && (
                              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{course.summary}</p>
                            )}
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center text-amber-500 text-sm">
                                <Star className="w-4 h-4 mr-1 fill-amber-400" />
                                <span>{Number(course.rating_avg ?? 0).toFixed(1)}</span>
                                <span className="ml-1 text-gray-500">({course.rating_count ?? 0})</span>
                              </div>
                              <span className="inline-flex items-center text-emerald-600 text-sm font-medium">
                                <Play className="w-4 h-4 mr-1" /> View Course
                              </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
