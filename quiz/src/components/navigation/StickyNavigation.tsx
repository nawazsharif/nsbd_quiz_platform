'use client';

import { useScroll } from '@/hooks/useScroll';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import Link from 'next/link';
import { 
  Home, 
  BookOpen, 
  Play, 
  User, 
  Search,
  ArrowUp,
  ChevronUp
} from 'lucide-react';

interface StickyNavigationProps {
  className?: string;
}

export default function StickyNavigation({ className }: StickyNavigationProps) {
  const { scrollY, scrollDirection, isScrolled, isScrolledPast } = useScroll({ threshold: 100 });
  const pathname = usePathname();
  const { user } = useAuth();

  const quickNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Quizzes', href: '/quizzes', icon: BookOpen },
    { name: 'Courses', href: '/courses', icon: Play },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Quick Navigation Bar - Large screens only */}
      <div
        className={clsx(
          'fixed top-20 left-1/2 transform -translate-x-1/2 z-40 transition-all duration-300',
          'hidden lg:flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md',
          'border border-slate-200 rounded-full shadow-lg',
          scrollDirection === 'down' && scrollY > 200 ? 'opacity-0 pointer-events-none' : 'opacity-100',
          isScrolled ? 'translate-y-0' : '-translate-y-20',
          className
        )}
      >
        {quickNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200',
              'hover:bg-slate-100 hover:scale-105',
              isActive(item.href)
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden xl:inline">{item.name}</span>
          </Link>
        ))}
      </div>

      {/* Scroll to Top Button - Desktop */}
      <button
        onClick={scrollToTop}
        className={clsx(
          'fixed bottom-8 right-8 z-50 p-3 bg-slate-900 text-white rounded-full shadow-lg',
          'hover:bg-slate-800 hover:scale-110 transition-all duration-300',
          'hidden md:flex items-center justify-center',
          scrollY > 400 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Mobile Scroll Indicator */}
      <div
        className={clsx(
          'fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 z-50',
          'md:hidden transition-opacity duration-300',
          isScrolled ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          transform: `scaleX(${Math.min(scrollY / (document.documentElement.scrollHeight - window.innerHeight), 1)})`,
          transformOrigin: 'left'
        }}
      />

      {/* Mobile Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={clsx(
          'fixed bottom-20 right-4 z-40 p-2 bg-slate-900/90 text-white rounded-full shadow-lg',
          'md:hidden flex items-center justify-center backdrop-blur-sm',
          'hover:bg-slate-800 transition-all duration-300',
          scrollY > 400 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
        )}
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </>
  );
}