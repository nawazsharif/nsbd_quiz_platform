'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { apiBase } from '@/lib/env'

function getApiBase(): string { return apiBase }

export default function ApiHealthBanner() {
  const [visible, setVisible] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState('')

  const check = async () => {
    setChecking(true)
    const base = getApiBase()
    try {
      // A simple GET; if it resolves (even 404), server is reachable through our route
      await fetch(`${base}/health`, { cache: 'no-store' })
      setVisible(false)
      setMessage('')
    } catch (_e1) {
      try {
        await fetch(base, { cache: 'no-store' })
        setVisible(false)
        setMessage('')
      } catch (_e2) {
        setVisible(true)
        setMessage(
          'Unable to reach the backend API. Check API_PROXY_TARGET or NEXT_PUBLIC_API_URL and restart the dev server.'
        )
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    check()
    // Re-check on visibility changes (tab focus) to recover fast
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div className="sticky top-16 z-40 bg-red-50 border-b border-red-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">
            <div className="font-medium">API connection problem</div>
            <div className="mt-0.5">
              {message}
              <ul className="list-disc ml-5 mt-1">
                <li>If using proxy (default), set API_PROXY_TARGET to your Laravel host (e.g., http://api.quiz.test) and restart</li>
                <li>Or set NEXT_PUBLIC_API_URL to your API (e.g., http://api.quiz.test/api) for direct access</li>
                <li>Ensure the Laravel server is running and accessible</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={check}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-md border text-red-700 hover:bg-red-100 disabled:opacity-50"
              disabled={checking}
              title="Retry"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              Retry
            </button>
            <button onClick={() => setVisible(false)} className="h-8 w-8 grid place-items-center rounded-md hover:bg-red-100" title="Dismiss">
              <X className="h-4 w-4 text-red-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
