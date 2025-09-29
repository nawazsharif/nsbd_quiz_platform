'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/auth'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'

interface Course {
  id: number
  title: string
  visibility?: string
  is_paid: boolean
  price_cents?: number
  status?: string
  created_at?: string
}

interface SessionWithToken {
  accessToken?: string
}

export default function CourseApprovalsPage() {
  const { user } = useAuth()
  const { hasPermission, isLoading } = usePermissions()
  const { data: session } = useSession()
  const token = (session as SessionWithToken)?.accessToken
  const [items, setItems] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getCourses(1, 200, 'submitted')
      const list = res?.data?.data ?? res?.data ?? res
      const all: Course[] = (Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [])
      setItems(all)
    } catch(e: unknown){
      const errorMessage = e instanceof Error ? e.message : 'Failed to load courses'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

  const canApprove = user && (user.role === 'admin' || user.role === 'super_admin' || hasPermission(PERMISSIONS.APPROVE_COURSE))

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Course Approvals" subtitle="Review and approve submitted courses" />
        <div className="bg-white border rounded-xl p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!canApprove) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">You do not have permission to approve courses.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Course Approvals" subtitle="Review and approve submitted courses" />

      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{notice}</div>}

      <div className="bg-white border rounded-xl p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-lg font-semibold text-slate-800 mb-1">No pending approvals</div>
            <p className="text-slate-600">Courses waiting for review will show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c)=> (
              <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium text-slate-900">{c.title}</div>
                  <div className="text-xs text-slate-500">#{c.id} • {c.visibility || 'public'} • {c.is_paid ? `$${((c.price_cents||0)/100).toFixed(2)}` : 'Free'}</div>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={async ()=>{
                      if (!token) return
                      setError(''); setNotice('')
                      try {
                        await authAPI.approveCourse(token, c.id)
                        setItems(prev=>prev.filter(it=>it.id!==c.id))
                        setNotice('Course approved')
                      } catch(e: unknown){
                        const errorMessage = e instanceof Error ? e.message : 'Failed to approve'
                        setError(errorMessage)
                      }
                    }}
                    className="h-8 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                  >Approve</button>
                  <button
                    onClick={async ()=>{
                      if (!token) return
                      const reason = window.prompt('Rejection reason (optional)') || undefined
                      setError(''); setNotice('')
                      try {
                        await authAPI.rejectCourse(token, c.id, reason)
                        setItems(prev=>prev.filter(it=>it.id!==c.id))
                        setNotice('Course rejected')
                      } catch(e: unknown){
                        const errorMessage = e instanceof Error ? e.message : 'Failed to reject'
                        setError(errorMessage)
                      }
                    }}
                    className="h-8 px-3 rounded-md border text-gray-900 hover:bg-gray-50"
                  >Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
