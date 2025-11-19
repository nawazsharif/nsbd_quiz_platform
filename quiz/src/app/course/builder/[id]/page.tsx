'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { Plus, Save, Trash2 } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import TiptapEditor from '@/components/editor/TiptapEditor'

type Content = { id: number; type: 'text'|'pdf'|'video'|'quiz'|'certificate'; title: string; order_index: number; duration_seconds?: number | null; payload?: any }

export default function CourseBuilderPage() {
  const params = useParams()
  const courseId = params?.id as string
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [course, setCourse] = useState<any>(null)
  const [items, setItems] = useState<Content[]>([])
  const [meta, setMeta] = useState<any>({ title: '', summary: '', description: '', cover_url: '', is_paid: false, price_cents: 0, visibility: 'public' })
  const [editing, setEditing] = useState<Content | null>(null)
  const [form, setForm] = useState<any>({ type: 'text', title: '', duration_seconds: 0, payload: { body: '' } })
  const [quizMode, setQuizMode] = useState<'existing'|'create'>('existing')
  const [quizList, setQuizList] = useState<any[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [selectedQuizId, setSelectedQuizId] = useState<string>('')
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '', difficulty: 'medium', timer_seconds: 1800 })
  const [saving, setSaving] = useState(false)

  // Quiz question management states
  const [questions, setQuestions] = useState<any[]>([])
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [questionForm, setQuestionForm] = useState<any>({ type: 'mcq', text: '', prompt: '', sample_answer: '', multiple_correct: false, correct_boolean: true, points: 1, options: [{ text: '', is_correct: false }] })
  const [showQuizBuilder, setShowQuizBuilder] = useState(false)

  // PDF upload states
  const [pdfMode, setPdfMode] = useState<'url' | 'upload'>('url')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // Video upload states
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url')
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [c, list] = await Promise.all([
        authAPI.getCourse(courseId),
        authAPI.listCourseContents(token, courseId)
      ])
      setCourse(c)
      setMeta({ title: c?.title || '', summary: c?.summary || '', description: c?.description || '', cover_url: c?.cover_url || '', is_paid: !!c?.is_paid, price_cents: c?.price_cents || 0, visibility: c?.visibility || 'public' })
      setItems((list || []).sort((a: Content,b: Content)=> (a.order_index||0)-(b.order_index||0)))
    } catch (e: any) {
      setError(e.message || 'Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (courseId) load() }, [courseId])

  // Load questions when a quiz is selected
  useEffect(() => {
    if (selectedQuizId && showQuizBuilder) {
      loadQuestions(selectedQuizId)
    }
  }, [selectedQuizId, showQuizBuilder])

  // Load quizzes for selection when needed
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!token) return
      try {
        setQuizLoading(true)
        const res = await authAPI.getQuizzes(1, 100, undefined, token)
        const list = (res?.data?.data ?? res?.data ?? res) as any
        const all: any[] = (Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [])
        setQuizList(all)
      } catch {}
      finally { setQuizLoading(false) }
    }
    if (form.type === 'quiz') fetchQuizzes()
  }, [form.type, token])

  const onSaveMeta = async () => {
    if (!token) return
    setSaving(true)
    try {
      await authAPI.updateCourse(token, courseId, meta)
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to update course')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ type: 'text', title: '', duration_seconds: 0, payload: { body: '' } })
    setPdfFile(null)
    setPdfMode('url')
    setVideoFile(null)
    setVideoMode('url')
  }

  const onEdit = (c: Content) => {
    setEditing(c)
    if (c.type === 'text') setForm({ type: 'text', title: c.title || '', duration_seconds: c.duration_seconds || 0, payload: { body: c.payload?.body || '' } })
    if (c.type === 'pdf') {
      setForm({ type: 'pdf', title: c.title || '', duration_seconds: c.duration_seconds || 0, payload: { url: c.payload?.url || '' } })
      // Set PDF mode based on URL (if it's from our uploads, show as uploaded, otherwise URL)
      const url = c.payload?.url || ''
      if (url.includes('/storage/uploads/')) {
        setPdfMode('upload')
      } else {
        setPdfMode('url')
      }
    }
    if (c.type === 'video') {
      setForm({ type: 'video', title: c.title || '', duration_seconds: c.duration_seconds || 0, payload: { url: c.payload?.url || '' } })
      // Set video mode based on URL
      const url = c.payload?.url || ''
      if (url.includes('/storage/uploads/')) {
        setVideoMode('upload')
      } else {
        setVideoMode('url')
      }
    }
    if (c.type === 'quiz') setForm({ type: 'quiz', title: c.title || '', duration_seconds: c.duration_seconds || 0, payload: { quiz_id: c.payload?.quiz_id || '' } })
  }

  const onDelete = async (c: Content) => {
    if (!token) return
    if (!confirm('Delete this content?')) return
    try {
      await authAPI.deleteCourseContent(token, courseId, c.id)
      await load()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  // Quiz question management functions
  const loadQuestions = async (quizId: string) => {
    if (!quizId) return
    if (!token) {
      setError('Please sign in to view quiz questions')
      return
    }
    try {
      const qs = await authAPI.listQuestions(quizId, token)
      setQuestions(qs || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load questions')
    }
  }

  const resetQuestionForm = () => {
    setEditingQuestion(null)
    setQuestionForm({ type: 'mcq', text: '', prompt: '', sample_answer: '', multiple_correct: false, correct_boolean: true, points: 1, options: [{ text: '', is_correct: false }] })
  }

  const onEditQuestion = (q: any) => {
    setEditingQuestion(q)
    if (q.type === 'mcq') setQuestionForm({ type: 'mcq', text: q.text || '', points: q.points || 1, multiple_correct: !!q.multiple_correct, options: (q.options || []).map((o: any)=>({ text: o.text, is_correct: !!o.is_correct })) })
    if (q.type === 'true_false') setQuestionForm({ type: 'true_false', text: q.text || '', points: q.points || 1, correct_boolean: !!q.correct_boolean })
    if (q.type === 'short_desc') setQuestionForm({ type: 'short_desc', prompt: q.prompt || '', sample_answer: q.sample_answer || '', points: q.points || 1 })
  }

  const onDeleteQuestion = async (q: any) => {
    if (!token || !selectedQuizId) return
    if (!confirm('Delete this question?')) return
    try {
      await authAPI.deleteQuestion(token, selectedQuizId, q.id)
      await loadQuestions(selectedQuizId)
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const onSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedQuizId) return
    setSaving(true)
    try {
      const payload: any = { ...questionForm, order_index: (questions?.length || 0) + 1 }
      if (questionForm.type === 'mcq') {
        payload.options = (questionForm.options || []).filter((o: any)=>o.text?.trim()).map((o: any)=>({ text: o.text, is_correct: !!o.is_correct }))
      }
      if (editingQuestion) {
        await authAPI.updateQuestion(token, selectedQuizId, editingQuestion.id, payload)
      } else {
        await authAPI.createQuestion(token, selectedQuizId, payload)
      }
      resetQuestionForm()
      await loadQuestions(selectedQuizId)
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      const payload: any = { ...form, order_index: (items?.length || 0) + 1 }
      if (form.type === 'quiz') {
        const qid = form?.payload?.quiz_id || selectedQuizId
        if (!qid) throw new Error('Please select or create a quiz first')
        payload.payload = { quiz_id: Number(qid) }
        if (!payload.title) payload.title = 'Quiz'
      }
      if (editing) {
        await authAPI.updateCourseContent(token, courseId, editing.id, payload)
      } else {
        await authAPI.createCourseContent(token, courseId, payload)
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
      <PageHeader title="Course Builder" subtitle={course?.title ? `Editing: ${course.title}` : 'Edit course details and content'} actions={[{ label: 'Save', onClick: onSaveMeta }]} />
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
              <label className="block text-sm text-slate-600 mb-1">Visibility</label>
              <select className="h-10 w-full rounded-md border px-3 text-gray-900" value={meta.visibility} onChange={(e)=>setMeta({...meta, visibility: e.target.value})}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <TiptapEditor value={meta.description} onChange={(html)=>setMeta({...meta, description: html})} placeholder="Describe your course..." token={token} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Summary</label>
              <textarea className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500" rows={3} value={meta.summary} onChange={(e)=>setMeta({...meta, summary: e.target.value})} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-700 flex items-center gap-2"><input type="checkbox" checked={!!meta.is_paid} onChange={(e)=>setMeta({...meta, is_paid: e.target.checked})} /> Paid</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="h-10 w-40 rounded-md border px-3 text-gray-900"
                value={Number(meta.price_cents ?? 0) / 100}
                onChange={(e)=>setMeta({...meta, price_cents: Math.round(Number(e.target.value || 0) * 100)})}
                disabled={!meta.is_paid}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Content</h2>
            <button onClick={resetForm} className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium"><Plus className="h-4 w-4"/> New</button>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {items.map((c: any) => (
              <div key={c.id} className={`rounded-md border p-3 ${editing?.id === c.id ? 'border-emerald-500 bg-emerald-50' : 'bg-slate-50'}`}>
                <div className="text-xs uppercase text-slate-600 font-medium">{c.type}</div>
                <div className="text-slate-900 font-medium">{c.title || '(no title)'}</div>
                <div className="text-xs text-slate-600">{(c.duration_seconds||0)}s</div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button onClick={()=>onEdit(c)} className="h-8 px-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">Edit</button>
                  <button onClick={()=>onDelete(c)} className="h-8 px-2 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-sm text-slate-600">No content yet.</div>}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">{editing ? 'Edit Content' : 'Add Content'}</h2>
          <form onSubmit={onSubmitContent} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Type</label>
              <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 bg-white" value={form.type} onChange={(e)=>setForm({ ...form, type: e.target.value })}>
                <option value="text">Text</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="quiz">Quiz</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Title</label>
              <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 placeholder-slate-400 bg-white" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Duration (seconds) <span className="text-slate-500 font-normal">(optional)</span></label>
              <input type="number" min={0} className="h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 placeholder-slate-400 bg-white" value={form.duration_seconds || ''} onChange={(e)=>setForm({...form, duration_seconds: e.target.value ? Number(e.target.value) : 0})} placeholder="0" />
            </div>

            {form.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Body</label>
                <TiptapEditor
                  value={form?.payload?.body || ''}
                  onChange={(html) => setForm({ ...form, payload: { ...(form.payload||{}), body: html } })}
                  placeholder="Write lesson content..."
                  token={token}
                />
              </div>
            )}

            {form.type === 'pdf' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium text-slate-900">PDF Source:</label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={()=>setPdfMode('url')}
                      className={`px-3 py-2 text-sm font-medium ${pdfMode === 'url' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={()=>setPdfMode('upload')}
                      className={`px-3 py-2 border-l text-sm font-medium ${pdfMode === 'upload' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>

                {pdfMode === 'url' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">PDF URL</label>
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 placeholder-slate-400 bg-white"
                      placeholder="https://example.com/document.pdf"
                      value={form?.payload?.url || ''}
                      onChange={(e)=>setForm({ ...form, payload: { ...(form.payload||{}), url: e.target.value } })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900 mb-1">Upload PDF File</label>

                    {/* Show existing file info when editing */}
                    {form?.payload?.url && !pdfFile && !pdfUploading && (
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">Current PDF File</p>
                              <p className="text-xs text-blue-700">{form.payload.url.split('/').pop()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={form.payload.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Remove this PDF file?')) {
                                  setForm({ ...form, payload: { ...(form.payload||{}), url: '' } })
                                  setPdfFile(null)
                                }
                              }}
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="block w-full text-sm text-slate-900 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none hover:bg-slate-50"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !token) return

                        setPdfFile(file)
                        setPdfUploading(true)
                        setError('')

                        try {
                          const formData = new FormData()
                          formData.append('file', file)

                          // Remove /api from the end of NEXT_PUBLIC_API_URL if it exists
                          const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://api.quiz.test'
                          const uploadUrl = `${baseUrl}/api/uploads`

                          const response = await fetch(uploadUrl, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                            body: formData,
                          })

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.message || `Upload failed: ${response.status}`)
                          }

                          const data = await response.json()
                          setForm({ ...form, payload: { ...(form.payload||{}), url: data.url } })
                        } catch (err: any) {
                          console.error('PDF upload error:', err)
                          setError(err.message || 'PDF upload failed')
                          setPdfFile(null)
                        } finally {
                          setPdfUploading(false)
                        }
                      }}
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      {form?.payload?.url ? 'Upload a new file to replace the current one' : 'Choose a PDF file to upload'}
                    </p>

                    {pdfUploading && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        Uploading PDF...
                      </div>
                    )}
                    {pdfFile && !pdfUploading && form?.payload?.url && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ {pdfFile.name} uploaded successfully
                      </div>
                    )}
                    {error && !pdfUploading && (
                      <div className="mt-2 text-sm text-red-600">
                        ✗ {error}
                      </div>
                    )}
                  </div>
                )}

                {/* PDF Preview */}
                {form?.payload?.url && (
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">PDF Preview</span>
                      <a
                        href={form.payload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <iframe
                      src={form.payload.url}
                      className="w-full h-96 bg-white"
                      title="PDF Preview"
                    />
                  </div>
                )}
              </div>
            )}

            {form.type === 'video' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium text-slate-900">Video Source:</label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={()=>setVideoMode('url')}
                      className={`px-3 py-2 text-sm font-medium ${videoMode === 'url' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={()=>setVideoMode('upload')}
                      className={`px-3 py-2 border-l text-sm font-medium ${videoMode === 'upload' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>

                {videoMode === 'url' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">Video URL</label>
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 placeholder-slate-400 bg-white"
                      placeholder="https://example.com/video.mp4"
                      value={form?.payload?.url || ''}
                      onChange={(e)=>setForm({ ...form, payload: { ...(form.payload||{}), url: e.target.value } })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900 mb-1">Upload Video File</label>

                    {/* Show existing file info when editing */}
                    {form?.payload?.url && !videoFile && !videoUploading && (
                      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">Current Video File</p>
                              <p className="text-xs text-blue-700">{form.payload.url.split('/').pop()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={form.payload.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Remove this video file?')) {
                                  setForm({ ...form, payload: { ...(form.payload||{}), url: '' } })
                                  setVideoFile(null)
                                }
                              }}
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/x-flv,video/x-matroska,video/webm,.mp4,.mov,.avi,.wmv,.flv,.mkv,.webm"
                      className="block w-full text-sm text-slate-900 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none hover:bg-slate-50"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !token) return

                        setVideoFile(file)
                        setVideoUploading(true)
                        setError('')

                        try {
                          const formData = new FormData()
                          formData.append('file', file)

                          // Remove /api from the end of NEXT_PUBLIC_API_URL if it exists
                          const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://api.quiz.test'
                          const uploadUrl = `${baseUrl}/api/uploads`

                          const response = await fetch(uploadUrl, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                            body: formData,
                          })

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.message || `Upload failed: ${response.status}`)
                          }

                          const data = await response.json()
                          setForm({ ...form, payload: { ...(form.payload||{}), url: data.url } })
                        } catch (err: any) {
                          console.error('Video upload error:', err)
                          setError(err.message || 'Video upload failed')
                          setVideoFile(null)
                        } finally {
                          setVideoUploading(false)
                        }
                      }}
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      {form?.payload?.url ? 'Upload a new file to replace the current one' : 'Choose a video file to upload (MP4, MOV, AVI, etc. - max 50MB)'}
                    </p>

                    {videoUploading && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        Uploading video...
                      </div>
                    )}
                    {videoFile && !videoUploading && form?.payload?.url && (
                      <div className="mt-2 text-sm text-green-600">
                        ✓ {videoFile.name} uploaded successfully
                      </div>
                    )}
                    {error && !videoUploading && (
                      <div className="mt-2 text-sm text-red-600">
                        ✗ {error}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Preview */}
                {form?.payload?.url && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Video Preview</span>
                      <a
                        href={form.payload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <video
                      src={form.payload.url}
                      controls
                      className="w-full bg-black"
                      style={{ maxHeight: '400px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </div>
            )}

            {form.type === 'quiz' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Quiz Mode:</label>
                  <button type="button" onClick={()=>setQuizMode('existing')} className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${quizMode==='existing'?'bg-emerald-50 border-emerald-300 text-emerald-700':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Use Existing Quiz</button>
                  <button type="button" onClick={()=>setQuizMode('create')} className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${quizMode==='create'?'bg-emerald-50 border-emerald-300 text-emerald-700':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Create New Quiz</button>
                </div>

                {quizMode === 'existing' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Select a Quiz</label>
                      {quizLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                          Loading quizzes...
                        </div>
                      ) : (
                        <select className="h-10 w-full rounded-md border border-gray-300 px-3 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={selectedQuizId} onChange={(e)=>setSelectedQuizId(e.target.value)}>
                          <option value="">-- Select a Quiz --</option>
                          {quizList.map((q)=> (
                            <option key={q.id} value={q.id}>{q.title} (ID: {q.id})</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {selectedQuizId && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-emerald-700 font-medium">Quiz selected successfully!</span>
                          <button type="button" onClick={()=>setShowQuizBuilder(!showQuizBuilder)} className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                            {showQuizBuilder ? 'Hide Quiz Builder' : 'Edit Quiz Questions'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Create New Quiz</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quiz Title *</label>
                        <input
                          className="h-10 w-full rounded-md border border-gray-300 px-3 text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          placeholder="Enter quiz title..."
                          value={newQuiz.title}
                          onChange={(e)=>setNewQuiz({...newQuiz, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                        <select
                          className="h-10 w-full rounded-md border border-gray-300 px-3 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          value={newQuiz.difficulty || 'medium'}
                          onChange={(e)=>setNewQuiz({...newQuiz, difficulty: e.target.value})}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        rows={3}
                        placeholder="Describe your quiz..."
                        value={newQuiz.description}
                        onChange={(e)=>setNewQuiz({...newQuiz, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Time Limit (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        className="h-10 w-32 rounded-md border border-gray-300 px-3 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        value={Math.floor((newQuiz.timer_seconds || 1800) / 60)}
                        onChange={(e)=>setNewQuiz({...newQuiz, timer_seconds: Number(e.target.value) * 60})}
                      />
                      <span className="ml-2 text-sm text-gray-500">Default: 30 minutes</span>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={!token || !newQuiz.title}
                        className="h-10 px-4 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        onClick={async()=>{
                          if (!token || !newQuiz.title) return
                          try {
                            const created = await authAPI.createQuiz(token, {
                              title: newQuiz.title,
                              description: newQuiz.description,
                              difficulty: newQuiz.difficulty || 'medium',
                              timer_seconds: newQuiz.timer_seconds || 1800,
                              visibility: 'public',
                              status: 'draft',
                              is_paid: false,
                              price_cents: 0
                            } as any)
                            const id = (created as any)?.id || (created as any)?.data?.id
                            if (id) {
                              setSelectedQuizId(String(id))
                              setForm((f:any)=>({ ...f, payload: { ...(f.payload||{}), quiz_id: id } }))
                              setQuizMode('existing')
                              setShowQuizBuilder(true) // Automatically show quiz builder for new quiz
                            }
                          } catch (err:any) { setError(err.message || 'Failed to create quiz') }
                        }}
                      >
                        Create Quiz & Add Questions
                      </button>
                      <span className="text-sm text-gray-500">Quiz will be created and you can immediately add questions</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button disabled={saving || !token} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium">{editing ? 'Update' : 'Add content'}</button>
              {editing && <button type="button" onClick={resetForm} className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">Cancel</button>}
            </div>
          </form>
        </div>
      </div>

      {/* Quiz Builder Modal */}
      {showQuizBuilder && selectedQuizId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Quiz Questions</h2>
              <button onClick={resetQuestionForm} className="inline-flex items-center gap-2 h-8 px-2 rounded-md border"><Plus className="h-4 w-4"/> New</button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {questions.map((q: any) => (
                <div key={q.id} className={`rounded-md border p-3 ${editingQuestion?.id === q.id ? 'border-emerald-500' : ''}`}>
                  <div className="text-xs uppercase text-slate-500">{q.type}</div>
                  <div className="text-slate-800">{q.text || q.prompt || '(no text)'}</div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button onClick={()=>onEditQuestion(q)} className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">Edit</button>
                    <button onClick={()=>onDeleteQuestion(q)} className="h-8 px-2 rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && <div className="text-sm text-slate-500">No questions yet.</div>}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
            <form onSubmit={onSubmitQuestion} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Type</label>
                <select className="h-10 w-full rounded-md border px-3 text-gray-900" value={questionForm.type} onChange={(e)=>setQuestionForm({ ...questionForm, type: e.target.value })}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_desc">Short Description</option>
                </select>
              </div>

              {questionForm.type === 'mcq' && (
                <>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Question</label>
                    <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={questionForm.text} onChange={(e)=>setQuestionForm({...questionForm, text: e.target.value})} required />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="multi" type="checkbox" checked={!!questionForm.multiple_correct} onChange={(e)=>setQuestionForm({...questionForm, multiple_correct: e.target.checked})} />
                    <label htmlFor="multi" className="text-sm text-slate-700">Multiple correct</label>
                  </div>
                  <div className="space-y-2">
                    {(questionForm.options || []).map((opt: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="h-10 flex-1 rounded-md border px-3 text-gray-900 placeholder-gray-500" placeholder={`Option ${idx+1}`} value={opt.text} onChange={(e)=>{
                          const arr = [...questionForm.options]; arr[idx] = { ...opt, text: e.target.value }; setQuestionForm({ ...questionForm, options: arr })
                        }} />
                        <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={!!opt.is_correct} onChange={(e)=>{ const arr=[...questionForm.options]; arr[idx] = { ...opt, is_correct: e.target.checked }; setQuestionForm({...questionForm, options: arr}) }} /> Correct</label>
                        <button type="button" className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50" onClick={()=>{ const arr=[...questionForm.options]; arr.splice(idx,1); setQuestionForm({...questionForm, options: arr}) }}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50" onClick={()=>setQuestionForm({...questionForm, options: [...(questionForm.options||[]), { text: '', is_correct: false }]})}>Add option</button>
                  </div>
                </>
              )}

              {questionForm.type === 'true_false' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Question</label>
                    <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={questionForm.text || ''} onChange={(e)=>setQuestionForm({...questionForm, text: e.target.value})} required />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-700">Correct answer</label>
                    <select className="h-10 rounded-md border px-3 text-gray-900" value={questionForm.correct_boolean ? 'true' : 'false'} onChange={(e)=>setQuestionForm({...questionForm, correct_boolean: e.target.value === 'true'})}>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                </div>
              )}

              {questionForm.type === 'short_desc' && (
                <>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Prompt</label>
                    <input className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={questionForm.prompt} onChange={(e)=>setQuestionForm({...questionForm, prompt: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Sample Answer (optional)</label>
                    <textarea className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder-gray-500" rows={3} value={questionForm.sample_answer} onChange={(e)=>setQuestionForm({...questionForm, sample_answer: e.target.value})} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-slate-600 mb-1">Points</label>
                <input type="number" min={1} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={questionForm.points} onChange={(e)=>setQuestionForm({...questionForm, points: Number(e.target.value)})} />
              </div>

              <div className="flex items-center gap-2">
                <button disabled={saving || !token} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{editingQuestion ? 'Update' : 'Add question'}</button>
                {editingQuestion && <button type="button" onClick={resetQuestionForm} className="h-10 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Cancel</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
