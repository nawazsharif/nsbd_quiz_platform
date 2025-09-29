'use client'

import { useState } from 'react'
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail, 
  MessageCircle,
  QrCode,
  Download,
  Check,
  ExternalLink,
  Users,
  Globe,
  Lock
} from 'lucide-react'

type Quiz = {
  id: string | number
  title: string
  description?: string
  category?: string
  difficulty?: string
  questions_count?: number
  time_limit?: number
  is_public?: boolean
}

type ShareQuizProps = {
  quiz: Quiz
  className?: string
  variant?: 'button' | 'modal' | 'inline'
  showStats?: boolean
}

export default function ShareQuiz({ quiz, className = '', variant = 'button', showStats = false }: ShareQuizProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const quizUrl = `${baseUrl}/quiz/${quiz.id}`
  const shareTitle = `Check out this quiz: ${quiz.title}`
  const shareDescription = quiz.description || `Take this ${quiz.difficulty || ''} quiz about ${quiz.category || 'various topics'}.`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(quizUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = quizUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quizUrl)}&quote=${encodeURIComponent(shareTitle)}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(quizUrl)}&text=${encodeURIComponent(shareTitle)}&hashtags=quiz,learning`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(quizUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600 hover:bg-green-700',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${quizUrl}`)}`
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareDescription}\n\nTake the quiz here: ${quizUrl}`)}`
    }
  ]

  const handleShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400')
  }

  const generateQRCode = () => {
    // Using a free QR code API service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(quizUrl)}`
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.href = generateQRCode()
    link.download = `quiz-${quiz.id}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ShareContent = () => (
    <div className="space-y-6">
      {/* Quiz Info */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{quiz.title}</h3>
        {quiz.description && (
          <p className="text-sm text-slate-600 mb-3">{quiz.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {quiz.questions_count && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {quiz.questions_count} questions
            </span>
          )}
          {quiz.time_limit && (
            <span>{quiz.time_limit} minutes</span>
          )}
          <span className="flex items-center gap-1">
            {quiz.is_public ? (
              <>
                <Globe className="w-3 h-3" />
                Public
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                Private
              </>
            )}
          </span>
        </div>
      </div>

      {/* Copy Link */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Quiz Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quizUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
          />
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Social Media Sharing */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Share on Social Media
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={() => handleShare(option.url)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors ${option.color}`}
            >
              <option.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-700">
            QR Code
          </label>
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            {showQR ? 'Hide' : 'Show'} QR Code
          </button>
        </div>
        
        {showQR && (
          <div className="text-center space-y-3">
            <div className="inline-block p-4 bg-white border rounded-lg">
              <img
                src={generateQRCode()}
                alt="QR Code for quiz"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <button
              onClick={downloadQRCode}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </button>
          </div>
        )}
      </div>

      {/* Embed Code */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Embed Code
        </label>
        <textarea
          value={`<iframe src="${quizUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
          rows={3}
        />
        <p className="text-xs text-slate-500 mt-1">
          Copy this code to embed the quiz on your website
        </p>
      </div>

      {/* Stats (if enabled) */}
      {showStats && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Sharing Stats</h4>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-slate-900">0</div>
              <div className="text-xs text-slate-600">Times Shared</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-slate-900">0</div>
              <div className="text-xs text-slate-600">Views from Shares</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={className}>
        <ShareContent />
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ${className}`}
        >
          <Share2 className="w-4 h-4" />
          Share Quiz
        </button>

        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-slate-900">Share Quiz</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <ShareContent />
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Default button variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ${className}`}
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-20 p-4">
            <ShareContent />
          </div>
        </>
      )}
    </div>
  )
}