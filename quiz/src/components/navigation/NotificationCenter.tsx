'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Filter, Settings, Trash2, BookOpen, Wallet, Users, Award, MessageSquare } from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'quiz' | 'payment' | 'system' | 'social' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      category: 'quiz',
      title: 'Quiz Published',
      message: 'Your "JavaScript Basics" quiz has been approved and published.',
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      read: false,
      actionUrl: '/quiz/javascript-basics',
      priority: 'high'
    },
    {
      id: '2',
      type: 'info',
      category: 'social',
      title: 'New Message',
      message: 'You have a new message from a student about your React course.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: false,
      actionUrl: '/messages',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'warning',
      category: 'payment',
      title: 'Payment Pending',
      message: 'Your withdrawal request is pending approval.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      actionUrl: '/wallet',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'success',
      category: 'achievement',
      title: 'Course Completed',
      message: 'Congratulations! You completed "Python Fundamentals" course.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
      actionUrl: '/certificates',
      priority: 'low'
    },
    {
      id: '5',
      type: 'info',
      category: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2-4 AM EST.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: false,
      actionUrl: '/system-status',
      priority: 'low'
    }
  ]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'quiz' | 'payment' | 'system' | 'social' | 'achievement'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !notification.read;
    return notification.category === activeFilter;
  });

  // Sort notifications by priority and timestamp
  const sortedNotifications = filteredNotifications.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quiz':
        return <BookOpen className="h-4 w-4" />;
      case 'payment':
        return <Wallet className="h-4 w-4" />;
      case 'social':
        return <MessageSquare className="h-4 w-4" />;
      case 'achievement':
        return <Award className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-end pt-16 pr-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Filter notifications"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', icon: Bell },
                { key: 'unread', label: 'Unread', icon: AlertCircle },
                { key: 'quiz', label: 'Quizzes', icon: BookOpen },
                { key: 'payment', label: 'Payments', icon: Wallet },
                { key: 'social', label: 'Social', icon: MessageSquare },
                { key: 'achievement', label: 'Achievements', icon: Award },
                { key: 'system', label: 'System', icon: Settings },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key as any)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' && ` in ${activeFilter}`}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto max-h-[55vh]">
          {sortedNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {activeFilter === 'all' 
                  ? "You'll see notifications here when they arrive"
                  : `Try switching to "All" to see other notifications`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 relative">
                      {getNotificationIcon(notification.type)}
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        <div className="text-gray-400">
                          {getCategoryIcon(notification.category)}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            {notification.priority === 'high' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                High
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-gray-400">
                              {formatTime(notification.timestamp)}
                            </p>
                            {notification.actionUrl && (
                              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                View details →
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3 text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 hover:bg-red-100 rounded-full transition-colors"
                            title="Delete"
                          >
                            <X className="h-3 w-3 text-gray-400 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors">
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
}
