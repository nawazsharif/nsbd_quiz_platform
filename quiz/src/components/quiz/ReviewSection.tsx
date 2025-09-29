'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { authAPI } from '@/lib/auth-utils'
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  Trash2, 
  Flag,
  User,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

type Review = {
  id: number
  quiz_id: number
  user_id: number
  rating: number
  comment?: string
  is_hidden: boolean
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
    avatar?: string
  }
}

type ReviewSectionProps = {
  quizId: string | number
  canReview?: boolean
  showCreateForm?: boolean
}

export default function ReviewSection({ quizId, canReview = false, showCreateForm = false }: ReviewSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalReviews, setTotalReviews] = useState(0)
  
  // Review form state
  const [showForm, setShowForm] = useState(showCreateForm)
  const [formRating, setFormRating] = useState(5)
  const [formComment, setFormComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  
  // Filter and sort state
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const token = (session as any)?.accessToken as string | undefined
  const userId = (session as any)?.user?.id

  const loadReviews = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true)
      const data = await authAPI.getQuizReviews(quizId, pageNum, 15)
      
      if (reset) {
        setReviews(data.data || [])
      } else {
        setReviews(prev => [...prev, ...(data.data || [])])
      }
      
      setTotalReviews(data.total || 0)
      setHasMore((data.current_page || 1) < (data.last_page || 1))
      setPage(pageNum)
    } catch (e: any) {
      setError(e.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!token || !formComment.trim()) return
    
    setSubmitting(true)
    try {
      if (editingReview) {
        // Update existing review
        const updatedReview = await authAPI.updateQuizReview(
          token, 
          quizId, 
          editingReview.id, 
          { rating: formRating, comment: formComment.trim() }
        )
        
        setReviews(prev => prev.map(r => r.id === editingReview.id ? updatedReview : r))
        setEditingReview(null)
      } else {
        // Create new review
        const newReview = await authAPI.createQuizReview(
          token, 
          quizId, 
          { rating: formRating, comment: formComment.trim() }
        )
        
        setReviews(prev => [newReview, ...prev])
        setTotalReviews(prev => prev + 1)
      }
      
      setFormRating(5)
      setFormComment('')
      setShowForm(false)
    } catch (e: any) {
      setError(e.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReview = async (reviewId: number) => {
    if (!token || !confirm('Are you sure you want to delete this review?')) return
    
    try {
      await authAPI.deleteQuizReview(token, quizId, reviewId)
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setTotalReviews(prev => prev - 1)
    } catch (e: any) {
      setError(e.message || 'Failed to delete review')
    }
  }

  const handleEditReview = (review: Review) => {
    setEditingReview(review)
    setFormRating(review.rating)
    setFormComment(review.comment || '')
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingReview(null)
    setFormRating(5)
    setFormComment('')
    setShowForm(false)
  }

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate?.(star)}
            className={`${
              interactive ? 'hover:scale-110 transition-transform cursor-pointer' : 'cursor-default'
            }`}
            disabled={!interactive}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  const getRatingStats = () => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach(review => {
      stats[review.rating as keyof typeof stats]++
    })
    
    const total = reviews.length
    const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
    
    return { stats, total, average }
  }

  const filteredAndSortedReviews = () => {
    let filtered = reviews
    
    if (filterRating) {
      filtered = filtered.filter(r => r.rating === filterRating)
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'highest':
          return b.rating - a.rating
        case 'lowest':
          return a.rating - b.rating
        default:
          return 0
      }
    })
  }

  useEffect(() => {
    loadReviews(1, true)
  }, [quizId])

  const { stats, total, average } = getRatingStats()

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Reviews & Ratings</h3>
          {canReview && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <MessageSquare className="w-4 h-4" />
              Write Review
            </button>
          )}
        </div>

        {total > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {average.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mb-2">
                {renderStars(Math.round(average))}
              </div>
              <div className="text-sm text-slate-600">
                Based on {total} review{total !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm text-slate-600">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: total > 0 ? `${(stats[rating as keyof typeof stats] / total) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <div className="text-sm text-slate-600 w-8">
                    {stats[rating as keyof typeof stats]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-600">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p>No reviews yet. Be the first to review this quiz!</p>
          </div>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">
            {editingReview ? 'Edit Review' : 'Write a Review'}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rating
              </label>
              {renderStars(formRating, true, setFormRating)}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment
              </label>
              <textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder="Share your thoughts about this quiz..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={4}
                minLength={10}
                maxLength={1000}
              />
              <div className="text-xs text-slate-500 mt-1">
                {formComment.length}/1000 characters (minimum 10)
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={submitting || formComment.trim().length < 10}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      {total > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">Filter by rating:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterRating(null)}
                    className={`px-3 py-1 text-sm rounded ${
                      filterRating === null ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    All
                  </button>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilterRating(rating)}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                        filterRating === rating ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {rating} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredAndSortedReviews().map((review) => (
          <div key={review.id} className="bg-white border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  {review.user?.avatar ? (
                    <img
                      src={review.user.avatar}
                      alt={review.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {review.user?.name || 'Anonymous User'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {renderStars(review.rating)}
                {userId === review.user_id && (
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="p-1 text-gray-400 hover:text-emerald-600"
                      title="Edit review"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {review.comment && (
              <div className="text-slate-700 leading-relaxed mb-4">
                {review.comment}
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 hover:text-emerald-600">
                  <ThumbsUp className="w-4 h-4" />
                  Helpful
                </button>
                <button className="flex items-center gap-1 hover:text-red-600">
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              </div>
              
              {review.updated_at !== review.created_at && (
                <div className="text-xs text-slate-400">
                  Edited {new Date(review.updated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center">
            <button
              onClick={() => loadReviews(page + 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Load More Reviews
            </button>
          </div>
        )}
        
        {loading && page === 1 && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}