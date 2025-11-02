'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/auth'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { formatTaka } from '@/lib/utils'

export default function QuizApprovalsPage() {
  const { user } = useAuth()
  const { hasPermission, isLoading } = usePermissions()
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<string, { quiz: any; questions: any[] }>>({})

  const load = useCallback(async () => {
    if (!token) {
      if (status === 'loading') return
      setError('Please sign in to review quizzes')
      setItems([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getQuizzes(1, 200, undefined, token)
      const list = (res?.data?.data ?? res?.data ?? res) as any
      const all: any[] = (Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [])
      setItems(all.filter((q:any)=> (q.status === 'pending_review' || q.status === 'waiting')))
    } catch(e:any){
      setError(e.message || 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }, [token, status])

  useEffect(()=>{ load() }, [load])

  const canApprove = user && (user.role === 'admin' || user.role === 'super_admin' || hasPermission(PERMISSIONS.APPROVE_QUIZ))

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Quiz Approvals" subtitle="Review and approve submitted quizzes" />
        <div className="bg-white border rounded-xl p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!canApprove) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">You do not have permission to approve quizzes.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Quiz Approvals" subtitle="Review and approve submitted quizzes" />

      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{notice}</div>}

      <div className="bg-white border rounded-xl p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-lg font-semibold text-slate-800 mb-1">No pending approvals</div>
                <p className="text-slate-600">Quizzes waiting for review will show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((q)=> (
                  <div key={q.id} className="border rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between p-3 gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{q.title}</div>
                        <div className="text-xs text-slate-500">#{q.id} • {q.difficulty || '-'} • {q.visibility || 'public'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <button
                          onClick={async()=>{
                            if (!token) {
                              setError('Please sign in to view quiz details')
                              return
                            }
                            if (expandedId === q.id) { setExpandedId(null); return }
                            setExpandedId(q.id)
                            if (details[q.id]) return
                            try {
                              const [full, questions] = await Promise.all([
                                authAPI.getQuiz(q.id, token),
                                authAPI.listQuestions(q.id, token)
                              ])
                              setDetails(prev => ({ ...prev, [q.id]: { quiz: full, questions: Array.isArray(questions) ? questions : (questions?.data || []) } }))
                            } catch (e:any) {
                              setError(e.message || 'Failed to load details')
                            }
                          }}
                          className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50"
                        >{expandedId === q.id ? 'Hide details' : 'View details'}</button>
                      <button
                        onClick={async ()=>{
                          if (!token) return
                          setError('')
                          setNotice('')
                          try {
                            await authAPI.approveQuiz(token, q.id)
                            setItems(prev => prev.filter(it=>it.id!==q.id))
                            setNotice('Quiz approved and published')
                          } catch(e:any){ setError(e.message || 'Failed to approve') }
                        }}
                          className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                      >Approve</button>
                      <button
                        onClick={async ()=>{
                          if (!token) return
                          setError('')
                          setNotice('')
                          try {
                            await authAPI.rejectQuiz(token, q.id)
                            setItems(prev => prev.filter(it=>it.id!==q.id))
                            setNotice('Quiz rejected')
                          } catch(e:any){ setError(e.message || 'Failed to reject') }
                        }}
                          className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50"
                      >Reject</button>
                      </div>
                    </div>
                    {expandedId === q.id && (
                      <div className="px-3 md:px-4 pb-4">
                        {(() => {
                          const d = details[q.id]
                          if (!d) return (
                            <div className="p-3 text-sm text-slate-600">Loading details…</div>
                          )
                          const quiz = d.quiz || {}
                          const questions = d.questions || []
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                              <div className="md:col-span-1 space-y-2">
                                <div className="text-sm"><span className="text-slate-500">Difficulty:</span> <span className="capitalize">{quiz.difficulty || '-'}</span></div>
                                <div className="text-sm"><span className="text-slate-500">Timer:</span> {quiz.timer_seconds ? Math.round(quiz.timer_seconds/60) : 0} min</div>
                                <div className="text-sm"><span className="text-slate-500">Visibility:</span> {quiz.visibility || 'public'}</div>
                                <div className="text-sm"><span className="text-slate-500">Paid:</span> {quiz.is_paid ? `Yes (${formatTaka(Number(quiz.price_cents || 0), { fromCents: true })})` : 'No'}</div>
                                {quiz.negative_marking && (
                                  <div className="text-sm"><span className="text-slate-500">Negative marking:</span> -{quiz.negative_mark_value}</div>
                                )}
                              </div>
                              <div className="md:col-span-2">
                                <div className="text-sm text-slate-700 mb-2">Description</div>
                                <div className="prose prose-sm max-w-none text-slate-800 bg-slate-50 rounded-md p-3 overflow-auto" dangerouslySetInnerHTML={{ __html: String(quiz.description || '') }} />
                                <div className="mt-4">
                                  <div className="text-sm text-slate-700 mb-2">Questions ({questions.length})</div>
                                  <div className="max-h-80 md:max-h-72 overflow-auto border rounded-md">
                                    {questions.length === 0 ? (
                                      <div className="p-3 text-sm text-slate-500">No questions found.</div>
                                    ) : questions.map((qq:any, idx:number) => (
                                      <div key={qq.id || idx} className="p-3 border-b last:border-b-0">
                                        <div className="text-sm font-medium text-slate-900 break-words">{idx+1}. {qq.text || qq.prompt}</div>
                                        <div className="text-xs text-slate-500 capitalize">Type: {qq.type}</div>
                                        {qq.type === 'mcq' && Array.isArray(qq.options) && (
                                          <ul className="mt-1 text-sm list-disc ml-5">
                                            {qq.options.map((op:any, i:number)=> (
                                              <li key={i} className={op.is_correct ? 'text-emerald-700' : ''}>{op.text}{op.is_correct ? ' (correct)' : ''}</li>
                                            ))}
                                          </ul>
                                        )}
                                        {qq.type === 'true_false' && (
                                          <div className="mt-1 text-sm">Correct: {qq.correct_boolean ? 'True' : 'False'}</div>
                                        )}
                                        {qq.type === 'short_desc' && qq.sample_answer && (
                                          <div className="mt-1 text-sm text-slate-700">Sample answer: {qq.sample_answer}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
