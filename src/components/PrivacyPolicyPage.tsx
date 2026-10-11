import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

type Block = { p: string } | { ul: string[] } | { h: string };
type Section = { title: string; blocks: Block[] };

const EMAIL = 'hello@homelistingai.com';

const SECTIONS: Section[] = [
  {
    title: '1. Who this covers',
    blocks: [
      { ul: [
        '**Visitors and buyers** who use a listing page, chat with the AI, call a number we host, or share contact details.',
        '**Loan officers and agents** who have an account.',
        '**People who visit our own website** or receive our emails.',
      ] },
    ],
  },
  {
    title: '2. What we collect',
    blocks: [
      { h: 'If you are a buyer or visitor on a listing page' },
      { ul: [
        'What you type in the chat, and the AI’s answers.',
        'Your name, email address and phone number, if you choose to share them.',
        'If you use the **pre-approval form**: when you want to buy, whether you are already pre-approved, your credit score range, and your down payment range, plus your contact details. We do not ask for your Social Security number, income documents or bank details.',
        'Your choice to receive calls, texts and emails, and when and how you made it.',
        'Showing requests (date, time, home).',
        'Device and browser type, approximate location from your IP address, the page and link that brought you, and an anonymous visitor ID we store in your browser so the chat can remember your conversation.',
      ] },
      { h: 'If you call a phone number we host for a loan officer' },
      { ul: [
        'Your phone number, the time and length of the call, and what is said. The AI tells you it is an AI assistant and that the call is transcribed. We keep a **transcript and a short summary**, and a rating of how ready you seem to be to buy (hot, warm or cold). We do not keep the audio.',
      ] },
      { h: 'If you have a loan officer or agent account' },
      { ul: [
        'Name, email, phone, company, NMLS number and licensed states (loan officers), photo and branding, and listing details you add.',
        'Billing details are handled by Stripe. We do not store card numbers.',
        'How you use the product (pages, features, sign-in times).',
        'Instructions, documents and rules you give the AI, including company compliance rules and association documents you upload (such as HOA or condo documents).',
      ] },
      { h: 'If you visit our website or get our emails' },
      { ul: [
        'Pages viewed, links clicked, and whether an email was opened or clicked.',
        'If you are a loan officer we contact about our service, your business name, work email, job title and public business details.',
      ] },
    ],
  },
  {
    title: '3. How we use it',
    blocks: [
      { ul: [
        'To run the listing pages, the chat and the phone assistant, and to answer your questions.',
        'To send your details to the **listing agent and the loan officer** on that listing so they can contact you, and to alert them quickly.',
        'To judge how ready a buyer seems to be, so the right person follows up first. This is done by software; a person decides what to do with it.',
        'To send the messages you agreed to (alerts, reminders, showing confirmations).',
        'To keep the service safe, fix problems, prevent abuse and measure usage.',
        'To bill customers and support them.',
        'To follow the law.',
      ] },
      { p: 'We do **not** sell your personal information. We do not use buyer details for our own advertising, and we do not use your details to train AI models.' },
    ],
  },
  {
    title: '4. Who sees your information',
    blocks: [
      { p: '**The listing agent and the loan officer.** When you share your details on a listing page, we send them to both the agent who listed the home and the loan officer connected to that listing. Each is an independent business. After they receive your details, they use them under their own policies and legal duties. A loan officer’s use of your information is also governed by financial privacy law.' },
      { p: '**Our service providers**, who process data only to help us run the service:' },
      { ul: [
        'Supabase (database and sign-in), Render and Netlify (hosting)',
        'OpenAI (AI answers and summaries) and TypeSafe (software that rates and routes conversations)',
        'Mailgun (email), Textbelt (text messages), Telnyx (phone calls)',
        'Stripe (payments)',
        'Google (analytics, maps, translation)',
        'Sentry (error monitoring)',
      ] },
      { p: '**Legal and safety.** We share information when the law requires it, to protect people’s safety, or to protect our rights.' },
      { p: '**Business changes.** If we merge or are acquired, information may move to the new owner, which must follow this policy.' },
    ],
  },
  {
    title: '5. AI: what to know',
    blocks: [
      { ul: [
        'Chat and phone answers are written by AI and may be wrong. They are general information, not legal, tax or financial advice, and not a loan offer or commitment to lend. A person (your loan officer or agent) confirms details.',
        'What you say to the AI is sent to our AI providers to produce the answer.',
        'AI does not make a final decision about whether you qualify for a loan.',
      ] },
    ],
  },
  {
    title: '6. Calls, texts and emails',
    blocks: [
      { ul: [
        '**Texts and calls.** If you give your phone number and tick the box, you agree that the listing agent and the loan officer named on the page may call or text you about that home, including with automated technology. Agreeing is not required to buy a home or get a loan. Message and data rates may apply. Reply **STOP** to stop texts, **HELP** for help. We keep a record of when and how you agreed.',
        '**Price-drop alerts.** If you sign up for alerts on a listing, we text you about that listing until you reply STOP.',
        '**Email.** Every marketing email has an unsubscribe link. We still send account and service messages.',
      ] },
    ],
  },
  {
    title: '7. Cookies, browser storage and analytics',
    blocks: [
      { p: 'We use cookies and browser storage that are necessary for sign-in and for the chat to remember your visit. We also use Google Analytics to count visits and see which pages and links work. You can block cookies in your browser, or install Google’s opt-out add-on at tools.google.com/dlpage/gaoptout. Some features may not work if you block them.' },
    ],
  },
  {
    title: '8. How long we keep it',
    blocks: [
      { ul: [
        'Account information: while the account is open.',
        'Buyer details, chat messages, transcripts and summaries: up to **3 years**, or until you ask us to delete them, unless the law requires us to keep them longer.',
        'Billing records: as long as tax and accounting rules require.',
      ] },
    ],
  },
  {
    title: '9. Your choices and rights',
    blocks: [
      { p: `You can ask us to **see, correct, delete or export** your information, and to stop contacting you. Email **${EMAIL}**. We will confirm your request and answer within 45 days (sooner where the law says). Account holders can also delete their account in Settings, which removes their account, listings, leads, chat messages, call transcripts, settings and uploaded files. Buyers can ask us by email to delete their chat, details and call transcript. To stop texts, reply STOP. To stop emails, click unsubscribe.` },
      { p: '**If you live in California or another state with a privacy law,** you may have additional rights, including to know what we collect, to delete it, to correct it, and to opt out of sale or sharing. We do not sell personal information and do not share it for cross-context advertising. We will not treat you worse for using your rights.' },
      { p: 'Some information (for example financial information handled by a lender) is covered by other laws and is outside some of these rights.' },
    ],
  },
  {
    title: '10. Security',
    blocks: [
      { p: 'We protect information with encryption in transit (HTTPS) and at rest, limit who can reach it, and watch for problems. No system is perfectly secure. If you think your account was accessed without your permission, contact us right away.' },
    ],
  },
  {
    title: '11. Children',
    blocks: [
      { p: 'Our service is for adults. We do not knowingly collect information from anyone under 18. If you think a child gave us information, contact us and we will delete it.' },
    ],
  },
  {
    title: '12. Where data is processed',
    blocks: [
      { p: 'We are based in the United States and the service is for U.S. users. Information is processed in the United States.' },
    ],
  },
  {
    title: '13. Changes',
    blocks: [
      { p: 'If we change this policy in a way that matters, we will update the date above and email account holders. Using the service after a change means you accept it.' },
    ],
  },
  {
    title: '14. Contact',
    blocks: [
      { p: `HomeListingAI, **${EMAIL}**, 3855 Self Rd, Cashmere, WA 98815.` },
    ],
  },
];

