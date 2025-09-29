'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'
import ReviewSection from '@/components/quiz/ReviewSection'
import ShareQuiz from '@/components/quiz/ShareQuiz'
import BookmarkButton from '@/components/ui/BookmarkButton'
import QuizNavigation from '@/components/navigation/QuizNavigation'

export default function QuizDetailsPage() {
  const params = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const id = params?.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [hasCompletedAttempt, setHasCompletedAttempt] = useState(false)
  const returnTo = search?.get('return') || ''
  const token = (session as any)?.accessToken as string | undefined

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const q = await authAPI.getQuiz(id)
      setQuiz(q)

      // Check enrollment status if user is logged in
      if (token) {
        try {
          const enrollment = await authAPI.checkQuizEnrollment(token, id)
          setEnrollmentStatus(enrollment)

          // Check if user has completed attempts
          if (enrollment.enrolled) {
            try {
              const { attempts } = await authAPI.getUserQuizAttempts(token, parseInt(id))
              const quizIdNumber = parseInt(id)
              const completedAttempts = attempts?.filter((attempt: any) => {
                const attemptQuizId = Number(attempt.quizId ?? attempt.quiz_id ?? attempt.quizID)
                return attempt.status === 'completed' && attemptQuizId === quizIdNumber
              })
              setHasCompletedAttempt(completedAttempts && completedAttempts.length > 0)
            } catch (error) {
              console.warn('Failed to check attempt history:', error)
            }
          }
        } catch (error) {
          console.warn('Failed to check enrollment status:', error)
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!token || !quiz) return

    setEnrolling(true)
    try {
      const result = await authAPI.enrollQuiz(token, quiz.id)
      if (result.status === 'enrolled' || result.status === 'purchased' || result.status === 'automatic_access') {
        // Refresh enrollment status
        const enrollment = await authAPI.checkQuizEnrollment(token, id)
        setEnrollmentStatus(enrollment)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to enroll in quiz')
    } finally {
      setEnrolling(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Quiz" />
      <div className="bg-white border rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-full" />
        </div>
      </div>
    </div>
  )
  if (error) return <div className="max-w-7xl mx-auto px-4 py-6 text-red-600">{error}</div>
  if (!quiz) return <div className="max-w-7xl mx-auto px-4 py-6">Quiz not found</div>

  const baseTakeUrl = hasCompletedAttempt
    ? `/quiz/${quiz.id}/take?retake=1`
    : `/quiz/${quiz.id}/take`

  const takeUrl = returnTo
    ? `${baseTakeUrl}${baseTakeUrl.includes('?') ? '&' : '?'}return=${encodeURIComponent(returnTo)}`
    : baseTakeUrl

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title={quiz.title || 'Quiz'} subtitle={quiz.description ? String(quiz.description).slice(0, 140) : undefined} />

      {/* Navigation */}
      <QuizNavigation
        quizId={quiz.id}
        quizTitle={quiz.title}
        returnTo={returnTo}
        currentPage="details"
      />

      {/* Quiz Details Card */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {quiz.difficulty && <div className="text-xs inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize mb-3">{quiz.difficulty}</div>}
            {quiz.description && <p className="text-slate-700 whitespace-pre-line mb-4">{quiz.description}</p>}
            <div className="text-sm text-slate-600 mb-4">Timer: {quiz.timer_seconds ? Math.round(quiz.timer_seconds/60) : 0} min</div>
          </div>
          <div className="flex items-center gap-2">
            <BookmarkButton quizId={quiz.id} showLabel />
            <ShareQuiz quiz={quiz} variant="button" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!token ? (
            <Link href="/auth/signin" className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
              Sign In to Take Quiz
            </Link>
          ) : enrollmentStatus?.enrolled ? (
            <>
              <Link href={takeUrl} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">
                {hasCompletedAttempt ? 'Retake Quiz' : 'Start Quiz'}
              </Link>
              {hasCompletedAttempt && (
                <Link href={`/quiz/${quiz.id}/results${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`} className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
                  View Results
                </Link>
              )}
              <Link href={`/quiz/${quiz.id}/ranking${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`} className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
                Ranking
              </Link>
            </>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : quiz.is_paid ? `Enroll for $${(quiz.price_cents / 100).toFixed(2)}` : 'Enroll (Free)'}
            </button>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <ReviewSection
        quizId={quiz.id}
        canReview={true}
        showCreateForm={false}
      />
    </div>
  )
}
