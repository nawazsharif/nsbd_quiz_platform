'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import { Pencil, Trash2, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'

type Category = { id: number; name: string; slug?: string; parent_id?: number | null }

export default function CategoriesPage() {
  const { user: me } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<Category[]>([])
  const [form, setForm] = useState<{ id?: number; name: string; slug?: string; parent_id?: number | null }>({ name: '', slug: '', parent_id: null })
  const [saving, setSaving] = useState(false)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const canWrite = me && (me.role === 'admin' || me.role === 'super_admin')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (!token) {
        throw new Error('Session expired. Please sign in again to manage categories.')
      }

      const res = await authAPI.getCategories(token, page, 50, search || undefined)
      const list = (res?.data || res?.data?.data || res?.data?.data || res?.data) ?? res
      setItems((list?.data ?? list) as Category[])
      const meta = res?.meta || {}
      setTotal(meta.total || (list?.data ?? list)?.length || 0)
      // For parent select (first page fetch all up to 500)
      try {
        const all = await authAPI.getCategories(token, 1, 500)
        const flat = ((all?.data?.data ?? all?.data) ?? all) as any
        setAllCategories((flat?.data ?? flat) as Category[])
      } catch {}
    } catch (e: any) {
      setError(e.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [page, token])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      if (form.id) {
        await authAPI.updateCategory(form.id, { name: form.name, slug: form.slug, parent_id: form.parent_id ?? null }, token)
      } else {
        await authAPI.createCategory({ name: form.name, slug: form.slug, parent_id: form.parent_id ?? null }, token)
      }
      setForm({ name: '', slug: '', parent_id: null })
      setPage(1)
      await load()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (c: Category) => {
    setForm({ id: c.id, name: c.name, slug: c.slug, parent_id: c.parent_id ?? null })
  }

  const onDelete = async (c: Category) => {
    if (!token) return
    if (!confirm(`Delete category "${c.name}"?`)) return
    try {
      await authAPI.deleteCategory(c.id, token)
      await load()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  if (!canWrite) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only admin or superadmin can manage categories.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Categories" subtitle="Manage categories and subcategories" />

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">{form.id ? 'Edit Category' : 'Create Category'}</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 w-full rounded-md border px-3" required />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Slug (optional)</label>
              <input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-10 w-full rounded-md border px-3" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Parent Category (optional)</label>
              <select value={String(form.parent_id ?? '')} onChange={(e)=> setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })} className="h-10 w-full rounded-md border px-3 text-gray-900">
                <option value="">— None (Top level)</option>
                {allCategories.filter(c=>!form.id || c.id !== form.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={saving} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">{form.id ? 'Update' : 'Create'}</button>
              {form.id && (
                <button type="button" onClick={() => setForm({ name: '', slug: '', parent_id: null })} className="h-10 px-3 rounded-md border">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="h-10 rounded-md border px-3 w-60" />
            <button onClick={() => { setPage(1); load() }} className="h-10 px-3 rounded-md border">Search</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Slug</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6" colSpan={3}>
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                    </div>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={3}>No categories found</td></tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 text-slate-800">
                        <div className="flex items-center gap-2">
                          {allCategories.some(sc=>sc.parent_id===c.id) ? (
                            <button onClick={()=>setExpanded(prev=>({ ...prev, [c.id]: !prev[c.id] }))} className="h-6 w-6 inline-flex items-center justify-center rounded border">
                              {expanded[c.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                            </button>
                          ) : <span className="h-6 w-6"/>}
                          <span>{c.name}</span>
                        </div>
                        {expanded[c.id] && (
                          <div className="mt-2 ml-8 space-y-1">
                            {allCategories.filter(sc=>sc.parent_id===c.id).map(sc=> (
                              <div key={sc.id} className="flex items-center justify-between">
                                <div className="text-slate-700">— {sc.name}</div>
                                <div className="space-x-2">
                                  <button onClick={() => onEdit(sc)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs"><Pencil className="h-3 w-3"/> Edit</button>
                                  <button onClick={() => onDelete(sc)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs"><Trash2 className="h-3 w-3"/> Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{c.slug}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          onClick={() => onEdit(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                          title="Edit category"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => onDelete(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                          title="Delete category"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination simple */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-9 px-3 rounded-md border disabled:opacity-50 text-gray-900 hover:bg-gray-50">Prev</button>
            <span className="text-sm text-slate-600">Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 12} className="h-9 px-3 rounded-md border disabled:opacity-50 text-gray-900 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
