'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { authAPI } from '@/lib/auth-utils'

interface BookmarkButtonProps {
  quizId: string | number
  className?: string
  showLabel?: boolean
  onBookmarkChange?: (isBookmarked: boolean) => void
}

export default function BookmarkButton({ 
  quizId, 
  className = '', 
  showLabel = false,
  onBookmarkChange
}: BookmarkButtonProps) {
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('BookmarkButton Debug:', {
      sessionStatus: status,
      hasSession: !!session,
      hasToken: !!token,
      quizId
    })
  }, [session, status, token, quizId])

  // Check if quiz is bookmarked on component mount
  useEffect(() => {
    if (status === 'authenticated' && token && quizId) {
      checkBookmarkStatus();
    }
  }, [token, status, quizId]);

  const checkBookmarkStatus = async () => {
    if (!token) return
    
    try {
      console.log('Checking bookmark status for quiz:', quizId)
      const response = await authAPI.checkQuizBookmark(token, quizId)
      console.log('Bookmark check response:', response)
      const bookmarked = response.bookmarked || false
      setIsBookmarked(bookmarked)
      onBookmarkChange?.(bookmarked)
    } catch (error) {
      console.error('Failed to check bookmark status:', error)
    }
  }

  const handleToggleBookmark = async () => {
    if (!token) {
      console.log('No token available for bookmark toggle')
      return
    }

    setIsLoading(true)
    try {
      console.log('Toggling bookmark for quiz:', quizId)
      const response = await authAPI.toggleQuizBookmark(token, quizId)
      console.log('Bookmark toggle response:', response)
      const bookmarked = response.bookmarked || false
      setIsBookmarked(bookmarked)
      onBookmarkChange?.(bookmarked)
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-md"></div>
    )
  }

  if (status !== 'authenticated' || !session) {
    return null // Don't show bookmark button if not logged in
  }

  const Icon = isBookmarked ? BookmarkCheck : Bookmark

  return (
    <button
      type="button"
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-1.5 h-8 px-2 rounded-md border text-sm
        transition-colors duration-200
        ${isBookmarked 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
          : 'text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      <Icon className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
      {showLabel && (
        <span className="text-xs font-medium">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  )
}