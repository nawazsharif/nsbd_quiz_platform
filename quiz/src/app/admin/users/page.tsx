'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'
import { Trash2, UserPlus } from 'lucide-react'

type Role = { id: number; name: string }
type UserRow = { id: string; name: string; email: string; roles?: { name: string }[] }

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState<string>('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [u, r] = await Promise.all([
        authAPI.getUsers(token, 1, 100),
        authAPI.getAllRoles(token)
      ])
      const list = (u?.data?.data || u?.data || u || []) as any[]
      setUsers(list as UserRow[])
      setRoles((Array.isArray(r?.data) ? r.data : r) as Role[])
    } catch (e: any) {
      setError(e.message || 'Failed to load users/roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const currentRoleName = (u: UserRow) => (u.roles && u.roles[0]?.name) || 'user'

  const onChangeRole = async (u: UserRow, roleName: string) => {
    try {
      const role = roles.find(r => r.name === roleName)
      if (!role) throw new Error('Role not found')
      await authAPI.assignRoleToUser(role.id, u.id, token)
      // Optionally revoke other roles (keep it simple: best-effort)
      for (const r of roles) {
        if (r.name !== roleName && (u.roles || []).some(rr => rr.name === r.name)) {
          try { await authAPI.revokeRoleFromUser(r.id, u.id, token) } catch {}
        }
      }
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to change role')
    }
  }

  const onDelete = async (u: UserRow) => {
    if (!confirm(`Delete user ${u.email}?`)) return
    try {
      await authAPI.deleteUser(u.id, token)
      await load()
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  if (me?.role !== 'super_admin') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only superadmin can access user management.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title="User Management" subtitle="Assign roles and manage users" actions={[{ label: 'Add User', variant: 'primary' }]} />

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="overflow-x-auto bg-white border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={4}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={4}>No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-2 text-slate-700">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      className="h-9 rounded-md border px-2 text-sm"
                      value={currentRoleName(u)}
                      onChange={(e) => onChangeRole(u, e.target.value)}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onDelete(u)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
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
