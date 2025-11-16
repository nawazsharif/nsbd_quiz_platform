'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { QuizAttempt } from '@/types/quiz-attempt'
import {
  Trophy,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Share2,
  Download,
  RefreshCw,
  ArrowLeft,
  Award,
  TrendingUp,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import QuizNavigation from '@/components/navigation/QuizNavigation'
import { stripHtmlTags } from '@/lib/utils'
import Breadcrumb from '@/components/ui/Breadcrumb'
import BackButton from '@/components/ui/BackButton'

type Question = {
  id: number
  text?: string
  prompt?: string
  type: 'mcq' | 'true_false' | 'short_desc'
  options?: Array<{ text: string; is_correct: boolean }>
  correct_boolean?: boolean
  multiple_correct?: boolean
  explanation?: string
}

type AttemptResult = {
  attempt: QuizAttempt
  quiz: {
    id: number
    title: string
    description?: string
    difficulty?: string
    timer_seconds?: number
  }
  questions: Question[]
  answers: Record<string, any>
  results: {
    score: number
    maxScore: number
    correctAnswers: number
    incorrectAnswers: number
    pendingAnswers: number
    completionPercentage: number
    timeSpent: number
  }
}

export default function QuizResultsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get('return') || ''
  const { data: session } = useSession()

  const quizId = params?.id as string
  const attemptId = searchParams?.get('attempt')
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExplanations, setShowExplanations] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null)

  const token = (session as any)?.accessToken as string | undefined

  const load = async () => {
    if (!token) {
      setError('Please sign in to view results')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Resolve attempt: use query param if provided, else pick latest attempt for this quiz
      let resolvedAttemptId = attemptId as string | null
      if (!resolvedAttemptId) {
        const { attempts } = await authAPI.getUserQuizAttempts(token, quizId, 1, 1)
        const first = (attempts || [])[0] as any
        resolvedAttemptId = first?.id || null
        if (!resolvedAttemptId) {
          throw new Error('No attempts found for this quiz')
        }
      }

      // Get attempt details
      const { attempt: attemptData, quiz: quizPayload, answers: answerPayload, results: resultPayload } = await authAPI.getQuizAttempt(token, String(resolvedAttemptId))
      if (!attemptData) throw new Error('Unable to load attempt details')

      // Check if attempt is completed
      if (attemptData.status !== 'completed') {
        throw new Error('This attempt is not completed yet. Please complete the quiz first.')
      }

      const quizFromAttempt = quizPayload || await authAPI.getQuiz(quizId, token)
      let questions = (quizFromAttempt as any)?.questions as Question[] | undefined
      if (!questions || questions.length === 0) {
        questions = await authAPI.listQuestions(quizId, token)
      }

      const normalizedAnswers = answerPayload ? { ...answerPayload } : (attemptData.answers || {})
      const computedResults = resultPayload || calculateResults(questions || [], normalizedAnswers)

      setResult({
        attempt: attemptData,
        quiz: quizFromAttempt,
        questions: questions || [],
        answers: normalizedAnswers,
        results: computedResults
      })
    } catch (e: any) {
      setError(e.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const calculateResults = (questions: Question[], answers: Record<string, any>) => {
    let correct = 0
    let incorrect = 0
    let pending = 0

    questions.forEach((q) => {
      const key = String(q.id)
      const ans = answers[key]

      if (q.type === 'mcq') {
        const correctIdxs = (q.options || [])
          .map((o, i) => (o.is_correct ? i : null))
          .filter((v) => v !== null)

        if (q.multiple_correct) {
          const picked = new Set((ans || []) as number[])
          const expected = new Set(correctIdxs as number[])
          const setEq = expected.size === picked.size &&
            Array.from(expected).every((x) => picked.has(x))
          setEq ? correct++ : incorrect++
        } else {
          if (ans === undefined || ans === null) {
            incorrect++
          } else {
            correctIdxs.includes(ans) ? correct++ : incorrect++
          }
        }
      } else if (q.type === 'true_false') {
        if (typeof ans !== 'boolean') {
          incorrect++
        } else {
          (ans === !!q.correct_boolean) ? correct++ : incorrect++
        }
      } else if (q.type === 'short_desc') {
        // Manual grading required
        pending++
      }
    })

    const total = questions.length
    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    const completionPercentage = total > 0 ? Math.round(((correct + incorrect + pending) / total) * 100) : 0

    return {
      score,
      maxScore: 100,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      pendingAnswers: pending,
      completionPercentage,
      timeSpent: 0 // Will be updated from attempt data
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getQuestionResult = (question: Question, answer: any) => {
    const key = String(question.id)

    if (question.type === 'mcq') {
      const correctIdxs = (question.options || [])
        .map((o, i) => (o.is_correct ? i : null))
        .filter((v) => v !== null)

      if (question.multiple_correct) {
        const picked = new Set((answer || []) as number[])
        const expected = new Set(correctIdxs as number[])
        const isCorrect = expected.size === picked.size &&
          Array.from(expected).every((x) => picked.has(x))
        return isCorrect ? 'correct' : 'incorrect'
      } else {
        if (answer === undefined || answer === null) return 'unanswered'
        return correctIdxs.includes(answer) ? 'correct' : 'incorrect'
      }
    } else if (question.type === 'true_false') {
      if (typeof answer !== 'boolean') return 'unanswered'
      return (answer === !!question.correct_boolean) ? 'correct' : 'incorrect'
    } else if (question.type === 'short_desc') {
      return answer ? 'pending' : 'unanswered'
    }

    return 'unanswered'
  }

  useEffect(() => {
    if (quizId) load()
  }, [quizId, attemptId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <QuizNavigation
          quizId={quizId}
          returnTo={returnTo}
          currentPage="results"
        />
        <div className="bg-white border rounded-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const isInProgressError = error.includes('not completed yet')

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <QuizNavigation
          quizId={quizId}
          returnTo={returnTo}
          currentPage="results"
        />
        <div className={`${isInProgressError ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-xl p-8 text-center`}>
          {isInProgressError ? (
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          )}
          <h2 className={`text-xl font-semibold mb-2 ${isInProgressError ? 'text-blue-900' : 'text-red-900'}`}>
            {isInProgressError ? 'Quiz Not Completed' : 'Error Loading Results'}
          </h2>
          <p className={`mb-4 ${isInProgressError ? 'text-blue-700' : 'text-red-700'}`}>{error}</p>
          <div className="flex items-center justify-center gap-3">
            {isInProgressError ? (
              <Link
                href={`/quiz/${quizId}/take${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Target className="w-4 h-4" />
                Continue Quiz
              </Link>
            ) : (
              <Link
                href={`/quiz/${quizId}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Target className="w-4 h-4" />
                Take Quiz
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl p-8 text-center text-slate-600">
          Results not found
        </div>
      </div>
    )
  }

  const { attempt, quiz, questions, answers, results } = result

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="space-y-4">
        <BackButton fallbackUrl={`/quiz/${quizId}`} label="Back to Quiz" />
        <Breadcrumb
          items={[
            { label: 'Quizzes', href: '/quizzes' },
            { label: stripHtmlTags(quiz.title), href: `/quiz/${quizId}` },
            { label: 'Results' }
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{stripHtmlTags(quiz.title)}</h1>
          <p className="text-slate-600">Quiz Results</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/quiz/${quiz.id}/take?retake=1${returnTo ? `&return=${encodeURIComponent(returnTo)}` : ''}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <RefreshCw className="w-4 h-4" />
            Retake Quiz
          </Link>
          <Link
            href={`/quiz/${quiz.id}/ranking${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Trophy className="w-4 h-4" />
            View Ranking
          </Link>
        </div>
      </div>

      {/* Score Overview */}
      <div className={`border rounded-xl p-6 ${getScoreBgColor(results.score)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${results.score >= 80 ? 'bg-emerald-100' : results.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              {results.score >= 80 ? (
                <Trophy className={`w-6 h-6 ${getScoreColor(results.score)}`} />
              ) : results.score >= 60 ? (
                <Award className={`w-6 h-6 ${getScoreColor(results.score)}`} />
              ) : (
                <Target className={`w-6 h-6 ${getScoreColor(results.score)}`} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {results.score}%
              </h2>
              <p className="text-slate-600">
                {results.score >= 80 ? 'Excellent!' : results.score >= 60 ? 'Good job!' : 'Keep practicing!'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">Completed</div>
            <div className="text-lg font-semibold text-slate-900">
              {new Date(attempt.finishedAt || attempt.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{results.correctAnswers}</span>
            </div>
            <div className="text-sm text-slate-600">Correct</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{results.incorrectAnswers}</span>
            </div>
            <div className="text-sm text-slate-600">Incorrect</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">{results.pendingAnswers}</span>
            </div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {formatTime(attempt.progress?.timeSpent || 0)}
              </span>
            </div>
            <div className="text-sm text-slate-600">Time Spent</div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Question Review</h3>
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <BarChart3 className="w-4 h-4" />
            {showExplanations ? 'Hide' : 'Show'} Explanations
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => {
            const userAnswer = answers[String(question.id)]
            const questionResult = getQuestionResult(question, userAnswer)

            return (
              <div
                key={question.id}
                className={`border rounded-lg p-4 ${
                  questionResult === 'correct' ? 'border-emerald-200 bg-emerald-50' :
                  questionResult === 'incorrect' ? 'border-red-200 bg-red-50' :
                  questionResult === 'pending' ? 'border-yellow-200 bg-yellow-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      questionResult === 'correct' ? 'bg-emerald-100 text-emerald-700' :
                      questionResult === 'incorrect' ? 'bg-red-100 text-red-700' :
                      questionResult === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">
                        {stripHtmlTags(question.text || question.prompt || '')}
                      </h4>
                      <div className="text-xs text-slate-500 capitalize">
                        {question.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {questionResult === 'correct' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                    {questionResult === 'incorrect' && <XCircle className="w-5 h-5 text-red-600" />}
                    {questionResult === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    {questionResult === 'unanswered' && <AlertCircle className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Show user's answer */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-slate-700 mb-1">Your Answer:</div>
                  {question.type === 'mcq' && (
                    <div className="text-sm text-slate-600">
                      {question.multiple_correct ? (
                        userAnswer && Array.isArray(userAnswer) ?
                          userAnswer.map(idx => question.options?.[idx]?.text).join(', ') || 'No answer selected'
                          : 'No answer selected'
                      ) : (
                        userAnswer !== undefined ?
                          question.options?.[userAnswer]?.text || 'Invalid selection'
                          : 'No answer selected'
                      )}
                    </div>
                  )}
                  {question.type === 'true_false' && (
                    <div className="text-sm text-slate-600">
                      {typeof userAnswer === 'boolean' ? (userAnswer ? 'True' : 'False') : 'No answer selected'}
                    </div>
                  )}
                  {question.type === 'short_desc' && (
                    <div className="text-sm text-slate-600 bg-white border rounded p-2 max-h-20 overflow-y-auto">
                      {userAnswer || 'No answer provided'}
                    </div>
                  )}
                </div>

                {/* Show correct answer and explanation */}
                {showExplanations && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-sm font-medium text-slate-700 mb-1">Correct Answer:</div>
                    {question.type === 'mcq' && (
                      <div className="text-sm text-emerald-700 mb-2">
                        {question.options?.filter(o => o.is_correct).map(o => o.text).join(', ')}
                      </div>
                    )}
                    {question.type === 'true_false' && (
                      <div className="text-sm text-emerald-700 mb-2">
                        {question.correct_boolean ? 'True' : 'False'}
                      </div>
                    )}
                    {question.type === 'short_desc' && (
                      <div className="text-sm text-slate-600 mb-2">
                        Manual grading required
                      </div>
                    )}

                    {question.explanation && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-1">Explanation:</div>
                        <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded p-2">
                          {question.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-6">
        <button
          onClick={() => {
            // Share functionality
            if (navigator.share) {
              navigator.share({
                title: `Quiz Results: ${quiz.title}`,
                text: `I scored ${results.score}% on "${quiz.title}"!`,
                url: window.location.href
              })
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Share2 className="w-4 h-4" />
          Share Results
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>
    </div>
  )
}
