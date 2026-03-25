'use client';

import { useEffect, useRef, useState } from 'react';

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'fade';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transforms: Record<string, string> = {
    up: 'translate3d(0, 24px, 0)',
    left: 'translate3d(32px, 0, 0)',
    right: 'translate3d(-32px, 0, 0)',
    fade: 'translate3d(0, 0, 0)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : transforms[direction],
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        willChange: visible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
