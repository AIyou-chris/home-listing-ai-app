import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FadeIn } from '../../components/FadeIn';

// Shared blog conversion CTA — used at the end of every post and on the blog index.
export const BlogCTA: React.FC<{ delay?: number }> = ({ delay = 200 }) => {
  const navigate = useNavigate();
  return (
    <FadeIn delay={delay}>
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-8 md:p-12 text-center shadow-[0_0_50px_rgba(6,182,212,0.18)]">
        <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">For loan officers, by loan officers</p>
        <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 leading-tight">Put an AI concierge on every listing</h2>
        <p className="text-slate-300 max-w-xl mx-auto mb-7 text-base md:text-lg">
          Get agent partners, warm buyer leads, and your time back — co-branded with your name &amp; NMLS #. Start free, no card needed.
        </p>
        <button onClick={() => navigate('/lo-signup')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-8 py-4 rounded-2xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
          Start your 7-day free trial →
        </button>
        <p className="text-slate-500 text-xs mt-4">No charge for 7 days · cancel anytime</p>
      </div>
    </FadeIn>
  );
};

export default BlogCTA;
