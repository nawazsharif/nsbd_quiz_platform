'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authAPI } from '@/lib/auth-utils'
import { formatTaka } from '@/lib/utils'
import PageHeader from '@/components/dashboard/PageHeader'

export default function WalletPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [balance, setBalance] = useState<{ balance_cents: number }>({ balance_cents: 0 })
  const [amount, setAmount] = useState(500)
  const [provider, setProvider] = useState<'bkash'|'sslcommerz'>('bkash')
  const [txId, setTxId] = useState('')
  const [withAmount, setWithAmount] = useState(500)
  const [withdrawProvider, setWithdrawProvider] = useState<'bkash'|'sslcommerz'>('sslcommerz')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountMobile, setAccountMobile] = useState('')

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

  const queryString = searchParams?.toString()

  useEffect(() => {
    if (typeof window === 'undefined' || !queryString) return

    const params = new URLSearchParams(queryString)
    const status = params.get('status')
    const providerParam = params.get('provider')
    const messageParam = params.get('message')
    const transactionId = params.get('transaction_id')

    if (providerParam !== 'sslcommerz' || !status) {
      return
    }

    if (status === 'success') {
      const txSnippet = transactionId ? ` (#${transactionId})` : ''
      setNotice(`SSLCommerz recharge completed${txSnippet}`)
      setError('')
    } else if (status === 'failed') {
      setError(messageParam || 'SSLCommerz recharge failed')
      setNotice('')
    } else if (status === 'cancelled') {
      setError('SSLCommerz recharge cancelled')
      setNotice('')
    }

    const next = new URL(window.location.href)
    next.searchParams.delete('status')
    next.searchParams.delete('provider')
    next.searchParams.delete('transaction_id')
    next.searchParams.delete('message')
    const query = next.searchParams.toString()
    router.replace(`${next.pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }, [queryString, router])

  const recharge = async () => {
    if (!token) return
    setError('')
    setNotice('')
    try {
      const amountCents = Math.round(Number(amount || 0) * 100)
      const tx = await authAPI.rechargeWallet(token, amountCents, provider)
      const gatewayUrl = tx?.gateway_url || tx?.data?.gateway_url
      if (provider === 'sslcommerz' && gatewayUrl) {
        window.location.href = gatewayUrl
        return
      }
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
    if (withdrawProvider === 'sslcommerz' && (!accountNumber || !accountName)) {
      setError('Account number and name are required for SSLCommerz withdrawals')
      return
    }
    setError('')
    setNotice('')
    try {
      const meta = withdrawProvider === 'sslcommerz' ? {
        account_number: accountNumber,
        account_name: accountName,
        account_mobile: accountMobile,
      } : undefined
      const withdrawalCents = Math.round(Number(withAmount || 0) * 100)
      await authAPI.requestWithdrawal(token, withdrawalCents, withdrawProvider, meta)
      setAccountNumber('')
      setAccountName('')
      setAccountMobile('')
      await load()
    } catch (e: any) {
      setError(e.message || 'Withdrawal failed')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="Wallet" subtitle="Manage balance, recharge and withdrawals" />
      <div className="bg-white border rounded-xl p-4">
        {notice && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{notice}</div>}
        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="flex items-end gap-4">
            <div>
              <div className="text-sm text-slate-600">Current Balance</div>
              <div className="text-3xl font-bold text-slate-900">{formatTaka(balance.balance_cents, { fromCents: true })}</div>
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
              <label className="block text-sm text-slate-600 mb-1">Amount (৳)</label>
              <input type="number" min={1} step="0.01" className="h-10 w-full rounded-md border px-3" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} />
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
              <label className="block text-sm text-slate-600 mb-1">Provider</label>
              <select className="h-10 rounded-md border px-3" value={withdrawProvider} onChange={(e)=>setWithdrawProvider(e.target.value as any)}>
                <option value="sslcommerz">SSLCommerz</option>
                <option value="bkash">bKash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Amount (৳)</label>
              <input type="number" min={1} step="0.01" className="h-10 w-full rounded-md border px-3" value={withAmount} onChange={(e)=>setWithAmount(Number(e.target.value))} />
            </div>
            {withdrawProvider === 'sslcommerz' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Account Number</label>
                  <input className="h-10 w-full rounded-md border px-3" value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Account Holder Name</label>
                  <input className="h-10 w-full rounded-md border px-3" value={accountName} onChange={(e)=>setAccountName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Mobile (optional)</label>
                  <input className="h-10 w-full rounded-md border px-3" value={accountMobile} onChange={(e)=>setAccountMobile(e.target.value)} />
                </div>
              </div>
            )}
            <button onClick={withdraw} className="h-9 px-3 rounded-md bg-slate-900 text-white hover:bg-slate-800">Request Withdrawal</button>
          </div>
        </div>
      </div>
    </div>
  )
}
