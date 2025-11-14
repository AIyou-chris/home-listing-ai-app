import React from 'react';

const sections = [
  {
    title: 'Brand Identity',
    description: 'Upload logos, pick typography, and lock in your primary + accent colors so templates stay on-brand.',
    icon: 'palette'
  },
  {
    title: 'Contact + CTA Blocks',
    description: 'Control how prospects reach you: hero CTAs, calendly embeds, phone / SMS toggles, and social links.',
    icon: 'call_to_action'
  },
  {
    title: 'AI Scripts',
    description: 'Teach your concierge the elevator pitch, unique value props, and FAQs it should surface automatically.',
    icon: 'neurology'
  },
  {
    title: 'Media Library',
    description: 'Drag in video intros, listing reels, or testimonials to showcase right inside the interactive card.',
    icon: 'movie'
  }
];

const AICardBuilderPage: React.FC = () => {
  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 uppercase tracking-wide">
              <span className="material-symbols-outlined text-base">badge</span>
              AI Card Builder
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">Design your interactive business card</h1>
            <p className="text-slate-500 mt-1">
              Control the layout, copy, and AI concierge behavior that powers the shareable card your clients see.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-semibold px-4 py-2 shadow-sm hover:bg-primary-700 transition"
          >
            <span className="material-symbols-outlined text-base">file_download</span>
            Export Preview
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Live Preview</h2>
              <p className="text-sm text-slate-500">Adjust settings on the right to see instant updates.</p>
            </div>
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border border-white/20 bg-slate-800 flex items-center justify-center text-xl font-semibold">
                  AO
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">Agent Concierge</p>
                  <p className="text-lg font-semibold text-white">“Hey, I’m your always-on co-pilot.”</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-300 text-base">smartphone</span>
                  Mobile-friendly, sharable URL
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-300 text-base">schedule</span>
                  Built-in scheduling + instant CTAs
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-300 text-base">neurology</span>
                  AI answers trained on your data
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <button className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white font-semibold py-2">
                  <span className="material-symbols-outlined text-base">calendar_add_on</span>
                  Book a Call
                </button>
                <button className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white font-semibold py-2">
                  <span className="material-symbols-outlined text-base">neurology</span>
                  Chat with AI
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">This is a placeholder preview—hook it up to real builder data soon.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Builder Checklist</h2>
              <p className="text-sm text-slate-500">Map out what we’ll wire next in the live builder.</p>
            </div>
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.title} className="rounded-xl border border-slate-200 p-4 hover:border-primary-200 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">{section.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary-200 text-primary-600 font-semibold py-2 text-sm">
              <span className="material-symbols-outlined text-base">add</span>
              Add custom module
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICardBuilderPage;
