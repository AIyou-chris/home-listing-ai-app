'use strict';
// Real product facts only. Each topic is one angle for one post. No numbers, no customer stories, no promises.
const SITE = 'https://homelistingai.com';
const LO = `${SITE}/for-loan-officers`;

const TOPICS = [
  { key: 'wow-link-intro', pillar: 'agent-partners', link: LO, idea: 'A WOW Link is a free listing page you send an agent. It answers buyer questions all day and the warm lead comes to you. Show a loan officer the simplest way to give an agent something useful this week.' },
  { key: 'agent-gets-free-page', pillar: 'agent-partners', link: LO, idea: 'Agents love free help that makes their listing look better. A WOW Link gives them a page with an AI chat on it, at no cost to them. Frame it as what a loan officer can bring to an agent that is not a rate sheet.' },
  { key: 'not-a-rate-sheet', pillar: 'agent-partners', link: LO, idea: 'Most loan officers show up to agents with a rate sheet. Agents already have one. Talk about showing up with something that helps them sell a listing instead.' },
  { key: 'night-buyers', pillar: 'warm-leads', link: LO, idea: 'Buyers browse listings at night and on weekends, when nobody answers. The listing page chat answers them and captures a name and phone number for the loan officer.' },
  { key: 'warm-vs-cold', pillar: 'warm-leads', link: LO, idea: 'A cold lead is a name on a list. A warm lead raised their hand about a real home. Explain the difference in plain words and where warm leads come from.' },
  { key: 'follow-up-fast', pillar: 'warm-leads', link: LO, idea: 'The first call to a new lead matters most. The app tells the loan officer who to call next, with the lead in front of them. Keep it practical.' },
  { key: 'call-first-card', pillar: 'warm-leads', link: LO, idea: 'The Today screen shows one lead to call next. One screen, one action. Talk about not having to dig through a pipeline to find the right call.' },
  { key: 'ai-answers-calls', pillar: 'ai', link: LO, idea: 'The AI phone line answers when the loan officer cannot, gets a name and number, and passes it along. It works beside the loan officer, not instead of them. The AI tells callers it is an AI.' },
  { key: 'ai-brain-once', pillar: 'ai', link: LO, idea: 'Train the AI Brain once and every listing chat and phone call uses it. Your rules, your answers, your voice. Teach it once.' },
  { key: 'ai-teammate', pillar: 'ai', link: LO, idea: 'AI is a teammate, not a replacement. It covers the gaps: the night, the weekend, the busy day. The loan officer still closes the loan.' },
  { key: 'share-kit', pillar: 'lo-marketing', link: LO, idea: 'The Share Kit gives a loan officer a listing link, a QR code, a flyer and a ready social post for any listing, in one place. No design work.' },
  { key: 'qr-sign-rider', pillar: 'lo-marketing', link: LO, idea: 'Put a QR code on a sign rider or flyer and buyers can chat with the listing from the sidewalk. Talk about turning a yard sign into a lead source.' },
  { key: 'free-trial', pillar: 'lo-marketing', link: LO, idea: 'Try it for 7 days, no card. Send one WOW Link to one agent and see what happens. Low risk, one small step.' },
  { key: 'one-link-this-week', pillar: 'agent-partners', link: LO, idea: 'Challenge: send one WOW Link to one agent. Just one. Small actions beat big plans.' },
  { key: 'condo-check', pillar: 'lo-marketing', link: LO, idea: 'Condo rules keep changing. Condo Check reads an association document and pulls out the facts with the page and quote so the loan officer can check them. Say the loan officer confirms every fact.' },
  { key: 'agent-partner-dashboard', pillar: 'agent-partners', link: LO, idea: 'A live dashboard for each listing shows the leads it brought in. A loan officer can share it with the agent so both see the same thing.' },
  { key: 'invoice-tool', pillar: 'lo-marketing', link: LO, idea: 'Sharing marketing costs with an agent gets awkward. The invoice tool lets a loan officer send a clean invoice. The app never touches the money.' },
  { key: 'stop-adding-software', pillar: 'lo-marketing', link: LO, idea: 'Stop adding software. Add help. A loan officer does not need another dashboard to check. They need leads that show up with a name and a number.' },
  { key: 'referrals-need-reason', pillar: 'agent-partners', link: LO, idea: 'Agents send deals to the loan officer who makes them look good. Give them a reason that is more than rates and fast closings.' },
  { key: 'listing-looks-better', pillar: 'agent-partners', link: LO, idea: 'A listing with an AI chat looks modern. Sellers notice. The agent can say it is part of how they market homes. Position it as a listing edge for the agent.' },
  { key: 'time-back', pillar: 'ai', link: LO, idea: 'Loan officers lose hours to repeat questions: what documents, how long, what costs. Let the AI handle the repeat questions so the loan officer spends time on real conversations.' },
  { key: 'compliance-built-in', pillar: 'lo-marketing', link: LO, idea: 'The listing page shows the loan officer NMLS, Equal Housing and a not-a-commitment note, and the AI says it is an AI. Compliance should not be an afterthought.' },
  { key: 'buyers-want-answers', pillar: 'warm-leads', link: LO, idea: 'Buyers want answers before they want to talk to anyone. Give them answers first, then a human. That is how a buyer becomes a conversation.' },
  { key: 'slow-market', pillar: 'agent-partners', link: LO, idea: 'In a slow market, agents work harder for every showing. A loan officer who helps a listing get more serious buyer questions becomes the loan officer the agent calls first.' },
  { key: 'simple-setup', pillar: 'lo-marketing', link: LO, idea: 'Set up takes minutes: add your details, send a WOW Link, publish a listing. Say what the first week looks like in three plain steps.' }
];

