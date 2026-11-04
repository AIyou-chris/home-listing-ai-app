import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { INCLUDED } from '../lib/loPlanFeatures';
import './approved-landing.css';

// The sales guide: loaded a moment after the page so it never slows the first paint.
const ChatBotFAB = lazy(() => import('./ChatBotFAB'));

interface Props {
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onEnterDemoMode: () => void;
  scrollToSection?: string;
  onScrollComplete?: () => void;
  onOpenConsultationModal: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToShowcase?: () => void;
}

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>
);

const questions = [
  ['Do I need an agent partner to start?', 'No. You can share your personal borrower link, the Homebuyer 101 lesson, or a loan program page with buyers right away. Send an agent a WOW Link when you want a co-branded listing in their hands.'],
  ['What can I make in Marketing?', 'Posts, images, and short videos with music, plus a link and a QR code for each. Every post is a draft for you to read first, and nothing goes out until you say so.'],
  ['What happens when a buyer reaches out?', 'The inquiry lands in Leads with where it came from and what they chose to share. Set a reminder and it shows up on your Today page.'],
  ['Is this another shared-lead service?', 'No. These are your own links, your own lessons, and your own listings. Nobody else gets the lead.'],
  ['What if I use all my AI phone minutes?', 'Calls ring your cell phone instead.'],
  ['Do I need a card to try it?', 'No. The 7-day trial needs no credit card. If it is not for you, just do not continue and you are never charged.'],
  ['Am I locked into a contract?', 'No. Month to month. Cancel any time from your billing settings.'],
];

/* ---------- Product mockups (drawn in code, so they stay sharp on every screen) ---------- */

const NAV = [
  ['today', 'Today'], ['handshake', 'Partners'], ['home', 'Listings'], ['groups', 'Leads'], ['campaign', 'Marketing'], ['psychology', 'AI Brain'],
];

