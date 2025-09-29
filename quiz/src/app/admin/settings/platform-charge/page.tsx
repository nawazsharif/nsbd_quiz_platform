'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

export default function PlatformChargeSettingsPage() {
  const { user } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizPct, setQuizPct] = useState(0)
  const [coursePct, setCoursePct] = useState(0)
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
      setQuizPct(Number(q?.platform_commission_percent || 0))
      setCoursePct(Number(c?.course_platform_commission_percent || 0))
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
        authAPI.updateQuizSettings(token, { paid_quiz_approval_amount_cents: 0, platform_commission_percent: quizPct }),
        authAPI.updateCourseSettings(token, { course_approval_fee_cents: 0, course_platform_commission_percent: coursePct })
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
        <p className="text-gray-600">Only superadmin can access platform charge settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Platform Charge Fee" subtitle="Set commission percentages for quizzes and courses" />
      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading ? (
        <div className="text-slate-600">Loading...</div>
      ) : (
        <div className="bg-white border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Quiz Platform Charge (%)</label>
            <input type="number" min={0} max={100} className="h-10 w-full rounded-md border px-3" value={quizPct} onChange={(e)=>setQuizPct(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Course Platform Charge (%)</label>
            <input type="number" min={0} max={100} className="h-10 w-full rounded-md border px-3" value={coursePct} onChange={(e)=>setCoursePct(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <button disabled={saving} onClick={onSave} className="h-10 px-4 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
