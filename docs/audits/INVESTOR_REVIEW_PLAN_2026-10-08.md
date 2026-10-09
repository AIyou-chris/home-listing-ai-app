# HomeListingAI investor-view review and plan — 2026-10-08

Not judged on having no customers. Judged on: does the one journey that earns money work, and is the story honest.

**Journey:** LO sends WOW Link → agent claims and shares → buyer has a useful chat → buyer agrees to share details → right LO and agent get them → follow-up works.

## Verdict
The idea is sound and the build is far ahead of most seed-stage products. **The value stops in three places on that journey, and two of them were real bugs I found and fixed locally today.** Nothing here is deployed yet. Not launch-ready until the fixes are pushed and the journey is run once for real.

## Where the value stops (in order)
| Step | What happened | Evidence | Status |
|---|---|---|---|
| 1. LO sends WOW Link | Works in code. Demo page loads. Real send never run. | Code read; `/partner-invite/demo` loads on a phone width | Not verified live |
| 2. Agent claims | Claim made the account, then sent the agent to a **sign-in screen** to retype a password they had just made. They then land in an **empty** account; the listing they just saw is not theirs. | `AgentClaimPage.tsx`, claim route creates no listing | Auto sign-in fixed locally. Empty account still open |
| 3. Agent shares a listing | Partner agents are on the **Free plan: 1 active listing, 25 stored leads.** A second listing is blocked at publish; lead 26 was rejected. This clashes with "20 listings across your partner network" | `billingEngine.js` limits; publish route checks the agent's own plan | Lead 26 fixed locally. Listing cap still open (a decision) |
| 4. Buyer chats | Works in code, rules and voice are in the prompts. Live chat not run (paid call) | Prompt code; tests | Not verified live |
| 5. **Buyer shares details** | **A buyer who typed a phone number got an error and the lead was NOT saved.** Email worked. The form never sent the text-consent flag the server demands. Proved on the live server with a harmless probe: `consent_sms_required_when_phone_present` | Live probe 2026-10-08; `PublicListingChatModule.tsx` | **Fixed locally** (clear checkbox) |
| 5b. Consent honesty | Buyer was told "I sent your details to the listing agent". The **loan officer** gets them too. No consent line at all on the form. A promised "1-page report" was never sent | Same file; server prompt text | **Fixed locally** (names the LO, checkbox, report promise removed) |
| 6. Right LO and agent get it | LO's bell alert **crashed the request** (`.catch` on a database call) after the lead was saved, and used the wrong user id, so the LO never got it and the buyer could see an error. LO got no email/text for ordinary leads, only for "hot" ones | `server.cjs` lead capture; new test catches the pattern | **Fixed locally** + LO now gets an email with the shared contact |
| 7. Follow-up | Agent gets push/email/text via queued jobs; unworked-lead nudge exists. Buyer-side automatic follow-up depends on funnels. Real run not done | Code read | Not verified live |

