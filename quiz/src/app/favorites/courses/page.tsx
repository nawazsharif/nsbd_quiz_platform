'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authAPI } from '@/lib/auth-utils';
import CourseBookmarkButton from '@/components/ui/CourseBookmarkButton';
import PageHeader from '@/components/dashboard/PageHeader';
import Link from 'next/link';
import { BookOpen, Star, Play } from 'lucide-react';
import { formatTaka } from '@/lib/utils';

export default function BookmarkedCoursesPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) loadBookmarks();
  }, [token]);

  const loadBookmarks = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.getBookmarkedCourses(token);
      setCourses(response.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load bookmarked courses');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkChange = (courseId: number, isBookmarked: boolean) => {
    if (!isBookmarked) {
      // Remove from list when unbookmarked
      setCourses(prev => prev.filter(item => item.course?.id !== courseId));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader
          title="Bookmarked Courses"
          subtitle="Your saved courses for later"
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="Bookmarked Courses"
        subtitle="Your saved courses for later"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookmarked Courses</h3>
          <p className="text-gray-600 mb-6">
            You haven't bookmarked any courses yet. Browse courses and bookmark the ones you're interested in.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((item) => {
            const course = item.course;
            if (!course) return null;

            const isPaid = course.is_paid && Number(course.price_cents ?? 0) > 0;
            const priceText = isPaid ? formatTaka(Number(course.price_cents ?? 0), { fromCents: true }) : 'Free';

            return (
              <div key={course.id} className="group bg-white rounded-2xl border border-gray-200 hover:shadow-xl transition-all overflow-hidden">
                <Link href={`/courses/${course.id}`} className="block">
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.cover_url || '/window.svg'}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
                      <CourseBookmarkButton
                        courseId={course.id}
                        onBookmarkChange={(isBookmarked) => handleBookmarkChange(course.id, isBookmarked)}
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {priceText}
                      </span>
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
                        <Play className="w-4 h-4 mr-1" /> View Course
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