function Window({ active, title, children, className = '' }: { active: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ll-window ${className}`} role="img" aria-label={`Example of the ${title} page`}>
      <div className="ll-bar"><i /><i /><i /><span>homelistingai.com</span></div>
      <div className="ll-app">
        <div className="ll-side">
          <p className="ll-brand"><Icon name="home" className="text-blue-600" /> HomeListingAI</p>
          {NAV.map(([ic, label]) => (
            <p key={label} className={label === active ? 'll-nav on' : 'll-nav'}><Icon name={ic} />{label}</p>
          ))}
        </div>
        <div className="ll-main">{children}</div>
      </div>
    </div>
  );
}

function MarketingMock() {
  return (
    <Window active="Marketing" title="Marketing">
      <h4 className="ll-h">Marketing</h4>
      <p className="ll-sub">Ready-to-share links, lessons, and posts.</p>
      <div className="ll-trio">
        {[['link', 'Borrower link', 'Start a chat with your AI'], ['menu_book', 'Homebuyer 101', 'A fun lesson for buyers'], ['workspace_premium', 'Promote a program', 'Your sheet, a page, posts']].map(([ic, t, s]) => (
          <div key={t} className="ll-card">
            <span className="ll-chip"><Icon name={ic} /></span>
            <b>{t}</b><small>{s}</small>
            <span className="ll-btnrow"><em>Preview</em><u>Copy link</u></span>
          </div>
        ))}
      </div>
      <div className="ll-quad">
        {[['qr_code_2', 'QR code'], ['edit_note', 'Write a post'], ['image', 'Make an image'], ['movie', 'Make a video']].map(([ic, t]) => (
          <div key={t}><span className="ll-chip"><Icon name={ic} /></span><b>{t}</b></div>
        ))}
      </div>
    </Window>
  );
}

function LeadsMock() {
  return (
    <Window active="Leads" title="Leads">
      <h4 className="ll-h">Leads</h4>
      <p className="ll-sub">New buyer conversations and next steps.</p>
      <div className="ll-lead">
        <div className="ll-row"><span className="ll-av">JM</span><div><b>Jessica Miller</b><small>Source: Homebuyer 101</small></div><span className="ll-pill">New</span></div>
        <p className="ll-quote">“How much do I need for a down payment as a first-time buyer?”</p>
        <div className="ll-row"><u className="ll-go">Follow up</u><span className="ll-date"><Icon name="event" /> Check back in 3 days</span></div>
      </div>
      <div className="ll-lead ll-today">
        <p><Icon name="notifications_active" className="text-blue-600" /> <b>Time to check back</b></p>
        <div className="ll-row"><small>Jessica Miller · down payment question</small><u className="ll-go">Done</u></div>
      </div>
    </Window>
  );
}

function BrainMock() {
  return (
    <Window active="AI Brain" title="AI Brain">
      <h4 className="ll-h">AI Brain</h4>
      <p className="ll-sub">Your always-on assistant. Set it up once.</p>
      {[['menu_book', 'Taught it', 'Your programs and talking points'], ['chat', 'Chat on', 'Answers buyer questions on your links'], ['call', 'Phone line live', 'Answers calls with your greeting'], ['play_circle', 'Tried it', 'You tested it and it works']].map(([ic, t, s]) => (
        <div key={t} className="ll-check"><Icon name="check_circle" className="ll-ok" /><span className="ll-chip"><Icon name={ic} /></span><div><b>{t}</b><small>{s}</small></div></div>
      ))}
    </Window>
  );
}

function Phone({ className = '' }: { className?: string }) {
  return (
    <div className={`ll-phone ${className}`} role="img" aria-label="Example of a WOW Link on a phone, with the loan officer’s name and NMLS number">
      <div className="ll-notch" />
      <div className="ll-ptop"><Icon name="home" /> WOW Link <small>with your loan officer</small></div>
      <img src="/assets/landing/preview-home.jpg" alt="" width="640" height="480" loading="eager" />
      <div className="ll-pbody">
        <b>124 Oak Street</b>
        <small>Example listing</small>
        <div className="ll-lo"><span className="ll-av">YN</span><div><b>Your Name, Loan Officer</b><small>NMLS # shown here</small></div></div>
        <div className="ll-ask"><Icon name="chat" /> Ask about financing</div>
      </div>
    </div>
  );
}

function LeadCard() {
  return (
    <div className="l3-mini" role="img" aria-label="Example lead card: Jessica Miller from Homebuyer 101">
      <div className="ll-row"><span className="ll-av">JM</span><div><b>Jessica Miller</b><small>Homebuyer 101 · New lead</small></div><span className="ll-pill">New</span></div>
      <p className="ll-quote">“How much do I need down as a first-time buyer?”</p>
      <div className="ll-row"><u className="ll-go">Follow up</u><span className="ll-date"><Icon name="event" /> In 3 days</span></div>
    </div>
  );
}

function BrainCard() {
  return (
    <div className="l3-mini" role="img" aria-label="Example AI Brain setup checks">
      <p className="l3-mt"><Icon name="psychology" className="text-blue-600" /> AI Brain</p>
      {['Taught it', 'Chat on', 'Phone line live', 'Tried it'].map(t => <p key={t} className="l3-ck"><Icon name="check_circle" className="ll-ok" />{t}</p>)}
    </div>
  );
}

function QrChip() {
  const cells = Array.from({ length: 49 }, (_, i) => ((i * 7 + (i >> 2) * 3) % 5 < 2) || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(i));
  return <div className="l3-qr" role="img" aria-label="Example QR code">{cells.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</div>;
}

function VideoChip() {
  return <div className="l3-vid" role="img" aria-label="Example short video with music"><img src="/assets/landing/preview-home.jpg" alt="" width="320" height="240" /><span className="l3-play"><Icon name="play_arrow" /></span><small><Icon name="music_note" /> 0:15</small></div>;
}

function ScoreChip() {
  return <div className="l3-score" role="img" aria-label="Example Homebuyer 101 readiness score"><svg viewBox="0 0 36 36" width="54" height="54"><circle cx="18" cy="18" r="15" fill="none" stroke="#dbe8ff" strokeWidth="4" /><circle cx="18" cy="18" r="15" fill="none" stroke="#1d4ed8" strokeWidth="4" strokeDasharray="70 100" strokeLinecap="round" transform="rotate(-90 18 18)" /></svg><div><b>Ready score</b><small>Homebuyer 101</small></div></div>;
}

function Box({ children, chips }: { children: React.ReactNode; chips?: React.ReactNode }) {
  return <div className="ll-box">{children}{chips}</div>;
}
const Float = ({ at, children }: { at: string; children: React.ReactNode }) => <div className={`ll-float ${at}`}><div className="l3-in">{children}</div></div>;

const PATH = [
  ['link', 'Share your link', 'Post your borrower link, a Homebuyer 101 lesson, or a loan program page. Make the post, image or video in a few taps.', 'Buyers find you'],
  ['forum', 'They learn and ask', 'The lesson, the AI chat and your AI phone line answer buyers in your voice, day and night.', 'They open up'],
  ['notifications_active', 'You get the lead', 'You see who they are, where they came from and what they asked. You and your agent partner get an alert.', 'Only you have it'],
  ['event_available', 'You follow up on time', 'Pick “check back in 3 days.” It shows on your Today page so nobody slips away.', 'No one is forgotten'],
  ['emoji_events', 'You close the loan', 'You were first in the conversation, you knew the question, and you called at the right time.', 'More closed deals'],
];

function PhoneShell({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ll-phone ll-wphone ${className}`} role="img" aria-label={title}>
      <div className="ll-notch" />
      <div className="ll-ptop"><Icon name="home" /> WOW Link <small>with your loan officer</small></div>
      {children}
    </div>
  );
}

