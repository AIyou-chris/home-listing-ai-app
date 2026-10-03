import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from './SEO';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { PricingSectionNew } from './PricingSectionNew';
import ComparePlansModal from './ComparePlansModal';
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
const tools = [
  { name: 'AI Listing Assistant', icon: 'chat', headline: 'Give every home a helpful voice.', body: 'Answer property questions using the information attached to the listing.', benefit: 'Help buyers explore the home while their interest is high.', steps: [['Add your property', 'Enter the listing details and upload photos.'], ['Train the assistant', 'Add property documents, features, and useful answers.'], ['Share the listing', 'Buyers can ask questions from the property page.']], preview: 'Ask about the home', example: 'Is there a pool?', action: 'Try the listing assistant' },
  { name: 'Mortgage Calculator', icon: 'calculate', headline: 'Turn interest into a payment conversation.', body: 'Let buyers explore an estimated payment directly on the property page.', benefit: 'Give them a useful starting point for a conversation with you.', steps: [['Open the listing', 'Find the mortgage calculator on the property page.'], ['Adjust the numbers', 'Explore the price, down payment, rate, and loan term.'], ['Take the next step', 'Connect with the loan officer to discuss financing.']], preview: 'Explore the payment', example: 'What would my payment look like?', action: 'See the property experience' },
  { name: 'AI Phone Caller', icon: 'call', headline: 'Follow up while the lead is warm.', body: 'Start an AI call with your lead and property context.', benefit: 'Keep the first conversation moving while you focus on your pipeline.', steps: [['Choose your lead', 'Open the buyer record you want to contact.'], ['Pick your caller', 'Choose the AI assistant and conversation script.'], ['Start the call', 'Call now or add it to a follow-up flow.']], preview: 'A conversation with context', example: 'Buyer + property + conversation script', action: 'See HomeListingAI in action' },
  { name: 'Smart QR Codes', icon: 'qr_code_2', headline: 'Make every scan a way in.', body: 'Connect your signs and printed materials to the digital listing.', benefit: 'Give buyers a quick path from seeing a home to exploring it.', steps: [['Open the Share Kit', 'Choose the listing you want buyers to visit.'], ['Create your QR code', 'Choose the source and download the code.'], ['Put it to work', 'Add it to signs, flyers, and open-house materials.']], preview: 'From sign to listing', example: 'Scan. Explore. Ask a question.', action: 'See the property experience' },
  { name: 'Open House Flyers', icon: 'description', headline: 'Keep the home in their hands.', body: 'Create a property flyer with an easy route back to the listing.', benefit: 'Give visitors a useful takeaway they can revisit and share.', steps: [['Choose the listing', 'Open its Share Kit and flyer options.'], ['Check the details', 'Review the photos, property facts, and contact information.'], ['Download and print', 'Use the flyer at your open house or share it digitally.']], preview: 'A takeaway that connects', example: 'Property details + photos + QR code', action: 'See HomeListingAI in action' },
  { name: 'Social Content + Video', icon: 'play_circle', headline: 'Give the listing more ways to be seen.', body: 'Create social posts, stories, and listing video to share.', benefit: 'Help your agents bring buyers back to the property experience.', steps: [['Select the property', 'Open the listing’s social content or video tools.'], ['Review your content', 'Choose the format and check the copy and visuals.'], ['Download and share', 'Publish with the listing link so buyers can explore.']], preview: 'Ready for your channels', example: 'Posts. Stories. Listing video.', action: 'See HomeListingAI in action' },
  { name: 'Property Reports', icon: 'analytics', headline: 'Give buyers something useful.', body: 'Create a shareable report with information about the property.', benefit: 'Help your agent start a more informed buyer conversation.', steps: [['Open the Share Kit', 'Select the property report for your listing.'], ['Review the information', 'Check the property facts and report content.'], ['Create and share', 'Download the report and use it in your conversations.']], preview: 'Property information, together', example: 'A report your agent can put to work', action: 'See HomeListingAI in action' },
];
const questions = [
  ['Is this another shared-lead service?', 'HomeListingAI helps you start conversations through your agent partners’ listings. Buyers explore a property, ask questions, and connect with you through that listing.'],
  ['What tools are included?', 'Explore AI listing assistance, the mortgage calculator, AI phone calling, QR codes, open-house flyers, social content and video, and property reports. Plan limits and availability are shown in pricing and your dashboard.'],
  ['How does the AI Phone Caller work?', 'Choose a lead, select your AI caller and conversation script, then start the call or include it in a follow-up flow. Use it with leads who have agreed to receive calls.'],
  ['How do I get my agent partners started?', 'Invite your agent partners, add their listings, and share the property experience. Your name and NMLS information connect you to the financing conversation.'],
  ['Am I locked into a contract?', 'No. There is no long-term contract. You can cancel your subscription from your dashboard billing settings.'],
  ['What if it’s not for me?', 'No worries. If it’s not for you, request your money back within 30 days. Contact us for help with your refund.'],
];

