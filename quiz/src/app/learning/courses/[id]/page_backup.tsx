'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { coursesAPI } from '@/lib/courses';
import { CheckCircle, FileText, Film, Timer, Play, FileQuestion, ExternalLink, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

type ContentItem = {
  id: number;
  type: 'text' | 'pdf' | 'video' | 'quiz' | string;
  title: string;
  order_index: number;
  duration_seconds?: number | null;
  payload?: any;
};

export default function CourseLearningPage() {
  const params = useParams();
  const id = params?.id as string;
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    coursesAPI.contents(id).then((data) => {
      if (!mounted) return;
      const sorted = [...data].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setContents(sorted);
      // Load local progress
      try {
        const raw = localStorage.getItem(`course_progress_${id}`);
        if (raw) setCompletedIds(JSON.parse(raw));
      } catch {}
      setIsLoading(false);
    }).catch((e) => {
      if (!mounted) return;
      setError(e.message || 'Failed to load course contents');
      setIsLoading(false);
    });
    return () => { mounted = false };
  }, [id]);

  const active = contents[activeIndex];

  const totalDuration = useMemo(() => contents.reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0), [contents]);

  const markCompleted = (contentId: number) => {
    setCompletedIds(prev => {
      if (prev.includes(contentId)) return prev;
      const next = [...prev, contentId];
      try { localStorage.setItem(`course_progress_${id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (active) markCompleted(active.id);
    setActiveIndex((i) => Math.min(contents.length - 1, i + 1));
  };

  const progressPercent = contents.length > 0 ? Math.round((completedIds.length / contents.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-30 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-slate-900">Course Content</h2>
            <div className="text-sm text-slate-600 inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
              <Timer className="w-4 h-4" /> {Math.ceil(totalDuration/60)}m
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">{completedIds.length} of {contents.length} completed</span>
              <span className="text-emerald-600 font-bold">{progressPercent}%</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-slate-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-red-600">{error}</div>
            ) : contents.length === 0 ? (
              <div className="p-4 text-slate-500">No contents yet</div>
            ) : contents.map((item, idx) => {
              const isActive = idx === activeIndex;
              const done = completedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-center gap-3 ${isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  {item.type === 'video' ? (
                    <Film className="w-4 h-4 text-emerald-600" />
                  ) : item.type === 'quiz' ? (
                    <FileQuestion className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-600" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 line-clamp-1">{item.title}</div>
                    {item.duration_seconds ? <div className="text-xs text-slate-500">{Math.ceil(item.duration_seconds/60)} min</div> : null}
                  </div>
                  <CheckCircle className={`w-4 h-4 ${done ? 'text-emerald-600' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </aside>
        <main className="lg:col-span-8 xl:col-span-9">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-8">Loading...</div>
            ) : error ? (
              <div className="p-8 text-red-600">{error}</div>
            ) : active ? (
              <div className="p-4 md:p-6">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">{active.title}</h1>
                {(() => {
                  const payload = (active?.payload ?? {}) as any;
                  const type = (active?.type || '').toLowerCase();

                  // VIDEO
                  if (type === 'video') {
                    const url: string | undefined = payload?.url || payload?.videoUrl || payload?.src;
                    const embed: string | undefined = payload?.embedHtml || payload?.embed;
                    if (embed) {
                      return (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black" dangerouslySetInnerHTML={{ __html: embed }} />
                      );
                    }
                    if (url) {
                      const isYouTube = /youtube\.com|youtu\.be/.test(url);
                      const isVimeo = /vimeo\.com/.test(url);
                      if (isYouTube) {
                        const ytId = url.split('v=')[1] || url.split('/').pop();
                        return (
                          <iframe
                            className="w-full aspect-video rounded-xl"
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title={active.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      }
                      if (isVimeo) {
                        return (
                          <iframe
                            className="w-full aspect-video rounded-xl"
                            src={url.replace('vimeo.com', 'player.vimeo.com/video')}
                            title={active.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      }
                      return (
                        <video controls className="w-full aspect-video rounded-xl bg-black">
                          <source src={url} />
                          Your browser does not support the video tag.
                        </video>
                      );
                    }
                    return <div className="aspect-video bg-black rounded-xl flex items-center justify-center text-white"><Play className="w-5 h-5 mr-2" /> Video not available</div>;
                  }

                  // PDF
                  if (type === 'pdf') {
                    const url: string | undefined = payload?.url || payload?.file || payload?.src;
                    if (url) {
                      return (
                        <object data={url} type="application/pdf" className="w-full h-[70vh] rounded-xl">
                          <iframe src={url} className="w-full h-[70vh] rounded-xl" title={active.title} />
                        </object>
                      );
                    }
                    return <div className="h-[70vh] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">PDF not available</div>;
                  }

                  // QUIZ
                  if (type === 'quiz') {
                    const quizId: number | string | undefined = payload?.quiz_id || payload?.id;
                    const returnUrl = `/learning/courses/${id}`;
                    return (
                      <div className="p-6 rounded-xl border border-slate-200">
                        <div className="text-slate-700 mb-4">This lesson contains a quiz. You can open it below.</div>
                        {quizId ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <Link href={`/quiz/${quizId}?return=${encodeURIComponent(returnUrl)}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50">
                              View Quiz
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <Link href={`/quiz/${quizId}/take?return=${encodeURIComponent(returnUrl)}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                              Take Quiz
                              <Play className="w-4 h-4" />
                            </Link>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">Quiz reference missing.</div>
                        )}
                      </div>
                    );
                  }

                  // TEXT/RICH
                  const html: string = payload?.html || payload?.body || payload?.content || payload?.text || '';
                  const hasHtml = /<[^>]+>/.test(html);
                  if (html) {
                    return hasHtml ? (
                      <article className="prose max-w-none">
                        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
                      </article>
                    ) : (
                      <article className="prose max-w-none">
                        <p className="whitespace-pre-line text-slate-700">{html}</p>
                      </article>
                    );
                  }
                  return (
                    <div className="p-6 rounded-xl border border-slate-200 text-slate-600">Content coming soon...</div>
                  );
                })()}
                <div className="mt-6 flex items-center justify-between">
                <button
                    disabled={activeIndex === 0}
                    onClick={goPrev}
                    className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >Previous</button>
                    <button
                    onClick={() => active && markCompleted(active.id)}
                    className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >Mark as completed</button>
                  <button
                    disabled={activeIndex === contents.length - 1}
                    onClick={goNext}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >Next</button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-slate-500">Select a lesson from the sidebar</div>
          )}
        </div>
        </main>
      </div>
    </div>
  );
}