// The 30-day launch plan (docs/marketing/LAUNCH_CAMPAIGN_30_DAY.md). Four weeks, three campaign angles.
// Every idea says what NOT to do, because these posts go out without a person reading them first.
const SIGNUP = `${SITE}/lo-signup`;
const RULES = 'Plain words, short punchy lines, one idea. No statistics except the verified facts listed in this brief, if any. No other numbers about Realtors, no customer stories, no guaranteed referrals or closings. Never say "never miss a lead" or "no lead goes cold". Never say the product finds, matches or supplies Realtors: it gives the loan officer a free WOW Link listing page to bring to an agent, and the buyer chat sends the warm lead to the loan officer.';
const LAUNCH = [
  { week: 1, key: 'l1-quitting', headline: "Your referral network is changing. What's your plan?", campaign: 1, link: LO, facts: ['nar-members-now'], idea: `Campaign 1, The Disappearing Network. Open with: Your referral network is changing. Say plainly that some Realtor partners have slowed down or left the industry, and that your network may not be producing like it used to. Never say all or most Realtors are leaving. What is your plan? No numbers. End with a clear next step. ${RULES}` },
  { week: 1, key: 'l1-cant-control', headline: "You can't control the market. You can control how you compete.", campaign: 1, link: LO, idea: `You cannot control rates. You cannot control the housing market. You cannot stop Realtors from leaving. But you can control how you compete. Build the post on that turn. ${RULES}` },
  { week: 1, key: 'l1-old-network', headline: "Is your referral network still producing?", campaign: 1, link: LO, facts: ['sole-vocation'], idea: `Depending on yesterday's referral network is a risk. Ask the loan officer when they last added a new agent partner, and why. Honest and direct, no scare tactics. ${RULES}` },
  { week: 1, key: 'l1-waiting-for-rates', headline: "Waiting for rates is not a plan.", campaign: 1, link: LO, idea: `Waiting for rates to fall is not a business development plan. Say what to do this week instead: start one new agent relationship. ${RULES}` },
  { week: 2, key: 'l2-competition', headline: "Your competition is building new relationships. Are you?", campaign: 2, link: LO, idea: `Campaign 2, Your Competition Is Not Waiting. Your competition is building new relationships. Are you? Say that loan officers who keep adding agent partners have more doors open, without any numbers or names. ${RULES}` },
  { week: 2, key: 'l2-cost-of-nothing', headline: "Doing nothing is a risk.", campaign: 2, link: LO, facts: ['nar-members-one-year'], idea: `The cost of doing nothing: every referral you never get because the agent does not know you exist. Show the consequence in plain words and give one small step. ${RULES}` },
  { week: 2, key: 'l2-same-agents', headline: "What if two of your top agents slow down?", campaign: 2, link: LO, facts: ['sole-vocation', 'nar-members-now'], idea: `Most loan officers lean on the same few agents. Ask what happens to the pipeline if two of them slow down. Then point to starting one new relationship. ${RULES}` },
  { week: 2, key: 'l2-not-a-rate-sheet', headline: "Stop showing up with a rate sheet.", campaign: 2, link: LO, idea: `Every loan officer shows up with a rate sheet. Competitors who show up with something that helps the agent sell a listing get remembered. Use that contrast. ${RULES}` },
  { week: 3, key: 'l3-next-partner', headline: "Your next top Realtor partner doesn't know you exist.", campaign: 3, link: LO, idea: `Campaign 3, The Opportunity. Your next top Realtor partner does not know you exist. Show how to start: send them a free WOW Link, a listing page with an AI buyer chat, for one of their listings. ${RULES}` },
  { week: 3, key: 'l3-how-it-works', headline: "Send one WOW Link. Start the conversation.", campaign: 3, link: LO, idea: `Explain a WOW Link in three plain steps: you send it, the agent previews a page for their listing, buyers chat with it and the warm lead comes to you. Real steps only. ${RULES}` },
  { week: 3, key: 'l3-start-with-value', headline: "Start with something useful, not a pitch.", campaign: 3, link: LO, idea: `Start the relationship with something useful instead of a pitch. A free listing page that answers buyers at night and on weekends is useful to an agent. Say it that simply. ${RULES}` },
  { week: 3, key: 'l3-warm-lead', headline: "A name. A phone number. A warm lead.", campaign: 3, link: LO, idea: `The payoff for the loan officer is a warm lead: a buyer who asked about a real home and left a name and a phone number. Describe that moment. Do not promise a number of leads. ${RULES}` },
  { week: 4, key: 'l4-founding-price', headline: "Founding price: $49 a month. First 25 loan officers.", campaign: 4, link: SIGNUP, idea: `Founding loan officer launch price: $49 a month instead of $79 for the first 25 loan officers who join, with a 7-day free trial and no card. It ends when the 25 spots are gone. Do not invent a date. Call to action: claim your founding price. ${RULES}` },
  { week: 4, key: 'l4-stop-waiting', headline: "Stop waiting for the market to save you.", campaign: 4, link: SIGNUP, idea: `Stop waiting for the market to save you. Start building your next referral network. Finish with a direct call to action to start the free trial. ${RULES}` },
  { week: 4, key: 'l4-try-one-agent', headline: "Try it free for 7 days. Send one WOW Link.", campaign: 4, link: SIGNUP, idea: `Low risk: start the 7-day free trial, send one WOW Link to one agent, and see what happens. Keep it small and clear. ${RULES}` },
  { week: 4, key: 'l4-market-changed', headline: "The market changed. It's time you did too.", campaign: 4, link: SIGNUP, idea: `The market changed. It is time you did too. Build your network. Build your pipeline. Build your future. A confident closing post that ends with the free trial. ${RULES}` }
];

const FORMATS = ['value', 'feature', 'article'];
const GOALS = { 'agent-partners': 'Build agent partnerships', 'warm-leads': 'Get warm leads', 'ai': 'Drive website visits', 'lo-marketing': 'Drive website visits' };

module.exports = { LAUNCH, TOPICS, FORMATS, GOALS, SITE, LO };
