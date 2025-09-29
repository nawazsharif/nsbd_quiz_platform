'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

type Provider = {
  id?: number
  provider: string
  enabled: boolean
  config: Record<string, any>
}

export default function PaymentSettingsPage() {
  const { user } = useAuth()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<Provider[]>([])
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [configs, setConfigs] = useState<Record<string, string>>({})

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getPaymentProviders(token)
      const list: Provider[] = Array.isArray(res) ? res : (res?.data || [])
      setProviders(list)
      const initial: Record<string, string> = {}
      for (const p of list) initial[p.provider] = JSON.stringify(p.config || {}, null, 2)
      setConfigs(initial)
    } catch (e: any) {
      setError(e.message || 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const toggleEnabled = async (prov: Provider, enabled: boolean) => {
    if (!token) return
    setSaving((s) => ({ ...s, [prov.provider]: true }))
    try {
      await authAPI.updatePaymentProvider(token, prov.provider, { enabled })
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to update')
    } finally {
      setSaving((s) => ({ ...s, [prov.provider]: false }))
    }
  }

  const saveConfig = async (prov: Provider) => {
    if (!token) return
    setSaving((s) => ({ ...s, [prov.provider]: true }))
    try {
      let parsed: Record<string, any> = {}
      try { parsed = JSON.parse(configs[prov.provider] || '{}') } catch { throw new Error('Invalid JSON in config') }
      await authAPI.updatePaymentProvider(token, prov.provider, { config: parsed })
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to save config')
    } finally {
      setSaving((s) => ({ ...s, [prov.provider]: false }))
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">Only superadmin can access payment settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Payment Settings" subtitle="Enable providers and update credentials" />
      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {loading ? (
        <div className="text-slate-600">Loading...</div>
      ) : providers.length === 0 ? (
        <div className="text-slate-600">No providers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((p) => (
            <div key={p.provider} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-900 capitalize">{p.provider}</h2>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={p.enabled} onChange={(e)=>toggleEnabled(p, e.target.checked)} disabled={!!saving[p.provider]} /> Enabled
                </label>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Config (JSON)</label>
                <textarea className="w-full rounded-md border px-3 py-2 font-mono text-xs min-h-[180px]" value={configs[p.provider] || ''} onChange={(e)=>setConfigs((c)=>({ ...c, [p.provider]: e.target.value }))} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={()=>saveConfig(p)} disabled={!!saving[p.provider]} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
