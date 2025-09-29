'use client'

import PageHeader from '@/components/dashboard/PageHeader'

export default function ProfilePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeader title="Profile" subtitle="View and update your profile" />
      <div className="bg-white border rounded-xl p-6 text-sm text-slate-700">
        <p>Profile details coming soon.</p>
      </div>
    </div>
  )
}