// Turns **bold** markers into <strong>.
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-white font-semibold">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>))}
  </>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
      <PublicHeader
        onNavigateToSignUp={() => { window.location.href = '/signup'; }}
        onNavigateToSignIn={() => { window.location.href = '/signin'; }}
        onEnterDemoMode={() => { }}
      />

      <BackgroundTechIcons />
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
      <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

      <main className="flex-grow py-24 sm:py-32 relative z-10 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
            <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">Legal</p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">Privacy Policy</h1>
            <p className="text-slate-400 text-sm mb-6">Last updated: October 11, 2026</p>
            <p className="text-slate-300 mb-10">
              HomeListingAI (“we,” “us,” “our”) runs the HomeListingAI website and platform at homelistingai.com. We give loan officers and real estate agents AI-powered listing pages, a buyer chat, a phone assistant, and tools to follow up with buyers. This policy explains what we collect, why, who sees it, and your choices. Questions: <a href={`mailto:${EMAIL}`} className="text-cyan-400 hover:text-cyan-300 font-medium">{EMAIL}</a>.
            </p>

            <div className="text-slate-300 font-light leading-relaxed space-y-10">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{section.title}</h2>
                  {section.blocks.map((block, i) => {
                    if ('h' in block) return <p key={i} className="mt-6 mb-3 font-semibold text-white">{block.h}</p>;
                    if ('p' in block) return <p key={i} className="mt-4"><Rich text={block.p} /></p>;
                    return (
                      <ul key={i} className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                        {block.ul.map((item) => <li key={item}><Rich text={item} /></li>)}
                      </ul>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="mt-auto relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
