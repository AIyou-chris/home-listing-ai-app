import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { PricingSectionNew } from './PricingSectionNew';
import InlineLoDemo from './InlineLoDemo';
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
const Icon = ({ name }: { name: string }) => <span aria-hidden="true" className="material-symbols-outlined al-icon">{name}</span>;
const questions = [
  ['Is this another shared-lead service?', 'No. HomeListingAI puts your AI inside your agent partners’ listings. Buyers ask about a home, then talk to you through that listing. Nobody else gets the lead.'],
  ['What do I get?', 'An AI chat on every listing, your own AI phone line that answers calls, and instant alerts to you and your agent when a buyer shares their info. Plan limits are in the pricing section.'],
  ['How do I get my agent partners started?', 'Send an agent a WOW Link. Their listing opens as an app with your name and NMLS number on it.'],
  ['Am I locked into a contract?', 'No. Month to month. You can cancel from your dashboard billing settings.'],
  ['What if it’s not for me?', 'Try it free for 7 days with no credit card. If it’s not for you, just don’t continue and you are never charged.'],
];

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
    const observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('al-visible'); observer.unobserve(e.target); }
    }), { threshold: 0.08 });
    root.current?.querySelectorAll('.al-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const demo = () => navigate('/lo-demo');
  return <div className="approved-landing" ref={root}>
    <SEO title="HomeListingAI — Stop Paying for Shared Leads" description="Build buyer conversations through your agent partners’ listings. AI property answers, marketing tools, and follow-up in one platform for loan officers." image="/og-image.png" />
    <PublicHeader {...props} onOpenContact={props.onOpenConsultationModal} />
    <main>
      <section className="al-section al-hero">
        <div className="al-wrap al-split">
          <div><p className="al-eyebrow">Built for loan officers</p><h1>Stop paying for<br /><em>shared leads.</em></h1><p className="al-copy">Put your AI inside your agents’ listings. Answer buyers when the financing question hits—and own the lead before it gets shared, sold, or forgotten.</p><div className="al-actions"><button className="al-button" onClick={demo}>See It Work <Icon name="arrow_forward" /></button><button className="al-secondary" onClick={props.onNavigateToSignUp}>Start Free — 7 Days</button></div><p className="al-note">Never shared. Never resold. Your agent. Your listing. Your lead.</p></div>
          <img className="al-product al-float" src="/assets/landing/buyer-conversation.webp" width="1254" height="1254" alt="A buyer asks about a home and the loan officer receives the property and question together." />
        </div>
      </section>
      <section className="al-section al-reveal"><div className="al-wrap">
        <div className="al-heading"><p className="al-eyebrow">The old way is broken</p><h2>You paid for the lead.<br /><em>So did your competition.</em></h2><p>By the time the buyer reaches your phone, the race has already started.</p></div>
        <div className="al-grid">{[['call','Same buyer. More competition.','A shared lead isn’t an introduction. It’s a starting gun.'],['help','No context.','No property. No question. No reason why now.'],['credit_card','Pay again next month.','Stop buying leads and the pipeline stops.']].map(([icon,title,body]) => <article className="al-card" key={title}><Icon name={icon} /><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="al-reversal"><p className="al-eyebrow">The better way</p><h3>Don’t race for the lead.<br /><em>Be where it begins.</em></h3><p>Your agent. Their listing. Your lead.</p></div>
      </div></section>
      <section id="how-it-works" className="al-section al-reveal"><div className="al-wrap">
        <div className="al-split"><div><p className="al-eyebrow">How it works</p><h2>The buyer has a question.<br /><em>You should be the answer.</em></h2><p className="al-copy">HomeListingAI connects you to buyers at the moment a home becomes a financing conversation.</p></div><img className="al-product" src="/assets/landing/buyer-conversation.webp" loading="lazy" width="1254" height="1254" alt="Listing, buyer question, and warm introduction connected." /></div>
        <div className="al-grid">{[['Your agent shares a listing','Your loan officer profile lives inside the property experience.'],['The buyer asks about money','Payment. Down payment. PMI. Qualification.'],['You get the whole story','The buyer, the property, and the question—in one warm introduction.']].map(([title,body],index) => <article className="al-card" key={title}><span className="al-number">0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div><p className="al-closing">From listing click to <em>lending conversation.</em></p>
      </div></section>
      <section id="what-you-get" className="al-section al-reveal"><div className="al-wrap"><div className="al-heading"><h2>What you get. <em>Four things.</em></h2></div><div className="al-grid">{[['forum','AI answers buyers','Every listing has an AI that answers questions about the home and about financing, day or night.'],['call','AI answers your phone','Your own AI phone number takes the call, gets the name and number, and sends you a summary.'],['notifications_active','You and the agent get the alert','The moment a buyer shares their info, you both know.'],['handshake','One link to start','Send an agent a WOW Link. Their listing becomes an app with your name on it.']].map(([icon,title,body]) => <article className="al-card" key={title}><Icon name={icon} /><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>
      <section id="demo" className="al-section al-reveal"><div className="al-wrap al-split"><div><p className="al-eyebrow">Try it for yourself</p><h2>Got a question?<br /><em>Ask the listing.</em></h2><p className="al-copy">Explore the buyer experience. Ask about the home and see how the conversation starts.</p><button className="al-button" onClick={demo}>Open the full demo<Icon name="arrow_forward" /></button></div><InlineLoDemo theme="dark" /></div></section>
      <PricingSectionNew onNavigateToSignUp={props.onNavigateToSignUp} onEnterDemoMode={props.onEnterDemoMode} />
      <section id="faq" className="al-section al-reveal"><div className="al-wrap al-faq"><div className="al-heading"><p className="al-eyebrow">FAQ</p><h2>Good questions. <em>Straight answers.</em></h2></div>{questions.map(([question,answer],index) => <details key={question} open={index===0 ? true : undefined}><summary>{question}<Icon name="add" /></summary><p>{answer}{index===4 && <> <button className="al-text-button" onClick={props.onOpenConsultationModal}>Contact us</button></>}</p></details>)}</div></section>
      <section className="al-section al-final al-reveal"><div className="al-wrap"><p className="al-eyebrow">Build your own pipeline</p><h2>Your next borrower<br />is looking at a home<br /><em>right now.</em></h2><p>Be part of that listing. Be there for the question. Be ready for the conversation.</p><button className="al-button" onClick={props.onNavigateToSignUp}>Start Your 7-Day Free Trial<Icon name="arrow_forward" /></button><button className="al-secondary" onClick={demo}>See HomeListingAI in action</button><p className="al-note">No card needed. Cancel anytime.</p><p className="al-tagline">Your agent. Their listing. Your lead.</p></div></section>
    </main><PublicFooter onNavigateToAdmin={props.onNavigateToAdmin} />
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
