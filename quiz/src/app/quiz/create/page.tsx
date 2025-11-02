'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { Plus } from 'lucide-react'
import TiptapEditor from '@/components/editor/TiptapEditor'
import { formatTaka } from '@/lib/utils'

export default function CreateQuizPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    is_paid: false,
    price_cents: 0,
    timer_seconds: 1800,
    visibility: 'public',
    status: 'draft',
    category_id: null as number | null,
    negative_marking: false,
    negative_mark_value: null as number | null,
  })
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [timerMinutes, setTimerMinutes] = useState<number>(Math.round(30))
  const [addFirstQuestion, setAddFirstQuestion] = useState(false)
  const [qType, setQType] = useState<'mcq'|'true_false'>('mcq')
  const [qText, setQText] = useState('')
  const [qPoints, setQPoints] = useState(1)
  const [multipleCorrect, setMultipleCorrect] = useState(false)
  const [tfCorrect, setTfCorrect] = useState<'true'|'false'>('true')
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { setError('Please sign in'); return }

    if (form.negative_marking) {
      const value = form.negative_mark_value
      if (value === null || !Number.isFinite(value) || value <= 0) {
        setError('Negative mark value is required and must be greater than 0 when negative marking is enabled.')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const negativeValue = form.negative_marking ? form.negative_mark_value : null
      const payload = {
        ...form,
        price_cents: form.is_paid ? form.price_cents : 0,
        timer_seconds: Math.max(0, Math.round(Number(timerMinutes) || 0) * 60),
        negative_mark_value: negativeValue,
      }
      const res = await authAPI.createQuiz(token, payload as any)
      const id = res?.id || res?.data?.id
      if (!id) throw new Error('Quiz created but no ID returned')
      // Optionally create first question
      if (addFirstQuestion) {
        try {
          if (qType === 'mcq') {
            const mcq = {
              type: 'mcq',
              order_index: 1,
              text: qText,
              multiple_correct: !!multipleCorrect,
              points: qPoints,
              options: options.filter(o=>o.text.trim()).map(o=>({ text: o.text, is_correct: !!o.is_correct }))
            }
            await authAPI.createQuestion(token, id, mcq)
          } else {
            const tf = { type: 'true_false', order_index: 1, text: qText, correct_boolean: tfCorrect === 'true', points: qPoints }
            await authAPI.createQuestion(token, id, tf)
          }
        } catch (e) {
          // Non-blocking; still proceed to builder
          console.warn('Failed to create first question', e)
        }
      }
      router.push(`/quiz/builder/${id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create quiz')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    // Fetch categories for selection (public)
    authAPI.getCategories(undefined, 1, 100)
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
        setCategories(list.map((c: any) => ({ id: c.id, name: c.name })))
      })
      .catch(() => setCategories([]))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Create Quiz" subtitle="Add basic details. You can add questions next." />
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={onSubmit} className="lg:col-span-2 space-y-6 bg-white border rounded-xl p-6">
          <section className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input className="h-10 w-full rounded-md border px-3" placeholder="e.g. JavaScript Fundamentals" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} required />
              <p className="text-xs text-slate-500 mt-1">A clear, descriptive title attracts the right learners.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <TiptapEditor value={form.description} onChange={(html)=>setForm({...form, description: html})} placeholder="Describe what this quiz covers, target audience, and outcomes..." token={token} />
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                className="h-10 w-full rounded-md border px-3"
                value={form.category_id ?? ''}
                onChange={(e)=>setForm({...form, category_id: e.target.value ? Number(e.target.value) : null})}
              >
                <option value="">No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <div className="flex items-center gap-2">
                {(['easy','medium','hard'] as const).map(d => (
                  <button key={d} type="button" onClick={()=>setForm({...form, difficulty: d})} className={`h-9 px-3 rounded-md border text-sm capitalize ${form.difficulty===d?'bg-emerald-50 border-emerald-300 text-emerald-700':''}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <div className="flex items-center gap-2">
                {(['public','private'] as const).map(v => (
                  <button key={v} type="button" onClick={()=>setForm({...form, visibility: v})} className={`h-9 px-3 rounded-md border text-sm capitalize ${form.visibility===v?'bg-emerald-50 border-emerald-300 text-emerald-700':''}`}>{v}</button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timer (minutes)</label>
              <input type="number" min={0} className="h-10 w-full rounded-md border px-3" value={timerMinutes} onChange={(e)=>setTimerMinutes(Number(e.target.value))} />
              <p className="text-xs text-slate-500 mt-1">Set to 0 for no time limit.</p>
            </div>
            <div className="sm:col-span-2 flex items-end gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_paid} onChange={(e)=>setForm({...form, is_paid: e.target.checked})} /> Paid quiz</label>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (৳)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 w-full rounded-md border px-3"
                  value={Number(form.price_cents ?? 0) / 100}
                  onChange={(e)=>setForm({...form, price_cents: Math.round(Number(e.target.value || 0) * 100)})}
                  disabled={!form.is_paid}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 flex items-end gap-3">
              <label className="inline-flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={form.negative_marking}
                  onChange={(e)=>setForm({...form, negative_marking: e.target.checked, negative_mark_value: e.target.checked ? (form.negative_mark_value ?? null) : null})}
                />
                Enable negative marking
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Negative mark value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="h-10 w-full rounded-md border px-3"
                value={form.negative_mark_value ?? ''}
                onChange={(e)=>setForm({...form, negative_mark_value: e.target.value === '' ? null : Number(e.target.value)})}
                disabled={!form.negative_marking}
              />
              <p className="text-xs text-slate-500 mt-1">Deduction per wrong answer when enabled.</p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">Add first question</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={addFirstQuestion} onChange={(e)=>setAddFirstQuestion(e.target.checked)} /> Enable</label>
            </div>
            {addFirstQuestion && (
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <label className={`${qType==='mcq'?'font-semibold text-emerald-700':''}`}><input type="radio" name="qtype" checked={qType==='mcq'} onChange={()=>setQType('mcq')} /> Multiple Choice</label>
                  <label className={`${qType==='true_false'?'font-semibold text-emerald-700':''}`}><input type="radio" name="qtype" checked={qType==='true_false'} onChange={()=>setQType('true_false')} /> True / False</label>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Question</label>
                  <input className="h-10 w-full rounded-md border px-3" value={qText} onChange={(e)=>setQText(e.target.value)} placeholder="Enter the question text" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-slate-700 mb-1">Points</label>
                    <input type="number" min={1} className="h-10 w-full rounded-md border px-3" value={qPoints} onChange={(e)=>setQPoints(Number(e.target.value))} />
                  </div>
                  {qType==='mcq' ? (
                    <div className="flex items-center gap-2 mt-7"><input type="checkbox" checked={multipleCorrect} onChange={(e)=>setMultipleCorrect(e.target.checked)} /> <span className="text-sm">Multiple correct</span></div>
                  ) : (
                    <div className="flex items-center gap-2 mt-7">
                      <span className="text-sm">Correct answer</span>
                      <select className="h-10 rounded-md border px-3" value={tfCorrect} onChange={(e)=>setTfCorrect(e.target.value as any)}>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </div>
                  )}
                </div>
                {qType==='mcq' && (
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="h-10 flex-1 rounded-md border px-3" placeholder={`Option ${idx+1}`} value={opt.text} onChange={(e)=>{
                          const arr=[...options]; arr[idx] = { ...opt, text: e.target.value }; setOptions(arr)
                        }} />
                        <label className="text-xs text-slate-700 flex items-center gap-1"><input type="checkbox" checked={opt.is_correct} onChange={(e)=>{ const arr=[...options]; arr[idx] = { ...opt, is_correct: e.target.checked }; setOptions(arr) }} /> Correct</label>
                        <button type="button" className="h-8 px-2 rounded-md border" onClick={()=>{ const arr=[...options]; arr.splice(idx,1); setOptions(arr) }}>Remove</button>
                      </div>
                    ))}
                    <button type="button" className="inline-flex items-center h-8 px-2 rounded-md border" onClick={()=>setOptions(prev=>[...prev, { text: '', is_correct: false }])}><Plus className="h-4 w-4" /> Add option</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="flex items-center gap-2">
            <button disabled={saving} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create & Continue'}</button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Summary</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li><span className="text-slate-500">Title:</span> {form.title || '—'}</li>
              <li><span className="text-slate-500">Category:</span> {categories.find(c=>c.id===form.category_id)?.name || '—'}</li>
              <li><span className="text-slate-500">Difficulty:</span> {form.difficulty}</li>
              <li><span className="text-slate-500">Visibility:</span> {form.visibility}</li>
              <li><span className="text-slate-500">Timer:</span> {timerMinutes > 0 ? `${timerMinutes} min` : 'No limit'}</li>
              <li><span className="text-slate-500">Pricing:</span> {form.is_paid ? formatTaka(form.price_cents, { fromCents: true }) : 'Free'}</li>
              <li><span className="text-slate-500">Negative marking:</span> {form.negative_marking ? `Yes (-${form.negative_mark_value ?? '?'})` : 'No'}</li>
            </ul>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Tips</h3>
            <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
              <li>Use concise questions and clear options.</li>
              <li>Pick a suitable time limit for the quiz length.</li>
              <li>Keep visibility private while drafting.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
