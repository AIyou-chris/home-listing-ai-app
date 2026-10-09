# HomeListingAI launch audit — 2026-10-08

**Verdict: DO NOT LAUNCH yet.** Close, but a live privacy hole is not fixed in production, and the two journeys that make money (checkout, agent claims a WOW Link) have never been run by a real customer.

## 1. What is actually running
| Piece | State |
|---|---|
| Branch / commit | `main` @ `2d5a8bef` = `origin/main` (nothing unpushed at audit start) |
| Frontend (Netlify `ailisting`) | Live deploy `6ac7c9f2…` is commit `2d5a8bef` — matches what was verified |
| Backend (Render) | `/healthz` ok, mode `all`, background tasks + job worker `true`. **Render does not report its commit**, so "backend = this commit" is NOT verified. Admin routes added today answer 401 (not 404) |
| Database | Supabase `HOMELISTINGAI`. Column check against all columns the code uses: only known/tolerated gaps (`agents.user_id/is_admin/stripe_account_id`, legacy `funnel_*`). Security advisor: no errors; RLS on everywhere (73 tables with RLS and no policy = backend-only by design); Postgres version has a patch available |
| Real-world use | 3 accounts (1 LO = Chris, comped; 2 agents, unpaid), 4 leads (all Cold, test), 1 published listing (`test1234`, a test), 1 agent invite, 1 AI conversation, 0 paying customers, all admin send/post switches OFF, 8 blog posts published, 36 drafts |
| Local changes made in this audit | NOT pushed, NOT deployed (see section 4) |

## 2. Checks run
- Backend tests 330 pass (324 before + 6 new), Jest 156 pass, `tsc` clean, lint clean, production build ok.
- Live probes without a login: ~50 routes. Admin, dashboard, LO, billing, webhook routes all refuse (401/403/400). Stripe, Mailgun, Telnyx, OpenAI webhooks reject unsigned calls.
- Live site on a 375px phone: 10 pages, no sideways scrolling. Tiny text only on `/for-loan-officers` (8 items under 11px). Many tap targets under 36px on the landing, signup, privacy, terms pages (15–17 each).
- Admin dashboard loaded (the browser pane was signed in as the admin). Not clicked through again; Chris's 10-06 click-through is the last full pass.
- Screenshots: the browser tool returned images I could not view, so **no screenshots are attached**. Layout findings come from measurements and page text, not eyes.

