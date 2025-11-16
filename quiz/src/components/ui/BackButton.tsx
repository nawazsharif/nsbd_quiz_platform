'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  fallbackUrl?: string
  label?: string
  className?: string
}

export default function BackButton({
  fallbackUrl = '/',
  label = 'Back',
  className = ''
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // Try to go back in history, if no history, go to fallback
    if (window.history.length > 2) {
      router.back()
    } else {
      router.push(fallbackUrl)
    }
  }

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group ${className}`}
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span className="font-medium">{label}</span>
    </button>
  )
}
