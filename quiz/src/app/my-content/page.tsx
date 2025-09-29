'use client'

import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'

export default function MyContentPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="My Content" subtitle="Manage your quizzes and courses" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quizzes card */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Quizzes</h2>
            <Link href="/quiz/create" className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Create Quiz</Link>
          </div>
          <p className="text-sm text-slate-600 mb-3">Create and edit your quizzes.</p>
          <Link href="/dashboard/quizzes" className="inline-flex h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Manage Quizzes</Link>
        </div>

        {/* Courses card */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Courses</h2>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/courses" className="h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50">Manage Courses</Link>
              <Link href="/course/create" className="h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Create Course</Link>
            </div>
          </div>
          <p className="text-sm text-slate-600">Create and edit your courses; submit for approval when ready.</p>
        </div>
      </div>
    </div>
  )
}
