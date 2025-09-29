'use client';

import { useState, useEffect } from 'react';

interface UseScrollOptions {
  threshold?: number;
  debounceMs?: number;
}

interface ScrollState {
  scrollY: number;
  scrollDirection: 'up' | 'down' | null;
  isScrolled: boolean;
  isScrolledPast: boolean;
}

export function useScroll({ threshold = 10, debounceMs = 10 }: UseScrollOptions = {}): ScrollState {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollY: 0,
    scrollDirection: null,
    isScrolled: false,
    isScrolledPast: false,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastScrollY = window.scrollY;

    const updateScrollState = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY ? 'down' : currentScrollY < lastScrollY ? 'up' : null;

      setScrollState({
        scrollY: currentScrollY,
        scrollDirection: direction,
        isScrolled: currentScrollY > 0,
        isScrolledPast: currentScrollY > threshold,
      });

      lastScrollY = currentScrollY;
    };

    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(updateScrollState, debounceMs);
    };

    // Initial state
    updateScrollState();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [threshold, debounceMs]);

  return scrollState;
}