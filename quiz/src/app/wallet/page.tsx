'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import PageHeader from '@/components/dashboard/PageHeader'

export default function WalletPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<{ balance_cents: number }>({ balance_cents: 0 })
  const [amount, setAmount] = useState(500)
  const [provider, setProvider] = useState<'bkash'|'sslcommerz'>('bkash')
  const [txId, setTxId] = useState('')
  const [withAmount, setWithAmount] = useState(500)

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.getWalletBalance(token)
      setBalance(res?.data || res)
    } catch (e: any) {
      setError(e.message || 'Failed to load balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const recharge = async () => {
    if (!token) return
    try {
      const tx = await authAPI.rechargeWallet(token, amount, provider)
      setTxId(tx?.transaction_id || tx?.data?.transaction_id || '')
    } catch (e: any) {
      setError(e.message || 'Recharge failed')
    }
  }

  const confirm = async () => {
    if (!token || !txId) return
    try {
      await authAPI.confirmRecharge(token, txId, 'completed')
      setTxId('')
      await load()
    } catch (e: any) {
      setError(e.message || 'Confirm failed')
    }
  }

  const withdraw = async () => {
    if (!token) return
    try {
      await authAPI.requestWithdrawal(token, withAmount)
      await load()
    } catch (e: any) {
      setError(e.message || 'Withdrawal failed')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="Wallet" subtitle="Manage balance, recharge and withdrawals" />
      <div className="bg-white border rounded-xl p-4">
        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="flex items-end gap-4">
            <div>
              <div className="text-sm text-slate-600">Current Balance</div>
              <div className="text-3xl font-bold text-slate-900">${(balance.balance_cents/100).toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Recharge</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Provider</label>
              <select className="h-10 rounded-md border px-3" value={provider} onChange={(e)=>setProvider(e.target.value as any)}>
                <option value="bkash">bKash</option>
                <option value="sslcommerz">SSLCommerz</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Amount (cents)</label>
              <input type="number" min={100} className="h-10 w-full rounded-md border px-3" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={recharge} className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Recharge</button>
              {txId && <button onClick={confirm} className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Confirm</button>}
            </div>
            {txId && <div className="text-xs text-slate-600">Transaction: {txId}</div>}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Withdraw</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Amount (cents)</label>
              <input type="number" min={100} className="h-10 w-full rounded-md border px-3" value={withAmount} onChange={(e)=>setWithAmount(Number(e.target.value))} />
            </div>
            <button onClick={withdraw} className="h-9 px-3 rounded-md bg-slate-900 text-white hover:bg-slate-800">Request Withdrawal</button>
          </div>
        </div>
      </div>
    </div>
  )
}
