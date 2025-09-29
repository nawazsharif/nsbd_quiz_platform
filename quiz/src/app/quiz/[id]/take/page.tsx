'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { QuizAttempt, QuizProgress } from '@/types/quiz-attempt'
import { ArrowLeft, Clock, Play, RotateCcw, Save, XCircle } from 'lucide-react'
import Link from 'next/link'
import QuizNavigation from '@/components/navigation/QuizNavigation'

type Question = any

export default function TakeQuizPage() {
  const params = useParams()
  const router = useRouter()
  const search = useSearchParams()
  const { data: session } = useSession()
  const quizId = params?.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [remaining, setRemaining] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [startTime] = useState(new Date())
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [existingAttempt, setExistingAttempt] = useState<QuizAttempt | null>(null)
  const returnTo = search?.get('return') || ''
  const wantsRetake = search?.get('retake') === '1'

  // Auto-save interval ref
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const token = (session as any)?.accessToken as string | undefined

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [q, qs] = await Promise.all([authAPI.getQuiz(quizId), authAPI.listQuestions(quizId)])
      setQuiz(q)
      setQuestions(qs || [])
      if (q?.timer_seconds) setRemaining(q.timer_seconds)

      // Check enrollment status first
      if (token) {
        try {
          const enrollmentStatus = await authAPI.checkQuizEnrollment(token, quizId)
          if (!enrollmentStatus.enrolled) {
            setError('You need to enroll in this quiz before taking it. Please go back and click the Enroll button.')
            setLoading(false)
            return
          }
        } catch (error) {
          console.warn('Failed to check enrollment status:', error)
          setError('Unable to verify quiz access. Please make sure you are enrolled in this quiz.')
          setLoading(false)
          return
        }
      } else {
        setError('Please sign in to take this quiz.')
        setLoading(false)
        return
      }

      // Check for existing attempts first
      if (token) {
        try {
          const { attempts = [] } = await authAPI.getUserQuizAttempts(token, parseInt(quizId))

          // Check for incomplete attempts first
          const quizIdNumber = parseInt(quizId)
          const incompleteAttempt = attempts.find((attempt: any) => {
            const attemptQuizId = Number(attempt.quizId ?? attempt.quiz_id ?? attempt.quizID)
            return attempt.status === 'in_progress' && attemptQuizId === quizIdNumber
          })

          if (incompleteAttempt) {
            setExistingAttempt(incompleteAttempt)
            setShowResumeDialog(true)
            return // Don't start a new attempt yet
          }

          // Check for completed attempts
          const completedAttempts = attempts.filter((attempt: any) => {
            const attemptQuizId = Number(attempt.quizId ?? attempt.quiz_id ?? attempt.quizID)
            return attempt.status === 'completed' && attemptQuizId === quizIdNumber
          })

          if (completedAttempts.length > 0) {
            const latestAttempt = completedAttempts[0]

            if (!wantsRetake) {
              const resultsUrl = `/quiz/${quizId}/results?attempt=${latestAttempt.id}` +
                (returnTo ? `&return=${encodeURIComponent(returnTo)}` : '')

              setLoading(false)
              router.replace(resultsUrl)
              return
            }

            setExistingAttempt(latestAttempt)
            setShowResumeDialog(true)
            return // Don't start a new attempt yet
          }
        } catch (error) {
          console.warn('Failed to check for existing attempts:', error)
        }
      }

      // Start a new attempt if user is logged in and no incomplete attempt exists
      if (token) {
        try {
          const { attempt: attemptPayload } = await authAPI.startQuizAttempt(token, quizId)
          if (attemptPayload) {
            setAttempt(attemptPayload)

            const progress = attemptPayload.progress || {}
            setIdx(progress.currentQuestionIndex || 0)
            setAnswers(progress.answers ? { ...progress.answers } : {})
            if (progress.timeSpent && q?.timer_seconds) {
              setRemaining(q.timer_seconds - progress.timeSpent)
            }
          }
        } catch (attemptError: any) {
          console.warn('Failed to start attempt tracking:', attemptError)

          if (attemptError.message?.includes('Too many quiz attempt requests')) {
            setError('Rate limit reached. Please wait a moment before trying again.')
            return
          } else if (attemptError.message) {
            setError(attemptError.message)
            return
          }

          // Continue without attempt tracking for non-logged users
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  // Auto-save progress function
  const saveProgress = useCallback(async (force = false) => {
    if (!token || !attempt || saving) return

    try {
      setSaving(true)
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
      const answeredQuestions = Object.keys(answers).length
      const completionPercentage = questions.length > 0 ? (answeredQuestions / questions.length) * 100 : 0

      const progress: Partial<QuizProgress> = {
        currentQuestionIndex: idx,
        totalQuestions: questions.length,
        answeredQuestions,
        answers,
        timeSpent,
        lastActivityAt: new Date(),
        completionPercentage
      }

      await authAPI.saveQuizProgress(token, attempt.id, {
        currentQuestionIndex: idx,
        answers,
        timeSpent
      })

      setLastSaved(new Date())
    } catch (error) {
      console.warn('Failed to save progress:', error)
    } finally {
      setSaving(false)
    }
  }, [token, attempt, idx, answers, questions.length, saving])

  // Resume existing attempt
  const resumeAttempt = useCallback(async () => {
    if (!existingAttempt || !token) return

    try {
      const { attempt: resumed } = await authAPI.resumeQuizAttempt(token, existingAttempt.id)
      if (!resumed) throw new Error('Unable to resume attempt')
      setAttempt(resumed)

      const progress = resumed.progress || {}
      setIdx(progress.currentQuestionIndex || 0)
      setAnswers(progress.answers ? { ...progress.answers } : {})
      if (progress.timeSpent && quiz?.timer_seconds) {
        setRemaining(quiz.timer_seconds - progress.timeSpent)
      }

      setShowResumeDialog(false)

      // Start auto-save
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
      autoSaveInterval.current = setInterval(() => {
        saveProgress()
      }, 30000) // Auto-save every 30 seconds

    } catch (error) {
      console.error('Failed to resume attempt:', error)
      setShowResumeDialog(false)
      // Fall back to starting a new attempt
      startNewAttempt()
    }
  }, [existingAttempt, token, quiz, saveProgress])

  // Start a new attempt
  const startNewAttempt = useCallback(async () => {
    if (!token) return

    try {
      // If there's an existing attempt, abandon it first
      if (existingAttempt) {
        await authAPI.abandonQuizAttempt(token, existingAttempt.id)
      }

      const { attempt: newAttempt } = await authAPI.startQuizAttempt(token, quizId, { forceNew: true })
      if (newAttempt) {
        setAttempt(newAttempt)
        const progress = newAttempt.progress || {}
        setIdx(progress.currentQuestionIndex || 0)
        setAnswers(progress.answers ? { ...progress.answers } : {})
        if (progress.timeSpent && quiz?.timer_seconds) {
          setRemaining(quiz.timer_seconds - progress.timeSpent)
        } else if (quiz?.timer_seconds) {
          setRemaining(quiz.timer_seconds)
        }
      }
      setShowResumeDialog(false)

      // Start auto-save
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
      autoSaveInterval.current = setInterval(() => {
        saveProgress()
      }, 30000) // Auto-save every 30 seconds

    } catch (error) {
       console.error('Failed to start new attempt:', error)
       setShowResumeDialog(false)
     }
   }, [token, quizId, existingAttempt, saveProgress])

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress()
    }, 2000) // Save 2 seconds after last change
  }, [saveProgress])

  useEffect(() => { if (quizId) load() }, [quizId])

  // Set up auto-save interval
  useEffect(() => {
    if (token && attempt && !submitted) {
      // Auto-save every 30 seconds
      autoSaveInterval.current = setInterval(() => {
        saveProgress()
      }, 30000)

      return () => {
        if (autoSaveInterval.current) {
          clearInterval(autoSaveInterval.current)
        }
      }
    }
  }, [token, attempt, submitted, saveProgress])

  // Save progress when answers or current question changes
  useEffect(() => {
    if (token && attempt && !submitted) {
      debouncedSave()
    }
  }, [answers, idx, token, attempt, submitted, debouncedSave])

  // Timer countdown
  useEffect(() => {
    if (!remaining || submitted) return
    const t = window.setInterval(() => setRemaining((s) => (s ? s - 1 : s)), 1000)
    return () => window.clearInterval(t)
  }, [remaining, submitted])

  // Auto-submit when time expires
  useEffect(() => {
    if (remaining === 0 && !submitted) {
      handleSubmit()
    }
  }, [remaining, submitted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const current = questions[idx]

  const onSelectOption = (q: Question, optIndex: number, checked: boolean) => {
    setAnswers((prev) => {
      const key = String(q.id)
      if (q.multiple_correct) {
        const set = new Set(prev[key] || [])
        if (checked) set.add(optIndex)
        else set.delete(optIndex)
        return { ...prev, [key]: Array.from(set) }
      } else {
        return { ...prev, [key]: optIndex }
      }
    })
  }

  const onSetTF = (q: Question, value: boolean) => setAnswers((p) => ({ ...p, [String(q.id)]: value }))
  const onSetShort = (q: Question, text: string) => setAnswers((p) => ({ ...p, [String(q.id)]: text }))

  const computeScore = () => {
    let correct = 0
    let incorrect = 0
    let pending = 0
    questions.forEach((q: any) => {
      const key = String(q.id)
      const ans = answers[key]
      if (q.type === 'mcq') {
        const correctIdxs = (q.options || []).map((o: any, i: number) => (o.is_correct ? i : null)).filter((v: any) => v !== null)
        if (q.multiple_correct) {
          const picked = new Set((ans || []) as number[])
          const expected = new Set(correctIdxs as number[])
          const setEq = expected.size === picked.size && Array.from(expected).every((x) => picked.has(x))
          setEq ? correct++ : incorrect++
        } else {
          if (ans === undefined || ans === null) incorrect++
          else correctIdxs.includes(ans) ? correct++ : incorrect++
        }
      } else if (q.type === 'true_false') {
        if (typeof ans !== 'boolean') incorrect++
        else (ans === !!q.correct_boolean) ? correct++ : incorrect++
      } else if (q.type === 'short_desc') {
        // Manual grading
        pending++
      }
    })
    const total = questions.length
    return { correct, incorrect, pending, total }
  }

  const handleSubmit = async () => {
    if (submitted) return

    // Save final progress before submitting
    if (token && attempt) {
      try {
        await saveProgress(true)

        // Calculate final time spent
        const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)

        const submitResponse = await authAPI.submitQuizAttempt(token, attempt.id, answers, timeSpent)

        // Redirect to results page after successful submission
        const base = `/quiz/${quiz?.id}/results?attempt=${attempt.id}`
        router.push(returnTo ? `${base}&return=${encodeURIComponent(returnTo)}` : base)
        return
      } catch (error) {
        console.warn('Failed to submit attempt:', error)
      }
    }

    setSubmitted(true)
  }

  const result = useMemo(() => (submitted ? computeScore() : null), [submitted, answers, questions])

  if (loading) return <div className="max-w-5xl mx-auto p-6">Loading...</div>
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              href={`/quiz/${quizId}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Enroll in Quiz
            </Link>
          </div>
        </div>
      </div>
    )
  }
  if (!quiz) return <div className="max-w-5xl mx-auto p-6">Quiz not found</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      {/* Navigation */}
      <QuizNavigation
        quizId={quizId}
        quizTitle={quiz?.title}
        returnTo={returnTo}
        currentPage="take"
        showBreadcrumb={!showResumeDialog}
      />

      {/* Resume/Results Dialog */}
      {showResumeDialog && existingAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            {existingAttempt.status === 'completed' ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Previous Quiz Results
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Score:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {existingAttempt.score || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm text-gray-900 capitalize">
                      {existingAttempt.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Started:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(existingAttempt.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  You have already completed this quiz. Would you like to retake it or view detailed results?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/quiz/${quizId}/results?attempt=${existingAttempt.id}${returnTo ? `&return=${encodeURIComponent(returnTo)}` : ''}`)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Results
                  </button>
                  <button
                    onClick={startNewAttempt}
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Retake Quiz
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resume Previous Attempt?
                </h3>
                <p className="text-gray-600 mb-6">
                  You have an incomplete attempt for this quiz. Would you like to continue where you left off or start fresh?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={resumeAttempt}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={startNewAttempt}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Start Fresh
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
          <div className="text-sm text-slate-600">Question {Math.min(idx+1, questions.length)} / {questions.length}</div>
          {token && attempt && (
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              {saving && <span className="text-amber-600">Saving...</span>}
              {lastSaved && !saving && (
                <span className="text-emerald-600">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && <div className="text-sm font-medium">Time: {Math.max(0, Math.floor(remaining/60))}:{String(Math.max(0, remaining%60)).padStart(2,'0')}</div>}
          {!submitted ? (
            <button onClick={handleSubmit} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Submit</button>
          ) : (
            <button onClick={()=>router.push(`/quiz/${quiz.id}/results${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`)} className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">View Results</button>
          )}
        </div>
      </div>

      {!submitted ? (
        <div className="bg-white border rounded-xl p-4">
          {current ? (
            <div>
              <div className="text-sm uppercase text-slate-500 mb-1">{current.type}</div>
              {current.text && <div className="text-slate-800 font-medium mb-3">{current.text}</div>}
              {current.prompt && <div className="text-slate-800 font-medium mb-3">{current.prompt}</div>}

              {current.type === 'mcq' && (
                <div className="space-y-2">
                  {(current.options || []).map((o: any, i: number) => (
                    <label key={i} className="flex items-center gap-2 p-2 rounded-md border hover:bg-slate-50">
                      <input
                        type={current.multiple_correct ? 'checkbox' : 'radio'}
                        name={`q-${current.id}`}
                        checked={current.multiple_correct
                          ? (answers[String(current.id)] || []).includes(i)
                          : answers[String(current.id)] === i}
                        onChange={(e)=>onSelectOption(current, i, e.currentTarget.checked)}
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {current.type === 'true_false' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 p-2 rounded-md border hover:bg-slate-50"><input type="radio" name={`q-${current.id}`} checked={answers[String(current.id)] === true} onChange={()=>onSetTF(current, true)} /> True</label>
                  <label className="flex items-center gap-2 p-2 rounded-md border hover:bg-slate-50"><input type="radio" name={`q-${current.id}`} checked={answers[String(current.id)] === false} onChange={()=>onSetTF(current, false)} /> False</label>
                </div>
              )}

              {current.type === 'short_desc' && (
                <div>
                  <textarea className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500" rows={4} value={answers[String(current.id)] || ''} onChange={(e)=>onSetShort(current, e.target.value)} placeholder="Write your answer here" />
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button disabled={idx===0} onClick={()=>setIdx((i)=>Math.max(0,i-1))} className="h-9 px-3 rounded-md border disabled:opacity-50 text-gray-900 hover:bg-gray-50">Prev</button>
                <button disabled={idx>=questions.length-1} onClick={()=>setIdx((i)=>Math.min(questions.length-1,i+1))} className="h-9 px-3 rounded-md border disabled:opacity-50 text-gray-900 hover:bg-gray-50">Next</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No questions available.</div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Results</h2>
          {result ? (
            <div className="space-y-2">
              <div className="text-slate-800">Score: {result.correct} / {result.total} ({Math.round((result.correct/result.total)*100)}%)</div>
              <div className="text-slate-600 text-sm">Correct: {result.correct} • Incorrect: {result.incorrect} • Pending (manual): {result.pending}</div>
              {token && attempt && (
                <div className="text-slate-600 text-xs mt-2">
                  Attempt ID: {attempt.id} • Time spent: {Math.floor((new Date().getTime() - startTime.getTime()) / 60000)} minutes
                </div>
              )}
            </div>
          ) : <div className="text-slate-600">No result</div>}
        </div>
      )}
    </div>
  )
}
