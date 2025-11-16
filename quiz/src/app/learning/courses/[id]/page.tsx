'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { coursesAPI } from '@/lib/courses';
import { CheckCircle, FileText, Film, Timer, Play, FileQuestion, ExternalLink, ChevronLeft, ChevronRight, Menu, X, Award } from 'lucide-react';

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

  const goPrev = () => {
    setActiveIndex((i) => Math.max(0, i - 1));
    setMobileMenuOpen(false);
  };

  const goNext = () => {
    if (active) markCompleted(active.id);
    setActiveIndex((i) => Math.min(contents.length - 1, i + 1));
    setMobileMenuOpen(false);
  };

  const progressPercent = contents.length > 0 ? Math.round((completedIds.length / contents.length) * 100) : 0;

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Film className="w-5 h-5" />;
      case 'quiz': return <FileQuestion className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex-1 mx-4">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="text-xs text-slate-600 mt-1">{progressPercent}% complete</div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white border-r border-slate-200 transform transition-transform duration-300 z-50 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg text-slate-900">Course Content</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-white/50 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{completedIds.length} of {contents.length} completed</span>
                <span className="text-emerald-600 font-bold">{progressPercent}%</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-600 text-sm">{error}</div>
            ) : contents.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No contents yet</div>
            ) : contents.map((item, idx) => {
              const isActive = idx === activeIndex;
              const done = completedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveIndex(idx); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-4 border-b border-slate-100 flex items-center gap-3 transition-colors ${isActive ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'}`}
                >
                  <div className={`flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {item.title}
                    </div>
                    {item.duration_seconds ? (
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {Math.ceil(item.duration_seconds/60)} min
                      </div>
                    ) : null}
                  </div>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${done ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 transition-all duration-300 z-30 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-slate-900">Course Content</h2>
            <div className="text-sm text-slate-600 inline-flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Timer className="w-4 h-4" /> {Math.ceil(totalDuration/60)}m
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
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
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-5 h-5 bg-slate-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : contents.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No contents yet</div>
          ) : contents.map((item, idx) => {
            const isActive = idx === activeIndex;
            const done = completedIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left px-5 py-4 border-b border-slate-100 flex items-center gap-3 transition-all ${isActive ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50 hover:border-l-4 hover:border-l-slate-300'}`}
              >
                <div className={`flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-emerald-900' : 'text-slate-900'}`}>
                    {item.title}
                  </div>
                  {item.duration_seconds ? (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {Math.ceil(item.duration_seconds/60)} min
                    </div>
                  ) : null}
                </div>
                <CheckCircle className={`w-5 h-5 flex-shrink-0 ${done ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:flex fixed top-[calc(50%+2rem)] -translate-y-1/2 z-40 bg-white border border-slate-200 hover:bg-slate-50 rounded-r-lg p-2 shadow-lg transition-all"
        style={{ left: sidebarOpen ? '320px' : '0px' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 pt-0 lg:pt-0 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Loading content...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
              <div className="text-red-600 font-medium mb-2">Error</div>
              <p className="text-red-700">{error}</p>
            </div>
          ) : active ? (
            <div className="space-y-6">
              {/* Content Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{active.title}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
                          {getIcon(active.type)}
                          <span className="capitalize">{active.type}</span>
                        </span>
                        {active.duration_seconds && (
                          <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
                            <Timer className="w-4 h-4" />
                            {Math.ceil(active.duration_seconds/60)} min
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
                          Lesson {activeIndex + 1} of {contents.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 lg:p-8">
                  {(() => {
                    const payload = (active?.payload ?? {}) as any;
                    const type = (active?.type || '').toLowerCase();

                    // VIDEO
                    if (type === 'video') {
                      const url: string | undefined = payload?.url || payload?.videoUrl || payload?.src;
                      const embed: string | undefined = payload?.embedHtml || payload?.embed;
                      if (embed) {
                        return (
                          <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-xl" dangerouslySetInnerHTML={{ __html: embed }} />
                        );
                      }
                      if (url) {
                        const isYouTube = /youtube\.com|youtu\.be/.test(url);
                        const isVimeo = /vimeo\.com/.test(url);
                        if (isYouTube) {
                          const ytId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
                          return (
                            <iframe
                              className="w-full aspect-video rounded-xl shadow-xl"
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
                              className="w-full aspect-video rounded-xl shadow-xl"
                              src={url.replace('vimeo.com', 'player.vimeo.com/video')}
                              title={active.title}
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          );
                        }
                        return (
                          <video controls className="w-full aspect-video rounded-xl bg-black shadow-xl">
                            <source src={url} />
                            Your browser does not support the video tag.
                          </video>
                        );
                      }
                      return (
                        <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
                          <div className="text-center">
                            <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Video not available</p>
                          </div>
                        </div>
                      );
                    }

                    // PDF
                    if (type === 'pdf') {
                      const url: string | undefined = payload?.url || payload?.file || payload?.src;
                      if (url) {
                        return (
                          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xl">
                            <iframe src={url} className="w-full h-[75vh]" title={active.title} />
                          </div>
                        );
                      }
                      return (
                        <div className="h-[75vh] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>PDF not available</p>
                          </div>
                        </div>
                      );
                    }

                    // QUIZ
                    if (type === 'quiz') {
                      const quizId: number | string | undefined = payload?.quiz_id || payload?.id;
                      const returnUrl = `/learning/courses/${id}`;
                      return (
                        <div className="p-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-600 rounded-xl">
                              <FileQuestion className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">Quiz Time!</h3>
                              <p className="text-sm text-slate-600">Test your knowledge with this quiz</p>
                            </div>
                          </div>
                          {quizId ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                href={`/quiz/${quizId}?return=${encodeURIComponent(returnUrl)}`}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-medium shadow-sm transition-all"
                              >
                                View Quiz Details
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/quiz/${quizId}/take?return=${encodeURIComponent(returnUrl)}`}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 font-medium shadow-lg transition-all"
                              >
                                Start Quiz
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
                        <div className="prose max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg prose-p:text-slate-900 prose-li:text-slate-900 text-slate-900">
                          <div dangerouslySetInnerHTML={{ __html: html }} />
                        </div>
                      ) : (
                        <div className="max-w-none">
                          <p className="whitespace-pre-line text-slate-900 text-lg leading-relaxed">{html}</p>
                        </div>
                      );
                    }
                    return (
                      <div className="p-12 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Content coming soon...</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    disabled={activeIndex === 0}
                    onClick={goPrev}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Previous
                  </button>

                  <button
                    onClick={() => active && markCompleted(active.id)}
                    disabled={completedIds.includes(active?.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {completedIds.includes(active?.id) ? 'Completed' : 'Mark Complete'}
                  </button>

                  <button
                    disabled={activeIndex === contents.length - 1}
                    onClick={goNext}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition-all"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Indicator */}
                {progressPercent === 100 && (
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 rounded-lg">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900">Congratulations!</h4>
                        <p className="text-sm text-emerald-700">You've completed all lessons in this course!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a lesson from the sidebar to begin</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
