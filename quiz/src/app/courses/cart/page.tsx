'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { coursesAPI, type Course } from '@/lib/courses';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { formatTaka } from '@/lib/utils';

type CartItem = { id: number; title: string; price_cents?: number | null; is_paid: boolean };

export default function CourseCartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('course_cart');
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { setItems([]); }
    }
  }, []);

  const removeItem = (id: number) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    localStorage.setItem('course_cart', JSON.stringify(next));
  };

  const subtotal = items.reduce((sum, i) => sum + (i.is_paid ? Number(i.price_cents ?? 0) : 0), 0);

  const checkout = async () => {
    // One-by-one enroll/purchase via API, then clear cart
    for (const item of items) {
      try { await coursesAPI.enroll(item.id); } catch (e) { /* ignore to continue */ }
    }
    setItems([]);
    localStorage.removeItem('course_cart');
    // Redirect user to learning
    window.location.href = '/learning';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-emerald-600" /> Course Cart</h1>

        {items.length === 0 ? (
          <div className="p-8 border border-slate-200 rounded-2xl text-center">
            <div className="text-slate-600">Your course cart is empty.</div>
            <Link href="/courses" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Browse Courses <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {items.map(item => (
                <div key={item.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-sm text-slate-600">{item.is_paid ? formatTaka(Number(item.price_cents ?? 0), { fromCents: true }) : 'Free'}</div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
            <div className="border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold">{formatTaka(subtotal, { fromCents: true })}</span>
              </div>
              <button onClick={checkout} className="mt-4 w-full px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Checkout</button>
              <div className="mt-2 text-xs text-slate-500">Wallet will be used for paid enrollments.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