## Results table
| Area | Light | Evidence | What needs to change | Done or still open |
|---|---|---|---|---|
| Buyer phone-number capture and consent | 🔴 Red | Live probe returned 400 for any phone without the consent flag; form had no consent text and named only the agent | Checkbox naming agent and LO, send consent flag, honest confirmation | Fixed locally. **Open until pushed** |
| LO alert on a new lead | 🔴 Red | Bell code threw an error after saving and used a profile id where a login id is needed; no email for normal leads | Safe bell + email to LO with the details the buyer chose to share; test that blocks the pattern | Fixed locally. **Open until pushed** |
| Lead claims (public copy and AI text) | 🔴 Red | "Pre-qualified", "every buyer captured", "100% leads route to you", "never miss a lead", "100% contacted within 1 minute", a **made-up case-study email** ("Sarah doubled her GCI"), sales bot saying every visitor gets routed | Say what is true: the buyer chose to share; the AI notes how serious they seem; the LO decides who is qualified | 14 spots fixed locally (site, SEO files, sales bot, template). Open until pushed. Still needs a decision: the **30-day money-back** promise on the landing page is not in any policy and the sales bot says 7-day trial |
| Production verification | 🔴 Red | DB: 3 accounts, 0 paying, 4 test leads, 1 test listing. No real WOW send, claim, checkout or buyer lead has ever happened | One scripted real run (steps below) | Open. Needs your OK |
| Compliance structure (free tool, referrals) | 🔴 Red | Prompt rules protect wording; they do not make the arrangement lawful. Facts and questions written below | Qualified review before scaling LO outreach | Open. Needs a lawyer |
| "Unlimited" and usage limits | 🔴 Red | LO Pro says unlimited SMS in 6+ places. The SMS counter **only counts, never blocks**, and uses an id that may not match. Phone minutes are enforced (100/300/1000). Public AI chat has a **site-wide** cap of 5,000/day: one busy week at 100 accounts could switch off every buyer chat | Write real fair-use numbers, enforce them, set per-listing chat caps | Open (recommendation below). No pricing changed |
| Competitive advantage | 🔴 Red | Pages, chat, QR, flyer are all copyable by any site builder | See "What could be hard to copy" | Open (strategy) |
| Venture-scale case | 🔴 Red | No revenue, retention or acquisition data; the big story is not yet shown | Prove one LO closes a loan from a listing lead. No valuation is possible yet | Open. Not verified |
| Agent adoption | 🟡 Yellow | Claim → retype password → empty account. Nothing pushes the agent to share with buyers | Auto sign-in (done), then land on "add your listing" with the invited address; weekly "your listing got X views / Y asked" note to the agent | Partly fixed locally |
| Product focus | 🟡 Yellow | LO menu is only 8 items (good). Clutter is in the admin and the repo, and in the sheer number of features the pitch mentions | Pitch only: WOW Link, buyer chat, lead alert, partners. Keep the rest, say less. No deletions proposed | Open (copy and ordering) |
| Positioning | 🟡 Yellow | Public site is already about LOs, shared-lead pain and partnerships ("Stop paying for shared leads"). "AI operating system" appears only in internal docs (CLAUDE.md) | Use: "The listing page your agent partners share, with your name on it. Buyers ask; you get the lead." Update the internal docs | Open (internal docs) |
| Pricing and margins | 🟡 Yellow | Estimated ~85% margin at 10/100/1,000 accounts (see earlier audit); voice minutes are the risk. Prices not changed | Only after real usage data | Open |
| Design and phone use | 🟡 Yellow | No sideways scroll on 10 pages; many tap targets under 36px; the listing tab title can read "Draft Listing" | Bigger taps on public pages; real page title and share image per listing | Open |
| Marketing Studio | 🟡 Yellow | Admin only; guarded; all switches off; good support tool, not why an LO pays | Keep it behind the scenes. No extra work until the core journey is proven | Open (no action) |
| Condo Check | 🟡 Yellow | The LO must tick "I checked these against the document" before anything saves; saved text tells the AI never to say a loan is approved or eligible; red/yellow flags are LO-only | Add a visible "questions for the lender, not a decision" line on the LO screen; test with a real budget PDF | Open |
| Core purpose | 🟢 Green | Warm buyer talks and agent partnerships are the thing everything points to | Protect it | Done |
| WOW Link (idea and demo) | 🟢 Green | Demo is a phone-style app with agent and LO cards, tour preview, loan chat; sent by email and copy-paste text. Not yet run with a real agent | Make it the first thing in every pitch and email | Idea strong. Real run still open |
| LO → agent → buyer model | 🟢 Green | New listings by a partner agent are auto-linked to the LO; LO is told | Do not claim automatic growth; agents must share | Done |
| Founder execution | 🟢 Green | Large amount shipped; fast fixes; strong test habit (332 backend, 156 front-end) | Aim it at finishing this one journey | Done |
| Focused software business | 🟢 Green | One clear paid user: the LO with agent partners | Build around it | Done |

## What could be hard to copy (and what is not)
- **Not a defense:** listing pages, a chat widget, QR, flyers, reels, blog tools.
- **Could be:** (1) the LO's own **compliance rules and per-listing loan facts** sitting in front of every answer (generic chatbots do not have them); (2) the **agent network** itself: once an LO's agents share their pages, moving costs the LO real relationships; (3) a **closed loop**: this agent → this listing → this lead → this application → this closed loan. The cost-per-closed-loan calculator is already on the site; the app does not yet track the outcome. That one number is what makes an LO renew and what would make an investor listen.
- **Suggested focus:** record "applied / closed" on each lead and show the LO "closed loans from my agent partners" on Today. Small feature, big meaning. Not built.

## Compliance structure: the facts and the questions (not legal advice)
**What the product does today (from the code):**
- The LO pays for the platform. The agent gets a free account and a free AI listing page branded with the LO's name and NMLS number.
- Buyer details the buyer chooses to share go to **both** the listing agent and the LO.
- The LO can send an agent an **invoice for a shared marketing cost** (we create, email and track; we never touch the money).
- AI answers carry platform rules (no rate promises, no approval promises, Fair Housing, no guessing) plus the LO's own compliance rules.
- The AI phone line says it is an AI and that the call is transcribed.

