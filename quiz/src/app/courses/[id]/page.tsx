'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { coursesAPI, type Course } from '@/lib/courses';
import { Play, ShoppingCart, Shield, Star, Clock, XCircle, ArrowLeft, BookOpen } from 'lucide-react';
import AddToCartButton from '@/components/courses/AddToCartButton';
import { formatTaka } from '@/lib/utils';
import Breadcrumb from '@/components/ui/Breadcrumb';
import BackButton from '@/components/ui/BackButton';
import { useToast } from '@/hooks/useToast';

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const id = params?.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    coursesAPI.get(id).then((data) => {
      if (!mounted) return;
      setCourse(data);
      setIsLoading(false);
    }).catch((e) => {
      if (!mounted) return;
      setError(e.message || 'Failed to load course');
      setIsLoading(false);
    });
    return () => { mounted = false };
  }, [id]);

  const handleEnroll = async () => {
    if (!course) return;
    setIsEnrolling(true);
    setEnrollError(null);
    try {
      await coursesAPI.enroll(course.id);
      success('Successfully enrolled in course!');
      router.push(`/learning/courses/${course.id}`);
    } catch (e: any) {
      const errorMsg = e.message || 'Enrollment failed';
      setEnrollError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-slate-200 border-t-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading course...</p>
        </div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md text-center px-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Course Not Found</h2>
            <p className="text-slate-600 mb-6">{error || 'The course you\'re looking for doesn\'t exist or has been removed.'}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/courses" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all">
                <BookOpen className="w-5 h-5" />
                Browse Courses
              </Link>
              <button onClick={() => router.back()} className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all">
                <ArrowLeft className="w-5 h-5" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = course.is_paid && Number(course.price_cents ?? 0) > 0;
  const priceText = isPaid ? formatTaka(Number(course.price_cents ?? 0), { fromCents: true }) : 'Free';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <div className="mb-6 space-y-4">
          <BackButton fallbackUrl="/courses" label="Back to Courses" />
          <Breadcrumb
            items={[
              { label: 'Courses', href: '/courses' },
              { label: course.title }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.cover_url || '/window.svg'} alt={course.title} className="w-full h-full object-cover" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">{course.title}</h1>
            {course.summary && <p className="mt-2 text-slate-700 text-lg">{course.summary}</p>}
            {course.description && (
              <div className="mt-6 prose max-w-none">
                <p className="whitespace-pre-line text-slate-700">{course.description}</p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">What you'll get</h2>
              <a href={`/courses/${course.id}/leaderboard`} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">View Leaderboard</a>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /> Lifetime access</div>
                <div className="p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-600" /> Learn at your pace</div>
                <div className="p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Certificate on completion</div>
                <div className="p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Play className="w-4 h-4 text-emerald-600" /> Interactive content</div>
              </div>
            </div>
          </div>

          <div>
            <div className="sticky top-6 p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Price</span>
                <span className="text-2xl font-bold">{priceText}</span>
              </div>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {isPaid ? <ShoppingCart className="w-5 h-5" /> : <Play className="w-5 h-5" />} {isPaid ? (isEnrolling ? 'Processing...' : 'Buy & Enroll') : (isEnrolling ? 'Enrolling...' : 'Enroll Now')}
              </button>
              {isPaid && (
                <div className="mt-3 flex justify-center">
                  <AddToCartButton course={{ id: course.id, title: course.title, price_cents: course.price_cents, is_paid: course.is_paid }} />
                </div>
              )}
              {enrollError && <div className="mt-3 text-sm text-red-600">{enrollError}</div>}
              <div className="mt-4 text-sm text-slate-600">
                7-day refund policy. Secure wallet checkout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
