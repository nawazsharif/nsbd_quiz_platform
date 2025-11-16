'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import StickyNavigation from './StickyNavigation';
import ApiHealthBanner from '@/components/system/ApiHealthBanner';

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const { isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const hideForQuizTake = /^\/quiz\/[^/]+\/take(\/|$)?/.test(pathname);

  // Determine if sidebar should be shown based on current route
  const shouldShowSidebar = pathname.startsWith('/dashboard') ||
                           pathname.startsWith('/admin') ||
                           pathname.startsWith('/analytics') ||
                           pathname.startsWith('/quiz/create') ||
                           pathname.startsWith('/course/create') ||
                           pathname.startsWith('/my-content') ||
                           pathname.startsWith('/settings') ||
                           pathname.startsWith('/wallet') ||
                           // Learning pages - show sidebar for enrolled pages, hide for player pages
                           pathname.startsWith('/learning/quizzes/enrolled') ||
                           pathname.startsWith('/learning/courses/enrolled') ||
                           // IMPORTANT: learning pages have their OWN layout (player). Hide global sidebar.
                           pathname.startsWith('/progress') ||
                           pathname.startsWith('/certificates') ||
                           pathname.startsWith('/favorites') ||
                           pathname.startsWith('/earnings') ||
                           pathname.startsWith('/performance') ||
                           pathname.startsWith('/help');

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Don't show navigation for auth pages (SSR-safe)
  if (pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Fullscreen learning layout: keep Topbar but hide Sidebar/Sticky/Mobile nav
  // EXCEPT for enrolled pages which should show the sidebar
  const isEnrolledPage = pathname.startsWith('/learning/quizzes/enrolled') ||
                         pathname.startsWith('/learning/courses/enrolled');

  if (pathname.startsWith('/learning') && !isEnrolledPage) {
    return (
      <div className="min-h-screen bg-white">
        <Topbar
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={false}
          showMenuButton={false}
        />
        <ApiHealthBanner />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <Topbar
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        showMenuButton={shouldShowSidebar && !hideForQuizTake}
      />

      {/* API health status banner */}
      <ApiHealthBanner />

      {/* Sidebar - only show for dashboard pages (never on quiz take) */}
      {shouldShowSidebar && !hideForQuizTake && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Sticky Navigation */}
      {!hideForQuizTake && <StickyNavigation />}

      {/* Main content */}
      <div className={shouldShowSidebar ? (isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64") : ""}>
        <main className="min-h-screen">
          {children}
        </main>

        {/* Mobile Navigation - only show for dashboard pages (not on quiz take) */}
        {shouldShowSidebar && !hideForQuizTake && <MobileNav />}

        {/* Bottom padding for mobile nav */}
        {shouldShowSidebar && !hideForQuizTake && <div className="h-20 lg:hidden" />}
      </div>
    </div>
  );
}
