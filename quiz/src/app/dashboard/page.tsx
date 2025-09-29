'use client';

import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  BookOpen, 
  Trophy, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Bell, 
  ChevronRight, 
  BarChart3, 
  Users, 
  FileText, 
  Award, 
  Clock, 
  Target, 
  Activity, 
  Zap,
  Search,
  Globe,
  ShoppingCart,
  Package,
  UserPlus,
  Eye,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area } from 'recharts';
import PageHeader from '@/components/dashboard/PageHeader';
import AttemptHistory from '@/components/quiz/AttemptHistory';
import AttemptStatistics from '@/components/dashboard/AttemptStatistics';

export default function DashboardPage() {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();

  // Sample data for charts
  const visitorData = [
    { name: 'Jan', visitors: 4000, pageViews: 2400 },
    { name: 'Feb', visitors: 3000, pageViews: 1398 },
    { name: 'Mar', visitors: 2000, pageViews: 9800 },
    { name: 'Apr', visitors: 2780, pageViews: 3908 },
    { name: 'May', visitors: 1890, pageViews: 4800 },
    { name: 'Jun', visitors: 2390, pageViews: 3800 },
    { name: 'Jul', visitors: 3490, pageViews: 4300 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 4000, target: 4500 },
    { month: 'Feb', revenue: 3000, target: 3200 },
    { month: 'Mar', revenue: 5000, target: 4800 },
    { month: 'Apr', revenue: 4500, target: 4200 },
    { month: 'May', revenue: 6000, target: 5500 },
    { month: 'Jun', revenue: 5500, target: 5800 },
  ];

  const satisfactionData = [
    { month: 'Jan', satisfaction: 85 },
    { month: 'Feb', satisfaction: 88 },
    { month: 'Mar', satisfaction: 82 },
    { month: 'Apr', satisfaction: 90 },
    { month: 'May', satisfaction: 87 },
    { month: 'Jun', satisfaction: 92 },
  ];

  const targetVsRealityData = [
    { category: 'Sales', target: 100, reality: 85 },
    { category: 'Marketing', target: 80, reality: 92 },
    { category: 'Support', target: 90, reality: 78 },
    { category: 'Development', target: 95, reality: 88 },
  ];

  const volumeServiceData = [
    { service: 'Email', volume: 85, level: 92 },
    { service: 'Chat', volume: 70, level: 88 },
    { service: 'Phone', volume: 60, level: 95 },
    { service: 'Social', volume: 45, level: 82 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader title="Dashboard" subtitle="Overview of your learning and earnings" />
        {/* Today's Sales Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Sales</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Export <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">Sales Summary</p>
          
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Sales */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">$1k</div>
              <div className="text-sm text-gray-600 mb-2">Total Sales</div>
              <div className="text-xs text-gray-500">+8% from yesterday</div>
            </div>

            {/* Total Order */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">300</div>
              <div className="text-sm text-gray-600 mb-2">Total Order</div>
              <div className="text-xs text-gray-500">+5% from yesterday</div>
            </div>

            {/* Product Sold */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">5</div>
              <div className="text-sm text-gray-600 mb-2">Product Sold</div>
              <div className="text-xs text-gray-500">+1.2% from yesterday</div>
            </div>

            {/* New Customers */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">8</div>
              <div className="text-sm text-gray-600 mb-2">New Customers</div>
              <div className="text-xs text-gray-500">+0.5% from yesterday</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Visitor Insights Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Visitor Insights</h3>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Visitors</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">Page Views</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={visitorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pageViews" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Target vs Reality */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Target vs Reality</h3>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Bar Chart Component</p>
                <p className="text-sm text-gray-400">Target vs actual performance</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-center">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Reality Sales</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">8,823</div>
              </div>
              <div className="text-center">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Target Sales</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">12,122</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Attempt Statistics */}
          <div className="xl:col-span-2">
            <AttemptStatistics className="w-full" />
          </div>
          
          {/* Quiz Attempt History */}
          <div className="xl:col-span-1">
            <AttemptHistory 
              showStatistics={false}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Revenue Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Total Revenue</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span className="text-gray-600">This Year</span>
              <span className="text-gray-600">Last Year</span>
            </div>
          </div>

          {/* Customer Satisfaction Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Satisfaction</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={satisfactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.2}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between items-center mt-4 text-sm">
              <span className="text-green-600 font-medium">+5.4%</span>
              <span className="text-gray-600">vs last month</span>
            </div>
          </div>

          {/* Target vs Reality Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Target vs Reality</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={targetVsRealityData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="target" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reality" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                <span className="text-gray-600">Target</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Reality</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">01</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Home Decor Range</p>
                    <p className="text-sm text-gray-500">Decor</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">$45,000</p>
                  <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                    <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">02</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Disney Princess Pink Bag 18</p>
                    <p className="text-sm text-gray-500">Bag</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">$29,000</p>
                  <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                    <div className="w-10 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">03</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Bathroom Essentials</p>
                    <p className="text-sm text-gray-500">Bath</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">$18,000</p>
                  <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                    <div className="w-8 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold text-sm">04</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Apple Smartwatches</p>
                    <p className="text-sm text-gray-500">Watch</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">$25,000</p>
                  <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                    <div className="w-9 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Mapping by Country */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Mapping by Country</h3>
            <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
              <div className="relative z-10 text-center">
                <Globe className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">World Map</p>
                <p className="text-sm text-gray-500">Interactive country sales data</p>
              </div>
              {/* Sample country indicators */}
              <div className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="absolute top-8 right-8 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <div className="absolute bottom-6 left-8 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute bottom-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">USA</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Europe</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Asia</span>
              </div>
            </div>
          </div>

          {/* Volume vs Service Level */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Volume vs Service Level</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeServiceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="service" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="level" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Volume</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Service Level</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