function WowListing() {
  return (
    <PhoneShell title="Example WOW Link: a listing with the agent and loan officer side by side">
      <img src="/assets/landing/preview-home.jpg" alt="" width="640" height="480" loading="lazy" />
      <div className="ll-pbody">
        <b>124 Oak Street</b><small>Example listing · 4 bed · 3 bath</small>
        <div className="ll-lo"><span className="ll-av">AG</span><div><b>Agent Name</b><small>Listing agent</small></div></div>
        <div className="ll-lo"><span className="ll-av">YN</span><div><b>Your Name, Loan Officer</b><small>NMLS # shown here</small></div></div>
        <div className="ll-ask"><Icon name="chat" /> Ask about financing</div>
      </div>
    </PhoneShell>
  );
}

function WowChat() {
  return (
    <PhoneShell title="Example WOW Link chat: a buyer asks a financing question and the AI answers">
      <div className="ll-pbody ll-chatbody">
        <p className="ll-bub me">What would I need to put down on this one?</p>
        <p className="ll-bub ai">Good question. Down payment options depend on the loan type. I can walk you through the choices. Want Your Name to follow up?</p>
        <p className="ll-bub me">Yes please</p>
        <p className="ll-bub ai">Great. What is your name and best number?</p>
        <div className="ll-ask"><Icon name="send" /> Type a message…</div>
      </div>
    </PhoneShell>
  );
}

function WowTour() {
  return (
    <PhoneShell title="Example WOW Link tour booking: choose a day and time to see the home">
      <div className="ll-pbody">
        <b>Book a tour</b><small>Pick a day that works for you</small>
        <div className="ll-days">{['Sat', 'Sun', 'Mon', 'Tue'].map((d, i) => <span key={d} className={i === 1 ? 'on' : ''}>{d}</span>)}</div>
        <div className="ll-times">{['10:00', '11:30', '1:00', '3:30'].map((t, i) => <span key={t} className={i === 2 ? 'on' : ''}>{t}</span>)}</div>
        <div className="ll-ask"><Icon name="event_available" /> Request this tour</div>
        <small>Your agent and your loan officer both get the request.</small>
      </div>
    </PhoneShell>
  );
}

const WOW_STEPS = [
  ['send', 'Send the link', 'Pick a listing and tap Send a WOW Link. The agent gets it by text or email.'],
  ['phone_iphone', 'The agent opens an app', 'Their listing, their photos, and your name and NMLS number side by side.'],
  ['forum', 'Buyers ask, the AI answers', 'Questions about the home and the financing get answered right away, in your voice.'],
  ['notifications_active', 'You get the lead', 'Name, number and question go to you and your agent partner. Nobody else gets it.'],
];

/* ---------- Page ---------- */


