import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarCheck, Handshake, House, Link2, MessageSquare, Play, QrCode } from 'lucide-react';

const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-800';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-700 px-5 py-3 text-center text-sm font-bold text-blue-800 hover:bg-blue-50';

export default function HomePreviewPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link to="/home-preview" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950"><House className="text-blue-700" aria-hidden="true" /> HomeListingAI</Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
            <a href="#how-it-works">How it works</a>
            <Link to="/signin">Sign in</Link>
            <Link to="/lo-signup" className={primary}>Start free trial</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-20">
          <div>
            <p className="inline-block rounded-lg bg-blue-100 px-3 py-2 text-xs font-extrabold tracking-wide text-blue-900">BUILT FOR LOAN OFFICERS, BY A LOAN OFFICER</p>
            <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl">Start more borrower conversations.</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-700">Create marketing, connect with agents, and know who to follow up with next.</p>
            <p className="mt-4 text-base italic text-slate-700">Built from 15 years in the mortgage industry.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#how-it-works" className={primary}>See how it works <ArrowRight size={17} aria-hidden="true" /></a>
              <Link to="/lo-signup" className={secondary}>Start your free trial</Link>
            </div>
          </div>

          <div className="relative min-w-0 rounded-3xl bg-blue-50 p-3 sm:p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:mr-16">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-950 px-4 py-3 text-white">
                <span className="flex items-center gap-2 text-sm font-bold"><House size={16} aria-hidden="true" /> WOW Link</span>
                <span className="text-xs text-blue-100">Loan officer + agent</span>
              </div>
              <img className="aspect-[16/9] w-full object-cover" src="/demo/home-1.png" alt="Exterior of the example home" fetchPriority="high" />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Example listing</p>
                <p className="mt-1 text-xl font-extrabold">124 Oak Street</p>
                <p className="mt-1 text-sm text-slate-600">A co-branded listing with an AI mortgage assistant.</p>
                <Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-800 hover:underline" to="/lo-demo">Explore the loan officer demo <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:relative sm:-mt-5 sm:ml-20">
              <Link to="/demo-dashboard/lo-promote" className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg hover:border-blue-400">
                <Play className="text-blue-700" size={22} aria-hidden="true" />
                <span className="text-sm font-extrabold">Branded video</span>
                <span className="text-xs text-slate-600">Explore the video maker</span>
              </Link>
              <Link to="/learn/sample" className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg hover:border-blue-400">
                <BookOpen className="text-blue-700" size={22} aria-hidden="true" />
                <span className="text-sm font-extrabold">Homebuyer 101</span>
                <span className="text-xs text-slate-600">Try the buyer lesson</span>
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Two ways to reach borrowers" className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl bg-slate-100 p-5 sm:p-7">
            <BookOpen className="mb-3 text-blue-700" aria-hidden="true" />
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Reach borrowers directly</h2>
            <p className="mt-2 text-slate-700">Share your personal link, Homebuyer 101, or a loan program page with your own audience.</p>
            <p className="mt-4 text-sm font-bold text-blue-900">Posts · Images · Branded videos</p>
            <Link to="/ask/sample" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-800 hover:underline">See a sample borrower link <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>
          <article className="rounded-3xl bg-slate-100 p-5 sm:p-7">
            <Handshake className="mb-3 text-blue-700" aria-hidden="true" />
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Give agents a WOW Link</h2>
            <p className="mt-2 text-slate-700">Let agents preview a co-branded listing with your AI mortgage assistant built in.</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-900"><QrCode size={17} aria-hidden="true" /> Listing links · QR codes · Flyers · Videos</p>
            <Link to="/how-it-works" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-800 hover:underline">See the WOW Link workflow <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>
        </section>

        <section id="how-it-works" className="my-8 scroll-mt-6 rounded-3xl border border-slate-200 p-5 sm:p-7">
          <h2 className="mb-5 text-2xl font-black tracking-tight">From first share to follow-up</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Link2, title: 'Create & share', description: 'Make a post or video, then share a borrower page or co-branded listing.' },
              { icon: MessageSquare, title: 'Capture inquiries', description: 'See where each borrower inquiry came from and what they asked.' },
              { icon: CalendarCheck, title: 'Follow up', description: 'Set a reminder in Leads and see who needs a callback on Today.' },
            ].map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="rounded-xl bg-blue-100 p-3 text-blue-800"><Icon size={21} aria-hidden="true" /></span>
                <div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm text-slate-700">{description}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-blue-950 p-5 text-white sm:p-8">
          <div>
            <h2 className="text-3xl font-black">See HomeListingAI in action</h2>
            <p className="mt-2 text-blue-100">Explore the marketing tools, leads, and follow-up reminders.</p>
          </div>
          <Link to="/lo-demo" className={primary}>Open the demo <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-sm text-slate-600">
        <Link to="/" className="font-semibold hover:underline">HomeListingAI</Link>
      </footer>
    </div>
  );
}
