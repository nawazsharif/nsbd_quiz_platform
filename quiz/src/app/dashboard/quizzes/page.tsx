'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/dashboard/PageHeader'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'

export default function MyQuizzesPage() {
  const { user, isAdmin } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [submittingId, setSubmittingId] = useState<string|number|undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<'all'|'published'|'pending_review'|'my_drafts'|'my_rejected'>(() => {
    const f = (searchParams?.get('filter') || 'all') as any
    return (['all','published','pending_review','my_drafts','my_rejected'] as const).includes(f) ? f : 'all'
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getQuizzes(page, 100)
      // Normalize Laravel paginator { data: [], meta: {...} } or raw []
      const list = (res?.data?.data ?? res?.data ?? res) as any
      const all: any[] = (Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [])
      setItems(all)
    } catch (e: any) {
      setError(e.message || 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  // Sync filter to URL when it changes
  useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString() || '')
    sp.set('filter', statusFilter)
    router.replace(`${pathname}?${sp.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const uid = String(user?.id || '')
  const isOwner = (q: any) => String(q.owner_id ?? q.user_id ?? q.created_by ?? q.createdBy ?? q.author?.id) === uid

  const visible = useMemo(() => {
    // Default view: all published + pending
    let list = items as any[]
    if (statusFilter === 'published') list = list.filter(q => (q.status || (q.published ? 'published' : 'draft')) === 'published')
    else if (statusFilter === 'pending_review') list = list.filter(q => (q.status === 'pending_review' || q.status === 'waiting'))
    else if (statusFilter === 'my_drafts') list = list.filter(q => isOwner(q) && (q.status || 'draft') === 'draft')
    else if (statusFilter === 'my_rejected') list = list.filter(q => isOwner(q) && (q.status || '') === 'rejected')
    else list = list.filter(q => {
      const s = (q.status || (q.published ? 'published' : 'draft')) as string
      return s === 'published' || s === 'pending_review' || s === 'waiting'
    })
    return list
  }, [items, statusFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="Quizzes"
        subtitle="Browse published and pending quizzes"
        actions={[{ label: 'Create Quiz', href: '/quiz/create' }]}
      />

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{notice}</div>}

      <div className="overflow-x-auto bg-white border rounded-lg">
        <div className="flex items-center justify-between p-3 border-b bg-slate-50">
          <div className="text-sm text-slate-700">Showing {statusFilter === 'all' ? 'Published & Pending' : statusFilter.replace('_',' ')}</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Filter</label>
            <select
              value={statusFilter}
              onChange={(e)=> setStatusFilter(e.target.value as any)}
              className="h-8 px-2 rounded-md border text-sm bg-white"
            >
              <option value="all">Published & Pending</option>
              <option value="published">Published</option>
              <option value="pending_review">Pending</option>
              <option value="my_drafts">My Drafts</option>
              <option value="my_rejected">My Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-slate-600">
            <div className="text-xl font-semibold text-slate-800 mb-2">No quizzes to show</div>
            <p className="mb-4">Adjust filters or create your first quiz.</p>
            <Link href="/quiz/create" className="inline-flex h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Create Quiz</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-4 py-2">Difficulty</th>
                <th className="text-left px-4 py-2">Visibility</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Created</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q: any) => (
                <tr key={q.id} className="border-t">
                  <td className="px-4 py-2 text-slate-900">{q.title}</td>
                  <td className="px-4 py-2 capitalize">{q.difficulty || '-'}</td>
                  <td className="px-4 py-2 capitalize">{q.visibility || 'public'}</td>
                  <td className="px-4 py-2">
                    {(() => {
                      const status: string = (q.status || (q.published ? 'published' : 'draft')) as string
                      const colors: Record<string, string> = {
                        draft: 'bg-slate-100 text-slate-700',
                        waiting: 'bg-amber-100 text-amber-800',
                        pending_review: 'bg-amber-100 text-amber-800',
                        approved: 'bg-emerald-100 text-emerald-800',
                        rejected: 'bg-red-100 text-red-800',
                        published: 'bg-blue-100 text-blue-800',
                      }
                      const cls = colors[status] || 'bg-slate-100 text-slate-700'
                      const label = String(status).replace('_',' ')
                      return <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${cls}`}>{label}</span>
                    })()}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {(() => {
                      const returnUrl = `${pathname}?${new URLSearchParams({ filter: statusFilter }).toString()}`
                      return (
                        <>
                          <Link href={`/quiz/${q.id}?return=${encodeURIComponent(returnUrl)}`} className="inline-flex items-center h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">View</Link>
                          {(isOwner(q) || isAdmin) && (
                            <Link href={`/quiz/builder/${q.id}?return=${encodeURIComponent(returnUrl)}`} className="inline-flex items-center h-8 px-2 rounded-md border text-gray-900 hover:bg-gray-50">Edit</Link>
                          )}
                        </>
                      )
                    })()}
                    {(() => {
                      const status: string = (q.status || (q.published ? 'published' : 'draft')) as string
                      const canSubmit = (status === 'draft' || status === 'rejected') && isOwner(q)
                      if (!canSubmit) return null
                      const label = status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'
                      return (
                        <button
                          disabled={!token || submittingId === q.id}
                          onClick={async () => {
                            if (!token) return
                            setSubmittingId(q.id)
                            setError('')
                            setNotice('')
                            try {
                              await authAPI.submitQuiz(token, q.id)
                              // update local state optimistically
                              setItems(prev => prev.map(item => item.id === q.id ? { ...item, status: 'pending_review' } : item))
                              setNotice(status === 'rejected' ? 'Resubmitted for approval' : 'Submitted for approval')
                            } catch (e: any) {
                              setError(e.message || 'Failed to submit for approval')
                            } finally {
                              setSubmittingId(undefined)
                            }
                          }}
                          className="inline-flex items-center h-8 px-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {submittingId === q.id ? 'Submitting...' : label}
                        </button>
                      )
                    })()}
                    {(() => {
                      const status: string = (q.status || (q.published ? 'published' : 'draft')) as string
                      const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin'
                      const canDelete = (isOwner(q) && status !== 'published') || isSuperAdmin
                      if (!canDelete) return null
                      return (
                        <button
                          disabled={!token}
                          onClick={async () => {
                            if (!token) return
                            if (!confirm('Request deletion? This will require superadmin approval and may be irreversible. Continue?')) return
                            try {
                              await authAPI.deleteQuiz(token, q.id)
                              setItems(prev => prev.filter(item => item.id !== q.id))
                              setNotice('Delete request submitted')
                            } catch (e: any) {
                              setError(e.message || 'Failed to delete quiz')
                            }
                          }}
                          className="inline-flex items-center h-8 px-2 rounded-md border text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
