import React, { useEffect, useRef } from 'react';

/**
 * Motion tech background for the hero section.
 * - Animated particle network with connecting lines (Canvas)
 * - Scanning beam (CSS)
 * - Floating tech orbs (CSS)
 * - Animated data grid (CSS)
 *
 * Performant: single canvas, ~60 particles, capped at 60fps.
 */
export const HeroMotionBg: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    type Particle = { x: number; y: number; vx: number; vy: number; r: number };
    const particles: Particle[] = [];
    const COUNT = Math.min(90, Math.floor((width * height) / 14000));
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        r: Math.random() * 2 + 1,
      });
    }

    const MAX_DIST = 150;
    let raf = 0;
    let lastTime = 0;
    const FRAME_MS = 1000 / 60;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - lastTime < FRAME_MS) return;
      lastTime = t;

      ctx.clearRect(0, 0, width, height);

      // Update + draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }
    };
    raf = requestAnimationFrame(draw);

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      {/* Particle network canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Scanning beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-[scan_4s_linear_infinite]" />
      </div>

      {/* Floating tech orbs — larger and brighter, faster animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,1)] animate-[float-1_6s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_25px_rgba(96,165,250,1)] animate-[float-2_7s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] animate-[float-3_5s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 right-1/3 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_25px_rgba(192,132,252,1)] animate-[float-4_6.5s_ease-in-out_infinite]" />
      </div>

      {/* Animated radial pulses (data ping) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-cyan-400">
          <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <div className="absolute bottom-[30%] right-[20%] w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: '1.5s' }}>
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="absolute top-[60%] left-[60%] w-1.5 h-1.5 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: '3s' }} />
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(120px, -80px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-140px, 100px); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(100px, 130px); }
        }
        @keyframes float-4 {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-120px, -110px); }
        }
      `}</style>
    </>
  );
};
