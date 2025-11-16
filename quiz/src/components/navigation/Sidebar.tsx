'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/auth';
import {
  Home,
  BookOpen,
  Plus,
  BarChart3,
  Wallet,
  Settings,
  Users,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  Award,
  HelpCircle,
  Target,
  X
} from 'lucide-react';
const FolderIcon = (props: any) => (<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props?.className}><path d="M4 20h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z"/></svg>);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
  superAdminOnly?: boolean;
}

interface NavGroup {
  name: string;
  items: NavItem[];
  permission?: string;
  superAdminOnly?: boolean;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'create', 'content management', 'user management']);

  const navigationGroups: NavGroup[] = [
    {
      name: 'Main',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
      ]
    },
    {
      name: 'Content Management',
      permission: 'manage_users',
      items: [
        { name: 'Categories', href: '/admin/categories', icon: FolderIcon as any },
        { name: 'Quizzes', href: '/dashboard/quizzes', icon: BookOpen },
        { name: 'Quiz Approvals', href: '/admin/approvals/quizzes', icon: FileCheck, permission: 'approve_quiz' },
        { name: 'Course Approvals', href: '/admin/approvals/courses', icon: FileCheck, permission: 'approve_course' },
        { name: 'Courses', href: '/courses', icon: Play },
      ]
    },
    {
      name: 'Learning',
      items: [
        { name: 'Enrolled Quizzes', href: '/learning/quizzes/enrolled', icon: Target },
        { name: 'Enrolled Courses', href: '/learning/courses/enrolled', icon: Play },
        { name: 'Progress', href: '/progress', icon: TrendingUp },
        { name: 'Certificates', href: '/certificates', icon: Award },
        { name: 'Favorites', href: '/favorites', icon: Star },
      ]
    },
    {
      name: 'Create',
      permission: 'create_quiz',
      items: [
        { name: 'Create Quiz', href: '/quiz/create', icon: Plus, permission: 'create_quiz' },
        { name: 'Create Course', href: '/course/create', icon: Plus, permission: 'create_course' },
        { name: 'My Content', href: '/my-content', icon: FileCheck, permission: 'create_quiz' },
      ]
    },
    {
      name: 'Analytics',
      permission: 'view_analytics',
      items: [
        { name: 'Dashboard', href: '/analytics', icon: BarChart3, permission: 'view_analytics' },
        { name: 'My Revenue', href: '/dashboard/revenue', icon: Wallet, permission: 'view_analytics' },
        { name: 'Performance', href: '/performance', icon: TrendingUp, permission: 'view_analytics' },
      ]
    },
    {
      name: 'User Management',
      superAdminOnly: true,
      items: [
        { name: 'Roles', href: '/admin/roles', icon: Settings, superAdminOnly: true },
        { name: 'Permissions', href: '/admin/permissions', icon: FileCheck, superAdminOnly: true },
        { name: 'Users', href: '/admin/users', icon: Users, superAdminOnly: true },
        { name: 'Platform Revenue', href: '/admin/revenue', icon: BarChart3, superAdminOnly: true },
        { name: 'Approval Settings', href: '/admin/settings/approval', icon: Settings, superAdminOnly: true },
        { name: 'Platform Charge', href: '/admin/settings/platform-charge', icon: Settings, superAdminOnly: true },
        { name: 'Payment Settings', href: '/admin/settings/payments', icon: Wallet, superAdminOnly: true },
      ]
    },
    {
      name: 'Account',
      items: [
        { name: 'Wallet', href: '/wallet', icon: Wallet },
        { name: 'Transactions', href: '/wallet/transactions', icon: FileCheck },
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Help & Support', href: '/help', icon: HelpCircle },
      ]
    }
  ];

  const toggleGroup = (groupName: string) => {
    if (isCollapsed) return; // Don't allow group toggling when collapsed
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (user?.role === 'admin' || user?.role === 'super_admin') return true;
    const effective = (permissions && permissions.length > 0)
      ? permissions
      : (user?.permissions || []);
    return effective.includes(permission as Permission);
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const filteredGroups = navigationGroups.filter(group => {
    if (group.superAdminOnly) return (user?.role === 'super_admin');
    return !group.permission || hasPermission(group.permission)
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white/95 backdrop-blur-sm border-r border-slate-200/60 z-50 transform transition-all duration-300 ease-in-out shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-16' : 'w-64'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200/50">
            {!isCollapsed && (
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Navigation
              </h2>
            )}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600 rotate-90" />
              )}
            </button>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {filteredGroups.map((group) => (
              <div key={group.name} className="mb-4">
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.name.toLowerCase())}
                    className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-wider transition-colors"
                  >
                    <span>{group.name}</span>
                    <div className="flex items-center space-x-1">
                      {group.items.filter(item => {
                        if (item.superAdminOnly) return (user?.role === 'super_admin');
                        return !item.permission || hasPermission(item.permission);
                      }).length > 0 && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          {group.items.filter(item => {
                            if (item.superAdminOnly) return (user?.role === 'super_admin');
                            return !item.permission || hasPermission(item.permission);
                          }).length}
                        </span>
                      )}
                      {expandedGroups.includes(group.name.toLowerCase()) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </div>
                  </button>
                )}

                {(expandedGroups.includes(group.name.toLowerCase()) || isCollapsed) && (
                  <div className={`${isCollapsed ? 'space-y-1' : 'mt-2 space-y-1'}`}>
                    {group.items
                      .filter(item => {
                        if (item.superAdminOnly) return (user?.role === 'super_admin');
                        return !item.permission || hasPermission(item.permission);
                      })
                      .map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`
                              group flex items-center space-x-3 px-4 py-3 text-sm transition-all duration-200 relative
                              ${active
                                ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-r-2 border-blue-500 shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }
                              ${isCollapsed ? 'justify-center px-2' : ''}
                            `}
                            title={isCollapsed ? item.name : undefined}
                          >
                            <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'} transition-colors`} />
                            {!isCollapsed && (
                              <>
                                <span className="flex-1 font-medium">{item.name}</span>
                                {item.badge && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                            {active && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
                            )}
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-200/50 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">
                    {user?.role?.replace('_', ' ') || 'User'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
