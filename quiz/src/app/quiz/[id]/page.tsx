'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka, stripHtmlTags } from '@/lib/utils'
import PageHeader from '@/components/dashboard/PageHeader'
import ReviewSection from '@/components/quiz/ReviewSection'
import ShareQuiz from '@/components/quiz/ShareQuiz'
import BookmarkButton from '@/components/ui/BookmarkButton'
import Breadcrumb from '@/components/ui/Breadcrumb'
import BackButton from '@/components/ui/BackButton'
import { useToast } from '@/hooks/useToast'

export default function QuizDetailsPage() {
  const params = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { success, error: showError } = useToast()
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
      const errorMsg = e.message || 'Failed to load quiz'
      setError(errorMsg)
      showError(errorMsg)
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
        success('Successfully enrolled in quiz!')
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to enroll in quiz'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setEnrolling(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white border rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-4/5" />
        </div>
      </div>
    </div>
  )
  if (error || !quiz) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookmarkButton quizId={parseInt(id) || 0} showLabel={false} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Quiz Not Available</h2>
        <p className="text-slate-600 mb-6">{error || 'The quiz you\'re looking for doesn\'t exist or has been removed.'}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/quizzes" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all">
            Browse Quizzes
          </Link>
          <button onClick={() => router.back()} className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all">
            Go Back
          </button>
        </div>
      </div>
    </div>
  )

  const baseTakeUrl = hasCompletedAttempt
    ? `/quiz/${quiz.id}/take?retake=1`
    : `/quiz/${quiz.id}/take`

  const takeUrl = returnTo
    ? `${baseTakeUrl}${baseTakeUrl.includes('?') ? '&' : '?'}return=${encodeURIComponent(returnTo)}`
    : baseTakeUrl

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation */}
      <div className="space-y-4">
        <BackButton fallbackUrl="/quizzes" label="Back to Quizzes" />
        <Breadcrumb
          items={[
            { label: 'Quizzes', href: '/quizzes' },
            { label: stripHtmlTags(quiz.title || 'Quiz') }
          ]}
        />
      </div>

      <PageHeader
        title={stripHtmlTags(quiz.title || 'Quiz')}
        subtitle={quiz.description ? stripHtmlTags(String(quiz.description)).slice(0, 140) : undefined}
      />

      {/* Quiz Details Card */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {quiz.difficulty && <div className="text-xs inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize mb-3">{quiz.difficulty}</div>}
            {quiz.description && <p className="text-slate-700 whitespace-pre-line mb-4">{stripHtmlTags(quiz.description)}</p>}
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
              {enrolling ? 'Enrolling...' : quiz.is_paid ? `Enroll for ${formatTaka(quiz.price_cents, { fromCents: true })}` : 'Enroll (Free)'}
            </button>
          )}
        </div>
      </div>

      {/* Reviews Section - Only show for paid quizzes */}
      {quiz.is_paid && Number(quiz.price_cents || 0) > 0 && (
        <ReviewSection
          quizId={quiz.id}
          canReview={true}
          showCreateForm={false}
        />
      )}
    </div>
  )
}
