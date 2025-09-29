'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, BookOpen, Target, BarChart3, Trophy } from 'lucide-react'

interface QuizNavigationProps {
  quizId: string
  quizTitle?: string
  returnTo?: string
  currentPage: 'details' | 'take' | 'results' | 'ranking'
  showBreadcrumb?: boolean
  className?: string
}

export default function QuizNavigation({
  quizId,
  quizTitle,
  returnTo,
  currentPage,
  showBreadcrumb = true,
  className = ''
}: QuizNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Quizzes', href: '/quizzes', icon: BookOpen },
    ]

    if (quizTitle) {
      items.push({
        label: quizTitle.length > 30 ? `${quizTitle.slice(0, 30)}...` : quizTitle,
        href: `/quiz/${quizId}`,
        icon: Target
      })
    }

    if (currentPage === 'take') {
      items.push({ label: 'Taking Quiz', href: '', icon: Target })
    } else if (currentPage === 'results') {
      items.push({ label: 'Results', href: '', icon: BarChart3 })
    } else if (currentPage === 'ranking') {
      items.push({ label: 'Ranking', href: '', icon: Trophy })
    }

    return items
  }

  const getBackButtonAction = () => {
    // If there's a returnTo parameter, use it
    if (returnTo) {
      return () => router.push(returnTo)
    }

    // Otherwise, navigate based on current page
    switch (currentPage) {
      case 'take':
        return () => router.push(`/quiz/${quizId}`)
      case 'results':
        return () => router.push(`/quiz/${quizId}`)
      case 'ranking':
        return () => router.push(`/quiz/${quizId}`)
      default:
        return () => router.back()
    }
  }

  const getBackButtonLabel = () => {
    if (returnTo) {
      return 'Back to Course'
    }

    switch (currentPage) {
      case 'take':
        return 'Back to Quiz'
      case 'results':
        return 'Back to Quiz'
      case 'ranking':
        return 'Back to Quiz'
      default:
        return 'Back'
    }
  }

  const breadcrumbItems = getBreadcrumbItems()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      {showBreadcrumb && (
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && <span className="text-gray-400">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center space-x-1 hover:text-gray-900 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="flex items-center space-x-1 text-gray-900 font-medium">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={getBackButtonAction()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {getBackButtonLabel()}
        </button>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {currentPage === 'details' && (
            <>
              <Link
                href={`/quiz/${quizId}/take${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Target className="w-4 h-4" />
                Take Quiz
              </Link>
              <Link
                href={`/quiz/${quizId}/results${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                View Results
              </Link>
              <Link
                href={`/quiz/${quizId}/ranking${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Trophy className="w-4 h-4" />
                Ranking
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
