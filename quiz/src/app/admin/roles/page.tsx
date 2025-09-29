'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

type Role = { id: number; name: string }
type Permission = { id: number; name: string }

export default function RolesPage() {
  const { user: me } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [roles, setRoles] = useState<Role[]>([])
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [assigned, setAssigned] = useState<string[]>([])
  const [newRole, setNewRole] = useState('')
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

  const load = async (selectFirst = true) => {
    setLoading(true)
    setError('')
    try {
      const [r, p] = await Promise.all([authAPI.getAllRoles(token), authAPI.getAllPermissions(token)])
      const rolesList = uniqueByName((Array.isArray(r?.data) ? r.data : r) as Role[])
      setRoles(rolesList)
      const permList = uniqueByName((Array.isArray(p?.data) ? p.data : p) as Permission[])
      setPermissions(permList)
      if (selectFirst && rolesList.length > 0) {
        selectRole(rolesList[0])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load roles/permissions')
    } finally {
      setLoading(false)
    }
  }

  const selectRole = async (role: Role) => {
    setActiveRole(role)
    try {
      const rp = await authAPI.getRolePermissions(role.id as any, token)
      const list = Array.isArray(rp) ? rp : (rp as any)?.permissions || []
      const names = Array.from(new Set(list.map((x: any) => x?.name || x?.permission || x)))
      setAssigned(names)
    } catch (e: any) {
      setAssigned([])
    }
  }

  useEffect(() => { load(true) }, [])

  const onToggle = (name: string) => {
    setAssigned((prev) => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const onSave = async () => {
    if (!activeRole) return
    try {
      await authAPI.updateRolePermissions(activeRole.id as any, assigned, token)
      await selectRole(activeRole)
    } catch (e: any) {
      setError(e.message || 'Failed to update permissions')
    }
  }

  const onCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRole.trim()) return
    try {
      const res = await authAPI.createRole(newRole, token)
      setNewRole('')
      await load(false)
    } catch (e: any) {
      setError(e.message || 'Failed to create role')
    }
  }

  if (me?.role !== 'super_admin') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only superadmin can manage roles.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="Roles" subtitle="Create roles and assign permissions" />
      <div className="flex items-center justify-between mb-4">
        <form onSubmit={onCreateRole} className="flex items-center gap-2">
          <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="New role name" className="h-9 rounded-md border px-3" />
          <button className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Create</button>
        </form>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-3">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">All Roles</h2>
          <div className="space-y-1">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-gray-500">No roles found</div>
            ) : roles.map(r => (
              <button key={r.id} onClick={() => selectRole(r)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeRole?.id === r.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}>{r.name}</button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white border rounded-lg p-3">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Permissions</h2>
          {activeRole ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-auto p-1 border rounded-md">
                {permissions.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-2 py-1">
                    <input type="checkbox" className="h-4 w-4" checked={assigned.includes(p.name)} onChange={() => onToggle(p.name)} />
                    <span className="text-sm text-slate-700">{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={onSave} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Select a role to view permissions</div>
          )}
        </div>
      </div>
    </div>
  )
}
