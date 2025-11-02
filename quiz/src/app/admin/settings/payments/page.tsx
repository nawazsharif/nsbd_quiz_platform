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
  const [structuredConfigs, setStructuredConfigs] = useState<Record<string, any>>({})

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getPaymentProviders(token)
      const list: Provider[] = Array.isArray(res) ? res : (res?.data || [])
      setProviders(list)
      const initial: Record<string, string> = {}
      const structured: Record<string, any> = {}
      for (const p of list) {
        initial[p.provider] = JSON.stringify(p.config || {}, null, 2)
        if (p.provider === 'sslcommerz') {
          const cfg = p.config || {}
          structured[p.provider] = {
            environment: cfg.environment || cfg.env || 'sandbox',
            store_id: cfg.store_id || cfg.storeId || cfg.storeID || '',
            store_password: cfg.store_password || cfg.storePassword || cfg.password || '',
            callback_url: cfg.callback_url || cfg.callbackUrl || '',
          }
        }
        if (p.provider === 'bkash') {
          const cfg = p.config || {}
          structured[p.provider] = {
            environment: cfg.environment || cfg.env || cfg.mode || 'sandbox',
            merchant_id: cfg.merchant_id || cfg.merchantId || cfg.merchant || '',
            merchant_key: cfg.merchant_key || cfg.merchantKey || cfg.key || '',
            app_key: cfg.app_key || cfg.appKey || cfg.app_key || '',
            app_secret: cfg.app_secret || cfg.appSecret || cfg.secret || '',
          }
        }
      }
      setStructuredConfigs(structured)
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
      if (structuredConfigs[prov.provider]) {
        const s = structuredConfigs[prov.provider]
        if (prov.provider === 'sslcommerz') {
          parsed = {
            environment: s.environment,
            store_id: s.store_id,
            store_password: s.store_password,
            callback_url: s.callback_url,
          }
        } else if (prov.provider === 'bkash') {
          parsed = {
            environment: s.environment,
            merchant_id: s.merchant_id,
            merchant_key: s.merchant_key,
            app_key: s.app_key,
            app_secret: s.app_secret,
          }
        } else {
          // fallback to structured object as-is
          parsed = s
        }
      } else {
        try { parsed = JSON.parse(configs[prov.provider] || '{}') } catch { throw new Error('Invalid JSON in config') }
      }
      await authAPI.updatePaymentProvider(token, prov.provider, { config: parsed })
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to save config')
    } finally {
      setSaving((s) => ({ ...s, [prov.provider]: false }))
    }
  }

  const saveSslConfig = async (prov: Provider) => saveConfig(prov)

  const removeProvider = async (prov: Provider) => {
    if (!token) return
    setSaving((s) => ({ ...s, [prov.provider]: true }))
    try {
      // disable and clear config
      await authAPI.updatePaymentProvider(token, prov.provider, { enabled: false, config: {} })
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to remove provider')
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
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((p) => (
            <div key={p.provider} className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-900 capitalize">{p.provider}</h2>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={p.enabled} onChange={(e)=>toggleEnabled(p, e.target.checked)} disabled={!!saving[p.provider]} /> Enabled
                </label>
              </div>

              { (p.provider === 'sslcommerz' || p.provider === 'bkash') ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <label className="block text-sm text-slate-600 mb-1">Environment</label>
                      <select className="w-full rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.environment || 'sandbox'} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), environment: e.target.value } }))}>
                        <option value="sandbox">Sandbox</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                  </div>

                  {p.provider === 'sslcommerz' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Store ID</label>
                        <input className="w-full rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.store_id || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), store_id: e.target.value } }))} />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Store Password</label>
                        <div className="flex items-center gap-2">
                          <input id={`pwd-${p.provider}`} type="password" className="flex-1 rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.store_password || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), store_password: e.target.value } }))} />
                          <button type="button" onClick={()=>{
                            const el = document.getElementById(`pwd-${p.provider}`) as HTMLInputElement | null
                            if (el) el.type = el.type === 'password' ? 'text' : 'password'
                          }} className="px-2 py-1 text-sm border rounded">👁</button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Callback URL (optional)</label>
                        <input className="w-full rounded-md border px-3 py-2" placeholder="https://quiz.example.com/wallet/result" value={structuredConfigs[p.provider]?.callback_url || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), callback_url: e.target.value } }))} />
                        <p className="mt-1 text-xs text-slate-500">Learners will be redirected here after payment success, failure, or cancellation. Status and transaction ID are appended as query params.</p>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">IPN URL</label>
                        <div className="flex items-center gap-2">
                          <input readOnly className="flex-1 rounded-md border px-3 py-2 bg-gray-50 text-sm" value={(typeof window !== 'undefined' ? window.location.origin : '') + '/api/payments/sslcommerz/ipn'} />
                          <button type="button" onClick={async ()=>{ try { await navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + '/api/payments/sslcommerz/ipn'); } catch {} }} className="px-3 py-2 border rounded bg-white text-sm">Copy</button>
                        </div>
                      </div>
                    </>
                  )}

                  {p.provider === 'bkash' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Merchant ID</label>
                        <input className="w-full rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.merchant_id || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), merchant_id: e.target.value } }))} />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Merchant Key</label>
                        <input className="w-full rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.merchant_key || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), merchant_key: e.target.value } }))} />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">App Key</label>
                        <input className="w-full rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.app_key || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), app_key: e.target.value } }))} />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">App Secret</label>
                        <div className="flex items-center gap-2">
                          <input id={`pwd-${p.provider}`} type="password" className="flex-1 rounded-md border px-3 py-2" value={structuredConfigs[p.provider]?.app_secret || ''} onChange={(e)=>setStructuredConfigs((s)=>({ ...s, [p.provider]: { ...(s[p.provider]||{}), app_secret: e.target.value } }))} />
                          <button type="button" onClick={()=>{
                            const el = document.getElementById(`pwd-${p.provider}`) as HTMLInputElement | null
                            if (el) el.type = el.type === 'password' ? 'text' : 'password'
                          }} className="px-2 py-1 text-sm border rounded">👁</button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-600 mb-1">IPN URL</label>
                        <div className="flex items-center gap-2">
                          <input readOnly className="flex-1 rounded-md border px-3 py-2 bg-gray-50 text-sm" value={(typeof window !== 'undefined' ? window.location.origin : '') + '/api/payments/bkash/ipn'} />
                          <button type="button" onClick={async ()=>{ try { await navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : '') + '/api/payments/bkash/ipn'); } catch {} }} className="px-3 py-2 border rounded bg-white text-sm">Copy</button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={()=>saveConfig(p)} disabled={!!saving[p.provider]} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                    <button onClick={()=>removeProvider(p)} disabled={!!saving[p.provider]} className="h-9 px-3 rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Config (JSON)</label>
                    <textarea className="w-full rounded-md border px-3 py-2 font-mono text-xs min-h-[180px]" value={configs[p.provider] || ''} onChange={(e)=>setConfigs((c)=>({ ...c, [p.provider]: e.target.value }))} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={()=>saveConfig(p)} disabled={!!saving[p.provider]} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
                  </div>
                </>
              )}
            </div>
          ))}
          </div>
        <div className="mt-6 flex items-center gap-4">
          <button className="px-4 py-2 rounded-md border bg-white">+ Add New Gateway</button>
          <button className="px-4 py-2 rounded-md border bg-white">+ Add Manual Payment</button>
        </div>
        </div>
      )}
    </div>
  )
}
