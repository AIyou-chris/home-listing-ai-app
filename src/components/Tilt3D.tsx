import React, { useRef } from 'react';

/**
 * 3D perspective tilt wrapper — card tilts toward the cursor with a
 * moving glare highlight. Pure CSS transforms, zero dependencies.
 * Resets smoothly on mouse leave; inert on touch devices and for
 * users with reduced-motion enabled.
 */
export const Tilt3D: React.FC<{ children: React.ReactNode; max?: number; className?: string }> = ({
  children,
  max = 9,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.MouseEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) scale3d(1.02, 1.02, 1.02)`;
      if (glareRef.current) {
        glareRef.current.style.opacity = '1';
        glareRef.current.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(103,232,249,0.14), transparent 55%)`;
      }
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    const card = cardRef.current;
    if (card) card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    if (glareRef.current) glareRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d] ${className}`}
    >
      {children}
      <div
        ref={glareRef}
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 transition-opacity duration-300 z-10"
        aria-hidden="true"
      />
    </div>
  );
};
