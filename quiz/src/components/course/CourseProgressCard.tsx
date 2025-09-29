'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Play, CheckCircle, BookOpen, Calendar, User } from 'lucide-react'

type CourseEnrollment = {
  id: number
  course: {
    id: number
    title: string
    summary?: string
    cover_url?: string
    is_paid?: boolean
    price_cents?: number
    category?: {
      id: number
      name: string
    }
    owner?: {
      id: number
      name: string
    }
  }
  progress: {
    total_contents: number
    completed_contents: number
    progress_percentage: number
    status: 'not_started' | 'in_progress' | 'completed'
  }
  enrolled_at: string
}

type CourseProgressCardProps = {
  enrollment: CourseEnrollment
  onContinue?: (courseId: number) => void
}

export default function CourseProgressCard({ enrollment, onContinue }: CourseProgressCardProps) {
  const { course, progress, enrolled_at } = enrollment
  const [imageError, setImageError] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      default:
        return 'Not Started'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Course Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        {course.cover_url && !imageError ? (
          <img
            src={course.cover_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-blue-400" />
          </div>
        )}
        
        {/* Progress Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center justify-between text-white text-sm">
            <span>{progress.completed_contents} of {progress.total_contents} lessons</span>
            <span>{progress.progress_percentage}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="p-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(progress.status)}`}>
            {progress.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {progress.status === 'in_progress' && <Play className="w-3 h-3 mr-1" />}
            {progress.status === 'not_started' && <Clock className="w-3 h-3 mr-1" />}
            {getStatusText(progress.status)}
          </span>
          
          {course.is_paid && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Paid Course
            </span>
          )}
        </div>

        {/* Course Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {course.title}
        </h3>

        {/* Course Summary */}
        {course.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {course.summary}
          </p>
        )}

        {/* Course Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          {course.category && (
            <div className="flex items-center">
              <BookOpen className="w-3 h-3 mr-1" />
              {course.category.name}
            </div>
          )}
          {course.owner && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {course.owner.name}
            </div>
          )}
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Enrolled {formatDate(enrolled_at)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href={`/learning/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {progress.status === 'completed' ? 'Review Course' : 
             progress.status === 'in_progress' ? 'Continue Learning' : 'Start Course'}
            <Play className="w-4 h-4 ml-2" />
          </Link>
          
          <Link
            href={`/courses/${course.id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}