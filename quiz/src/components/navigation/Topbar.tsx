'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import SearchModal from './SearchModal';
import NotificationCenter from './NotificationCenter';
import { useSession } from 'next-auth/react';
import { authAPI } from '@/lib/auth-utils';
import { formatTaka } from '@/lib/utils';
import {
  Search,
  Bell,
  Wallet,
  User,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  X,
  BookOpen,
  Plus,
  BarChart3,
  HelpCircle,
  Shield,
  Moon,
  Sun,
  Globe,
  CreditCard,
  Activity,
  Star,
  Award,
  FileText,
  Bookmark
} from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
  showMenuButton?: boolean;
}

export default function Topbar({ onMenuToggle, isSidebarOpen, showMenuButton = true }: TopbarProps) {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const pathname = usePathname();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number|string; title: string; time: string; unread?: boolean }>>([]);
  const [walletBalanceCents, setWalletBalanceCents] = useState<number | null>(null);
  const [learningCount, setLearningCount] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<{ completedQuizzes: number; totalPoints: number; currentStreak: number; achievements: number }>({ completedQuizzes: 0, totalPoints: 0, currentStreak: 0, achievements: 0 });

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearchModal(true);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Here you would implement actual dark mode toggle logic
  };

  // Load dynamic topbar data
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        // Wallet
        try {
          const wb = await authAPI.getWalletBalance(token);
          const cents = (wb?.balance_cents ?? wb?.data?.balance_cents ?? wb?.balance ?? 0);
          setWalletBalanceCents(Number(cents));
        } catch {}

        // Learning count
        try {
          const enrollments = await authAPI.getCourseEnrollments(token);
          const list = (enrollments?.data ?? enrollments?.enrollments ?? enrollments) as any;
          const arr = Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [];
          setLearningCount(arr.length);
        } catch {}

        // Attempts as "completed quizzes" count (best-effort)
        try {
          const { attempts, meta } = await authAPI.getUserQuizAttempts(token, undefined, 1, 1);
          const total = meta?.total ?? (Array.isArray(attempts) ? attempts.length : 0);
          setUserStats(prev => ({ ...prev, completedQuizzes: Number(total || 0) }));
        } catch {}

        // TODO: points/streak/awards endpoints if available; keep zeros otherwise
      } catch {}
    };
    load();
  }, [token]);

  const unreadNotifications = notifications.filter(n => n.unread).length;

  // userStats now comes from state above

  const navItems = [
    { name: 'Quizzes', href: '/quizzes' },
    { name: 'Courses', href: '/courses' },
    { name: 'About', href: '/about' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Menu button for mobile */}
            {showMenuButton && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
            )}

            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NSBD Quiz
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Learning Platform</p>
              </div>
            </Link>
          </div>

          {/* Center section - Navigation for larger screens */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right section */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden sm:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search quizzes, courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </form>

            {/* Mobile search button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>

            {user && (
              <>
                {/* Wallet */}
                <Link
                  href="/wallet"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Wallet"
                >
                  <Wallet className="h-5 w-5 text-gray-600" />
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {walletBalanceCents !== null ? formatTaka(walletBalanceCents, { fromCents: true }) : formatTaka(0, { fromCents: true })}
                  </span>
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-xl z-50">
                      <div className="p-4 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadNotifications > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              {unreadNotifications} new
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors ${
                              notification.unread ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                              }`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-slate-200/50">
                        <Link
                          href="/notifications"
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* User menu */}
            {!user && (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}

            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    {/* Online status indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-24">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Enhanced User menu dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200">
                    {/* User Profile Header */}
                    <div className="p-6 border-b border-slate-200/50 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg font-semibold">
                              {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                          <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full">
                              <Award className="w-3 h-3 mr-1" />
                              {user?.role?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/50">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{userStats.completedQuizzes}</p>
                          <p className="text-xs text-gray-600">Quizzes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-600">{userStats.totalPoints}</p>
                          <p className="text-xs text-gray-600">Points</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">{userStats.currentStreak}</p>
                          <p className="text-xs text-gray-600">Streak</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-orange-600">{userStats.achievements}</p>
                          <p className="text-xs text-gray-600">Awards</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Account Section */}
                      <div className="px-2 py-1">
                        <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</p>
                      </div>

                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 mx-2 rounded-lg"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4 text-blue-600" />
                        <span>My Profile</span>
                        <ChevronDown className="h-3 w-3 text-gray-400 ml-auto rotate-[-90deg]" />
                      </Link>

                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 mx-2 rounded-lg"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        <span>Dashboard</span>
                        <ChevronDown className="h-3 w-3 text-gray-400 ml-auto rotate-[-90deg]" />
                      </Link>

                      <Link
                        href="/learning"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 mx-2 rounded-lg"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span>My Learning</span>
                        <div className="ml-auto flex items-center">
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-2">{learningCount ?? 0}</span>
                          <ChevronDown className="h-3 w-3 text-gray-400 rotate-[-90deg]" />
                        </div>
                      </Link>

                      <Link
                        href="/favorites"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 mx-2 rounded-lg"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Bookmark className="h-4 w-4 text-orange-600" />
                        <span>Saved Items</span>
                        <ChevronDown className="h-3 w-3 text-gray-400 ml-auto rotate-[-90deg]" />
                      </Link>





                      {/* Logout Section */}
                      <div className="border-t border-gray-100 mt-3 pt-2 mx-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 w-full text-left rounded-lg"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
         <SearchModal
           isOpen={showSearchModal}
           onClose={() => setShowSearchModal(false)}
         />
       )}
    </header>
  );
}
