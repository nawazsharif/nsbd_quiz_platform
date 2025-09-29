'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

type Category = { id: number; name: string; slug?: string }

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getCategories(undefined, 1, 60)
      const list = (res?.data?.data ?? res?.data ?? res) as any
      setItems((list?.data ?? list) as Category[])
    } catch (e: any) {
      setError(e.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Categories" subtitle="Browse content by category" />

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      {loading ? (
        <div className="bg-white border rounded-xl p-6">
          <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="h-10 w-10 rounded-lg bg-slate-200 mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">No categories found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(c => (
            <Link key={c.id} href={`/categories/${c.slug || c.id}`} className="group rounded-xl border p-4 hover:shadow-md transition">
              <div className="h-10 w-10 rounded-lg bg-slate-900 text-white grid place-items-center mb-2">{c.name?.charAt(0).toUpperCase()}</div>
              <div className="font-medium text-slate-900 group-hover:text-emerald-700">{c.name}</div>
              <div className="text-xs text-slate-500">{c.slug}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