export default function ApprovedLandingPage(props: Props) {
  const { scrollToSection, onScrollComplete } = props;
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(2);
  const [compare, setCompare] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowGuide(true), 2500);
    return () => window.clearTimeout(t);
  }, []);
  const detail = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const tool = selected === null ? null : tools[selected];
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
  const selectTool = (index: number) => {
    setSelected(index);
    requestAnimationFrame(() => {
      detail.current?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 900px)').matches) detail.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  };
  return <div className="approved-landing" ref={root}>
    <SEO title="HomeListingAI — Stop Paying for Shared Leads" description="Build buyer conversations through your agent partners’ listings. AI property answers, marketing tools, and follow-up in one platform for loan officers." image="/og-image.png" />
    <PublicHeader {...props} onOpenContact={props.onOpenConsultationModal} />
    <main>
      <section className="al-section al-hero">
        <div className="al-wrap al-split">
          <div><p className="al-eyebrow">Built for loan officers</p><h1>Stop paying for<br /><em>shared leads.</em></h1><p className="al-copy">Put your AI inside your agents’ listings. Answer buyers when the financing question hits—and own the lead before it gets shared, sold, or forgotten.</p><div className="al-actions"><button className="al-button" onClick={demo}>See It Work <Icon name="arrow_forward" /></button><button className="al-secondary" onClick={props.onNavigateToSignUp}>Start Free — 7 Days</button></div><p className="al-note">Never shared. Never resold. Your agent. Your listing. Your lead.</p></div>
          <img className="al-product al-float" src="/assets/landing/buyer-conversation.png" width="1254" height="1254" alt="A buyer asks about a home and the loan officer receives the property and question together." />
        </div>
      </section>
      <section className="al-section al-reveal"><div className="al-wrap">
        <div className="al-heading"><p className="al-eyebrow">The old way is broken</p><h2>You paid for the lead.<br /><em>So did your competition.</em></h2><p>By the time the buyer reaches your phone, the race has already started.</p></div>
        <div className="al-grid">{[['call','Same buyer. More competition.','A shared lead isn’t an introduction. It’s a starting gun.'],['help','No context.','No property. No question. No reason why now.'],['credit_card','Pay again next month.','Stop buying leads and the pipeline stops.']].map(([icon,title,body]) => <article className="al-card" key={title}><Icon name={icon} /><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="al-reversal"><p className="al-eyebrow">The better way</p><h3>Don’t race for the lead.<br /><em>Be where it begins.</em></h3><p>Your agent. Their listing. Your lead.</p></div>
      </div></section>
      <section id="how-it-works" className="al-section al-reveal"><div className="al-wrap">
        <div className="al-split"><div><p className="al-eyebrow">How it works</p><h2>The buyer has a question.<br /><em>You should be the answer.</em></h2><p className="al-copy">HomeListingAI connects you to buyers at the moment a home becomes a financing conversation.</p></div><img className="al-product" src="/assets/landing/buyer-conversation.png" loading="lazy" width="1254" height="1254" alt="Listing, buyer question, and warm introduction connected." /></div>
        <div className="al-grid">{[['Your agent shares a listing','Your loan officer profile lives inside the property experience.'],['The buyer asks about money','Payment. Down payment. PMI. Qualification.'],['You get the whole story','The buyer, the property, and the question—in one warm introduction.']].map(([title,body],index) => <article className="al-card" key={title}><span className="al-number">0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div><p className="al-closing">From listing click to <em>lending conversation.</em></p>
      </div></section>
      <section className="al-section al-reveal"><div className="al-wrap"><div className="al-heading"><p className="al-eyebrow">Why agents say yes</p><h2>Give your agents more value.<br /><em>Get closer to their buyers.</em></h2><p>You’re not asking for referrals. You’re giving every listing a smarter way to turn interest into conversation.</p></div><div className="al-grid">{[['home','Agent','A better listing experience','A property page agents are proud to share.'],['forum','Homebuyer','Answers while interest is hot','Helpful property and financing information without the wait.'],['notifications_active','Loan officer','The conversation comes to you','Every financing question opens the door to a real borrower.']].map(([icon,role,title,body]) => <article className="al-card" key={role}><Icon name={icon} /><p className="al-eyebrow">{role}</p><h3>{title}</h3><p>{body}</p></article>)}</div><p className="al-closing">You help the agent win. <em>The agent helps you grow.</em></p></div></section>
      <section id="tools" className="al-section al-reveal"><div className="al-wrap"><div className="al-heading"><h2>Pick a tool. <em>Put it to work.</em></h2><p>See what it does. Learn how to use it.</p></div><div className="al-tool-layout"><div className="al-tool-list" aria-label="HomeListingAI tools">{tools.map((item,index) => <button key={item.name} id={`tool-button-${index}`} aria-expanded={selected===index} aria-controls="tool-detail" className={selected===index?'al-selected':''} onClick={() => selectTool(index)}><Icon name={item.icon} /><span>{item.name}</span><Icon name="chevron_right" /></button>)}</div><div id="tool-detail" className="al-tool-panel" ref={detail} tabIndex={-1} role="region" aria-label={tool ? `${tool.name} guide` : 'Choose a tool'}>{tool ? <><button className="al-close" aria-label="Close tool guide" onClick={() => { const index=selected; setSelected(null); document.getElementById(`tool-button-${index}`)?.focus(); }}><Icon name="close" /></button><p className="al-eyebrow">{tool.name}</p><h3>{tool.headline}</h3><p>{tool.body}</p><p className="al-benefit">{tool.benefit}</p><p className="al-eyebrow al-how-label">How to use it</p><ol>{tool.steps.map(([title,body],index) => <li key={title}><span className="al-number">{index+1}</span><div><h4>{title}</h4><p>{body}</p></div></li>)}</ol><div className="al-tool-preview"><Icon name={tool.icon} /><div><strong>{tool.preview}</strong><p>{tool.example}</p></div></div><button className="al-text-button" onClick={() => navigate(tool.name==='AI Listing Assistant'?'/lo-demo':'/partner-invite/demo')}>{tool.action}<Icon name="arrow_forward" /></button>{tool.name==='AI Phone Caller' && <p className="al-note">Use with leads who have agreed to receive calls.</p>}</> : <div className="al-empty"><Icon name="touch_app" /><h3>Choose your next tool.</h3><p>Select a tool to see its guide.</p></div>}</div></div></div></section>
      <section id="demo" className="al-section al-reveal"><div className="al-wrap al-split"><div><p className="al-eyebrow">Try it for yourself</p><h2>Got a question?<br /><em>Ask the listing.</em></h2><p className="al-copy">Explore the buyer experience. Ask about the home and see how the conversation starts.</p><button className="al-button" onClick={demo}>Open the full demo<Icon name="arrow_forward" /></button></div><InlineLoDemo theme="dark" /></div></section>
      <PricingSectionNew onNavigateToSignUp={props.onNavigateToSignUp} onEnterDemoMode={props.onEnterDemoMode} onOpenComparePlans={() => setCompare(true)} />
      <section className="al-guarantee al-reveal"><div className="al-wrap al-guarantee-panel"><h2>Not for you? <em>No worries.</em></h2><div className="al-grid">{[['verified_user','30-day money-back guarantee','If it’s not for you, request your money back within 30 days.'],['lock_open','No contract','No long-term commitment.'],['check_circle','Try it with confidence','See how it fits your business.']].map(([icon,title,body]) => <div className="al-assurance" key={title}><Icon name={icon} /><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></div></section>
      <section id="faq" className="al-section al-reveal"><div className="al-wrap al-faq"><div className="al-heading"><p className="al-eyebrow">FAQ</p><h2>Good questions. <em>Straight answers.</em></h2></div>{questions.map(([question,answer],index) => <details key={question} open={index===0 ? true : undefined}><summary>{question}<Icon name="add" /></summary><p>{answer}{index===5 && <> <button className="al-text-button" onClick={props.onOpenConsultationModal}>Contact us</button></>}</p></details>)}</div></section>
      <section className="al-section al-final al-reveal"><div className="al-wrap"><p className="al-eyebrow">Build your own pipeline</p><h2>Your next borrower<br />is looking at a home<br /><em>right now.</em></h2><p>Be part of that listing. Be there for the question. Be ready for the conversation.</p><button className="al-button" onClick={demo}>See HomeListingAI in action<Icon name="arrow_forward" /></button><a href="#tools" className="al-secondary">Explore the tools</a><p className="al-tagline">Your agent. Their listing. Your lead.</p></div></section>
    </main><PublicFooter onNavigateToAdmin={props.onNavigateToAdmin} /><ComparePlansModal isOpen={compare} onClose={() => setCompare(false)} />
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
