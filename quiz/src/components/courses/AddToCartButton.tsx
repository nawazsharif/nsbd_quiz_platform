'use client';

import { ShoppingCart } from 'lucide-react';

interface AddToCartButtonProps {
  course: { id: number; title: string; price_cents?: number | null; is_paid: boolean };
}

export default function AddToCartButton({ course }: AddToCartButtonProps) {
  const addToCart = () => {
    const stored = localStorage.getItem('course_cart');
    const list: { id: number; title: string; price_cents?: number | null; is_paid: boolean }[] = stored ? JSON.parse(stored) : [];
    if (!list.find(i => i.id === course.id)) {
      const next = [...list, course];
      localStorage.setItem('course_cart', JSON.stringify(next));
    }
    window.location.href = '/courses/cart';
  };

  return (
    <button onClick={addToCart} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
      <ShoppingCart className="w-4 h-4" /> Add to Cart
    </button>
  );
}
