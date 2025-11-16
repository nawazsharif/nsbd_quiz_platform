'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { authAPI } from '@/lib/auth-utils'

interface CourseBookmarkButtonProps {
  courseId: string | number
  className?: string
  showLabel?: boolean
  onBookmarkChange?: (isBookmarked: boolean) => void
}

export default function CourseBookmarkButton({
  courseId,
  className = '',
  showLabel = false,
  onBookmarkChange
}: CourseBookmarkButtonProps) {
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if course is bookmarked on component mount
  useEffect(() => {
    if (status === 'authenticated' && token && courseId) {
      checkBookmarkStatus();
    }
  }, [token, status, courseId]);

  const checkBookmarkStatus = async () => {
    if (!token) return

    try {
      const response = await authAPI.checkCourseBookmark(token, courseId)
      const bookmarked = response.bookmarked || false
      setIsBookmarked(bookmarked)
      onBookmarkChange?.(bookmarked)
    } catch (error) {
      console.error('Failed to check course bookmark status:', error)
    }
  }

  const handleToggleBookmark = async () => {
    if (!token) {
      return
    }

    setIsLoading(true)
    try {
      const response = await authAPI.toggleCourseBookmark(token, courseId)
      const bookmarked = response.bookmarked || false
      setIsBookmarked(bookmarked)
      onBookmarkChange?.(bookmarked)
    } catch (error) {
      console.error('Failed to toggle course bookmark:', error)
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
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      <Icon className={`h-4 w-4 ${isBookmarked ? 'fill-emerald-700' : ''}`} />
      {showLabel && (
        <span className="hidden sm:inline">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  )
}
