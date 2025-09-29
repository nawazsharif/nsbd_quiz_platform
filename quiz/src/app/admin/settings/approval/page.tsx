'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

export default function ApprovalSettingsPage() {
  const { user } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizFee, setQuizFee] = useState(0)
  const [courseFee, setCourseFee] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [q, c] = await Promise.all([
        authAPI.getQuizSettings(token),
        authAPI.getCourseSettings(token)
      ])
      setQuizFee(Number(q?.paid_quiz_approval_amount_cents || 0))
      setCourseFee(Number(c?.course_approval_fee_cents || 0))
    } catch (e: any) {
      setError(e.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const onSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      await Promise.all([
        authAPI.updateQuizSettings(token, { paid_quiz_approval_amount_cents: quizFee }),
        authAPI.updateCourseSettings(token, { course_approval_fee_cents: courseFee })
      ])
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only superadmin can access approval settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Content Approval Fee" subtitle="Configure quiz and course approval fees" />
      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading ? (
        <div className="text-slate-600">Loading...</div>
      ) : (
        <div className="bg-white border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Quiz Approval Fee (cents)</label>
            <input type="number" min={0} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={quizFee} onChange={(e)=>setQuizFee(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Course Approval Fee (cents)</label>
            <input type="number" min={0} className="h-10 w-full rounded-md border px-3 text-gray-900 placeholder-gray-500" value={courseFee} onChange={(e)=>setCourseFee(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <button disabled={saving} onClick={onSave} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
