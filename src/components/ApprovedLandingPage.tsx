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

function Toast() {
  return (
    <div className="ll-toast" role="img" aria-label="Example alert: a new buyer lead from Homebuyer 101">
      <span className="ll-chip ll-chip-ok"><Icon name="notifications_active" /></span>
      <div><b>New lead</b><small>Jessica · Homebuyer 101</small></div>
    </div>
  );
}

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
  const trial = () => navigate('/lo-signup');

  return <div className="approved-landing" ref={root}>
    <SEO title="HomeListingAI — Start More Borrower Conversations" description="Built for loan officers by a loan officer. Share your own borrower link, a Homebuyer 101 lesson and loan program pages, send agents a WOW Link, and know who to follow up with next. 7-day free trial." />
    <PublicHeader {...props} onOpenContact={props.onOpenConsultationModal} />
    <main className="ll">
      {/* HERO */}
      <section className="ll-hero">
        <div className="ll-wrap ll-herogrid">
          <div>
            <p className="ll-eyebrow">Built for loan officers, by a loan officer</p>
            <h1>Start more borrower conversations.</h1>
            <p className="ll-lead-copy">Make your own marketing, connect with agents, and always know who to follow up with next. No shared leads. No waiting on a realtor.</p>
            <p className="ll-italic">Built from 15 years in the mortgage industry.</p>
            <div className="ll-cta">
              <button type="button" className="ll-btn ll-btn-solid" onClick={trial}>Start your free trial <Icon name="arrow_forward" /></button>
              <button type="button" className="ll-btn ll-btn-line" onClick={() => navigate('/lo-demo')}>Try the demo</button>
            </div>
            <p className="ll-fine">7 days free · No card needed · Month to month</p>
          </div>
          <div className="ll-stage">
            <MarketingMock />
            <Phone className="ll-phone-hero" />
            <Toast />
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
      <section id="how-it-works" className="ll-section">
        <div className="ll-wrap">
          <p className="ll-eyebrow ll-center">How it works</p>
          <h2 className="ll-h2 ll-center">Create. Capture. <span>Follow up.</span></h2>

          <div className="ll-tour ll-reveal">
            <div><p className="ll-step">1 · Create &amp; share</p><h3>Marketing in a few taps.</h3>
              <p>Make a post, an image, or a short video with music. Copy the link or download the QR code. Posts are drafts you read first, and they never mention rates or payments on their own.</p></div>
            <MarketingMock />
          </div>
          <div className="ll-tour ll-flip ll-reveal">
            <div><p className="ll-step">2 · Capture inquiries</p><h3>See where every buyer came from.</h3>
              <p>Each inquiry lands in Leads with its source and what the buyer asked. You and your agent partner get an alert right away.</p></div>
            <LeadsMock />
          </div>
          <div className="ll-tour ll-reveal">
            <div><p className="ll-step">3 · Follow up</p><h3>Never lose a not-ready buyer.</h3>
              <p>Pick “check back in 3 days” and it shows up on your Today page. Your AI Brain answers buyers and calls in your voice in the meantime.</p></div>
            <BrainMock />
          </div>
          <div className="ll-tour ll-flip ll-reveal">
            <div><p className="ll-step">Bonus · Agent partners</p><h3>Give agents a WOW Link.</h3>
              <p>Their listing opens as an app with your name and NMLS number on it. Buyers ask about the home, then talk to you. Nobody else gets the lead.</p></div>
            <div className="ll-phonewrap"><Phone /></div>
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
