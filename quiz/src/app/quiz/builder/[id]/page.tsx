'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { Plus, Save, Trash2 } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import TiptapEditor from '@/components/editor/TiptapEditor'

type Question = any

export default function QuizBuilderPage() {
  const params = useParams()
  const quizId = params?.id as string
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [meta, setMeta] = useState<any>({ title: '', description: '', difficulty: 'medium', timer_seconds: 1800, category_id: null, negative_marking: false, negative_mark_value: null, is_paid: false, price_cents: 0, status: 'draft' })
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [editing, setEditing] = useState<Question | null>(null)
  const [form, setForm] = useState<any>({ type: 'mcq', text: '', prompt: '', sample_answer: '', multiple_correct: false, correct_boolean: true, points: 1, options: [{ text: '', is_correct: false }] })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDefaults, setImportDefaults] = useState<{ type: '' | 'mcq' | 'true_false' | 'short_desc'; points: number }>({ type: '', points: 1 })
  const [importing, setImporting] = useState(false)
  const [importFeedback, setImportFeedback] = useState<any>(null)
  const [importError, setImportError] = useState('')
  const [importInputKey, setImportInputKey] = useState(() => Date.now())
  const [aiFile, setAiFile] = useState<File | null>(null)
  const [aiCount, setAiCount] = useState(5)
  const [aiQuestionType, setAiQuestionType] = useState<'mcq' | 'true_false' | 'short_desc'>('mcq')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)
  const [aiInputKey, setAiInputKey] = useState(() => Date.now())
  const [showImportTools, setShowImportTools] = useState(false)
  const [showAiTools, setShowAiTools] = useState(false)

  const load = useCallback(async () => {
    if (!quizId) return
    if (!token) {
      if (status === 'loading') return
      setError('Please sign in to manage this quiz')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [q, qs] = await Promise.all([
        authAPI.getQuiz(quizId, token),
        authAPI.listQuestions(quizId, token)
      ])
      setQuiz(q)
      setMeta({
        title: q?.title || '',
        description: q?.description || '',
        difficulty: q?.difficulty || 'medium',
        timer_seconds: q?.timer_seconds || 1800,
        category_id: q?.category_id ?? null,
        negative_marking: !!q?.negative_marking,
        negative_mark_value: typeof q?.negative_mark_value === 'number' ? Number(q.negative_mark_value) : null,
        is_paid: !!q?.is_paid,
        price_cents: typeof q?.price_cents === 'number' ? q.price_cents : 0,
        status: q?.status || 'draft',
      })
      setQuestions(qs || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }, [quizId, token, status])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    authAPI.getCategories(undefined, 1, 100)
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setCategories(list.map((c: any) => ({ id: c.id, name: c.name })))
      })
      .catch(() => setCategories([]))
  }, [])

  const onSaveMeta = async () => {
    if (!token) return

    if (meta.negative_marking) {
      const value = meta.negative_mark_value
      if (value === null || !Number.isFinite(value) || value <= 0) {
        setError('Negative mark value is required and must be greater than 0 when negative marking is enabled.')
        return
      }
    }

    setSaving(true)
    try {
      const negativeValue = meta.negative_marking ? meta.negative_mark_value : null
      const payload = {
        ...meta,
        price_cents: meta.is_paid ? meta.price_cents : 0,
        negative_mark_value: negativeValue,
      }
      await authAPI.updateQuiz(token, quizId, payload)
      await load()
      setNotice('Quiz saved successfully')
      setTimeout(() => {
        router.push('/dashboard/quizzes')
      }, 800)
    } catch (e: any) {
      setError(e.message || 'Failed to update quiz')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ type: 'mcq', text: '', prompt: '', sample_answer: '', multiple_correct: false, correct_boolean: true, points: 1, options: [{ text: '', is_correct: false }] })
  }

  const onEdit = (q: Question) => {
    setEditing(q)
    if (q.type === 'mcq') setForm({ type: 'mcq', text: q.text || '', points: q.points || 1, multiple_correct: !!q.multiple_correct, options: (q.options || []).map((o: any)=>({ text: o.text, is_correct: !!o.is_correct })) })
    if (q.type === 'true_false') setForm({ type: 'true_false', text: q.text || '', points: q.points || 1, correct_boolean: !!q.correct_boolean })
    if (q.type === 'short_desc') setForm({ type: 'short_desc', prompt: q.prompt || '', sample_answer: q.sample_answer || '', points: q.points || 1 })
  }

  const onDelete = async (q: Question) => {
    if (!token) return
    if (!confirm('Delete this question?')) return
    try {
      await authAPI.deleteQuestion(token, quizId, q.id)
      await load()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const handleImportSubmit = async () => {
    if (!token) {
      setImportError('Please sign in to import questions.')
      return
    }
    if (!importFile) {
      setImportError('Select a CSV or Excel file to import.')
      return
    }

    setImporting(true)
    setImportError('')
    setImportFeedback(null)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      if (importDefaults.type) formData.append('default_type', importDefaults.type)
      if (importDefaults.points > 0) formData.append('default_points', String(importDefaults.points))
      formData.append('start_order_index', String((questions?.length || 0) + 1))

      const result = await authAPI.importQuizQuestions(token, quizId, formData)
      setImportFeedback(result)
      setImportFile(null)
      setImportInputKey(Date.now())
      await load()
    } catch (e: any) {
      setImportError(e.message || 'Failed to import questions')
    } finally {
      setImporting(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!token) {
      setAiError('Please sign in to generate questions.')
      return
    }
    if (!aiFile) {
      setAiError('Select a PDF or image file to analyze.')
      return
    }

    setAiGenerating(true)
    setAiError('')
    setAiResult(null)
    try {
      const formData = new FormData()
      formData.append('file', aiFile)
      formData.append('count', String(Math.max(1, Math.min(20, aiCount))))
      if (aiQuestionType) formData.append('question_type', aiQuestionType)
      if (meta?.difficulty) formData.append('difficulty', meta.difficulty)

      const result = await authAPI.generateQuizQuestions(token, quizId, formData)
      setAiResult(result)
      setAiFile(null)
      setAiInputKey(Date.now())
      await load()
    } catch (e: any) {
      setAiError(e.message || 'Failed to generate questions')
    } finally {
      setAiGenerating(false)
    }
  }

  const onSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      const payload: any = { ...form, order_index: (questions?.length || 0) + 1 }
      if (form.type === 'mcq') {
        payload.options = (form.options || []).filter((o: any)=>o.text?.trim()).map((o: any)=>({ text: o.text, is_correct: !!o.is_correct }))
      }
      if (editing) {
        await authAPI.updateQuestion(token, quizId, editing.id, payload)
      } else {
        await authAPI.createQuestion(token, quizId, payload)
      }
      resetForm()
      await load()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {notice && (
        <div className="fixed top-5 right-5 z-50">
          <div className="rounded-md bg-emerald-600 text-white px-4 py-2 shadow-lg">{notice}</div>
        </div>
      )}
      <PageHeader title="Quiz Builder" subtitle={quiz?.title ? `Editing: ${quiz.title}` : 'Edit quiz details and questions'} actions={[{ label: 'Save', onClick: onSaveMeta }]} />
      <div className="bg-white border rounded-xl p-4">
        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title</label>
              <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={meta.title} onChange={(e)=>setMeta({...meta, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Difficulty</label>
              <select className="h-10 w-full rounded-md border px-3 text-gray-900" value={meta.difficulty} onChange={(e)=>setMeta({...meta, difficulty: e.target.value})}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Category</label>
              <select className="h-10 w-full rounded-md border px-3 text-gray-900" value={meta.category_id ?? ''} onChange={(e)=>setMeta({...meta, category_id: e.target.value ? Number(e.target.value) : null})}>
                <option value="">No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Timer (minutes)</label>
              <input type="number" min={0} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={Math.round((meta.timer_seconds||0)/60)} onChange={(e)=>{
                const minutes = Math.max(0, Math.round(Number(e.target.value)||0))
                setMeta({...meta, timer_seconds: minutes * 60})
              }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <TiptapEditor value={meta.description} onChange={(html)=>setMeta({...meta, description: html})} placeholder="Describe your quiz..." token={token} />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-end gap-3">
                <label className="inline-flex items-center gap-2 text-sm mt-6">
                  <input type="checkbox" checked={!!meta.is_paid} onChange={(e)=>setMeta({...meta, is_paid: e.target.checked})} disabled={meta.status === 'published'} />
                  Paid quiz
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Price (৳)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500"
                  value={Number(meta.price_cents ?? 0) / 100}
                  onChange={(e)=>setMeta({...meta, price_cents: Math.round(Number(e.target.value || 0) * 100)})}
                  disabled={!meta.is_paid || meta.status === 'published'}
                />
                {meta.status === 'published' && <p className="text-xs text-slate-500 mt-1">Price cannot be changed after publishing.</p>}
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm mt-6">
                  <input type="checkbox" checked={!!meta.negative_marking} onChange={(e)=>setMeta({...meta, negative_marking: e.target.checked, negative_mark_value: e.target.checked ? (meta.negative_mark_value ?? null) : null})} />
                  Enable negative marking
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Negative mark value</label>
                <input type="number" min={0} step={0.01} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={meta.negative_mark_value ?? ''} onChange={(e)=>setMeta({...meta, negative_mark_value: e.target.value === '' ? null : Number(e.target.value)})} disabled={!meta.negative_marking} />
                <p className="text-xs text-slate-500 mt-1">Deduction per wrong answer when enabled.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Questions</h2>
            <button onClick={resetForm} className="inline-flex items-center gap-2 h-8 px-2 rounded-md border"><Plus className="h-4 w-4"/> New</button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {questions.map((q: any) => (
              <div key={q.id} className={`rounded-md border p-3 ${editing?.id === q.id ? 'border-emerald-500' : ''}`}>
                <div className="text-xs uppercase text-slate-500">{q.type}</div>
                <div className="text-slate-800">{q.text || q.prompt || '(no text)'}</div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button onClick={()=>onEdit(q)} className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">Edit</button>
                  <button onClick={()=>onDelete(q)} className="h-8 px-2 rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            ))}
            {questions.length === 0 && <div className="text-sm text-slate-500">No questions yet.</div>}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{editing ? 'Edit Question' : 'Add Question'}</h2>
          <div className="space-y-3 mb-4">
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowImportTools((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>Bulk import questions (CSV / Excel)</span>
                <span className="text-xs text-slate-500">{showImportTools ? 'Hide' : 'Show'}</span>
              </button>
              {showImportTools && (
                <div className="p-4 space-y-3 bg-slate-50 border-t">
                  <p className="text-xs text-slate-600">
                    Accepted columns: <code className="font-mono text-[11px] bg-white px-1 rounded">type</code>, <code className="font-mono text-[11px] bg-white px-1 rounded">question</code>, <code className="font-mono text-[11px] bg-white px-1 rounded">options</code>, <code className="font-mono text-[11px] bg-white px-1 rounded">correct_options</code>, <code className="font-mono text-[11px] bg-white px-1 rounded">points</code>, <code className="font-mono text-[11px] bg-white px-1 rounded">correct</code>.
                  </p>
                  {importError && (
                    <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs">
                      {importError}
                    </div>
                  )}
                  {importFeedback && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-xs space-y-1">
                      <div>Imported {importFeedback.created ?? 0} question(s).</div>
                      {importFeedback.failed ? <div>Skipped {importFeedback.failed} row(s).</div> : null}
                    </div>
                  )}
                  {Array.isArray(importFeedback?.errors) && importFeedback.errors.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-xs space-y-1">
                      <div>Review the first few issues:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {importFeedback.errors.slice(0, 3).map((err: any, idx: number) => (
                          <li key={idx}>Row {err?.row ?? '?'}: {err?.message ?? 'Unknown error'}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <input
                    key={importInputKey}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setImportFile(file)
                      setImportError('')
                    }}
                    className="w-full text-sm text-slate-600"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Default type</label>
                      <select
                        className="h-9 w-full rounded-md border px-2 text-sm"
                        value={importDefaults.type}
                        onChange={(event) => setImportDefaults({ ...importDefaults, type: event.target.value as typeof importDefaults.type })}
                      >
                        <option value="">Auto-detect</option>
                        <option value="mcq">Multiple choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_desc">Short answer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Default points</label>
                      <input
                        type="number"
                        min={1}
                        className="h-9 w-full rounded-md border px-2 text-sm"
                        value={importDefaults.points}
                        onChange={(event) => setImportDefaults({ ...importDefaults, points: Math.max(1, Number(event.target.value) || 1) })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={importing || !importFile || !token}
                    className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : 'Import questions'}
                  </button>
                  <p className="text-[11px] text-slate-500">Imported questions are appended after the existing {questions.length} question(s).</p>
                </div>
              )}
            </div>
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowAiTools((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>Generate with AI (PDF / image)</span>
                <span className="text-xs text-slate-500">{showAiTools ? 'Hide' : 'Show'}</span>
              </button>
              {showAiTools && (
                <div className="p-4 space-y-3 bg-slate-50 border-t">
                  <p className="text-xs text-slate-600">
                    We'll send the document to your configured AI provider and create {aiQuestionType === 'short_desc' ? 'short-answer' : aiQuestionType === 'true_false' ? 'true/false' : 'multiple choice'} questions.
                  </p>
                  {aiError && (
                    <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs">{aiError}</div>
                  )}
                  {aiResult && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-xs">
                      Generated {aiResult.created ?? (aiResult.questions?.length || 0)} question(s).
                    </div>
                  )}
                  <input
                    key={aiInputKey}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setAiFile(file)
                      setAiError('')
                    }}
                    className="w-full text-sm text-slate-600"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Number of questions</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="h-9 w-full rounded-md border px-2 text-sm"
                        value={aiCount}
                        onChange={(event) => setAiCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Question type</label>
                      <select
                        className="h-9 w-full rounded-md border px-2 text-sm"
                        value={aiQuestionType}
                        onChange={(event) => setAiQuestionType(event.target.value as typeof aiQuestionType)}
                      >
                        <option value="mcq">Multiple choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_desc">Short answer</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating || !aiFile || !token}
                    className="h-9 px-3 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {aiGenerating ? 'Generating…' : 'Generate with AI'}
                  </button>
                  <p className="text-[11px] text-slate-500">Requires an AI API key on the server. Generation may take a few seconds.</p>
                </div>
              )}
            </div>
          </div>
          <form onSubmit={onSubmitQuestion} className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select className="h-10 w-full rounded-md border px-3 text-gray-900" value={form.type} onChange={(e)=>setForm({ ...form, type: e.target.value })}>
                <option value="mcq">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_desc">Short Description</option>
              </select>
            </div>

            {form.type === 'mcq' && (
              <>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Question</label>
                  <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={form.text} onChange={(e)=>setForm({...form, text: e.target.value})} required />
                </div>
                <div className="flex items-center gap-2">
                  <input id="multi" type="checkbox" checked={!!form.multiple_correct} onChange={(e)=>setForm({...form, multiple_correct: e.target.checked})} />
                  <label htmlFor="multi" className="text-sm text-slate-700">Multiple correct</label>
                </div>
                <div className="space-y-2">
                  {(form.options || []).map((opt: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input className="h-10 flex-1 rounded-md border px-3 text-gray-900 placeholder-gray-500" placeholder={`Option ${idx+1}`} value={opt.text} onChange={(e)=>{
                        const arr = [...form.options]; arr[idx] = { ...opt, text: e.target.value }; setForm({ ...form, options: arr })
                      }} />
                      <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={!!opt.is_correct} onChange={(e)=>{ const arr=[...form.options]; arr[idx] = { ...opt, is_correct: e.target.checked }; setForm({...form, options: arr}) }} /> Correct</label>
                      <button type="button" className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50" onClick={()=>{ const arr=[...form.options]; arr.splice(idx,1); setForm({...form, options: arr}) }}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50" onClick={()=>setForm({...form, options: [...(form.options||[]), { text: '', is_correct: false }]})}>Add option</button>
                </div>
              </>
            )}

            {form.type === 'true_false' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Question</label>
                  <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={form.text || ''} onChange={(e)=>setForm({...form, text: e.target.value})} required />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-700">Correct answer</label>
                  <select className="h-10 rounded-md border px-3 text-gray-900" value={form.correct_boolean ? 'true' : 'false'} onChange={(e)=>setForm({...form, correct_boolean: e.target.value === 'true'})}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              </div>
            )}

            {form.type === 'short_desc' && (
              <>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Prompt</label>
                  <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={form.prompt} onChange={(e)=>setForm({...form, prompt: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Sample Answer (optional)</label>
                  <textarea className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500" rows={3} value={form.sample_answer} onChange={(e)=>setForm({...form, sample_answer: e.target.value})} />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-slate-600 mb-1">Points</label>
              <input type="number" min={1} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={form.points} onChange={(e)=>setForm({...form, points: Number(e.target.value)})} />
            </div>

            <div className="flex items-center gap-2">
              <button disabled={saving || !token} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{editing ? 'Update' : 'Add question'}</button>
              {editing && <button type="button" onClick={resetForm} className="h-10 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Cancel</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
