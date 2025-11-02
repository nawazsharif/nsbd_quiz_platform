'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import TiptapEditor from '@/components/editor/TiptapEditor'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'

export default function CreateCoursePage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    cover_url: '',
    is_paid: false,
    price_cents: 0,
    visibility: 'public' as 'public'|'private',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { setError('Please sign in'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, price_cents: form.is_paid ? form.price_cents : 0 }
      const res = await authAPI.createCourse(token, payload)
      const id = (res as any)?.id || (res as any)?.data?.id
      if (!id) throw new Error('Course created but no ID returned')
      router.push(`/course/builder/${id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Create Course" subtitle="Add basic details. You can add content next." />
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={onSubmit} className="lg:col-span-2 space-y-6 bg-white border rounded-xl p-6">
          <section className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input className="h-10 w-full rounded-md border px-3" placeholder="e.g. Full-Stack Web Development" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} required />
              <p className="text-xs text-slate-500 mt-1">A clear, descriptive title attracts the right learners.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Summary</label>
              <input className="h-10 w-full rounded-md border px-3" placeholder="One-liner about this course" value={form.summary} onChange={(e)=>setForm({...form, summary: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <TiptapEditor value={form.description} onChange={(html)=>setForm({...form, description: html})} placeholder="Describe what this course covers, who it's for, and outcomes..." token={token} />
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <div className="flex items-center gap-2">
                {(['public','private'] as const).map(v => (
                  <button key={v} type="button" onClick={()=>setForm({...form, visibility: v})} className={`h-9 px-3 rounded-md border text-sm capitalize ${form.visibility===v?'bg-emerald-50 border-emerald-300 text-emerald-700':''}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cover URL</label>
              <input className="h-10 w-full rounded-md border px-3" value={form.cover_url} onChange={(e)=>setForm({...form, cover_url: e.target.value})} placeholder="https://..." />
              <p className="text-xs text-slate-500 mt-1">Optional, used for course card/preview.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3 flex items-end gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_paid} onChange={(e)=>setForm({...form, is_paid: e.target.checked})} /> Paid course</label>
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

          <div className="flex items-center gap-2">
            <button disabled={saving} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create & Continue'}</button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Summary</h3>
            <ul className="text-sm text-slate-700 space-y-1">
              <li><span className="text-slate-500">Title:</span> {form.title || '—'}</li>
              <li><span className="text-slate-500">Visibility:</span> {form.visibility}</li>
              <li><span className="text-slate-500">Pricing:</span> {form.is_paid ? formatTaka(form.price_cents, { fromCents: true }) : 'Free'}</li>
            </ul>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Tips</h3>
            <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
              <li>Use a concise title and summary.</li>
              <li>Keep visibility private while drafting.</li>
              <li>Set a fair price; you can change it later.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
