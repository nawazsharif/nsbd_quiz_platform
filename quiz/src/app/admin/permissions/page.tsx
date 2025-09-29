'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import { Trash2, Plus } from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'

type Permission = { id: number; name: string }

export default function PermissionsPage() {
  const { user: me } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const uniqueByName = <T extends { name?: string }>(arr: T[]) => {
    const seen = new Set<string>()
    const out: T[] = []
    for (const item of arr) {
      const key = (item?.name || '').toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
    return out
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getAllPermissions(token)
      const list = (Array.isArray(res?.data) ? res.data : res) as Permission[]
      setPermissions(uniqueByName(list))
    } catch (e: any) {
      setError(e.message || 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await authAPI.createPermission(newName, token)
      setNewName('')
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to create permission')
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm('Delete this permission?')) return
    try {
      await authAPI.deletePermission(id, token)
      await load()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  if (me?.role !== 'super_admin') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only superadmin can manage permissions.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Permissions" subtitle="Create or remove permissions" />
      <div className="flex items-center justify-between mb-4">
        <form onSubmit={onCreate} className="flex items-center gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New permission name" className="h-9 rounded-md border px-3" />
          <button className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
        </form>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={2}>Loading...</td></tr>
            ) : permissions.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={2}>No permissions found</td></tr>
            ) : (
              permissions.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 text-slate-800">{p.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onDelete(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
