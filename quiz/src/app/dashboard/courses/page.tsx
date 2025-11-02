'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'

type Course = { id: number; title: string; owner_id?: number; visibility?: string; is_paid?: boolean; price_cents?: number; status?: string; created_at?: string }

export default function MyCoursesPage() {
  const { user } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [items, setItems] = useState<Course[]>([])
  const [tab, setTab] = useState<'all'|'draft'|'submitted'|'approved'|'rejected'>('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [drafts, submitted, approved, rejected] = await Promise.all([
        authAPI.getCourses(1, 200, 'draft'),
        authAPI.getCourses(1, 200, 'submitted'),
        authAPI.getCourses(1, 200, 'approved'),
        authAPI.getCourses(1, 200, 'rejected'),
      ])
      const norm = (res:any) => {
        const list = (res?.data?.data ?? res?.data ?? res) as any
        return (Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : []) as Course[]
      }
      const all = [...norm(drafts), ...norm(submitted), ...norm(approved), ...norm(rejected)]
      const uid = Number(user?.id || 0)
      setItems(all.filter(c => Number(c.owner_id ?? 0) === uid))
    } catch (e:any) {
      setError(e.message || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  const visible = useMemo(() => {
    if (tab === 'all') return items
    return items.filter(c => (c.status||'').toLowerCase() === tab)
  }, [items, tab])

  const submit = async (id: number) => {
    if (!token) return
    setError(''); setNotice('')
    try {
      await authAPI.submitCourse(token, id)
      setItems(prev => prev.map(c => c.id === id ? { ...c, status: 'submitted' } : c))
      setNotice('Submitted for approval')
    } catch (e:any) { setError(e.message || 'Failed to submit') }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="My Courses" subtitle="Create, edit and submit courses for approval" actions={[{ label: 'Create Course', href: '/course/create' }]} />

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{notice}</div>}

      <div className="bg-white border rounded-xl">
        <div className="border-b px-4 py-2 flex items-center gap-2 text-sm">
          {(['all','draft','submitted','approved','rejected'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`h-8 px-2 rounded-md border ${tab===t?'bg-emerald-50 border-emerald-300 text-emerald-700':''}`}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div className="p-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-slate-600">No courses found for the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-2">Title</th>
                    <th className="text-left px-4 py-2">Visibility</th>
                    <th className="text-left px-4 py-2">Price</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Created</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-2 text-slate-900">{c.title}</td>
                      <td className="px-4 py-2 capitalize">{c.visibility || 'public'}</td>
                      <td className="px-4 py-2">{c.is_paid ? formatTaka(Number(c.price_cents || 0), { fromCents: true }) : 'Free'}</td>
                      <td className="px-4 py-2">
                        {(() => {
                          const s = (c.status || 'draft').toLowerCase()
                          const colors: Record<string, string> = { draft: 'bg-slate-100 text-slate-700', submitted: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800' }
                          return <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${colors[s]||''}`}>{s}</span>
                        })()}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <Link href={`/courses/${c.id}`} className="inline-flex items-center h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">View</Link>
                        <Link href={`/course/builder/${c.id}`} className="inline-flex items-center h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">Edit</Link>
                        {(['draft','rejected'] as const).includes((c.status||'draft').toLowerCase() as any) && (
                          <button onClick={()=>submit(c.id)} disabled={!token} className="inline-flex items-center h-8 px-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">Submit for Approval</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
