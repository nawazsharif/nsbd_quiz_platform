'use client'

import Link from 'next/link'

type Action = {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export default function PageHeader({
  title,
  subtitle,
  actions = [],
}: {
  title: string
  subtitle?: string
  actions?: Action[]
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>
        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((a, i) =>
              a.href ? (
                <Link
                  key={i}
                  href={a.href}
                  className={
                    a.variant === 'secondary'
                      ? 'h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50'
                      : 'h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700'
                  }
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={a.onClick}
                  className={
                    a.variant === 'secondary'
                      ? 'h-9 px-3 rounded-md border text-gray-900 hover:bg-gray-50'
                      : 'h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700'
                  }
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