export default function ApprovedLandingPage(props: Props) {
  const { scrollToSection, onScrollComplete } = props;
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowGuide(true), 2500);
    return () => window.clearTimeout(t);
  }, []);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }), 400);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!scrollToSection) return;
    document.getElementById(scrollToSection)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    onScrollComplete?.();
  }, [scrollToSection, onScrollComplete]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { root.current?.querySelectorAll('.ll-reveal').forEach(el => el.classList.add('ll-in')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('ll-in'); observer.unobserve(e.target); }
    }), { threshold: 0.08 });
    root.current?.querySelectorAll('.ll-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const heroRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0; let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = still ? 0.55 : Math.min(1, Math.max(0, -r.top / span));
      el.style.setProperty('--s', String(window.innerWidth <= 960 ? Math.min(1, (window.innerWidth - 40) / 780) : Math.min(1, (window.innerWidth - 24) / 620)));
      if (Math.abs(p - last) < 0.0005) return;
      last = p; el.style.setProperty('--p', p.toFixed(4));
      setStep(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) window.cancelAnimationFrame(raf); };
  }, []);
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    heroRef.current?.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
    heroRef.current?.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };
  const untilt = () => { heroRef.current?.style.setProperty('--mx', '0'); heroRef.current?.style.setProperty('--my', '0'); };
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('.ll-tour, .ll-price, .ll-three, .ll-path, .ll-wow, .ll-mk') || []);
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      nodes.forEach(n => {
        const r = n.getBoundingClientRect();
        const c = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
        n.style.setProperty('--c', Math.max(-1, Math.min(1, c)).toFixed(3));
      });
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) window.cancelAnimationFrame(raf); };
  }, []);
  const trial = () => navigate('/lo-signup');

  return <div className="approved-landing" ref={root}>
    <SEO title="HomeListingAI — Start More Borrower Conversations" description="Built for loan officers by a loan officer. Share your own borrower link, a Homebuyer 101 lesson and loan program pages, send agents a WOW Link, and know who to follow up with next. 7-day free trial." />
    <PublicHeader {...props} onOpenContact={props.onOpenConsultationModal} />
    <main className="ll">
      {/* HERO: a 3D scene that opens up as you scroll */}
      <section className="l3" ref={heroRef} data-step={step}>
        <div className="l3-sticky">
          <div className="ll-wrap l3-grid">
            <div className="l3-copy">
              <p className="ll-eyebrow">Built for loan officers, by a loan officer</p>
              <h1>Start more borrower conversations.</h1>
              <p className="ll-lead-copy">Make your own marketing, connect with agents, and always know who to follow up with next. No shared leads. No waiting on a realtor.</p>
              <div className="ll-cta">
                <button type="button" className="ll-btn ll-btn-solid" onClick={trial}>Start your free trial <Icon name="arrow_forward" /></button>
                <button type="button" className="ll-btn ll-btn-line" onClick={() => navigate('/lo-demo')}>Try the demo</button>
              </div>
              <p className="ll-fine">7 days free · No card needed · Month to month</p>
              <ol className="l3-steps" aria-label="How it works">
                {['Create & share', 'Capture inquiries', 'Follow up'].map((t, i) => <li key={t} className={step === i ? 'on' : ''}><b>{i + 1}</b>{t}</li>)}
              </ol>
            </div>
            <div className="l3-view" onPointerMove={tilt} onPointerLeave={untilt}>
              <div className="l3-glow" aria-hidden="true" />
              <div className="l3-scene">
                <div className="l3-layer l3-a"><div className="l3-in l3-win"><MarketingMock /></div></div>
                <div className="l3-layer l3-b"><div className="l3-in l3-ph"><Phone /></div></div>
                <div className="l3-layer l3-c"><div className="l3-in l3-card"><LeadCard /></div></div>
                <div className="l3-layer l3-d"><div className="l3-in l3-card"><BrainCard /></div></div>
                <div className="l3-layer l3-e"><div className="l3-in"><QrChip /></div></div>
                <div className="l3-layer l3-f"><div className="l3-in"><VideoChip /></div></div>
                <div className="l3-layer l3-g"><div className="l3-in"><ScoreChip /></div></div>
              </div>
            </div>
          </div>
          <p className="l3-hint" aria-hidden="true"><Icon name="mouse" /> Scroll to open it up</p>
        </div>
      </section>

      {/* HOW IT WORKS: the simple path to a closed loan */}
      <section id="how-it-works" className="ll-section ll-pathsec">
        <div className="ll-wrap">
          <p className="ll-eyebrow ll-center">How it works</p>
          <h2 className="ll-h2 ll-center">From first click to <span>closed loan.</span></h2>
          <p className="ll-center ll-lead-copy">Five simple steps. Each one puts you in the conversation first.</p>
          <ol className="ll-path">
            <li className="ll-pathline" aria-hidden="true"><i /></li>
            {PATH.map(([ic, t, d, r], i) => (
              <li key={t} className="ll-pstep ll-reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="ll-pnode"><Icon name={ic} /><b>{i + 1}</b></span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="ll-presult"><Icon name="check_circle" />{r}</span>
              </li>
            ))}
          </ol>
          <div className="ll-why ll-reveal">
            {[['bolt', 'You are first', 'The buyer asks you, not a lead list.'], ['lock', 'You are the only one', 'No shared leads. No race against other loan officers.'], ['schedule', 'You never forget', 'Reminders bring every not-ready buyer back to you.']].map(([ic, t, d]) => (
              <div key={t}><span className="ll-chip"><Icon name={ic} /></span><b>{t}</b><small>{d}</small></div>
            ))}
          </div>
          <div className="ll-center"><button type="button" className="ll-btn ll-btn-solid" onClick={trial}>Start your free trial <Icon name="arrow_forward" /></button></div>
        </div>
      </section>

      {/* WOW LINK: its own big section */}
      <section id="wow-link" className="ll-wowsec ll-wow">
        <div className="ll-wowglow" aria-hidden="true" />
        <div className="ll-wrap ll-wowgrid">
          <div className="ll-wowcopy">
            <p className="ll-eyebrow ll-eyebrow-dark">The WOW Link</p>
            <h2>Give every agent a listing app <span>with your name on it.</span></h2>
            <p className="ll-wowlead">Send one link. Their listing opens as an app, co-branded with you. Buyers ask about the home, then talk to you. This is how you get in front of the buyers your agent partners already have.</p>
            <ol className="ll-wowsteps">
              {WOW_STEPS.map(([ic, t, d], i) => (
                <li key={t}><span className="ll-wown"><Icon name={ic} /></span><div><b>{i + 1}. {t}</b><small>{d}</small></div></li>
              ))}
            </ol>
            <ul className="ll-wowchips" aria-label="What is in a WOW Link">
              {['Your name and NMLS on every screen', 'Agent and you side by side', 'AI chat 24/7', 'Tour booking', 'Live lead dashboard for the agent', 'QR code and share kit'].map(t => <li key={t}><Icon name="check_circle" />{t}</li>)}
            </ul>
            <div className="ll-wowcta">
              <button type="button" className="ll-btn ll-btn-white" onClick={trial}>Send your first WOW Link <Icon name="arrow_forward" /></button>
              <small>50 WOW Links a month are included. 7-day free trial, no card.</small>
            </div>
          </div>
          <div className="ll-wowstage">
            <div className="ll-wl w1"><div className="l3-in"><WowListing /></div></div>
            <div className="ll-wl w2"><div className="l3-in"><WowChat /></div></div>
            <div className="ll-wl w3"><div className="l3-in"><WowTour /></div></div>
            <div className="ll-wlbadge b1"><div className="l3-in"><span className="ll-chip ll-chip-ok"><Icon name="notifications_active" /></span><div><b>New lead</b><small>Sent to you and the agent</small></div></div></div>
            <div className="ll-wlbadge b2"><div className="l3-in"><span className="ll-chip"><Icon name="qr_code_2" /></span><div><b>Scan to open</b><small>On a sign or a flyer</small></div></div></div>
          </div>
        </div>
      </section>

      {/* LOAN OFFICER MARKETING */}
      <section id="marketing" className="ll-mk ll-section">
        <div className="ll-wrap ll-mkgrid">
          <div className="ll-mkstage">
            <div className="ll-mkflyer"><div className="l3-in"><img src="/assets/landing/sample-class-flyer.jpg" alt="Sample homebuyer class flyer with a QR code" loading="lazy" /></div></div>
            <div className="ll-mkchip c1"><div className="l3-in"><span className="ll-chip ll-chip-ok"><Icon name="person_add" /></span><div><b>New lead</b><small>Finished the class, score 82</small></div></div></div>
            <div className="ll-mkchip c2"><div className="l3-in"><span className="ll-chip"><Icon name="qr_code_2" /></span><div><b>Scan to start</b><small>Prints on every flyer</small></div></div></div>
          </div>
          <div className="ll-mkcopy">
            <p className="ll-eyebrow">Loan officer marketing</p>
            <h2 className="ll-h2">Nobody knows where rates go. <span>Be the loan officer buyers already trust.</span></h2>
            <p className="ll-mklead">Slow markets reward the loan officers who show up before the buyer is ready. Teach first, and the buyer picks you when it is time to move. This is the toolkit that does it for you.</p>
            <ul className="ll-mklist">
              <li><span className="ll-chip ll-chip-lg"><Icon name="school" /></span><div><b>Homebuyer 101, a class that runs itself</b><small>A fun quiz, a cash calculator and a readiness score. Buyers who finish land in your Leads. Print the flyer, post the link, done.</small></div></li>
              <li><span className="ll-chip ll-chip-lg"><Icon name="workspace_premium" /></span><div><b>Promote a program in minutes</b><small>Upload a program sheet. Get a page, safe draft posts, a video and a link. Nothing posts without your yes.</small></div></li>
              <li><span className="ll-chip ll-chip-lg"><Icon name="verified_user" /></span><div><b>Your name and NMLS on everything</b><small>No rate promises, no made-up claims. Built to keep you on the right side of the rules.</small></div></li>
            </ul>
            <div className="ll-mkcta">
              <a className="ll-btn ll-btn-solid" href="/learn/LoTest_One?utm_source=landing_demo" target="_blank" rel="noopener noreferrer">Take the class as a buyer <Icon name="arrow_forward" /></a>
              <a className="ll-btn ll-btn-line" href="/downloads/sample-homebuyer-class-flyer.pdf" download>Download the sample flyer <Icon name="download" /></a>
            </div>
            <small className="ll-mknote">Try it yourself. Fill it in like a buyer and it shows up in my account, so I can follow up. The flyer is a sample. Yours gets your name, photo and QR code.</small>
          </div>
        </div>
        <div className="ll-wrap ll-mktools">
          <h3 className="ll-mkh3">Posts and videos, <span>written for you. Approved by you.</span></h3>
          <div className="ll-mktiles">
            {[
              ['edit_note', 'Social posts in seconds', 'Pick a topic and the AI writes drafts for LinkedIn, Facebook, Instagram and email. Edit the words, add your picture, share with one tap.'],
              ['movie', 'Short branded videos', 'Make a video from a program, a lesson or a listing. Your name and NMLS are on it. Download it and post it anywhere.'],
              ['palette', 'Pictures that match', 'Pick a shape and a color, drop in a photo, and get a post image ready to download. No design skills needed.'],
              ['toggle_on', 'You stay in control', 'Every post starts as a draft. You read it, change it, and press share. Nothing goes out without your yes.'],
            ].map(([ic, t, d]) => (
              <article key={t} className="ll-mktile"><span className="ll-chip ll-chip-lg"><Icon name={ic} /></span><h4>{t}</h4><p>{d}</p></article>
            ))}
          </div>
        </div>
      </section>

      {/* THREE WAYS */}
      <section className="ll-section ll-tint ll-reveal">
        <div className="ll-wrap">
          <h2 className="ll-h2">Three ways to reach buyers. <span>All yours.</span></h2>
          <div className="ll-three">
            {[
              ['link', 'Your borrower link', 'A personal link that starts a conversation with your AI. Put it on a card, a post, or a text.'],
              ['school', 'Homebuyer 101', 'A short, fun lesson with a quiz and a cash calculator. Buyers who finish land in your Leads, with their score.'],
              ['workspace_premium', 'Loan program pages', 'Upload a program sheet, add a few words, and get a page, safe draft posts, a video, and a link.'],
            ].map(([ic, t, s]) => (
              <article key={t} className="ll-feature"><span className="ll-chip ll-chip-lg"><Icon name={ic} /></span><h3>{t}</h3><p>{s}</p></article>
            ))}
          </div>
        </div>
      </section>

      {/* TOUR */}
      <section id="see-it" className="ll-section">
        <div className="ll-wrap">
          <p className="ll-eyebrow ll-center">How it works</p>
          <h2 className="ll-h2 ll-center">Create. Capture. <span>Follow up.</span></h2>

          <div className="ll-tour ll-reveal">
            <div><p className="ll-step">1 · Create &amp; share</p><h3>Marketing in a few taps.</h3>
              <p>Make a post, an image, or a short video with music. Copy the link or download the QR code. Posts are drafts you read first, and they never mention rates or payments on their own.</p></div>
            <Box chips={<><Float at="f-tr"><QrChip /></Float><Float at="f-bl"><VideoChip /></Float></>}><MarketingMock /></Box>
          </div>
          <div className="ll-tour ll-flip ll-reveal">
            <div><p className="ll-step">2 · Capture inquiries</p><h3>See where every buyer came from.</h3>
              <p>Each inquiry lands in Leads with its source and what the buyer asked. You and your agent partner get an alert right away.</p></div>
            <Box chips={<><Float at="f-tl"><ScoreChip /></Float><Float at="f-br"><LeadCard /></Float></>}><LeadsMock /></Box>
          </div>
          <div className="ll-tour ll-reveal">
            <div><p className="ll-step">3 · Follow up</p><h3>Never lose a not-ready buyer.</h3>
              <p>Pick “check back in 3 days” and it shows up on your Today page. Your AI Brain answers buyers and calls in your voice in the meantime.</p></div>
            <Box chips={<Float at="f-tr"><BrainCard /></Float>}><BrainMock /></Box>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="ll-section ll-tint ll-reveal">
        <div className="ll-wrap ll-pricewrap">
          <p className="ll-eyebrow ll-center">Pricing</p>
          <h2 className="ll-h2 ll-center">One plan. <span>One price.</span></h2>
          <p className="ll-center ll-lead-copy">Try it free for 7 days. No card needed.</p>
          <div className="ll-price">
            <p className="ll-badge">Launch price · first 25 loan officers</p>
            <p className="ll-amount"><b>$69</b><span>/ month</span><s>$99</s></p>
            <p className="ll-fine">Locked in for as long as you stay subscribed. Regular price is $99 a month.</p>
            <ul>{INCLUDED.map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul>
            <button type="button" className="ll-btn ll-btn-solid ll-full" onClick={trial}>Start your 7-day free trial</button>
            <p className="ll-fine ll-center">No card needed · Month to month · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ll-section ll-reveal">
        <div className="ll-wrap ll-faqwrap">
          <p className="ll-eyebrow ll-center">FAQ</p>
          <h2 className="ll-h2 ll-center">Straight <span>answers.</span></h2>
          {questions.map(([q, a]) => (
            <details key={q} className="ll-q"><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      {/* FINAL */}
      <section className="ll-final">
        <div className="ll-wrap ll-center">
          <h2>Your next borrower is looking for answers right now.</h2>
          <p>Be the one who gives them.</p>
          <button type="button" className="ll-btn ll-btn-white" onClick={trial}>Start your free trial <Icon name="arrow_forward" /></button>
        </div>
      </section>
    </main>
    <PublicFooter onNavigateToAdmin={props.onNavigateToAdmin} />
    {showGuide && (
      <Suspense fallback={null}>
        <ChatBotFAB
          context={{ userType: 'visitor', currentPage: 'landing', previousInteractions: 0, userInfo: {} }}
          initialMode="sales"
          launcher="headshot"
          launcherImage="/sales-guide.jpg"
          launcherLabel="Welcome, ask me anything"
          guideName="HomeListingAI Assistant"
          position="bottom-right"
        />
      </Suspense>
    )}
  </div>;
}
