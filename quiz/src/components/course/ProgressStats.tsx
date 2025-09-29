'use client'

import { TrendingUp, Clock, CheckCircle, BookOpen, Award, Target } from 'lucide-react'

type ProgressStatsProps = {
  stats: {
    totalEnrolled: number
    inProgress: number
    completed: number
    totalLessons: number
    completedLessons: number
    averageProgress: number
    timeSpent?: number // in minutes
    certificates?: number
  }
}

export default function ProgressStats({ stats }: ProgressStatsProps) {
  const {
    totalEnrolled,
    inProgress,
    completed,
    totalLessons,
    completedLessons,
    averageProgress,
    timeSpent = 0,
    certificates = 0
  } = stats

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const statCards = [
    {
      title: 'Total Courses',
      value: totalEnrolled,
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Enrolled courses'
    },
    {
      title: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'Currently learning'
    },
    {
      title: 'Completed',
      value: completed,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description: 'Finished courses'
    },
    {
      title: 'Average Progress',
      value: `${Math.round(averageProgress)}%`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description: 'Overall completion'
    },
    {
      title: 'Lessons Completed',
      value: `${completedLessons}/${totalLessons}`,
      icon: Target,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      description: 'Total progress'
    },
    {
      title: 'Time Spent',
      value: formatTime(timeSpent),
      icon: Clock,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      description: 'Learning time'
    }
  ]

  // Add certificates card if there are any
  if (certificates > 0) {
    statCards.push({
      title: 'Certificates',
      value: certificates,
      icon: Award,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      description: 'Earned certificates'
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {stat.title}
              </h3>
              <p className="text-xs text-gray-600">
                {stat.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}