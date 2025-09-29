'use client';

import Link from 'next/link';
import { Play, Star } from 'lucide-react';
import type { Course } from '@/lib/courses';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const isPaid = course.is_paid && Number(course.price_cents ?? 0) > 0;
  const priceText = isPaid ? `$${(Number(course.price_cents ?? 0) / 100).toFixed(2)}` : 'Free';

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 hover:shadow-xl transition-all overflow-hidden">
      <Link href={`/courses/${course.id}`} className="block">
        <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.cover_url || '/window.svg'}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
            <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{priceText}</span>
          </div>
          {course.summary && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{course.summary}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center text-amber-500 text-sm">
              <Star className="w-4 h-4 mr-1 fill-amber-400" />
              <span>{Number(course.rating_avg ?? 0).toFixed(1)}</span>
              <span className="ml-1 text-gray-500">({course.rating_count ?? 0})</span>
            </div>
            <span className="inline-flex items-center text-emerald-600 text-sm font-medium">
              <Play className="w-4 h-4 mr-1" /> Start
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
