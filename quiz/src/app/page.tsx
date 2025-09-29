'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  BookOpen,
  Play,
  TrendingUp,
  Users,
  Award,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Shield
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white pt-16 pb-20 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium mb-6 ring-1 ring-white/20">
              <Zap className="w-4 h-4 mr-2" />
              স্বপ্নের চাকরির প্রস্তুতি—যেখানে খুশি, যখন খুশি!
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Education Portal
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              দেশের সেরা অনলাইন শিক্ষা প্ল্যাটফর্ম। ইন্টারঅ্যাক্টিভ কুইজ এবং কোর্সের মাধ্যমে নতুন দক্ষতা অর্জন করুন
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/quizzes"
                className="group bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg flex items-center justify-center"
              >
                কুইজ ব্রাউজ করুন
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/courses"
                className="group border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-slate-900 transition-all duration-200 flex items-center justify-center"
              >
                কোর্স এক্সপ্লোর করুন
                <Play className="ml-2 w-5 h-5" />
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-slate-300 text-sm">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-emerald-300" />
                বিশ্বস্ত প্ল্যাটফর্ম
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-emerald-300" />
                ১০,০০০+ শিক্ষার্থী
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2 text-amber-300" />
                ৪.৮ রেটিং
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">৫০০+</div>
              <div className="text-gray-600">সক্রিয় কুইজ</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">১০K+</div>
              <div className="text-gray-600">শিক্ষার্থী</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <Play className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">৫০+</div>
              <div className="text-gray-600">কোর্স</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                <Award className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">৪.৮</div>
              <div className="text-gray-600">গড় রেটিং</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              কেন Education Portal বেছে নেবেন?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              আমাদের ব্যাপক শিক্ষা প্ল্যাটফর্মের সাথে কার্যকরভাবে শিখুন
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">ইন্টারঅ্যাক্টিভ কুইজ</h3>
              <p className="text-gray-600 leading-relaxed">
                বিভিন্ন বিষয় এবং কঠিনতার স্তরে আকর্ষণীয় কুইজের মাধ্যমে আপনার জ্ঞান পরীক্ষা করুন।
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Play className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">সম্পূর্ণ কোর্স</h3>
              <p className="text-gray-600 leading-relaxed">
                ভিডিও কন্টেন্ট, অ্যাসাইনমেন্ট এবং সার্টিফিকেট সহ কাঠামোবদ্ধ কোর্স থেকে শিখুন।
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">অগ্রগতি ট্র্যাক করুন</h3>
              <p className="text-gray-600 leading-relaxed">
                বিস্তারিত অ্যানালিটিক্স এবং অগ্রগতি ট্র্যাকিং দিয়ে আপনার শেখার যাত্রা পর্যবেক্ষণ করুন।
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">ব্যক্তিগতকৃত শিক্ষা</h3>
                  <p className="text-gray-600 leading-relaxed">
                    আপনার শেখার গতি এবং পছন্দ অনুযায়ী কাস্টমাইজড কন্টেন্ট এবং সুপারিশ পান।
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">২৪/৭ অ্যাক্সেস</h3>
                  <p className="text-gray-600 leading-relaxed">
                    যেকোনো সময়, যেকোনো জায়গা থেকে আপনার পছন্দের ডিভাইসে শিখুন।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              সফলতার গল্প
            </h2>
            <p className="text-xl text-gray-600">
              আমাদের শিক্ষার্থীরা কী বলছেন
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "Education Portal এর কুইজগুলো আমার BCS প্রস্তুতিতে অনেক সাহায্য করেছে। ইন্টারঅ্যাক্টিভ এবং সহজবোধ্য।"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  আ
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">আহমেদ হাসান</div>
                  <div className="text-gray-500 text-sm">BCS ক্যাডার</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "কোর্সগুলো খুবই ভালো সাজানো। ভিডিও লেকচার এবং প্র্যাকটিস টেস্ট দুটোই উপকারী।"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  ফ
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">ফাতিমা খাতুন</div>
                  <div className="text-gray-500 text-sm">ব্যাংক অফিসার</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "প্রগ্রেস ট্র্যাকিং ফিচার দারুণ। নিজের উন্নতি দেখতে পাই এবং আরো মোটিভেটেড হই।"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  র
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">রহিম উদ্দিন</div>
                  <div className="text-gray-500 text-sm">সরকারি চাকরিজীবী</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            শেখা শুরু করতে প্রস্তুত?
          </h2>
          <p className="text-xl mb-8 text-blue-100 leading-relaxed">
            হাজারো শিক্ষার্থীর সাথে যোগ দিন যারা ইতিমধ্যে নতুন দক্ষতা অর্জন করছেন
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="group bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg inline-flex items-center justify-center"
              >
                ড্যাশবোর্ডে যান
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="group bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all duration-200 shadow-lg inline-flex items-center justify-center"
                >
                  বিনামূল্যে শুরু করুন
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="group border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-slate-900 transition-all duration-200 inline-flex items-center justify-center"
                >
                  সাইন ইন করুন
                </Link>
              </>
            )}
          </div>

          {/* Additional CTA Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2 text-emerald-300" />
              <span className="text-blue-100">বিনামূল্যে রেজিস্ট্রেশন</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2 text-emerald-300" />
              <span className="text-blue-100">তাৎক্ষণিক অ্যাক্সেস</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2 text-emerald-300" />
              <span className="text-blue-100">কোনো লুকানো খরচ নেই</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