## 3. Findings
| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `GET /api/blueprint/leads?userId=<any id>` returned every lead for any user with no login (service-role query). Confirmed live (200). Nothing used it | **Launch blocker (privacy)** | Route and file deleted locally + test. **Live until deployed** |
| 2 | Golden Rules (no rate promises, Fair Housing, no guessing) were missing from: the SMS auto-reply to leads, the WOW-page property chat, the agent-page chat, both listing-description writers. The SMS reply also never said it was AI | High (rule 4) | Fixed locally + test |
| 3 | Public listing page showed a "Financing by [LO]" card and a payment widget with no NMLS number, no Equal Housing line, no "not a commitment to lend" line | High (rule 4) | Fixed locally (NMLS shown when the LO has one, plus a short disclosure). **Chris/compliance should approve the wording** |
| 4 | Privacy policy is dated May 2026. It does not mention AI phone answering, call transcripts, Telnyx, Mailgun, or call-recording consent rules (some states need all parties' consent). The AI does say "this call is transcribed" at the start | High (needs a lawyer) | Not changed. Needs qualified review |
| 5 | `POST /api/chat/handoff` (email to the owner) and `/api/language/detect` (paid Google call) had no rate limit | Medium | Fixed locally (10/min/IP) |
| 6 | `POST /api/continue-conversation` lets the browser send its own system prompt to a paid GPT-4-class model. Capped at 20/min and 150/day per IP, 5,000/day total, so worst case roughly a few hundred dollars a day | Medium | Not changed. The only caller is the old sales chat; lower the global cap or lock the prompt server-side |
| 7 | `POST /api/ai/property-chat` trusts the property data the browser sends (price, address) | Medium | Not changed. A visitor can make the bot say anything about a home, only on their own screen |
| 8 | Self-serve "delete my account" removes agents, leads, properties, subscriptions but leaves conversations, LO config, **AI phone number (keeps billing)**, partnerships, invoices | Medium | Not changed |
| 9 | Zero real customers have ever paid or claimed a WOW Link. Stripe checkout → account unlocks has never been tested live (open since 10-03) | Blocker for *launch*, not a bug | Needs Chris: one test, see next step |
| 10 | Footer said "Transform … lead generation" (banned words in our own voice rules); signup badge "TCPA Compliant SMS" is a legal claim we cannot certify | Low/Med | Fixed locally (footer text, badge now "STOP replies honored") |
| 11 | Public listing tab title reads "Draft Listing" for the test listing; social share card shows the generic site title, not the home | Medium for sharing (rule 2) | Not changed |
| 12 | Admin Overview shows "Process uptime 27.87%" and "Last login 7/1/2026 127.0.0.1". Looks broken to an owner | Low | Not changed |
| 13 | Listing descriptions (AI) on the test home use banned/hype words ("transform", "remarkable", "seize"). Voice rules are not in the description writer (only Golden Rules were added) | Low | Not changed |
| 14 | Reel job state, rate limits and the 60-second jobs all live in one server's memory; a deploy or restart loses reel jobs and resets limits. Render plan size not verified (reel renders need RAM) | Medium | Not changed |
| 15 | Default payment widget rate is a fixed 7.1% | Low | Not changed; has "Estimates only" text |
| 16 | 11 failed (403) requests on every public listing load; admin shows a known Supabase `is_user_admin` 403 | Low | Not traced |

## 4. Files changed locally (not pushed)
`backend/server.cjs` (route removed, 2 limiters, Golden Rules on 5 AI prompts), `backend/api/blueprint_leads.js` (deleted), `backend/__tests__/publicRoutes.allowlist.js`, `backend/__tests__/aiPromptGuardrails.test.js` (new), `src/components/PublicPropertyApp.tsx` (NMLS + disclosure), `src/components/layout/PublicFooter.tsx`, `src/components/LOSignupPage.tsx`.

## 5. AI and brains
- Golden Rules + voice reach: public listing chat, LO Brain (chat/phone/text), Business Brain, Marketing Studio, blog writer (via platform guardrails + blog rules), cold email (own banned-word + RESPA rules in code).
- Did NOT reach (now fixed locally): SMS auto-reply, WOW-page chat, agent chat, listing-description writers. Still without them: admin blog "repurpose" and social compose (admin-only), sidekick chat (owner-only), `/api/continue-conversation` (client-supplied prompt).
- Not tested live (paid calls, needs Chris's OK): prompt-injection and misleading-question attempts on the buyer chat, HOA/Condo Check with a real PDF in production.
- Condo Check design is sound (quote must exist on the page, LO ticks "I checked" before facts are used). Not re-run today.

## 6. Journeys: what was and was not verified
| Journey | Level |
|---|---|
| Landing → pitch → signup form (phone width) | Works in production (read only; no account created) |
| Sign up → trial → onboarding | Not verified (would create an account) |
| Checkout → account unlocks | **Not verified. Never tested live** |
| LO invites agent → WOW opens → agent claims → listing live | Demo page loads; real send/claim **not verified** |
| Buyer chat → lead saved → LO + agent notified | Not verified live. DB shows 4 test leads, all Cold |
| Share Kit, QR, flyer, reel | Code + tests only; reel needs a live run |
| Marketing campaign → approve → post | Works in code/tests; no real post ever made; nothing connected through the new flow yet |
| Cold email | Built, switch OFF, 0 prospects, 0 batches ever. Left OFF |
| Blog | 8 published, auto-post OFF (confirmed by code default) |
| Password reset, expired sessions | Not verified |
| Failed payment / cancel | Not verified. One subscription is `past_due` in the DB |

## 7. Design: five changes that matter most
1. Run one real LO through signup → first WOW Link in under 2 minutes with a stopwatch; cut every step that is not "add agent, pick listing, send".
2. Make every public listing shareable: real page title, share image and description per home (rule 2: the agent shares it; it must look right when pasted).
3. Raise tap targets on public pages to 40px+ (landing, signup, legal pages measured 15–17 small ones each).
4. One primary button per dashboard card (Today, Appointments) — still on the open list from 10-02.
5. Fix the admin numbers that look broken (uptime %, last login) so Chris trusts the screen.

## 8. Cost (estimates; assumptions stated)
Prices checked 2026-10-08: Supabase Pro $25/mo (+compute $10–$110); Mailgun Foundation $35 (50k emails), Scale $90 (100k); Telnyx SMS $0.004 + carrier ~$0.0035–0.0045 per segment; OpenAI gpt-4o-mini $0.15/$0.60 per 1M tokens, gpt-realtime-2.1-mini $10/$20 per 1M audio tokens (full model $32/$64); Stripe 2.9% + 30¢ plus 0.7% for Billing; Render web Starter $7, Standard $25, Pro $85 (workspace fee separate, not confirmed). Netlify, Sentry, Telnyx number rental, Apify not re-verified.

Assumptions: average plan $149; typical account uses ~$6–10/mo of AI, text, mail, storage; about 1 in 10 is a heavy phone/reel user at $40+.
| Paying accounts | Revenue | Fixed (hosting, DB, mail, tools) | Usage | Stripe | Total | Left |
|---|---|---|---|---|---|---|
| 10 | ~$1,490 | ~$110 | ~$60 | ~$55 | ~$225 | ~85% |
| 100 | ~$14,900 | ~$250 | ~$800–1,200 | ~$560 | ~$1,600–2,000 | ~87% |
| 1,000 | ~$149,000 | ~$1,000–1,500 | ~$10,000–13,000 | ~$5,600 | ~$17,000–20,000 | ~87% |
Missing: support time, sales/acquisition cost, Telnyx 10DLC fees (not listed on the page), real usage data (there is none). Biggest risk: voice minutes. LO Pro allows 1,000 minutes/month; at heavy use that could cost real money on a $299 plan.

## 9. Worth
- **Customer value:** An LO who has agent partners would plausibly pay $79 for listing pages that answer buyers and hand them the lead, plus the WOW Link as a pitch. The job it does best is rule 2 (the WOW Link). Cancel reasons: no warm leads in the first 30 days, agent never claims the link, a wrong AI answer on a home.
- **Business value:** What is hard to copy: Chris's LO-industry knowledge, the compliance-first prompts, the WOW Link motion. What is easy to copy: the software itself. No revenue, no retention, no acquisition numbers exist, so **no credible business valuation is available yet**.

## 10. Must fix / limited / later / cut
**Must fix before launch:** deploy finding 1 (and 2, 3, 5); run the money test; run one real WOW Link send + claim; legal review of privacy/terms for AI calls and texts.
**Safe with a stated limitation:** cold email stays OFF; social posting "not tested with a real post"; phone AI beta; reel "may be slow".
**After launch:** findings 6–8, 11–15; push alerts; Postgres patch; real monitoring on the Render plan size.
**Hide/cut:** repo clutter (105 root files, 6 AI-tool config files), unused admin stubs, footer "Admin" link on the public site, the two old unused sales-chat paths.

## 11. Next action
Push the local fixes (Chris says "push"), confirm the blueprint route returns 404 live, then the money test.