**Questions for a qualified mortgage-compliance lawyer:**
1. Does giving agents a free listing-page tool that sends buyers to the LO count as something of value tied to referrals (RESPA Section 8)? What would make it safe: LO-branded marketing only, no agent promise to refer, written terms?
2. Does the shared-cost invoice meet the "fair share, paid by each party for what it gets" idea? Who sets the amount and what records are needed?
3. Does the payment estimate on the listing page ("7.1% rate" default) make the page a credit advertisement that needs extra disclosures? Is the NMLS ID and Equal Housing line I added enough?
4. Text/call consent: must the checkbox name each party that may contact the buyer? Is one box enough for the agent and the LO?
5. AI disclosure: what state rules apply to chat bots and to recording or transcribing calls? The privacy page (May 2026) says nothing about AI calls.
6. Is the LO licensed where the home is? The Brain stores licensed states; the buyer chat does not yet block or hand off for an unlicensed state.
7. Is the app itself (storing buyer data for two businesses) covered by the LO's own privacy and safeguarding duties?
8. Do the blog "RESPA checklist" and the marketing guidelines say anything that reads as legal approval?

Do not tell customers the arrangement is "compliant" until this is answered.

## "Unlimited" and cost exposure
| Promise | What the code does | Cost risk | Recommended rule (no price change) |
|---|---|---|---|
| Unlimited SMS (LO Pro) | Counter adds up, never blocks; may update the wrong row | Unknown per-text price (provider price not verified); runaway texting possible | Call it "fair use up to 2,000/month"; enforce it; block with a clear message |
| 50 / 250 SMS (Lite / LO) | Same, not enforced | Free overage | Enforce or stop advertising numbers |
| Unlimited WOW links (Pro) | Enforced: 50 / 250 / unlimited | Email is cheap | Fine; add an abuse cap per day |
| AI phone minutes | Enforced: 30 trial, 100, 300, 1000 | A 1,000-minute heavy user could cost a large share of $299 (estimate; per-minute cost not verified) | Keep caps; show minutes used; pause at cap |
| Buyer chat | 20/min and 150/day per visitor, **5,000/day for the whole platform** | One busy day turns every customer's chat off | Add per-listing and per-LO daily caps; raise the global cap with usage |
| Reels | 5 per hour; no monthly cap; job list lives in memory | CPU and memory on a small server | Monthly cap per plan |
| Lead storage | Free agent 25, Lite 100, LO 250, Pro 2,000 | Storage is trivial | Never reject a lead for the cap (done locally); upsell by message instead |

## The three changes that matter most before launch
1. **Push the buyer-lead fixes and run the journey once for real.** Phone leads, consent, LO email, no cap rejection. Without this the core promise leaks at the exact moment it matters.
2. **Make the agent's first ten minutes end in a shared listing.** Land on "add your listing" with the invite's address filled in, decide whose plan covers a partner agent (today: 1 listing, 25 leads), and send the agent a weekly "your page got N views, M questions" note.
3. **Stop over-promising.** Replace "unlimited", enforce real limits, publish only claims the app can prove, and get the free-tool/referral arrangement reviewed before any LO outreach campaign goes out.

## Does the core product earn its price?
Not yet proven. At $79 the idea is worth trying for an LO with agent partners. At $149 and $299 it has not earned it: the proof an LO would pay for (a loan that came from an agent's listing) cannot be shown by the app today.

## Safe live test I can run once you say go
Uses your own test accounts and your own email and phone. Costs a few cents of AI and sends about 4 real emails/texts to you only.
1. Send a WOW Link from the comped LO to a test address you control. 2. Open it on a phone and claim it (should now sign straight in). 3. Create and publish a listing; check the LO is attached. 4. Open the public link, chat two messages, share a phone number with the box ticked. 5. Check: lead saved, LO email and bell, agent alert, STOP reply stops texts. 6. Delete the test data afterwards (only with your OK).

## Local changes from this review (nothing pushed)
`backend/server.cjs` (LO alert fix + email, cap no longer rejects a buyer, capture prompt, fixed a second `.catch` on a database call), `PublicListingChatModule.tsx`, `PublicListingPage.tsx`, `ViewingModal.tsx`, `AgentClaimPage.tsx`, `HowItWorksPage.tsx`, `ForLoanOfficersPage.tsx`, `SignUpPage.tsx`, `emailTemplates.ts`, `helpSalesChatBot.ts`, `index.html`, `public/llms.txt`, `public/ai.txt`; new test `noCatchOnSupabaseBuilder.test.js` and a cap test. Gates: backend 332, Jest 156, tsc, lint, build all pass. Not covered by a test: the new consent checkbox (needs a browser test).
