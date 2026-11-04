import React from 'react';
import './home-preview.css';
import { Link } from 'react-router-dom';
import { INCLUDED } from '../lib/loPlanFeatures';
import { ArrowRight, Check, GraduationCap, Bot, Users, CalendarCheck, Handshake, House, Link2, MessageSquare, Play, QrCode } from 'lucide-react';

const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-800';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-700 px-5 py-3 text-center text-sm font-bold text-blue-800 hover:bg-blue-50';

export default function HomePreviewPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950"><House className="text-blue-700" aria-hidden="true" /> HomeListingAI</Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link to="/signin">Sign in</Link>
            <Link to="/lo-signup" className={primary}>Start free trial</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        <section className="home-hero grid items-center lg:grid-cols-[0.88fr_1.12fr]">
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

          <div className="home-art">
            <div className="home-listing">
              <div className="flex items-center justify-between gap-2 bg-blue-950 px-4 py-3 text-xs text-white">
                <span className="flex items-center gap-2 font-extrabold"><House size={17} aria-hidden="true" /> WOW Link</span>
                <span>Co-branded with your agent</span>
              </div>
              <img className="home-listing-photo" src="/assets/landing/preview-home.jpg" alt="Example home with warm lights at dusk" fetchPriority="high" />
              <div className="p-4">
                <p className="text-xl font-black">124 Oak Street</p>
                <p className="mt-1 text-xs text-slate-500">Example listing · Your name and NMLS</p>
                <div className="my-3 flex gap-3 border-y border-slate-100 py-2 text-xs font-semibold text-blue-900"><span>Overview</span><span>Financing questions</span></div>
                <p className="text-sm text-slate-600">Explore the home. Ask a question. Start a conversation.</p>
                <Link to="/lo-demo" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-800">Explore the demo <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
            <Link to="/demo-dashboard/lo-promote" className="home-video" aria-label="Explore branded video tools">
              <img src="/assets/landing/preview-home.jpg" alt="" />
              <span className="home-video-play"><Play size={30} fill="currentColor" aria-hidden="true" /></span>
              <span className="block px-3 py-2 text-xs font-bold">Your listing. Your video.</span>
            </Link>
            <div className="home-lesson">
              <p className="flex items-center gap-2 text-lg font-black"><GraduationCap className="shrink-0 text-blue-700" aria-hidden="true" /> Homebuyer 101</p>
              <p className="my-2 text-sm text-slate-700">Help buyers take their next step.</p>
              <Link to="/learn/sample" className={`${primary} w-full`}>Try the lesson <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section aria-label="Two ways to reach borrowers" className="grid gap-4 lg:grid-cols-2">
          <article className="home-feature">
            <div className="flex items-start gap-3">
              <Users size={34} className="mt-1 shrink-0 text-blue-700" aria-hidden="true" />
              <div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Reach borrowers directly</h2>
              <p className="mt-2 text-slate-700">Attract, educate, and engage homebuyers with ready-to-share mortgage content.</p></div>
            </div>
            <div className="home-feature-tiles">
              <Link to="/learn/sample" className="home-feature-tile"><span className="home-feature-art"><GraduationCap size={40} className="text-blue-700" aria-hidden="true" /><strong>Homebuyer 101</strong><img src="/assets/landing/preview-home.jpg" alt="" className="h-12 w-full rounded-lg object-cover" /></span>Homebuyer 101</Link>
              <Link to="/program/sample/demo1" className="home-feature-tile"><span className="home-feature-art"><strong>Loan programs</strong><span className="text-xs font-normal text-slate-700">Your program sheet</span><Check size={22} className="text-blue-700" aria-hidden="true" /><span className="text-xs font-normal text-slate-700">Your guidance</span></span>Loan program pages</Link>
              <Link to="/demo-dashboard/lo-promote" className="home-feature-tile"><span className="home-feature-art relative !p-0"><img src="/assets/landing/preview-home.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" /><Play size={42} className="relative rounded-full bg-slate-900/60 p-2 text-white" fill="currentColor" aria-hidden="true" /></span>Branded videos</Link>
            </div>
          </article>
          <article className="home-feature">
            <div className="flex items-start gap-3">
              <Handshake size={34} className="mt-1 shrink-0 text-blue-700" aria-hidden="true" />
              <div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Give agents a WOW Link</h2>
              <p className="mt-2 text-slate-700">Partner with agents using co-branded listings and shareable tools.</p></div>
            </div>
            <div className="home-feature-tiles">
              <Link to="/how-it-works" className="home-feature-tile"><span className="home-feature-art !p-0"><span className="w-full bg-blue-950 p-2 text-xs text-white">WOW Link</span><img src="/assets/landing/preview-home.jpg" alt="" className="min-h-0 w-full flex-1 object-cover" /></span>Co-branded listings</Link>
              <Link to="/lo-demo" className="home-feature-tile"><span className="home-feature-art"><Bot size={35} className="text-blue-700" aria-hidden="true" /><span className="rounded-lg bg-blue-50 p-2 text-xs font-normal">Ask a financing question</span></span>AI mortgage assistant</Link>
              <Link to="/demo-dashboard/lo-listings" className="home-feature-tile"><span className="home-feature-art"><QrCode size={76} className="text-blue-950" aria-hidden="true" /><span className="text-xs font-normal">Share the listing</span></span>QR codes &amp; listing videos</Link>
            </div>
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
        <section id="pricing" className="my-10 scroll-mt-6 rounded-3xl bg-slate-100 p-5 sm:p-8">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-800">Pricing</p>
            <h2 className="mt-2 text-3xl font-black">One plan for loan officers</h2>
            <p className="mt-2 text-slate-700">Try it free for 7 days. No credit card needed.</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <p className="text-sm font-bold text-blue-800">Launch offer for the first 25 loan officers</p>
              <p className="mt-1"><span className="text-5xl font-black">$49</span><span className="text-slate-600"> / month</span></p>
              <p className="mt-2 text-sm text-slate-700">Regular price is $79/month. Eligible launch subscribers keep their rate while subscribed.</p>
              <ul className="my-5 grid gap-3 text-sm text-slate-800 sm:grid-cols-2">
                {INCLUDED.map((item) => <li key={item} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />{item}</li>)}
              </ul>
              <Link to="/lo-signup" className={primary}>Start your 7-day free trial</Link>
              <p className="mt-3 text-sm text-slate-600">Month to month. Cancel anytime.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto my-10 max-w-2xl scroll-mt-6">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-800">FAQ</p>
          <h2 className="mb-5 mt-2 text-3xl font-black">Frequently asked questions</h2>
          <div className="space-y-3">
            {[
              ['Do I need an agent partner to start?', 'You can share your personal borrower link, Homebuyer 101 lesson, or loan program page directly. You can also send a WOW Link to an agent to show them a co-branded listing.'],
              ['What can I create in Marketing?', 'Create posts, images, and branded videos. Copy a share link or download a QR code so buyers can open the page.'],
              ['What happens when a borrower reaches out?', 'The inquiry appears in Leads with its source and the information the borrower chose to share. Set a reminder to follow up from Today.'],
              ['What if I use all my AI phone minutes?', 'Calls ring your cell phone instead.'],
              ['Do I need a card to try it?', 'No credit card is needed for the 7-day trial. Choose whether to subscribe after you try it.'],
              ['Can I cancel anytime?', 'Yes. The plan is month to month. You can cancel from your billing settings.'],
            ].map(([question, answer]) => (
              <details key={question} className="rounded-xl border border-slate-200 bg-white px-4">
                <summary className="cursor-pointer py-3 font-bold">{question}</summary>
                <p className="pb-4 text-sm leading-relaxed text-slate-700">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-sm text-slate-600">
        <Link to="/" className="font-semibold hover:underline">HomeListingAI</Link>
      </footer>
    </div>
  );
}
