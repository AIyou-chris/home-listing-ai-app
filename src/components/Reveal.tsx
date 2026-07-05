import React, { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'left' | 'right' | 'fade' | 'scale';

interface RevealProps {
  children: React.ReactNode;
  direction?: Direction;
  /** Delay in ms before animation starts */
  delay?: number;
  /** Animation duration in ms (default 700) */
  duration?: number;
  /** % of element visible before triggering (default 0.15) */
  threshold?: number;
  /** Re-trigger animation every time element enters viewport */
  repeat?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Wraps content with a scroll-triggered entrance animation.
 * Uses IntersectionObserver — no scroll listeners, no jank.
 *
 * <Reveal direction="up" delay={100}>...</Reveal>
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  repeat = false,
  className = '',
  as: Tag = 'div',
}) => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // For elements taller than the viewport, `threshold` (a % of the ELEMENT)
    // may be impossible to reach — e.g. 15% of a 4500px section never fits on
    // a 900px screen, so the reveal would never fire and the section stays
    // invisible. Clamp to half the maximum achievable ratio so tall sections
    // always trigger once a reasonable chunk is scrolled into view.
    const viewportH = window.innerHeight || 900;
    const maxRatio = el.offsetHeight > 0 ? Math.min(1, (viewportH * 0.9) / el.offsetHeight) : 1;
    const effectiveThreshold = Math.min(threshold, maxRatio / 2);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!repeat) obs.disconnect();
        } else if (repeat) {
          setVisible(false);
        }
      },
      { threshold: effectiveThreshold, rootMargin: '0px 0px -10% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, repeat]);

  const initialStyle: Record<Direction, string> = {
    up: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
    fade: 'translateY(0)',
    scale: 'scale(0.95)',
  };

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate(0, 0) scale(1)' : initialStyle[direction],
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return (
    // @ts-expect-error generic tag
    <Tag ref={ref} style={style} className={className}>
      {children}
    </Tag>
  );
};
