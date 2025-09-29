'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/auth';
import { useState } from 'react';
import {
  Home,
  BookOpen,
  Plus,
  User,
  Wallet,
  Play,
  Star,
  FolderIcon,
  GraduationCap,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { permissions } = usePermissions();
  const { user } = useAuth();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Main navigation items (always visible)
  const mainNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Quizzes', href: '/quizzes', icon: BookOpen },
    { name: 'Courses', href: '/courses', icon: Play },
    { name: 'Learning', href: '/learning', icon: GraduationCap, badge: '3' },
    { name: 'Enrolled Quizzes', href: '/learning/quizzes/enrolled', icon: BookOpen },
    { name: 'Enrolled Courses', href: '/learning/courses/enrolled', icon: Play },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  // Create menu items (shown in popup)
  const createItems = [
    { name: 'Create Quiz', href: '/quiz/create', icon: FileText, permission: 'create_quiz' },
    { name: 'Create Course', href: '/course/create', icon: Play, permission: 'create_course' },
    { name: 'Categories', href: '/categories', icon: FolderIcon },
    { name: 'My Content', href: '/my-content', icon: Star, permission: 'create_quiz' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (user?.role === 'admin' || user?.role === 'super_admin') return true;
    const effective = (permissions && permissions.length > 0)
      ? permissions
      : (user?.permissions || []);
    return effective.includes(permission as Permission);
  };

  const hasCreatePermissions = createItems.some(item =>
    !item.permission || hasPermission(item.permission)
  );

  const filteredCreateItems = createItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* Create Menu Overlay */}
      {showCreateMenu && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setShowCreateMenu(false)}
        />
      )}

      {/* Create Menu Popup */}
      {showCreateMenu && (
        <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 lg:hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create & Manage</h3>
              <button
                onClick={() => setShowCreateMenu(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filteredCreateItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowCreateMenu(false)}
                    className={`
                      flex flex-col items-center space-y-2 p-4 rounded-xl transition-all duration-200
                      ${active
                        ? 'bg-gradient-to-br from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                      }
                    `}
                  >
                    <Icon className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium text-center">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/60 z-30 lg:hidden shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  relative flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
                  ${active
                    ? 'text-blue-600 bg-blue-50 shadow-sm transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-600'} transition-colors`} />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </div>
                <span className="text-xs font-medium truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* Create Button */}
          {hasCreatePermissions && (
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className={`
                relative flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
                ${showCreateMenu
                  ? 'text-white bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="relative">
                {showCreateMenu ? (
                  <X className="h-5 w-5 text-white transition-transform duration-200" />
                ) : (
                  <PlusCircle className="h-5 w-5 text-gray-600 transition-colors" />
                )}
              </div>
              <span className={`text-xs font-medium ${showCreateMenu ? 'text-white' : ''}`}>
                {showCreateMenu ? 'Close' : 'Create'}
              </span>
            </button>
          )}

          {/* Wallet Button */}
          <Link
            href="/wallet"
            className={`
              relative flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 min-w-0 flex-1 max-w-[80px]
              ${isActive('/wallet')
                ? 'text-blue-600 bg-blue-50 shadow-sm transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <div className="relative">
               <Wallet className={`h-5 w-5 ${isActive('/wallet') ? 'text-blue-600' : 'text-gray-600'} transition-colors`} />
               {isActive('/wallet') && (
                 <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
               )}
             </div>
            <span className="text-xs font-medium truncate">Wallet</span>
          </Link>
        </div>
      </nav>

      {/* Safe area spacer for devices with home indicator */}
      <div className="h-safe-area-inset-bottom lg:hidden" />
    </>
  );
}
