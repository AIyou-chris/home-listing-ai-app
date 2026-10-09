## 2026-10-09 — Claude: privacy policy draft for the attorney (docs only, nothing live)

- `docs/legal/PRIVACY_POLICY_DRAFT_2026-10-09.docx` (+ .md): full rewrite to match today's product (AI chat and phone line, transcripts, pre-approval answers, buyer details going to BOTH agent and LO, all vendors incl. OpenAI, TypeSafe, Mailgun, Textbelt, Telnyx, Sentry, Google, cookies/analytics, children, state rights). Notes for the attorney at the top list open choices (cookie banner, GLBA/DPA with LOs, California table, OpenAI training setting). Appendix lists matching changes for Terms, consent boxes (no privacy/terms link next to them today), pre-approval form, AI phone greeting.
- NOT published: live page `src/components/PrivacyPolicyPage.tsx` still the May 2026 text. Replace only after the attorney approves.
- Known gap it admits: "Delete my account" leaves chat messages, phone-line settings and invoices; deletion is finished on request by email until the code is fixed (open task).

## 2026-10-09 — Claude: lawyer brief written + invented customer stats removed (brief committed; copy fix local, NOT pushed)

- `docs/legal/LAWYER_BRIEF_2026-10-09.docx` (and .md): plain-words brief for a mortgage compliance attorney: what the product does, how value and money move, what buyers see, 18 questions (RESPA s.8, Reg Z/SAFE, TCPA, AI/recording/privacy, our own risk), links to the pages to review. Facts checked against the code and the live test. No lawyer chosen yet; outreach campaign and invoice-tool promotion stay paused until answered.
- While checking pages I found invented results in the hidden SEO text and the sales bot ("Most LOs see their first warm lead within the first week", "Most LOs recoup the cost in their first month", an "average LO commission" figure, "every buyer who engages becomes a warm lead ... in real time"). Zero customers exist, so these were made up. Reworded in `index.html`, `scripts/generate-seo-pages.mjs`, `helpSalesChatBot.ts`; new test blocks them. Needs push.

## 2026-10-09 — Claude: partner agents now covered by their loan officer's plan (local, NOT pushed)

- Chris picked #3. Before: a partner agent (free account from a WOW Link) was checked against their own Free plan, so a second listing was blocked at publish ("1 listing") even though LO plans are sold as "5/20/50 live listings across your partner network". Lead cap for them was already lifted earlier (buyers are never turned away).
- Now: publish for an agent with an active partnership checks every partner LO's plan limit against that LO's live (published) listings, not counting the one being published. Allowed if at least one partner LO has room; otherwise 403 `partner_network_limit_reached` with a plain message telling them to ask their loan officer to upgrade. Agents with no partner LO still use their own plan. New `services/partnerNetworkLimit.js` (+4 tests), glue `partnerNetworkPublishDecision` in `server.cjs`, order test. Backend 356.
- Edge left as is: with two partner LOs and only one having room, the listing stays assigned to both. Drafts do not count toward the LO's cap; only published ones.
- Not tested live (needs a partner agent with 2+ listings and a Lite LO at its 5 cap).

## 2026-10-09 — Codex: ArtCraft generation retry confirmed blocker

- Chris left Chrome alone for retry. Entered complete non-sensitive house-at-sunset sample prompt and clicked generation in signed-in ArtCraft (Nano Banana 2, square 1K, one image, 8-credit estimate). UI returned "Not enough credits. Choose a plan to start creating." Account balance 0. No image generated, no purchase, quality untested. Saved proof tmp/artcraft-test/artcraft-credit-block.png, dismissed upsell with Maybe later. No app code or publishing changes.

## 2026-10-09 — Codex: ArtCraft web smoke test

- Chris asked to test the ArtCraft studio shown in his screenshot. Signed-in Chrome UI confirmed balance 0 and Nano Banana 2 square 1K estimate 8 credits. Generation was not completed: native Chrome repeatedly reported user control changes and switched to YouTube during attempted interaction. No purchases made; do not claim generation quality tested.
- Separate IAB session: Edit Image opened without login, created 1024-square blank canvas, drew visible brush stroke. Undo click did not visibly remove stroke in this smoke test; needs investigation. Screenshot tmp/artcraft-test/artcraft-web-editor.png. Browser canvas/drawing tested only; uploads, export, AI editing, video, mobile and dashboard integration unverified. Main ArtCraft studio differs from previously tested native PhotoCraft.
- No application code or publishing settings changed. Blog auto-publishing remains off.

## 2026-10-09 — Claude: test data cleaned up (Chris said "clean up")

- Deleted from production, in one safety-checked block: test agent anaiyou+agent1@pm.me (agent row + login), listing 482 Maple Court, Test Buyer lead, its conversation + messages, the WOW invite, partnership row, bells/alerts and related rows. Counts are back to before the test (agents 3, leads 4, invites 1). Chris's LO account, Fred's partnership and the test1234 listing were not touched.
- Left behind: one test photo file in storage bucket ai-card-assets under folder c88fd9cf-30cf-437c-898d-33089f551f61/ (harmless; remove from the Supabase Storage screen if wanted). Email log rows from the test remain.

## 2026-10-09 — Codex: PhotoCraft/PdfCraft first local tests passed

- Chris requested help testing ArtCraft family. Downloaded official PhotoCraft 0.5.0/PdfCraft 0.4.0 universal Mac DMGs under tmp/artcraft-test; verified publisher SHA256SUMS; mounted read-only, launched directly via CUA. No Gatekeeper bypass, installation into /Applications, subscriptions, AI generations or production changes. Pinokio skill used for discovery; pterm search did not respond and was interrupted; control plane unreachable.
- PhotoCraft: opened existing marketing WebP (1536x1024), added editable Inter text layer, exported separate PNG; file format/dimensions checked. Original unchanged on disk. Unsaved working document remains open. PdfCraft: created safe two-page PDF, opened, moved first page after second, saved sample; visible first page now says page two. Samples/output/screenshots under tmp/artcraft-test. This is a first smoke test, not full stability, browser integration, automation, PSD roundtrip, or AI studio testing. Other Craft apps untested.
- Main ArtCraft license is restrictive fair source; separate PhotoCraft README identifies MIT/Apache2.0. Dashboard integration remains a proposal, not implemented. No app code changed/pushed. DMGs remain mounted while apps are open.

## 2026-10-09 — Claude: end-to-end test PASSED after chat fix (description fix local, NOT pushed)

- Live run, all on production: WOW invite emailed → page opened → claim (auto sign-in) → listing published → LO auto-attached → buyer chat answered live (after pushing a1a3225c; saved as lead/chat with original labels in metadata) → buyer submitted phone with consent box → lead row saved (agent + LO ids, consent_sms true, Warm) → agent bell + email, LO bell + email, all within 1 second.
- Found during the run: the buyer chat was not given the listing description or the Listing Brain notes (said "no garage info" when the description had a two-car garage). Fixed locally in `buildListingContext` (+test), not pushed.
- Not verified: reminder/follow-up texts to the buyer, the LO leads screen with this lead, STOP reply. Listing tab title flips to "Draft Listing" after the chat opens (cosmetic).
- Test data still in prod (delete only with Chris's OK): agent anaiyou+agent1@pm.me (97eec383-7d8f-492b-bd97-0d8b6f1aee01), listing 482 Maple Court (80bb0cdc-b413-41c9-8ded-a5ffd5f92cc2), lead Test Buyer (6fc91c9c-868a-4423-95d4-d7fca6672541), invite 62cb4ec6-..., conversation b315d802-....

## 2026-10-09 — Claude: live end-to-end test found the buyer chat never saved (fix local, NOT pushed)

- Test (Chris's own LO + anaiyou+agent1@pm.me): WOW invite sent and arrived, WOW page opened, claim worked (after a weak-password retry; new auto sign-in worked), agent created and published a listing, LO auto-attached, public page loads. **Buyer chat failed: HTTP 500 on every message.**
- Root cause: live table `ai_conversation_messages` only accepts sender in (lead, agent, ai) and channel in (chat, voice, email). Code wrote sender 'visitor'/'system' and channel 'web'/'sms'. So the listing chat has NEVER answered live or saved a message; the page quietly showed canned answers. SMS two-way history was also being rejected.
- Fix (code only, DB untouched): `backend/services/messageRows.js` translates at the DB edge (visitor→lead, web/sms→chat, original kept in metadata `sender_label`/`channel_label`) and back on read; `insertRowTolerant` applies it to every message write; two raw inserts moved onto it; agent reply route uses the legacy select. +4 tests (350 backend pass).
- Also: friendly message for weak passwords at invite claim (`password_too_weak`); stopped repeat `agents.user_id` lookups (7810, 24912).
- Open: listing tab title reads "Draft Listing" (title field never set from address); test data left in prod: agent anaiyou+agent1@pm.me (id 97eec383...), listing 482 Maple Court (80bb0cdc...), invite, conversation b315d802.... Delete only with Chris's OK.

## 2026-10-09 — Claude: spend stops + no more "unlimited" (local, NOT pushed)

- Chris asked: never promise unlimited, and stop guards on everything so one user/bug cannot cause a big bill. Details and every number: `docs/audits/SPEND_STOPS_2026-10-09.md`.
- New `backend/services/spendGuard.js` (+8 tests). A wrapper on global `fetch`, installed first in `server.cjs`, counts/stops OpenAI, TypeSafe, translation, Mailgun and Telnyx number orders. Own checks: texts (platform, per number, per account by plan), per-address email, AI phone calls (platform + per caller), reels, document reads, voice previews. One owner email per stop per day. All limits are `SPEND_*` Render settings.
- Copy: "unlimited" removed everywhere (site, SEO/AI files, sales bot, billing screens, welcome email). Pro = up to 2,000 texts, up to 1,000 WOW links a month; office = up to 500 listings per LO. Enforced in code (WOW links, office listing cap, texts). Test `spendStopsWired` blocks "unlimited" coming back.
- OpenAI dashboard monthly budget: Chris set it to $100 on 2026-10-09 (his word, not checked by me). Pushed as a45237c5. Backend 343, Jest 156, tsc, lint, build pass.

## 2026-10-08 — Claude: investor-view review, core journey traced (local, NOT pushed)

- Plan and evidence: `docs/audits/INVESTOR_REVIEW_PLAN_2026-10-08.md`. Same local branch as the launch audit; nothing pushed or deployed.
- Found + fixed locally on the buyer path: phone leads were rejected (no consent flag, proved live with a probe), form had no consent line and hid that the LO also gets the details, LO new-lead bell crashed the request (`.catch` on a Supabase builder) and used the wrong id, LO got no email for ordinary leads, full lead cap turned buyers away (free partner agents: 25 leads, 1 listing). Agent claim now signs the agent straight in. 14 overclaims reworded (pre-qualified, 100%, never miss, fake case-study email). New tests: `noCatchOnSupabaseBuilder`, cap test. Backend 332, Jest 156, tsc/lint/build pass.
- Still open: whose plan covers partner agents (listing cap), 30-day money-back promise vs 7-day trial, SMS "unlimited" not enforced, site-wide 5,000/day chat cap, lawyer review of free-tool/referral setup, live journey run (needs Chris OK), no closed-loan tracking.

## 2026-10-08 — Claude: final launch audit (verdict DO NOT LAUNCH yet), fixes local, NOT pushed

- Full report: `docs/audits/LAUNCH_AUDIT_2026-10-08.md`. Live frontend = `2d5a8bef`; Render does not report its commit (not verified).
- Found live: `GET /api/blueprint/leads?userId=` dumped any user's leads with no login. Route deleted locally; **still open in production until pushed**.
- Fixed locally: Golden Rules added to SMS auto-reply (now says it is AI), WOW-page chat, agent chat, both listing-description writers; NMLS + Equal Housing + "not a commitment to lend" on the public listing page; limiters on `/api/chat/handoff` and `/api/language/detect`; footer/signup wording. New test `backend/__tests__/aiPromptGuardrails.test.js`. Backend 330, Jest 156, tsc + lint clean.
- Not done: money test (checkout), real WOW send + claim, live buyer-chat/prompt-injection test (paid calls, needs OK), lawyer review of privacy/terms for AI calls, account-delete leaves phone number billing, listing share title/image.
- DB reality: 3 accounts, 0 paying, 4 test leads, 1 test listing. All send/post switches OFF (kept).

## 2026-10-08 — Claude: approved campaigns now post to the connected accounts (local, NOT pushed)

- Fixes the Marketing Studio gaps. After a campaign is approved, a "Send it out" card (`MarketingCampaignPosting.tsx`) lets Chris pick Facebook / Instagram / LinkedIn / YouTube Short, "as soon as I say" or a date (prefilled from the campaign's planned date), Post now, Remove, Try again. Also "Save article to my blog (draft)" (`POST .../save-blog`, never published, safe to press twice, links `blog_post_id`).
- Backend: `socialPublish.js` (copied from An AI You), `marketingPoster.js` (claim-before-post, failed posts wait for a person, reconnect marks the account, Instagram pending retries in 2 min, only approved campaigns, approval pulled = not posted), routes under `/api/admin/marketing-studio/campaigns/:id/posts*`, 5-minute sweep that only runs while the admin switch `social_auto_post` is ON (default OFF; switch is on the Connected accounts tab). Tracking tags `utm_source=<channel>&utm_medium=social&utm_campaign=<8 chars of campaign id>` are added to our own links at send time.
- Tables: `admin_marketing_posts` + switch row (migration `admin-marketing-posts-migration.sql`, ALREADY APPLIED, additive).
- Buffer: its panel is not in the UI and its auto-share only runs with `BLOG_AUTO_POST=true`, so it is dormant; code left in place. Not removed.
- Tests: backend 323, Jest 156, tsc + eslint clean. NOT tested: a real post to any network (no account connected through the new flow yet), the card on screen.
- Known limits: Bluesky has no connection; YouTube needs the video made first; Instagram needs a picture or video.

## 2026-10-08 — Claude: email master switch + campaign link for cold email (local, NOT pushed)

- Chris's email list is LOs he has not talked to, so this uses the existing cold-email engine (separate sending domain, unsubscribe, do-not-send list, windows, first batch capped at 20). Found it had 0 prospects and 0 batches ever.
- New: admin switch `cold_email_send` in table `admin_switches` (default OFF; missing or unreadable also means OFF). `COLD_EMAIL_ENABLED` env no longer controls sending. The 5-minute sweep and the manual Run both check the switch. Turning ON needs the domain/mailboxes/key setup done, and asks for confirmation. UI: big switch at the top of "Cold email to loan officers" (Marketing Funnels), visible even when the panel is closed.
- New: a cold batch can be tied to an approved Marketing Studio campaign (`cold_email_batches.marketing_campaign_id`, `theme`); the campaign idea + goal go into the writer prompt. Migration `admin-switches-migration.sql` ALREADY APPLIED to Supabase (additive only).
- Audit of Marketing Studio (read the code, not clicked): approving a campaign sends/posts nothing; blog from a campaign is not saved to the blog (the reverse exists: publishing a blog creates a share campaign); no tracking tags on campaign links; the calendar date triggers nothing; Buffer and the new direct social connections both exist.
- Verified: backend 315, Jest 156, tsc + eslint clean. Not verified: real sending (no domain/mailboxes/prospects set up yet).

## 2026-10-08 — Claude: "Powered by HomeListingAI" backlinks on everything that goes out (local, NOT pushed)

- Link `https://homelistingai.com/for-loan-officers?ref=powered-by` now sits on: the public listing page footer (real link, was plain text), the flyer fine print (print shows homelistingai.com), the Share Kit social post (last line), the reel end card ("Made with HomeListingAI", text only), and the WOW invite email footer (skipped for white-label LOs). Not touched: WOW page itself, invoices.
- Why: each shared page becomes a backlink for the blog and site. Blog drafts (10, old) were backed up to `tmp/blog-drafts-backup-2026-10-08.json`; Chris deletes them himself in /admin/blog.

## 2026-10-08 — Claude: Facebook Groups tab in the admin (local, NOT pushed)

- Facebook allows no auto-posting into groups, so this is a hand-posting kit copied in spirit from An AI You (`FacebookGroupKitPage`): library of groups with their rules (links yes/no/not checked, promo days), "Write a post" gives 3 versions (value first, no link, promotional) that follow the group's rules (no link unless links are allowed, links also stripped in code), brand-voice check, Copy, and "I posted this" log. Tab "Facebook Groups" in Marketing Funnels -> Marketing Studio.
- Files: `backend/services/fbGroupService.js`, routes `/api/admin/fb-groups*` (verifyAdmin, 20 writes/hour), `FbGroupsPanel.tsx`, `house-fb-groups-migration.sql` (tables `house_fb_groups`, `house_fb_group_posts` ALREADY CREATED in Supabase via the migration tool, Chris OK'd DB work for this feature).
- Not ported: Reddit/post radar and "opportunity" triage from An AI You, tying posts to campaigns.
- Social connect (earlier today, pushed): Chris added all env keys on Render and the redirect addresses for LinkedIn, YouTube and Meta. Not yet confirmed a real connection works.

## 2026-10-08 — Claude: social accounts in the admin, copied from An AI You (local, NOT committed)

- Chris wanted the same Connected accounts cards as anaiyou.com, not Buffer. The An AI You code is in `/Volumes/GFY/EatADick/AI-You-Site` (repo AIyou-chris/ai-landing-template). Copied its direct connection flow (Facebook, Instagram, YouTube, LinkedIn): `backend/services/houseSocialOauth.js`, `tokenCrypto.js`, `houseSocialStore.js`, routes `/api/admin/house-social/connections*` and the public return trip `GET /api/marketing/oauth/:platform/callback` (allowlisted, one-time state), `ConnectedAccountsPanel.tsx` in Marketing Funnels, migration `house-social-connections-migration.sql` (NOT run yet).
- Needs on Render before it can connect: `PUBLIC_SITE_ORIGIN=https://homelistingai.com`, `MARKETING_TOKEN_ENCRYPTION_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`, `SOCIAL_GOOGLE_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET` (same values as the An AI You service). Each developer console needs `https://homelistingai.com/api/marketing/oauth/<platform>/callback` added as a redirect address.
- Connecting only. Posting from the admin to these accounts is not ported yet (An AI You has it in `server/lib/marketing/house-post.cjs` + `social-publish.cjs`). Buffer panel is untouched and still works.
- Tests: backend 306 pass, tsc + eslint clean. Not tested: a real connection.

## 2026-10-07 — Claude: Condo Check on the LO Share Kit (local, NOT committed)

- Fannie facts verified from the letter itself (LL-2026-03, saved in `tmp/hoa-samples/`, untracked): Limited Review gone Aug 3 2026, reserves 10% to 15% for applications dated Jan 4 2027+, baseline funding banned, waiver for 10 or fewer units, master deductible max $50k/unit. Memory notes: `fannie-condo-ll-2026-03`, `hoa-doc-reader`.
- New: `backend/services/condoRules.js` (all Fannie numbers in one file, flags are "questions for the lender"), `POST /api/lo/listings/:listingId/hoa-read` (requireLoAgent + assignment check, PDF only, 15 MB, 10/hour, scanned PDF returns 422 SCANNED_PDF), `HoaDocsCard.tsx` on the LO Share Kit page. LO uploads, checks each fact against its quote and page, ticks "I checked", then the facts save into the existing `lo_listing_kb_docs` (so the buyer chat reads them, no new table). Saved text tells the AI never to say a loan is or is not approved.
- Tested: backend 300 pass, tsc + eslint clean, reader checked on the sample reserve study. NOT tested: the route with a real login, the upload screen in a browser, the buyer chat actually using the saved facts.
- Known: the sample study has no dues income, so reserve % of budget shows "could not be worked out" (correct; a reserve study is not a budget). A budget or questionnaire PDF is needed to test that path.
- Not done: OCR for scanned PDFs, the public "Condo Readiness" card on the WOW Link, the agent-facing "Condo Check" invite and marketing, reserve study "within 3 years" rule (unverified, left out).
- The listing reel commit (96540a7f) is still not pushed: GitHub returned 500 on push on 2026-10-07.

## 2026-10-07 — Claude: HOA document reader, first version (local, NOT committed, no route or UI yet)

- Why: Fannie's 2026 condo changes (Limited Review gone, reserve minimum rising, Full Review on every established project). Idea: a "Condo Check" card per listing. **Dates and percentages are from blogs, not Fannie's Lender Letter. Get the letter before using any number publicly.**
- `backend/services/hoaDocReaderService.js`: PDF to text (rebuilds lines by position so table labels stay with numbers), AI copies 13 facts with a page and a word-for-word quote, code checks the quote is on that page, flags a bare number, flags the same number used twice. Reserve % of budget is computed in code only. Tested on a real sample reserve study (`tmp/hoa-samples/`, untracked): units, balance, monthly reserve, percent funded, no special assessment, guardrail repair all matched the PDF. Costs about 6 cents per 55-page study (gpt-4o).
- Lesson: quote checking proves a number exists, not what it means (first run put the reserve balance in the dues field). The LO must confirm every fact before it is used.
- Not done: scanned PDFs (needs OCR), upload route, review screen, brain wiring, Condo Readiness card, Fannie Lender Letter facts, a real association budget and minutes (only samples so far).

## 2026-10-07 — Claude: Listing Reel (LO Share Kit "Make my reel"), local, NOT committed

- New `backend/services/listingReelService.js`: 9:16 video from the listing's own photos. Script from real facts only (brand-voice checked), OpenAI voice, captions timed by sentence length, Ken Burns + crossfades, end card with LO name, NMLS, agent, tracked link, Equal Housing + "AI-generated voice". FFmpeg via new dep `ffmpeg-static` (Render has no ffmpeg). 720x1280 by default (`REEL_WIDTH`), one render at a time, ~11s locally.
- Routes: `POST /api/lo/listings/:listingId/reel` (requireLoAgent, assignment check, needs 2+ photos and an NMLS, 5/hour) and `GET .../reel/:jobId`. Job state is in memory (lost on restart). Result uploads to `ai-card-assets/reels/`.
- UI: `ListingReelCard.tsx` on the LO Share Kit page. Tests: `listingReelService.test.js` (+5). Verified: backend 290 pass, tsc + eslint clean, real render checked frame by frame.
- Not done: background music (drop 2-3 royalty-free mp3s in `public/reel-music/`, mixed at 12%), agent Share Kit version, Whisper word-by-word captions, a live run on Render (memory on the small plan is the risk), listing description/neighborhood facts.

## 2026-10-06 — Codex: Chris Potter voice saved in live admin Business Brain

- Chris explicitly requested the pasted master guide for admin voice, marketing and sales. Saved the full reference as docs/brand/CHRIS_POTTER_VOICE.md. Updated platform_brain main personality with its actual system prompt (within 4000 chars) plus AI identity/factual-source/compliance boundaries. Added context-specific master voice instructions to marketing/sales, preserving their existing product guidance.
- Live save/read verification passed; seven business sources preserved exactly, service/greeting and marin spoken voice unchanged. Existing Business Brain prompt supplies personality and sales to admin test/public assistant; Marketing Studio freshly loads this same config and additionally uses marketing. No generated content, send, publication, account connection or new paid AI call. Website cache expires in at most 60 seconds. Existing drafts are not rewritten. This does not claim independent cold-email/blog writers automatically inherit these fields.
- Pre-change config backed up locally under tmp/brand-voice/brain-before.json; not committed. Initial validation stopped before a write because source normalization adds an optional empty URL; final update preserved raw sources exactly. Guide/handoff files local, not pushed. Blog publishing remains off.

## 2026-10-06 — Claude: live test of "Create campaign" (one paid draft, test campaign removed)

- Ran one real campaign draft from the live Studio (about a cent or two). It works end to end: saved, 10 drafts (title, blog, email subject and body, LinkedIn, Facebook, Instagram, Bluesky, video script, picture prompt), picture-size and scene pickers load, Remove works. Quality finding: the copy used words the voice rules forbid ("effortlessly", "elevate", "powerful"), opened with "Attention Loan Officers!" and stacked exclamation marks. The Studio prompt only banned a short list. Fixed the prompt in `adminMarketingStudio.js` to the full never-say list plus one exclamation mark per piece and no "Attention"; this is a prompt change only (a model can still slip), the checker still only blocks the platform banned phrases. Not re-tested with a new paid draft.

## 2026-10-06 — Claude: live click-through of the admin (Chris logged in the browser pane) + 3 small fixes (local, NOT committed)

- Clicked through the live admin as cdipotter@me.com: Overview, Marketing Funnels (all 7 Studio tabs, QR code creation, saved a brief and removed my own test brief, which persisted after reload), Business Brain, Users, LO Platform + Check account, Listings, Settings (Billing/Security/Analytics). Everything loads. Only console error on every admin page: Supabase `rpc/is_user_admin` returns 403 (the code falls back to the token claims, harmless but noisy). NOT clicked because they spend money: Create campaign (AI drafts), AI pictures, AI voice, Make video; and "Load sample ideas" (writes to the picture library).
- Fixed: Check account said "no agent has opened it" for a CLAIMED link (claimed now counts as opened); Settings > Billing showed "Could not load..." / "No customers yet" for the few seconds before the slowest call finished (now "Loading…"); cold email "Add from Lead Finder" now only brings over people whose title or company says mortgage/loan/lending and skips test rows (the live finder pool has tax advisors, founders and a "Test RealLO" row; that test row is still in `lo_lead_pool`, Chris decides whether to remove it).
- Verified: tsc, lint, Jest 154, backend 282.

## 2026-10-06 — Claude: audit of Codex's marketing work + /blog outage fix (pushed, commit 75d796a2)

- **Outage found and fixed:** after the Codex push, `homelistingai.com/blog` and `/tools/cost-per-closed-loan` were in a redirect loop. Netlify now proxies `/blog` to the backend, but `express.static(dist)` (mounted before the blog routes) answered `/blog` with a 301 to `/blog/` because `dist/blog/` is a prerendered folder, and Netlify strips the slash again. Fix: `express.static(..., { redirect: false })` (+ test `staticFolderRedirect.test.js`). Backend verified 200 on `/blog` after deploy; some Netlify edge nodes still held the cached 301 for a few minutes (flapping). If it persists, clear the Netlify cache and redeploy.
- **Audited, no problems found:** Marketing Studio routes (all `verifyAdmin`, owner-scoped, atomic claims, 3 AI attempts per campaign per kind, FFmpeg through `execFile` with no shell, private storage + 1-hour signed URLs); image library (RLS on, no public read, `/api/public/marketing-images/:id` only serves a checked image used by a PUBLISHED due article); blog public forms (rate limited, honeypot, explicit consent, signed 15-minute download token, numbers validated); all new tables have RLS on (policy-less on purpose, service role only); `blog_settings.lead_owner_id` is set; 8 published posts are due and will render in the new index; scheduler and social auto-post stay OFF by default. Frontend catch blocks show errors.
- **Not verified:** any of this on screen (needs the admin login), FFmpeg availability on Render, a real AI picture/voice run, a real blog lead end to end.

## 2026-10-06 — Claude: every brain ships with starter knowledge (local, NOT committed)

- Chris: no brain should dead-end on a basic question ("tell me about VA loans" used to hit the "only this home and its financing" rule and "don't invent beyond it"). New `backend/services/baseKnowledge.js`: `LOAN_BASICS` (loan types, pre-qual vs pre-approval, documents, DTI, credit, costs, timing, tips; no rates, no promises) is now always in the loan officer brain prompt (`loBrainService.buildBrainPrompt`, BEFORE the LO's own knowledge so theirs wins; also covers the AI phone line) and `HOME_BUYING_BASICS` (offers, earnest money, contingencies, inspection, appraisal, closing) is in the public listing chat prompt. The LO brain's last line now allows general mortgage and home-buying questions. Business Brain (website chat) was loaded earlier; the agent's own notes go on top. LO Brain page subtitle says basics are built in. Nothing written to the DB. Verified: tsc, lint, Jest 154, backend 279 (+1 test: no rate numbers or approval promises in the starter text, basics come before the LO's own knowledge).

## 2026-10-05 — Claude: Business Brain loaded + Agent Brain page (local, NOT committed)

- **Business Brain loaded into the live DB (with Chris's OK):** `platform_brain` row `main` now has 6 sources from `HLAI_BUSINESS_BRAIN.md` (pricing/trial/refunds, what it is, compliance, sales and objections, voice, safety/founder/links) plus the voice and the Marketing/Sales/Service boxes. Left out on purpose: Section 4 (planned, not live), the Codex checklist, every [VERIFY] line. Plan details come from `public/llms.txt` and `LO_PLAN_LISTING_LIMITS` in `server.cjs`. Codex's earlier seed source kept (its "no pricing verified" sentence removed). Live test: the public chat answered the plans and the 7-day trial correctly.
- **Agent Brain (new):** agents now have their own AI Brain page (`/dashboard/agent-brain`, nav item for agent/realtor accounts, hidden in demo): about, how they like buyers handled, areas, showing rules, approved Q&A, never-say. Saved in `agents.metadata.agent_brain` via `GET/PUT /api/dashboard/agent-brain` (`resolveDashboardOwnerId`). `buildListingContext` now also looks the agent up by login id (it used `agents.id` only, so agents keyed by login id got no name/phone) and adds `agent_notes`; `buildPublicListingSystemPrompt` appends them AFTER the rules and says they never override them. Logic in `services/agentBrain.js` (+3 tests, +3 screen tests). Not on screen. Loan officers keep their own brain at `/dashboard/lo-chatbot`.
- Verified: tsc, lint, Jest 154, backend 278, build.

## 2026-10-05 — Claude: LO Platform "Check account" (customer service view) (local, NOT committed)

- Chris wanted a link per loan officer to look at their dashboard and see what is wrong. Built a **read-only** report, not a "log in as them" (a real impersonation would sign the admin out of the admin session, and the old fake Impersonate button was removed earlier). LO Platform > LO Users now has **Check account**: plan and trial days, last seen, listings, leads, a plain-English "What looks wrong" list (no NMLS, AI Brain empty, compliance info missing, no listing assigned, no WOW Link sent / none opened / none claimed, phone number error, trial ended, late, quiet for 2+ weeks), a setup checklist, recent leads, WOW Links sent, recent AI calls. Backend `GET /api/admin/lo/users/:loId/support` (`verifyAdmin`, loId = `agents.id`, read only, writes an `audit_logs` row `admin_viewed_lo_support`); pure logic in `services/loSupportView.js` (+5 tests). If Chris later wants true "see exactly what they see", it needs a separate read-only impersonation design.
- Verified: tsc, lint, backend 275, Jest +1. Not on screen.

## 2026-10-05 — Claude: admin tab "Settings" (local, NOT committed)

- **Fake parts removed:** the **Deliverability** tab (saved to the browser's localStorage only; the server never read it), the **System Config** tab (app name, color, onboarding / AI logging / beta toggles: nothing in the platform read them, and saving updated 0 rows because the admin has no `agents` row), **Update Card / Download Invoices** (buttons with no click handler, acting on the admin's own Stripe customer, which does not exist), **Cancellation interception** (emailed the owner about a cancel nobody triggered). Routes deleted with them: `billing/invoices`, `billing/cancel-alert`, `billing/update-card`, `billing/download-invoice`, `system-settings` GET/PUT, `security/password`, `security/2fa` (a fake flag, real 2FA is Supabase MFA), `security/api-keys` GET/POST (made fake tokens).
- **Fixed:** Billing tab showed the ADMIN'S OWN plan ("Pro / active" by default if the call failed); it now shows platform customer counts (paying / free trial / comped / late) and a customer list with Type and Plan (the fake "Last Invoice" dash is gone). "Late payment reminder" only emails an address that is a real user (it could email any stranger), asks first, and tells you the result. Coupons (real: checkout reads the `coupons` table): code and amount validated (percent 1-100), duplicates refused, and a coupon is no longer saved when Stripe rejected it. Security > Activity Logs read `agents.metadata`, which the admin does not have, so it was always empty; it now reads the admin sign-ins in `audit_logs`. Delete-coupon asks first.
- Probed: all `/api/admin/*` settings routes return 401 with no login. Verified: tsc, lint, Jest 150 (+4 screen tests), backend 270. Analytics tab left as is (earlier audit found those numbers are real). Not on screen.

## 2026-10-05 — Claude: admin tab "LO Platform" (local, NOT committed)

- Read-only reporting page (LO users, WOW invites, pre-quals, offices). Real bug: the invites list showed "Sent By" as a dash for every invite because `agent_invites.lo_agent_id` holds the LOGIN (auth) id and the lookup used `agents.id` (verified in the DB: 1 of 1 invite matches by auth id, 0 by profile id). Lookup now tries both. Also: one failed list used to look like "No data yet" (all four were loaded in one try/catch); each list now loads alone and a red "Could not load: ... Try again" bar shows. Plan badges read "Comped" / "Trial / not paid" (were raw `comp` / `awaiting_payment`). Invites show view counts. Four routes return 401 with no login. Verified: tsc, lint, Jest 146, backend 270 (+3 screen tests).

## 2026-10-05 — Claude: admin tab "Listings" (local, NOT committed)

- Admin Listings showed no photos (read `image_url`/`hero_image`, which are not columns; real one is `hero_photos`), linked every card to the DEMO listing page (`/demo/listings/:id`), showed raw status, and "Add New Listing" created rows with status `Active` (real values are `draft`/`published`) and even with a blank address. Now: photo from `hero_photos[0]`, "Published"/"Draft" badge, public link `/l/:slug` only when published, owner name on each card, create is always a draft and needs an address, delete asks with the address + owner, dead Edit/Sidekick buttons, fake click-card and stale "Listing Sidekick / clone listing" tips removed.
- Removed two fake routes with no caller: `POST /api/admin/listings/:id/generate-summary` (overwrote a real description with canned text) and `POST /api/admin/ai-model` (said "updated" and did nothing). Probed: admin listing routes return 401 without login.
- Verified: tsc, lint, Jest 143, backend 270. Not on screen.

## 2026-10-05 — Codex: private picture-library migration applied with Chris OK

- Chris answered “ok” to the concrete request to apply the library update. Applied marketing_image_library to HOMELISTINGAI (yocchddxdsaldgsibmmc), corresponding to 20261005233000_marketing_image_library.sql. RLS enabled; anon/authenticated SELECT revoked; service_role INSERT confirmed; blog image attribution column exists; bucket remains private with WebP/AVIF added.
- Live verification passed: temporary library insert inside a rolled-back transaction, owned-library read through actual workflow/client, WebP upload, signed private download and blocked public URL. Temporary storage object removed; test DB row rolled back. No AI calls, sample import, human image approvals or publication. Advisors show expected service-only no-policy INFO plus existing extension/Postgres patch notices, no new permissive policy.
- Code still local/unpushed. Database ready; deploy/push remains next step before new screen is live. Blog scheduler/auto-share remain off; accounts LAST. Previous entry below describes original pre-approval build status.

## 2026-10-05 — Codex: marketing picture library built (local; live migration awaiting Chris OK)

- Read and implemented `docs/MARKETING_IMAGE_CODEX_PROMPT.md`, copied here by Claude after combined work was pushed as c6172c47. Blog scheduler and auto-sharing remain OFF by default; Blog sidebar remains hidden; accounts LAST. No push, deployment, publication or live database write in this image task.
- Reused existing admin media service/private bucket, three-request quota and backend OpenAI/Jev clients. New `backend/services/marketingImages/` provides brand direction, 40 scene recipes, eight-part prompts, three medium choices, reference edits, high-quality final only after selection, free Sharp layout exports, actual embedded Inter and official house logo. Legacy saved-picture hashes remain valid; uploads, free cards, voice and video preserved. Old paid single-picture shortcut now directs to reviewed choices.
- Picture library and campaign picker expose costs before paid clicks, format/headline controls, downloads and four mandatory human checks. Automatic OCR/logo, busy text-zone, contrast and size checks block use on failure. Approved owned library pictures integrate with Blog editor, stable public URLs only when a published article references them, reuse tags, source fingerprint preventing consecutive duplicate heroes, and real attributed blog performance; social results wait for connections. Jev category guidance times out/fails open to deterministic recipes.
- Generated six ideas x three medium choices (18 real backgrounds), all passing automatic checks, no human approvals. Image output cost about $0.246 plus small vision-check charges. Private samples/font/license live under `backend/assets/`; only dist is served statically. Explicit sample script saves receipts before layout and never runs at startup. Import is an explicit free admin action after migration. Samples are not published.
- Prepared `supabase/migrations/20261005233000_marketing_image_library.sql` for private service-only/RLS image library, additional private media MIME types and blog-event image attribution. NOT applied: HOW_TO_TALK_TO_CHRIS.md says do not change live database without his OK. Next action: Chris authorizes this migration, then apply and run owned/admin/private integration checks. No additional key needed. Official lender artwork and verified NMLS remain required before lending-ad layouts; An AI You shares direction rules only, not a second integrated app.
- Verification: 139 frontend tests, 270 backend tests, typecheck, lint and production build pass; server syntax and diff checks clean. Real sample generations/OCR/export checks passed. Storage/database workflow tests use mocks; live integration awaits migration. Responsive phone content has zero horizontal overflow. Local review: http://127.0.0.1:5177/tmp/marketing-images/index.html and mobile.html; fixture changes do not publish/save live or spend. Proof: tmp/marketing-images/phone-review.png. Docs: docs/MARKETING_IMAGES.md. Preserve unrelated scratch/config folders and pre-existing supabase/.temp/cli-latest change.

> **READ FIRST: `HOW_TO_TALK_TO_CHRIS.md`.** Keep it simple. 1 to 3 short lines on what you did. No "why". Anything Chris must do goes in **bold**, one step at a time.

## 2026-10-05 — Claude: auto blogging OFF, Blog tab hidden (local, NOT committed)

- Chris's order. The blog scheduler (`backend/blog/routes.cjs`, checks every minute and publishes scheduled posts) now only runs when `BLOG_SCHEDULER=true`. Auto-sharing a published post to social (`maybeAutoPostBlogToSocial`) only runs when `BLOG_AUTO_POST=true`, and the default setting is now off. The **Blog** item is removed from the admin sidebar (code and `blog` view untouched, so it comes back by re-adding one line in `AdminDashboardSidebar.tsx`). Codex: please keep these two switches off until Chris says so.
- Whole working tree (Codex + Claude together) checked: tsc, lint, Jest 136, backend 260, build all pass.

## 2026-10-05 — Claude: White Label tab removed (merged into Users) (local, NOT committed)

- Chris's call: no separate White Label tab. It only listed office accounts (there are 0) and set a custom domain, and its page read fields the API never returned. Tab, page and route case removed; **Users** now shows a "Set domain" button on office accounts (same `PUT /api/admin/white-label/offices/:id/domain`, which now rejects bad domains with 400 `invalid_domain` and duplicates with 409 `domain_in_use`). White-label itself (public `/white-label` page, tenant branding, office dashboard) is untouched. Blog tab NOT removed: Codex just built the blog workflow there and the 10 drafts still need review; waiting on Chris.
- Verified: tsc, lint, Jest 136, backend 260.

## 2026-10-05 — Claude: admin tabs "Broadcasts" and "Users" (local, NOT committed)

- Broadcasts: route and columns are fine (checked `notifications`). Page now confirms ("Send to about N users?") before sending, fake Type menu and a false bell tip removed (+3 tests).
- Users: delete now cancels the person's Stripe subscriptions first (`subscriptions` rows + live Stripe by `stripe_customer_id`), the fake **Impersonate** button is gone (it only set a localStorage flag and opened the demo blueprint dashboard), the list shows Type and Plan, delete confirm names the person, search text can no longer inject filter syntax (+3 tests). Known gap left: delete still does not remove that user's leads/listings/other rows (self-service `/api/account/delete` does). All `/api/admin/users*` routes return 401 with no token (probed live).
- Verified: tsc, lint, Jest 135, backend 260. Not on screen.

## 2026-10-05 — Claude: cold email to loan officers built (local, NOT committed; needs migration + sending domain before anything sends)

- Built from `Downloads/COLD_EMAIL_CODEX_PROMPT.md`. The An AI You engine named in the prompt is thin (and not in this repo), so this is its own system under `backend/services/coldEmail/` (facts, `rules.js` checker, `writer.js` prompt + rewrite loop, `templates.js` fixed touches 2-5, `examples.js` 12 first touches + 4 sequences + 5 break-ups, `sequence.js` windows/holidays/warm-up/pause, `compliance.js`, `replyClassifier.js`, `results.js`, `sender.js`, `engine.js`) and `backend/routes/coldEmailRoutes.js` (one `register(app, deps)` call in `server.cjs`; the route-guard test now scans that file too).
- **Safety:** nothing sends unless `COLD_EMAIL_ENABLED=true`, a SEPARATE sending domain + mailboxes are set (it refuses `homelistingai.com` / `mg.homelistingai.com`), and a batch was approved by an admin click; the first approved batch is capped at 20 people; Tue-Thu 7:30-9:30 recipient time; auto-pause at >3% bounce or >0.1% complaint; stops on reply/unsubscribe/bounce/complaint; replies are never auto-sent (interested = lead + email to the owner with a drafted answer). Footer + `List-Unsubscribe` one-click headers added by the server. Unsubscribes/bounces go in the existing `lo_suppression_list`.
- **DB:** `cold-email-migration.sql` (lo_prospects, cold_email_batches, cold_email_sends, cold_email_replies, RLS on). NOT run. The screen shows "run the migration" until then.
- **Screen:** Marketing Funnels > "Cold email to loan officers" (`AdminColdEmailPanel.tsx`): Setup checklist, Prospects (CSV / Lead Finder, MX check), Write and send, Replies, Results, Examples. Docs: `docs/COLD_EMAIL.md`, `docs/COLD_EMAIL_DNS.md`, DNS checker `backend/scripts/check-cold-email-dns.cjs`.
- **Hooks into existing code:** `/api/webhooks/mailgun` (events for tag `cold-email` suppress bounces/complaints and return early), `/api/public/lo-invite/:token` (+`/event`) also accept a prospect's `unsub_token` (greeting + per-person click tracking), new public `POST /api/webhooks/mailgun/cold-reply` (Mailgun-signed) and `GET|POST /api/public/cold-unsubscribe/:token`.
- Tests: backend 258 (+31: rules, sequence, classifier, writer, engine with an in-memory fake DB in `__tests__/helpers/fakeDb.js`), Jest 129, tsc/lint/build clean. One unexplained single failure in 1 of ~10 backend runs (not reproduced in 11 reruns; not in a cold-email test as far as I could tell). NOT tested against real Mailgun or on screen.
- Open for Chris: run the migration, choose the sending domain, add DNS, set the Render vars, connect the Mailgun route and webhooks (`docs/COLD_EMAIL_DNS.md`). Marketing image prompt (`MARKETING_IMAGE_CODEX_PROMPT.md`) NOT started, waiting for Codex because it rewrites Marketing Studio picture code.

## 2026-10-05 — Claude: admin tab 5 "Marketing Funnels" audit (local, NOT committed: `server.cjs` also holds Codex's uncommitted work, so commit together)

- **Real bug:** `funnel_steps` has no `step_key` / `delay_minutes` column in production (also no `email_subject`/`email_body`). Admin funnel save and the agent funnel save inserted them, so every edit returned 500 (after deleting the old step rows); `funnels` has no `realtor_funnel`/`broker_funnel` row, so no admin save ever worked. `writeWithColumnFallback` now accepts an array of rows and the 3 `funnel_steps` inserts use `insertRowTolerant`; full steps still live in `funnels.steps` JSON, which is what enrollment reads. No migration needed.
- **Calls:** `POST /api/voice/outbound-call` (+ `/vapi/`) only needed any login, so any account could place paid AI calls to any number with an owner id from the body. Both UI callers are admin screens, so both routes are now `verifyAdmin`.
- **Removed (no caller anywhere):** `/api/admin/marketing/qr-codes` x4 (demo array), `/api/admin/marketing/funnel/save` + `/get` (legacy), `POST /api/funnels/assign`.
- **Second pass (whole screen read):** the admin Funnels page was EMPTY for a fresh admin (admin has no `agents` row, no saved funnel) and could not save; `GET /api/admin/marketing/funnels` now also returns editable **starter** funnels (`ADMIN_STARTER_FUNNELS`, 3 realtor + 2 broker plain emails, nothing sends until Save) plus `savedKeys`; the page shows "starter, not saved" and blocks Import-with-emails until the funnel is saved (enrollment throws "Funnel not found" otherwise). The lead pop-up's "enroll in sequence" sent no login (always 401) and, behind that, used an in-memory DEMO leads array (always 404): rewired to new `POST /api/admin/leads/:leadId/enroll` (saved funnel + real funnel engine); removed 8 dead in-memory `/api/admin/marketing/sequences*` and `active-followups*` routes. CORRECTION to my earlier note: LO invite status `opened` means the pitch PAGE was visited (prefetching scanners count too), and `clicked` is the page's CTA, so the email itself is not the weak spot (99/441 visited, 0 CTA clicks).
- Checked: every route on this tab returns 401 with no token (probed live); CSV import consent prompt is in place (`AdminMarketingFunnelsPanel`, `consentConfirmed`). Left alone: Codex's Marketing Studio files. Verified: tsc, lint, Jest, backend 228 (+2 new), not on screen or live.

## 2026-10-05 — Codex: LO blog library and publishing workflow (local code; database seeded; accounts LAST)

- Built from Chris's `Downloads/BLOG_CODEX_PROMPT.md`, reusing the existing Blog Control Center and `blog_posts` CMS. Adapted An AI You's actual editorial rules, safe renderer/RSS/breadcrumb helpers and IndexNow helper from `/Volumes/GFY/EatADick/ai-landing-template/server/lib/marketing/`. Full HTML on Express public routes plus shared build-time prerender; Netlify forwards blog/calculator/sitemap routes to the existing backend. Root Cheerio dependency is required for clean Netlify builds; backend already used it.
- Applied `20261005172816_blog_editorial_library.sql` to `yocchddxdsaldgsibmmc`. 36 starter rows: five hubs, 28 spokes, three tool briefs; ten full reviewed-by-checker articles remain DRAFT, 26 remain BRIEF. No starter published. SQL + anonymous client confirm privacy. Removed broad any-agent blog write policies; new settings/events tables are deliberately service-only (RLS/no-policy INFO expected). Backend owns lead inbox and all admin writes.
- Shared authoring checks enforce count, voice, H2s, short answer, FAQ, metadata, picture alt, planned links, two step lists, copyable script, late/limited product mentions and compliance note. Editor saves unfinished drafts, shows publish blockers, protects saved versions, previews private HTML and schedules UTC from local time. Human publish/schedule only; minute job checks again. Scheduled work requires backend uptime. AI writer uses existing GPT-4.1-mini, at most three attempts per saved brief, no automatic paid retry. Starter authoring calls were made this turn; no need to regenerate the ten articles.
- Public index/topics, author bio, RSS, full body/schema/TOC, copy scripts/share links, WebP covers, gentle dismissible sticky CTA, three lead magnets and calculator. Gated signed PDFs save existing CRM leads with source blog/article slug, download consent only/no SMS/no newsletter. Real DB lead + signed $500 worksheet test passed; disposable lead removed. Trial attribution passes through sessionStorage to existing signup. Blog events store only slug/type. Publisher creates linked Marketing Studio LinkedIn/FB/email/three quote-card drafts and two incoming links from older articles when available; no social API calls or connections. A final real test found missing campaign ID, fixed with UUID; real idempotent draft creation passed and test campaign removed. Partial distribution errors do not lose a successful publication; save again retries.
- Verification: all124 frontend tests and225 backend tests pass, full lint/typecheck/build pass. All ten JSON drafts pass checks; source links verified against official CFPB, hypothetical numbers never market statistics. Mobile Lighthouse production template100/100/100 (local measurement); final rerun in progress at entry creation. Browser verifies search, saved draft/iframe preview, visible publication blockers, calculator $500 + zero-loan case, TOC, and actual390px iframe reading with zero horizontal overflow. Browser viewport override was ineffective in IAB; fixed-width iframe uses actual responsive CSS, not a fake screenshot. Proof under `tmp/blog-studio/`; docs `docs/BLOG.md`. CodeGraph built with user permission, now530 indexed files and auto-sync active.
- Local review: http://127.0.0.1:5181/blog; admin http://127.0.0.1:5177/tmp/blog-studio/index.html; phone http://127.0.0.1:5181/preview/mobile. Helper binds loopback only, local fixture edits, paid generation/publication/lead capture disabled. Real integration tested separately. Code remains uncommitted/unpushed/undeployed, including prior Marketing Studio stages2–4. Missing launch inputs: backend INDEXNOW_KEY, real Chris photo and verified LinkedIn URL. Social accounts still LAST. Do not deploy/publish drafts silently. All unrelated existing untracked files preserved.

## 2026-10-04 — Larger video ending logo
- User requested bigger, clearer ending logo. Increased logo from 108 to 188 pixels and white tile from 140 to 220. Adjusted landscape placement to keep the larger logo within the frame. Rebuilt local sample videos; inspected actual vertical ending frame. No accounts or deployment.

## 2026-10-04 — Codex: blank video preview repair
- Reproduced blank inline playback in the Codex browser; the same MP4 displayed correctly in its native standalone player. No renderer or codec change needed.
- Removed clipping from the video wrapper, preload video data, use the campaign picture as a poster, and added a separate Watch video link (without download). Reloaded preview and verified actual captioned video at 4 seconds.
- Added component regression coverage for poster, preload and standalone playback link. Accounts still last; no push/deploy.

# AI Handoff Log (Claude ⇄ Codex)

> **Shared notebook between Claude Code and Codex.** Both agents work in this repo.
> Neither can see the other's chat. This file is how we talk.
>
> **Start of every session:** read the latest 3 entries below + `CLAUDE.md` (full project context).
> **End of every session (or before handing off):** add a new entry at the TOP of the log. Keep it short.
> **Before editing a file another agent touched in its last entry:** read that entry first. Don't redo or undo their work silently.


## 2026-10-04 — Codex: Marketing Studio video polish (local; zero additional AI calls; accounts LAST)

- Chris approved gentle movement/transitions, better voice-following captions and a branded ending. Added gentle6% background zoom with text kept on a separate fixed overlay; soft caption fades; three-second HomeListingAI logo + “See a WOW Link” ending. User can switch to still picture, simple cuts or no ending. Controls save in existing JSON brief, preserve drafts and reused media, reset approval/stale video using existing settings/hash path. No migration, new subscription/dependency, API route or AI call.
- Renderer now uses separate background/transparent graphics streams and frame-counted fades, bounded single-thread final FFmpeg encoding. Existing narration/music mix retained; full voice finishes before closing card, max90s still enforced (ending can extend minimum duration). Actual public/newlogo.png composited onto white logo tile; deployment must include existing public asset. Closing card retains AI voice disclosure.
- Free FFmpeg silence detection nudges estimated caption-card boundaries toward nearby voice pauses, adjusted for chosen speed. Boundaries are clamped increasing even for short cards; full script remains. NOT word-level transcription/forced alignment; UI says timing is estimated and preview required. No new paid transcription call.
- Verification:21 targeted backend tests passed before final extra short-timeline regression; final4 renderer tests pass,15 studio frontend tests pass; typecheck/lint/build/syntax/diff pass. Real vertical+landscape H.264/AAC exports with existing actual picture/voice under tmp/marketing-studio-polish, no additional API spend or DB writes. Vertical31s includes complete narration plus closing card. Frames inspected for caption readability, motion and actual logo/CTA. Browser still/cut/no-ending settings saved and rendered actual local media; desktop/phone review described in design-qa.md. Deployed signed-in admin flow not tested.
- Preview http://127.0.0.1:5177/tmp/marketing-studio-polish/index.html?mobile=1; actual media+production components, in-memory preview edits, paid AI buttons disabled. Local helper127.0.0.1:5180 without production keys/DB. Stage2/3/4+polish code still uncommitted/unpushed. Social account connections remain LAST per Chris.

## 2026-10-04 — Codex: Marketing Studio stage four voice/music (local code; audio migration live; accounts LAST)

- Chris authorized stage four: voice, music and editor polish. Still NO social account connection, credentials, scheduler or publishing; no push/deploy requested. Stages two through four remain local/uncommitted/unpushed.
- Added backend `studioVideoOptions.js`, frontend `studioVideoOptions.ts` and `MarketingVideoControls.tsx`; extended renderer/media/studio services and UI. Settings preserve all text without AI calls: narration on/off, Nova/Alloy/Onyx, slower/normal/faster voice, calm/upbeat/uploaded music, quiet/medium volume, normal/large captions, blue/indigo or dark slate. Missing/stale selected audio blocks render/approval; optional unused audio does not block approval. Script/AI voice-choice edits stale narration; speed/music/layout reuse saved voice. Media replacement clears approval.
- New verifyAdmin POST campaign `/:id/audio` under Marketing Studio; only picture/audio routes accept 12MB JSON, others retain existing limit. Owner-scoped private normalized MP3 uploads, max8MB /90s. FFmpeg decodes local-only approved formats, strips metadata, normalizes loudness; rejects playlists, arbitrary bytes, oversize and overly long input. Optional AI `tts-1` (existing OpenAI client/key) speaks saved script, up to200 words, three lifetime attempts per campaign VOICE row (separate image budget), atomic claim before charge, no automatic paid retry. Burned-in “AI-generated voice” label accompanies AI-narrated videos. Voice preview available before render; no voice cloning/new dependency/subscription.
- Original synthesized calm/upbeat music beds, no external song downloads/licensing dependency. Uploaded own music also supported. FFmpeg produces H.264/AAC MP4 or truly silent H.264 when both off. Voice speed uses atempo. Minimum15/30/60s video length expands to full narration+1s up to90s; too-long slower voice fails with helpful message instead of truncation. Caption cards use word-weighted estimated timing, NOT forced word-level speech alignment. One final video render/server, bounded subprocess/temp cleanup retained.
- Applied `supabase/migrations/20261005022155_admin_marketing_audio.sql` to verified HLAI `yocchddxdsaldgsibmmc`: existing kind constraint now image/video/voice/music, private admin-marketing bucket additionally accepts audio/mpeg. Verified constraint, RLS true, bucket private, zero anon/authenticated media grants. Security advisors unchanged intentional service-only media RLS/no-policy info; no new policies/public access.
- Verification: full120 frontend/205 backend tests passed; two additional real-FFmpeg renderer regression tests passed afterward (207 total backend tests). Typecheck/lint/build/syntax/diff pass. Live integration `tmp/marketing-studio-stage-four/verify.cjs` used ONE paid AI speech call; saved/downloaded normalized voice, real vertical+landscape voice/music videos, changed speed/music reused same paid recording, recorded-voice/music uploads, stale narration rejection, deleted all temporary test rows/private files. FFprobe confirms H.264/AAC, vertical540×960, 29s extended from15s minimum; decoded sound nonzero (-19.4dB mean). Browser controls changed speed/music and actually rerendered26s, desktop1440/phone390 widths no overflow, media loads, no browser errors. Authenticated deployed admin flow NOT tested.
- Preview `http://127.0.0.1:5177/tmp/marketing-studio-stage-four/index.html?mobile=1`: real production components, actual media, preview-only in-memory campaign edits; paid AI buttons disabled, saved real AI voice available. Local helper127.0.0.1:5179 accepts preview origin only, no production DB/keys, actual upload normalization/rendering. Screens/sample videos in same tmp directory; leave these uncommitted. Next: Chris preview/polish, then account connections/manual+daily publishing when ready.

## 2026-10-04 — Codex: Marketing Studio stage three media (local code; migration live; accounts LAST)

- Chris authorized stage three, then explicitly changed order: make/tweak/review pictures and videos FIRST; connect social accounts LAST. No social connection, credential storage or posting code shipped in this stage; existing Buffer integrations unchanged. Connected accounts tab explains the hold. No push/deploy requested for stages two/three yet; code remains local.
- Added `adminMarketingMedia.js`, `studioVideoRenderer.js`, frontend media service and `MarketingCampaignMedia.tsx`. Admin-only capabilities/list/picture/video routes + campaign video-settings PATCH. Private photo uploads (8MB cap, decoded/normalized by Sharp, metadata stripped), free branded PNG cards, opt-in `gpt-image-1-mini` low-quality JPEG (existing key, up to three lifetime attempts/campaign, atomic claim before spend, no automatic paid retries), durable processing/failed states. Actual FFmpeg H.264 MP4: 15/30/60s vertical 540×960 or landscape 960×540, background picture + escaped on-screen captions, sentence grouping and word-weighted scene timing. Silent; no narration/music. One render at a time per server, single FFmpeg thread, bounded subprocess and temp cleanup; restart interrupted media retry after four minutes. Uses existing Sharp/FFmpeg/OpenAI, no new npm dependency or subscription.
- Applied `supabase/migrations/20261005014552_admin_marketing_media_and_posts.sql` (despite name, media ONLY) to `yocchddxdsaldgsibmmc`: verified 11 columns, RLS on, zero anon/authenticated table grants, `admin-marketing` bucket private; existing storage policies are bucket-scoped and give no browser access to this bucket. Signed preview URLs last one hour, Refresh renews. Replacements/delete clean stored files. Security advisors only add intentional service-only-table RLS/no-policy info.
- Media hash detects changed script/title/format/length/picture; picture hash excludes video settings. Uploaded photos remain usable through writing edits. Video settings preserve all text drafts and reset approval without a new AI call. Replacing media clears approval; approving refuses processing/failed/outdated media. Preview buttons disable on unsaved writing. Phone action bar no longer covers video controls. Every newly registered route uses `verifyAdmin`; ownership from verified auth only.
- Verification: all 117 frontend / 200 backend tests passed before final approval regression; added one meaningful test each (final totals 118/201, targeted tests pass). Typecheck, full lint, production build and syntax/diff checks pass. Real integration script under `tmp/marketing-studio-stage-three/verify.cjs`: saved branded picture, real optional AI image, actual private vertical 30s + landscape 15s video, photo upload/stale detection, cleanup all temporary DB rows/files. FFprobe confirmed H.264, dimensions and exact duration. Caption layout refined afterward and both actual videos rerendered locally. Browser checked desktop/phone, no overflow/errors, real local rendering/free picture generation and format settings. Full signed-in deployed admin flow NOT tested.
- Local preview `http://127.0.0.1:5177/tmp/marketing-studio-stage-three/index.html?mobile=1`: production UI + real generated media, preview-only in-memory campaign edits, AI image button disabled. Local helper binds 127.0.0.1:5178, accepts only preview origin, runs actual renderer WITHOUT production DB/keys. Screens/artifacts under same tmp directory. Live migration is applied, code still uncommitted/unpushed. Next: let Chris inspect/tweak media; accounts/manual+daily publishing only when ready.

## 2026-10-04 — Codex: Marketing Studio stage two (local code; migration applied; not pushed/deployed)

- Chris authorized wiring campaign creation and supplied the angle “a new tool for this new market.” Six `verifyAdmin` routes under `/api/admin/marketing-studio/campaigns` now list/save/delete/generate/edit/approve owner-scoped account drafts. Logic: `backend/services/adminMarketingStudio.js`; frontend service and `MarketingCampaignReview.tsx` connected to the existing studio. Uses existing OpenAI `gpt-4o-mini` with strict ten-field output schema: title, blog, email subject/body, LinkedIn, Facebook, Instagram, Bluesky, video script, picture prompt. Fresh Business Brain + platform guardrails; bounded fields, Unicode counts, prohibited guarantee checks, safe errors, atomic generation claim, optimistic edit versions, max three generation attempts and no automatic paid retry.
- Applied `supabase/migrations/20261005013115_admin_marketing_studio.sql` to HLAI project `yocchddxdsaldgsibmmc`. Verified columns, RLS enabled, zero anon/authenticated grants; table intentionally service-role-only. Test campaigns deleted. Live `platform_brain` existed but had no row: seeded `main` with Chris’s angle and verified existing app facts only, using ON CONFLICT DO NOTHING. No invented pricing/trials/testimonials/results. This is the shared Brain and therefore also feeds the existing public landing chat once loaded; no existing Brain edits overwritten.
- Account save precedes paid generation. Failed creation retains the brief; interrupted generation can retry after two minutes. Duplicate clicks do not generate twice. Editing clears approval. Old browser briefs import only by explicit action and originals remain. Approval only marks a reviewed draft: NO publishing, OAuth, actual image generation/upload, finished video or daily jobs. Calendar stays planning-only. Existing Buffer backend and lead/outreach/funnel tools untouched. No new dependencies.
- Verification: all 113 frontend tests and 195 backend tests passed; final targeted backend/guard checks passed after prompt tightening. Typecheck, full lint, production build, server syntax and diff checks pass. Real OpenAI + real Supabase save/generate/list/edit/approve/delete workflow passed (temporary script under `tmp/marketing-studio-stage-two/`). Desktop/mobile interactions and no-overflow/browser-error checks pass in isolated preview using an actual generated fixture; preview edits are explicitly preview-only. Full signed-in deployed admin flow not tested. Evidence/QA: `design-qa.md`. Code remains local/uncommitted/unpushed; migration and Brain foundation are live. Next: stage three media and native social connections/manual+daily publishing.

## 2026-10-04 — Codex: Marketing Studio stage one (GitHub push authorized; deployment not verified)

- Chris authorized reading BUILD/HANDOFF and starting stage one of approved mock. `AdminMarketingFunnelsPanel` now renders `AdminMarketingStudio` instead of `AdminSocialPostPanel`; lead finder/outreach/funnels untouched. Six tabs: Create, My campaigns, Make a Video, Calendar, QR Codes, Connected accounts. Uses existing React/Tailwind/Lucide/qrcode; no new dependencies or paid services.
- Stage-one working scope: campaign/video text briefs (account-scoped localStorage, max 50), edit/copy/remove, photo preview (filename saved only), planning date/month calendar, QR PNG creation/download. Later-state messaging is explicit: no AI creation, uploaded asset persistence, OAuth, publish jobs or daily scheduling. Old Buffer backend is unchanged; removing its panel does not disable any existing blog-sharing integration.
- New files: `src/components/admin/AdminMarketingStudio.tsx`, `marketingStudioDrafts.ts`, `AdminMarketingStudio.test.tsx`. Six meaningful tests cover saved-data isolation/remount, separate kinds, failure/corrupt-data protection and keyboard tabs. All 112 frontend tests, typecheck, full lint and production build passed. Visual checks used real component + sidebar in isolated local harness, desktop/mobile and actual QR creation; zero browser errors. Full authenticated admin page/live deployment not checked. QA: `design-qa.md`.
- Temporary local preview/evidence under `tmp/marketing-studio-stage-one/`; Vite running port 5177. Next: server-backed campaigns + AI generation using admin Business Brain, then FFmpeg video and native social connections/manual+daily posting. BUILD.md updated. No Supabase migration needed for stage one.

## 2026-10-04 — Claude: admin tab 4 "AI Sidekicks" replaced by "Business Brain" (pushed, commit 26b0c9a0; `platform-brain-migration.sql` RUN, table verified)

- **Chris asked to drop the old sidekicks and build the "Business Brain" from his AI You picture.** Admin sidebar item `knowledge-base` is now **Business Brain** (`AdminBusinessBrainPage.tsx`): readiness card, test chat, knowledge library (paste text / upload file / scan website via the existing `/api/lo/chatbot/extract-*`), voice + personality, Marketing / Sales / Customer Service boxes, sticky Save. Backend: `GET/PUT /api/admin/business-brain`, `POST /api/admin/business-brain/test` (`verifyAdmin`), logic in `services/businessBrain.js` (+4 tests), table `platform_brain` (**`platform-brain-migration.sql` must be run**; until then the page says so and the bot is unchanged). Once saved with at least one source, the brain is appended to the system prompt of the public `/api/continue-conversation` landing chat (cached 60 s).
- **Found while auditing:** 4 `/api/blueprint/ai-sidekicks/*` routes and `POST /api/training/feedback` were open to the internet (body `userId`, paid OpenAI, profile read); the admin sidekick routes plus `/api/voice/transcribe` were registered INSIDE the `/api/continue-conversation` handler (re-registered on every chat). All deleted, with the admin sidekick screen, Training Studio, `AIInteractiveTraining`, `AISidekicks.tsx` (~3,800 lines) and fake demo "training" rows that fed live prompts. Agent-side `/api/sidekicks/*` and `aiSidekicksService` (VoiceBubble) kept.
- Verified: tsc, lint, Jest 106, backend 187, build. Not verified on screen (admin login) or live.

## 2026-10-04 — Claude: SESSION SUMMARY (everything below this line from Oct 3-4 is pushed to main; BUILD.md updated)

- **Done and live:** agent dashboard launch audit fixes; LO to agent invoices (we never touch the money; migration `lo-invoices-migration.sql` run); realtor agents free in the app; critical `/api/admin/setup` hole closed (needs `ADMIN_SETUP_TOKEN`; only admin is cdipotter@me.com, not exploited); buyer listing chat saves again (`columnFallback.js`); admin tabs **Leads & Appointments**, **AI Conversations**, **Inbox** audited and fixed; dead code removed; `noUndefinedNames` guard test.
- **Admin tabs still to audit (Chris wants one at a time, each as verdict + red/yellow/green/suggestions + a 10-year-old checklist, answers kept short, anything he must do in bold):** AI Sidekicks, Marketing Funnels (re-check the CSV import consent prompt), Broadcasts, Listings, LO Platform, Users, Blog, White Label, Settings.
- **Not verified by clicking** (needs an admin login): all admin screens; a real buyer chat end to end; the invoice reminder from the app. Verified live: probes (401s), the $79 Stripe checkout, an invoice email arriving and opening, Mark paid.
- **Open for Chris:** money test (full signup through payment and cancel), Render invoice, optional `ai-chat-columns-migration.sql`. Open for me: background push alerts, weekly LO-to-agent email.
- **Test counts at this point:** Jest 103, backend 183, tsc/lint/build clean.

## 2026-10-04 — Codex: Dots guidance for Chris

- Checked official ChatGPT Dots documentation and project context. Explained using a dot for ongoing HomeListingAI coordination, issue follow-up, and draft preparation across connected tools. No app code, connections, or automations changed.
- Suggested starting with GitHub and a narrow responsibility; local computer access is separate from Codex access and requires ChatGPT open while used.

## 2026-10-04 — Claude: admin Inbox suggestions added (pushed)

- **Unread number on the Inbox menu item** (`AdminDashboardSidebar` `badgeCounts`; `AdminDashboard` loads the conversations once at start and counts needs-you chats not yet opened; read marks live in localStorage and fire a `hlai-inbox-read-changed` event so the number updates). **Quick replies** (Offer a showing / Offer loan help / Check in) fill the email or text body with the buyer's first name and the home. **Old idle chats** (no contact details, not a lead, quiet 14+ days) are tucked away on the All tab with a "Show N old idle chats" toggle. Inbox and AI Conversations stay separate by decision; the Inbox defaults to "Needs you". Logic in `inboxHelpers.ts`.

## 2026-10-04 — Claude: admin tab 3 "Inbox" (pushed)

- The Inbox is the same data as AI Conversations (`adminConversationsService.list`) shown as a two-pane inbox, and **half its controls were fake**: `InteractionHubPage` ignored 4 of its props, so (1) load errors and loading showed "Inbox is empty", (2) Archive only hid the row on screen (the server never heard; it came back on refresh), (3) the detail showed only the last message, not the thread, (4) the search box did nothing, (5) "Reply" was an `alert("coming soon")`, (6) unread dots reset on every reload (`isRead` was derived from `archived`), (7) the layout had no phone mode. Rewritten: "Needs you / All" tabs (needs you = lead captured, follow-up, or showing/offer/financing/timeline tags), working search, full thread, Reply by email/text link from the contact details (none = a plain note), Archive calls the server and shows an error if it fails, read marks kept in localStorage `hlai_admin_inbox_read`, loading + error + Try again, phone mode with a Back button. Logic in `src/admin-dashboard/inboxHelpers.ts` (+5 tests), screen test (+7). `AdminDashboard.tsx` now passes contact email/phone, lead id and tags into each interaction.
- Verified: tsc, lint, Jest 96, backend 183, build. NOT verified on screen (admin login).

## 2026-10-04 — Claude: admin tab 2 follow-ups (pushed): screen field names, paging, badges

- **Second bug found in the same tab:** the admin API sends camelCase (`contactName`, `lastMessage`) but the screen read snake_case, so every admin conversation showed "Unknown Contact" with no last message; buyer messages (`sender: 'visitor'`) were labelled "AI Sidekick". New `src/services/adminConversationsAdapters.ts` (+4 tests) translates both; used by `adminConversationsService`. Admin list now pages (50 + "Load more", server `?offset=`). Badges on each chat: "💰 Asked about financing" (the public chat now saves the buyer's intent tags into `ai_conversations.tags`) and "✓ Lead captured" (`lead_id`). Optional migration `ai-chat-columns-migration.sql` adds the 8 missing columns (NOT required: writes skip missing columns). Not run in the DB.

## 2026-10-04 — Claude: admin tab 2 "AI Conversations" — buyer listing chat was not saving anything (pushed)

- **Root cause (verified against the live DB):** `ai_conversation_messages` has NO `is_capture_event`, `intent_tags`, `confidence` columns, and `ai_conversations` has NO `agent_id`, `visitor_id`, `channel`, `last_activity_at`, `started_at`. The public listing chat (`POST /api/public/conversations/:id/message`) inserted those columns with no fallback, so every buyer message threw, the browser silently switched to canned answers ("Live assistant failed to respond"), and nothing was stored: DB has 1 conversation and 0 messages. The lead-capture hook that links a lead to its conversation (`lead_id`, `agent_id`, `visitor_id`...) failed the same way (error ignored), so the "View conversation" link on a lead was always empty.
- **Fix:** `backend/services/columnFallback.js` (`writeWithColumnFallback`, +4 tests) retries a write without any column the DB lacks; `insertRowTolerant/updateRowTolerant` in `server.cjs` now wrap the 2 public-chat message inserts, the conversation counter update, and the lead-attach update+insert. No migration needed. (Optional later: add the columns for intent tags.) The admin list hides archived conversations by default (Archive used to change nothing), search text is sanitized, and the admin "Export" button now exports the conversations on screen as CSV (was a disabled "Not Ready" button).
- **Not verified live:** a real buyer chat end to end (needs a deploy + a real chat).

## 2026-10-04 — Claude: admin tab 1 yellows fixed + 3 additions (pushed)

- **Added to the admin Leads tab:** (1) "Call these first" card (untouched hot/warm leads, longest wait first, Call/Text/Email buttons), (2) owner chip on every lead + "All owners" filter (`GET /api/admin/leads` now adds `ownerId/ownerName/ownerType/loName/intentLevel` from `agents`), (3) "waiting over 24h" card grouped by owner with a Show-them button. Pure logic in `src/admin-dashboard/leadInsights.ts` (+tests), UI in `AdminLeadInsights.tsx` (+render test).
- **Yellows fixed:** fake "Assigned agent" picker hidden (`agentOptions` is now empty in `AdminDashboard.tsx`); search text no longer injects filter syntax; the unused `phone-logs` GET/POST routes removed; the CSV import (it lives in the Marketing Funnels tab, `AdminMarketingFunnelsPanel.tsx`) now asks "Did these people agree to get emails?" and the server (`/api/admin/leads/import`) only enrolls into an email funnel when `assignment.consentConfirmed === true`.
- Verified: tsc, lint, Jest 80, backend 179, build, owner lookup run read-only against the real DB (4 leads, owners found). NOT verified on screen (needs admin login).

## 2026-10-04 — Claude: admin tab 1 "Leads & Appointments" (pushed)

- Lead **notes** list/add called `/api/admin/leads/:leadId/notes`, which did not exist (404): added GET/POST, stored as `lead_events` type `admin_note` (no `lead_notes` table). Admin edit/delete of someone else's appointment failed (the wrapper re-routes to the agent handler, which only lets the owner act): `ownedAppointment` now lets a verified admin act as the owner via `req.adminActingOnAny` (set only in the admin PUT/DELETE wrappers). Admin-created appointments still belong to the admin. Removed a debug `fs.appendFileSync('debug_leads_request.log')` in `POST /api/admin/leads` that wrote request data to disk.

## 2026-10-04 — Claude: admin dashboard audit fixes (pushed)

- **Admin Settings (system settings save, send reminder, cancel alert, coupons create/delete) and Training Studio (5 calls) sent NO Bearer token**, so every one was a 401 in production (errors swallowed; coupon delete even removed the row from the screen when the server refused). Now use `AuthService.makeAuthenticatedRequest`; coupon delete only updates the list on success. Scan of all admin screens: only `AdminSetup` (intentionally open) has an un-authed fetch.
- **Admin Broadcast page was broken:** it inserted `notifications` for every user from the browser; RLS only allows `user_id = auth.uid()`, so the batch always failed. New `POST /api/admin/notifications/broadcast` (service role, audience all/active resolved server-side, skips demo, chunks of 500); page now calls it. (The email route `POST /api/admin/broadcast` is NOT used by any screen; its `constaudienceType` typo is fixed anyway.)
- `PUT /api/admin/users/:userId` only edited an in-memory array (never the DB, no caller): removed. `POST /api/admin/users` temp password was `Welcome` + 4 digits: now random. `DELETE /api/admin/users/:userId` now refuses admin accounts (403 `cannot_delete_admin`). Known gap: admin delete does not cancel the user's Stripe subscription or clean leads/listings (self-service `/api/account/delete` does).
- 30 admin routes have no caller in `src`/`scripts` (list in the audit): left in place, need Chris's call.

## 2026-10-04 — Claude: CRITICAL admin hole closed (pushed)

- `POST /api/admin/setup` has no login (needed to create the first admin) and only refused when `admin_users` had rows. That table does NOT exist in production, so the check never fired: anyone could create a super-admin (`app_metadata.admin=true`). Verified in code + DB (table missing). Checked `auth.users`: only admin is cdipotter@me.com (June), so it was NOT exploited. Not probed live (would create an account). Fix: `backend/services/adminSetupGuard.js` fails closed: needs `ADMIN_SETUP_TOKEN` set on Render AND sent as `x-setup-token`; unset = route off (+3 tests). `/admin-setup` page (`AdminSetup.tsx`) no longer works without a token, fine because the admin exists. Admin audit still in progress.

## 2026-10-03 — Claude: dashboard header/tab title said "Today" on LO Listings/Leads/Appointments

- `resolveDashboardPageTitle` matched `/listings`, `/leads`, `/appointments`, but LO routes are `/lo-listings`, `/lo-leads`, `/lo-appointments`, so those pages showed "Today" in the header (pre-existing) and in the new tab title. Moved to `src/utils/dashboardPageTitle.ts` (matches the optional `lo-` prefix) with a 17-case test. Found from a screenshot of the live LO Share Kit page.

## 2026-10-03 — Claude: two real ReferenceError bugs fixed + guard test

- `buildSocialAssetHtml` used `brandName` but never received it, so the **social image PNG** routes threw on every call (real routes in `social-asset.png` are only used by `DemoAssetGalleryPage` and `backend/scripts/sharekit_smoke_test.sh`; the real agent/LO Share Kits use a TEXT social post, so customer impact was small, mostly the demo gallery); it now takes `brandName` (default `HomeListingAI`) and the live route passes `resolveListingBrandName(listing.id)` (the LO's white-label name when set). `POST /api/admin/broadcast` had `constaudienceType` (missing space), so the admin broadcast crashed; fixed. New `backend/__tests__/noUndefinedNames.test.js` runs ESLint `no-undef` on `server.cjs` and fails on any undefined name outside a short documented harmless list (`document` inside Puppeteer, `PORT` laptop fallback, the no-database `ensureLocal*`/`localAiCardStore` dev branches). Proven: it fails on the old code and passes on the new. **Not verified live** (needs a login): the social image and the broadcast.

## 2026-10-03 — Claude: audit #14 dead code removed (pushed)

- **Removed (each proven to have no caller in src, scripts, tests or server):** backend routes `POST /api/dashboard/onboarding/resend-welcome-email`, `billing/check-entitlement`, `reports/track-generation`, `billing/allow-overages`, `listings/:id/sources/upload-file`, `GET|PATCH /api/dashboard/automation-recipes`, `GET /api/dashboard/roi-metrics`, `GET /api/dashboard/command-center`, and `GET /api/listings` (it threw a ReferenceError on `ownerId` on every call since the Oct-2 lockdown, and `App.tsx` called it on every load and threw the answer away). Plus the helper `loadDashboardAppointmentsWindow`, the whole frontend command-center path (`services/dashboard/commandCenter.ts`, store `commandCenter` field, `getDemoCommandCenterSnapshot`), the `App.tsx` listings fetch + `BackendListing`, and 8 unused landing components (`ProofSectionNew`, `HeroMotionBg`, `Hero3D`, `FaqSectionNew`, `Reveal`, `FinalCtaNew`, `Tilt3D`, `StatStripNew`). ~1,700 lines.
- **Kept on purpose:** video credits routes (probably a planned feature), `videos/:id/signed-url` and `fair-housing-review.pdf` (called by `scripts/verify_phase513_live.cjs` and `backend/scripts/sharekit_smoke_test.sh`). `calculateRoiMetrics` in `leadIntelligenceService.js` and `listRecipes`/`setRecipeEnabled` in `automationRulesService.js` are now unused service exports; left alone.
- **New finding, NOT fixed:** an undefined-name scan of `server.cjs` (`eslint --no-eslintrc --env node,es2022 --rule no-undef:error backend/server.cjs`) still shows 24 hits that would throw ReferenceError if reached: `ensureLocalConversations`/`ensureLocalMessages`/`respondWithLocalConversations` (~29265-29395), `localAiCardStore`, `brandName`, `audienceType`, `PORT` (~25807), and `document` (8, inside a string/template). Worth checking which are live routes.

## 2026-10-03 — Claude: two audit suggestions done (pushed)

- A public showing booking now creates (or raises) the lead as **Hot** with a reason (`rateCaptureIntent('showing_requested')`, server.cjs near "Auto-creating lead"); the how-to PageGuide now starts **collapsed** on first visit (`PageGuide.tsx` `readState`), so the call-now card is first on Today. `lo-invoices-migration.sql` WAS run in Supabase (table verified: 31 columns, RLS on). Still open from the suggestions list: background push for new hot leads (needs VAPID keys + service worker + subscriptions table), weekly "your loan officer got you N leads" email to agents.

## 2026-10-03 — Claude: LO → agent invoices (pushed, live)

- **What:** the loan officer bills a partner agent for a share of marketing (some states require shared cost). We create, email and track the invoice; **we never touch the money** (no Stripe, no pay button, page says HomeListingAI is not a party). Agent pays the LO directly; LO marks it paid.
- **Run first:** `lo-invoices-migration.sql` in the Supabase SQL editor (table `lo_agent_invoices`, RLS on, no policies, backend only). Until it runs the invoice routes 500.
- **Backend (`server.cjs`, before the public partner-invite route):** `GET/POST /api/lo/invoices`, `GET /api/lo/invoices/export.csv`, `POST /api/lo/invoices/:id/{paid,void,remind}` (all `requireLoAgent`, owner = `lo_agent_invoices.lo_agent_id` = agents PROFILE id), public `GET /api/public/invoice/:token` (48-hex token, rate limited, counts views, allowlisted), agent `GET /api/dashboard/my-invoices` (by agent id or email). Pure logic + email + CSV in `backend/services/loInvoiceService.js` (+8 tests). 30 invoices/day per LO, 24h between reminders, max 5, listing must be co-branded with that LO.
- **Frontend:** `LOInvoicesPage` at `/dashboard/lo-invoices` (sidebar "Invoices", LO only, hidden in demo), "Send invoice" button on each partner (Partners page → `?new=1&email=&name=`), public `/invoice/:token` (`InvoicePage`, printable, noindex + robots.txt Disallow), `src/services/loInvoiceService.ts`.
- **#12 done:** a free realtor agent's Settings → Billing no longer sells the $79/$149/$299 LO plans; it says tools are covered by their loan officer and lists their invoices. Agents with a paid plan, and LOs/offices, still get the full page.
- **Compliance:** invoice wording is a draft, have an attorney read it. The app makes no "RESPA compliant" claim and suggests no amounts.
- **Verified:** tsc, lint, backend 175, Jest 52 (+`LOInvoicesPage` render test, agent billing test), build; public invoice page checked at 375px with a stubbed API (no overflow, HTML in text shown escaped, single noindex tag). **Not verified:** the migration, a real send/open/mark-paid against Supabase, the real email.

## 2026-10-03 — Claude: agent dashboard launch audit + fixes (pushed)

- **Audit verdict was READY AFTER FIXES.** Fixed in the working tree: (1) public `POST /api/appointments` now rate limited (`backend/services/publicBookingGuard.js`, +5 tests: 5/hour per IP, 2/day per email, 40/day per listing), field size/email checks, public bookings can only be `scheduled`; (2) `/api/billing/checkout-session` accepts `lo_lite` (the $79 Settings button used to 400); (3) `POST /api/properties` always creates a draft and `PUT /api/properties/:id` cannot publish a draft, so the publish route (plan cap + rules) is the only way to publish; (4) agents are no longer redirected out of Leads/Listings/Appointments while onboarding is unfinished (Today shows the checklist; `/dashboard` still sends new agents to the wizard); (5) onboarding no-row reply includes `account_type: 'realtor'`; (6) Leads header stacks on phones; (7) agent CSV exports defuse formulas (`src/utils/csvCell.ts`, +4 tests); (8) "Listing sold" notification uses the LO's auth id; (9) `/api/dashboard/leads` limited to newest 500 (`?limit=`, max 1000, returns `truncated`) and loads only needed property columns; (10) realtime WebSocket sends the token as a first `{type:'auth'}` message, not in the URL (`?token=` still accepted for old cached clients); (11) removed the client refresh of `/api/dashboard/command-center` on every realtime event (nobody read it); (13) 40px tap targets on lead detail links and Today "Details", dashboard tab titles named per page.
- **Left for Chris's decision:** #12 agent Billing page sells the LO plans ($79/$149/$299) to realtors; #14 unused backend routes (`resend-welcome-email`, `check-entitlement`, `track-generation`, `allow-overages`, `sources/upload-file`, `automation-recipes`, `roi-metrics`, `video-credits`, `signed-url`, `fair-housing-review.pdf`), the now-unused `/api/dashboard/command-center` route + `commandCenter` store field, and 8 unused landing components. None deleted.
- **Verified:** tsc, lint, backend 167, Jest 47, build; Leads export buttons and lead-detail links re-measured at 375px. **Not verified:** any signed-in flow, a real public booking, Stripe checkout for `lo_lite` (needs a live click after deploy), the WebSocket auth message against a real socket.

## 2026-10-03 — Codex: prepared agent dashboard launch-audit prompt for Chris

- Prompt only; no app code changed. Focuses on agent routes, end-to-end wiring, dead code, mobile usability, production readiness, evidence-backed red/yellow/green findings, and product suggestions measured against Golden Rules. Recent LO dashboard audit remains separate.

## 2026-10-03 — Claude: LO dashboard — ALL audit items below FIXED (red, yellow, dead code, design). NOT yet committed/deployed.

- **Backend (`server.cjs`):** CSV export (profile id, `properties`, test leads excluded, formula-safe); WOW public endpoint reads `properties`; `/api/lo/leads` (phone search, own offsets + `nextOffset`, `intent`/`status` filters, `sourceType`, `notes`, `callId`, `isTest`); lead conversation falls back to the AI call transcript; new `POST /api/lo/leads/:id/contacted` and `DELETE /api/lo/leads/:id` (test leads only); status on orphan pre-qual now 409 instead of fake success; invite reuse refreshes `expires_at`, email-failure flag, resend rate limit (10 min) + NMLS, stricter email check; `/api/lo/partners` returns `wowLink`/`smsText` per pending invite + `inviteUsage`; Today returns `aiCalls` + `brain`, excludes test leads; knowledge base over 60,000 chars now returns 413 instead of silently cutting; extract-file/url return `truncated`; listing cap (`loListingCapacity`) enforced on assign and exposed at `/api/lo/listing-limit`; public LO card respects the `listing_page` toggle; public lo-chatbot no longer breaks with 2 LOs on a listing. Removed: `/api/lo/invite-realtor`, `/api/internal/run-nudge-job`, legacy `/api/leads/:id/contacted`, `DELETE /api/lo/chatbot/compliance-doc`.
- **Frontend:** ListingEditorPage/OfficeBrandContext/ListingsCommandPage now send the Bearer token; LO Today (two-line mobile rows, Call marks contacted, AI activity card, retry); Leads rewritten (filters, deep link `?lead=`, Book a call, test-lead delete, race-safe search); Listings card = Share Kit primary + ⋯ menu; Partners (copy text/link on pending invites, usage meter, invite modal with Done/Esc, drawer a11y); Appointments (overdue bucket, local dates, Esc, no accidental form loss); Brain (failed saves no longer silent, size meter, truncation warnings); Onboarding sends a real WOW Link, lands on LO Today, headshot uploads to storage; Sidebar has an "AI is ON/OFF" switch for LOs; TodayDashboardPage redirects LO/office instead of flashing the agent page.
- **Left on purpose:** `calls_mode`/`texts_mode`/call+SMS templates (reserved for outbound calls). "Questions your Brain couldn't answer" card is NOT built (needs buyer-chat gap tracking). After trial ends chat/phone still answer; only invites and new listings are blocked.
- **Verified:** tsc, lint, backend 162, Jest 43, build; measured at 375px (lead names 0px -> 75-88px, listing address 30px -> 209px).

### Earlier same day: audit findings (for reference)

Read every LO page + `/api/lo/*` route, checked the live DB (read-only) and measured the demo pages at 375px. Baseline green (backend 162, tsc, lint). Findings, worst first:
- **Broken in prod:** (1) `ListingEditorPage` LO rate-sheet/financing docs + People tab send only `x-user-id` (no Bearer) → 401 in production (curl-verified); `OfficeBrandContext` `/api/me/brand` same (white-label never applies). (2) LO CSV export filters `leads.lo_agent_id` by the AUTH id; leads hold the PROFILE id and `agents.id <> auth_user_id` for every account → export is always empty; it also reads the legacy `listings` table for addresses. (3) WOW link public endpoint reads legacy `listings` (1 row) instead of `properties` → "Show them this listing" always falls back to the demo home. (4) LO Today lead rows: name/contact are 0px wide at 375px when the lead has a phone; LO listing cards show a 30px-wide address on phones. (5) Onboarding step 2 uses legacy `/api/lo/invite-realtor` (plain email, no WOW link, no partnership). (6) Search says "name, email or phone" but phone is not searched; `/api/lo/leads` pagination offset mixes two tables; leads from phone/email/SMS all show as "Chat" (`source_type` never returned); no transcript link for AI phone calls (`lo_phone_calls.lead_id` exists). (7) Partners "Schedule Appointment" links to the AGENT appointments page, so the prefill is ignored. (8) Re-inviting the same email reuses a revoked/expired token (dead link). (9) Tapping Call on a lead never marks it contacted, so the "call now" timer keeps pulsing; WaitingBadge reads `leads.last_agent_action_at`, which does not exist.
- **Dead/no-op:** `GET /api/lo/listing-limit` (no caller; plan listing limits are never enforced anywhere), `DELETE /api/lo/chatbot/compliance-doc`, `calls_mode`/`texts_mode`/call+sms templates (no UI, nothing reads them), toggles `listing_page`/`share_kit`/`open_house`/`qr` change nothing public, `/api/internal/run-nudge-job` (profile-id notifications fail, reads legacy `listings`), `_StatCard`, `_NAV_ITEMS`, legacy `/api/leads/:id/contacted` (auth-id compare). After trial ends only new WOW invites are blocked; chat, phone, leads and share kit keep working.

## 2026-10-03 06:50 — Claude (Cowork): design system artifact synced from this repo

- Read-only pass, **no code changed**. Built the "HomeListingAI" Design System artifact on claude.ai from `tailwind.config.js`, `src/public.css`, `src/components/DesignSystemPage.tsx` and `public/newlogo.png` at `1b064ba0`: colors (slate, primary + the Tailwind default shades the app actually uses), type scale, spacing, radii, shadows, logo, and static Button/Card/Input/Badge recipes.
- Found: `tailwind.config.js` names **Inter** but nothing loads it (no font file, no Google Fonts link), so users see system sans. `index.html` loads **Caveat** but nothing in `src/` uses it. The design-system page's Success button (`green-600` + white) is 3.3:1.

## 2026-10-03 — Claude: "money test" code audit — 3 revenue bugs fixed before the first paying LO

Read the whole signup → trial → Stripe → webhook → entitlement path. DB shows ZERO paying customers ever (agents: 1 comped LO, 2 awaiting payment), so none of this had run for real.
1. **Free-access backdoor.** `LIFETIME` and `FRIENDS30` were hardcoded in BOTH checkout routes (`/api/billing/checkout-session`, and the public no-login `/api/payments/checkout-session`) and shown as the promo input placeholder in `UpgradePromptModal`: anyone could activate an account free forever. Codes now come ONLY from env `FREE_ACCESS_PROMO_CODES` (comma separated, `services/promoCodes.js`, +2 tests). **Chris: if he gives friends free access, set that env var on Render with a new, non-guessable code.**
2. **A paying LO would never have been activated.** The LO checkout put the agent's SLUG in `client_reference_id`/metadata; the webhook (`billingEngine.resolveAgentIdFromStripeIdentifiers`) used it as the account id, so `upsertSubscription` hit a uuid error, `agents.stripe_customer_id` was never saved and `resolveLoPlanTier` kept returning `none` ("trial ended", WOW links paused). Fix: checkout now sends `agent_id` (auth id) in session AND subscription metadata (`paymentService`), and the webhook turns a slug into the real id (also covers old in-flight sessions).
3. **Second free week.** Checkout always added a 7-day Stripe trial on top of the no-card trial. `services/checkoutTrial.js` (+5 tests): Stripe trial = days LEFT of the first week, 0 once it has ended or for pay-now codes; `trial_period_days` is omitted when 0 (Stripe rejects 0).
- Unchanged and fine: entitlement is read live from Stripe (`active`/`trialing`), price ids from `STRIPE_LO_LITE_PRICE_ID` / `STRIPE_LO_PRICE_ID` / `STRIPE_LO_PRO_PRICE_ID`; LO Lite fails loud without its env var.
- Still to do: Chris runs the live test (new LO signup → "Choose my plan" → card → back), then cancel inside the 7-day trial so nothing is charged.

## 2026-10-03 — Claude: Sentry's first alert was a real bug — fixed

- Sentry (now live, `SENTRY_DSN` saved) reported `DB schema error PGRST204 on funnels: Could not find the 'is_active' column`. Cause: `ensureDefaultFunnels()` (runs at every boot) looked funnels up by `type` (empty on the 3 existing rows, which use `funnel_key`), so it always tried to insert a new one with columns that do not exist (`title`, `is_active`) — harmless only because the insert failed; it would have created duplicate default funnels otherwise. Now looks up by `funnel_key` or `type`, and inserts with real columns (`funnel_key`, `name`, `is_default`).
- First proof that `dbErrorWatch` + Sentry works. Expect this one issue to stop appearing after the next deploy; mark it Resolved in Sentry.

## 2026-10-02 23:50 — Claude: end-of-day wrap-up (read this first next session)

- **State:** everything is committed and pushed (`main`). Live checks at the end: `/healthz` shows `app_runtime_mode: all`, `run_background_tasks: true`, `run_job_worker: true`; every route I locked answers 401 with no token. Backend 155 tests, Jest 43, tsc and lint clean.
- **Docs updated:** `CLAUDE.md` (§3 new rules, infrastructure notes, new §7 snapshot), `BUILD.md` (Stack was wrongly Firebase; status sections rewritten), `render.yaml` (target single-service setup), memory notes.
- **Chris still has to (in this order):** 1) pay the failed Render invoice (Sep, $73.52) tomorrow; 2) Render savings: upgrade web to Starter $7, suspend `home-listing-ai-worker`, delete `home-listing-ai-video-worker`, downgrade the $25 Pro workspace plan; 3) save `SENTRY_DSN` in Render (Sentry project already created, Express, error monitoring only); 4) set `CRON_SECRET` / `INTERNAL_JOB_SECRET` only if something outside calls the cron/nudge routes.
- **Next for the agent:** the "money test" (new LO signup, trial, Stripe upgrade; never done live), confirm trial/drip emails fire now the loop runs, Today/Appointments declutter, background push, repo clutter.
- **Heads-up:** this commit also includes two older Codex notes (Sep 30) that had been sitting uncommitted in this file.

## 2026-10-02 23:00 — Claude: second security sweep + safety nets + accessibility layer

**More open routes found and closed** (all verified by probing): `DELETE /api/setup/reset-agent/:identifier` deleted agents by slug/email with no login (now `verifyAdmin`); `POST /api/vapi/call` placed calls (now `requireAuth`); `POST /api/payments/portal-session` opened any account's Stripe billing portal from a public slug (now `requireAuth`, uses the signed-in user only); `POST /api/security/notify-login` emailed attacker-supplied addresses with unescaped HTML (now auth, emails only the account's own address, escaped); `POST /api/webhooks/email` let anyone mark leads Bounced (now needs `EMAIL_WEBHOOK_SECRET`); `GET /api/leads/stats` was platform-wide (now auth; `all=true` is admin only); `POST /api/leads/score-all` (admin only); hardcoded fallback secrets `hlai-cron-secret` / `hlai-internal` removed — **set `CRON_SECRET` and `INTERNAL_JOB_SECRET` in Render if anything external calls `/api/cron/inactivity-check` or `/api/internal/run-nudge-job`** (they now refuse without them).
**SSRF:** three places fetched user-typed URLs (blueprint memory, LO `extract-url`, lead webhook test). All now go through `services/safeUrl.js` `safeFetch` (blocks private/loopback/link-local/CGNAT, re-checks redirects). +6 tests.
**Safety nets (all run in `npm run test:backend`, 155 tests):** `backend/__tests__/routeGuards.test.js` fails if any `/api` route is added with no login guard and not on `backend/__tests__/publicRoutes.allowlist.js` (and if money/mail/call/delete routes ever get allowlisted). `services/dbErrorWatch.js` wraps the Supabase client's fetch so a query naming a missing column/table logs `🚨 [DB SCHEMA ERROR]` (+ Sentry if `SENTRY_DSN` is set). `npm run check:db` / `node backend/scripts/check-db-columns.cjs --sql` finds every select column that does not exist (paste the SQL in the Supabase editor, or set `SUPABASE_DB_URL`).
**Sentry:** already wired in `server.cjs` but `SENTRY_DSN` is not set on Render (a warning prints at boot). `@sentry/node` was not in `backend/package.json` (worked only because the root install provides it); now listed.
**Accessibility layer** at the end of `src/public.css` (THE app stylesheet — `main.tsx` → `PublicApp` → `public.css`): 12px minimum text, AA contrast for slate-400/emerald/amber, 40px touch targets on touch screens. Measured on demo pages: tiny text 17-23 → 0, low contrast 10-22 → 0-4, Appointments small targets 40 → 0.
**Deleted dead entry files:** `src/index.tsx`, `src/styles.css`, `src/App.css` (nothing imported them; the real entry is `main.tsx`).
- Lesson: I first put the CSS in `styles.css` (dead) and the browser measurement showed no change. Measure before declaring done.

## 2026-10-02 21:00 — Claude: principal-engineer sweep — CRITICAL: unauthenticated send/call/AI routes closed

Probed live with empty POST bodies: these reached their handlers with no token (anyone on the internet could use them on our accounts):
- `POST /api/email/send` (arbitrary To/Subject/HTML/**From**), `POST /api/sms/send`, `POST /api/voice/{,vapi/,hume/}outbound-call` (places phone calls), `POST /api/shorten` (short links on our domain), `POST /api/ai/generate-listing` + `/api/ai/agent-chat` (paid OpenAI), `POST /api/leads` (anonymous lead injection).
- Now `requireAuth` (shorten uses a wrapper because it registers before `requireAuth` exists). `/api/email/send` no longer honours a caller-supplied `from`. `/api/sms/send` rate-limits on the authed id, not a body `userId`.
- Public AI routes that must stay open (`/api/ai/property-chat` on the WOW page, `/api/realtime/offer`, `/api/realtime/handoff`) now share `aiChatLimiter` (+ `aiSpendGuard` for the first two).
- Frontend callers send the Bearer token via `authedFetch`: ContactLeadModal, AdminMarketingFunnelsPanel, textingService, AICardPage, openaiService; `listingsService` AI describe adds the token.
- **Lesson (again):** a multi-part Python edit failed halfway (a file with no `import` line). Re-verified every part with a grep count before committing.
- tsc, lint, backend 143, build OK.

## 2026-10-02 19:00 — Claude: LO dashboard audit started — whole-backend column check found more silent failures

Ran every literal `.from('t').select('cols')` in `server.cjs` + `services/` against `information_schema` (read-only). Fixed selects that named columns that do not exist (Supabase returns an error and `data: null`, which the code mostly swallowed):
- **Lead "View conversation" was always a 500** (agent `GET /api/dashboard/leads/:id/conversation` and the LO equivalent): `ai_conversations` has no `visitor_id/channel/started_at/last_activity_at`; `ai_conversation_messages` has no `is_capture_event/intent_tags/confidence`.
- **Lead detail never had its listing** (`properties` has no `city/state/zip`), nor did reminder emails, appointment emails and the listing resolver (5 selects).
- `listing_sources` has no `text` (AI Summary on the listing page); `ai_conversations.agent_id` (summary job + public chat), export-conversations.
- Weekly "value" email to listing agents (`schedulerService`): `pre_qual_submissions.name` -> `full_name`, dropped `properties.city/state`, `agents.name`.
- **3 tables the code uses do not exist in production:** `appointment_reminders`, `lead_events`, `lead_conversation_summaries` (a singular `lead_conversation_summary` exists with a different shape). `missing-core-tables-migration.sql` creates them (idempotent). **Chris must run it in the Supabase SQL editor** (project convention). Until then reminders created through the dashboard routes, the lead activity log and the Summary card stay empty (the code tolerates the missing tables).
- Not fixed on purpose: `agents.user_id`/`is_admin` selects (they already have fallbacks), `ai_knowledge_base` (table missing, code handles it), legacy `funnel_steps` selects (steps come from `funnels.steps`).
- All `/api/lo/*` routes require a login (listing-docs routes check inside the handler). Live: 401 with no token.
- Verified: backend 143 pass.

## 2026-10-02 17:00 — Claude: "make it 100" pass — found 6 live bugs from a schema check

Checked every column my new code (and older code) selects against the real DB (`information_schema`, read-only). **`agents` has no `full_name` and no `brokerage` column.** PostgREST returns an error and `data: null`, so these were silently failing in production:
- Lead detail "Mortgage Partner" card (`lo_partner` lookup selected `full_name`) never appeared.
- LO Share Kit: both the LO and the listing agent came back `null` (flyer showed "Loan Officer" with no company, and no listing agent).
- WOW link public page: claimed agent's company/headshot/phone missing (selected `brokerage`).
- Agent listing hydration (`brokerage`).
- My new `my-loan-officer`, `ask-lo`, `agent-share-kit` routes had the same mistake (would have shown nothing).
All selects now use real columns (`company` is the brokerage). **Rule: never select `agents.full_name` or `agents.brokerage`; names come from `first_name` + `last_name`.**
- **Compliance Brain** now starts from the LO profile: blank `company_name` / `licensed_states` fall back to `agents.company` / `agents.lending_states` in the prompt (`loBrainService.buildBrainPrompt`) and in `GET /api/lo/chatbot-config`. Chris's config row has `company_name ''` but his profile has company "An AI You" + NMLS. (+2 tests)
- **Every new lead is rated at capture** (`services/captureIntent.js`, +5 tests): showing/pre-approval = Hot, report = Warm, contact left = Warm, none = Cold, with a reason in `source_meta.intent_reason`. A repeat visit can raise but never lower the level. Jev still rates replies and pre-approvals.
- Today: the Call-now lead no longer repeats in the list below. Verified the new screens in demo mode on desktop + 375px (no horizontal overflow).
- tsc, lint, backend 143, Jest 43, build OK.
- **Not done:** real background push (needs service worker, VAPID keys in Render, a subscriptions table; `public/sw.js` is still the kill-switch). ~40 unused backend routes remain (edit was blocked by the harness; they are all auth-locked).

## 2026-10-02 15:00 — Claude: LO Today + Leads get the same call-now tools

- LO Today: `CallNowHero` for the best new lead, per-row waiting timer + one-tap Call/Text, heading padding fixed (the `/dashboard/lo-today` route had no wrapper, so the heading hugged the top edge). LO Leads rows show the waiting timer.
- **Bug found:** `GET /api/lo/dashboard/today` never returned `phone` (or `sourceType`) for recentLeads, so phone-only leads read "No contact info". Now returns `phone` (phone_e164 || phone), `sourceType`, `intentReason`.
- `WaitingBadge` now takes just `status/created_at/intent_level/last_agent_action_at` so any lead shape can use it.
- tsc, lint, backend 136, Jest 43, build OK.

## 2026-10-02 14:00 — Claude: agent dashboard — 8 upgrades for warm leads + LO partnership

- **Today:** `CallNowHero` (best lead, big Call / Text / Ask-LO), `WaitingBadge` speed-to-lead timer (client clock, red + "call now" after 5 min on Hot), Jev's reason on every lead card (`LeadReason`), `MyLoanOfficerCard`, `InstallAppPrompt` (phones only, once). Shared pieces in `LeadActions.tsx`.
- **Leads inbox:** reason line, timer, Text button. **Lead page:** "Ask {LO} to call".
- **Listings:** primary **Share** button (native share sheet, tracked link, copy fallback).
- **Live alert:** `DashboardRealtimeBootstrap` now toasts a new lead (under 2 min old) with a Call button and buzzes on Hot. This is in-app only. Real background push needs a service worker + VAPID keys + a subscriptions table; `public/sw.js` is still the kill-switch. Not built.
- **Backend (light):** `GET /api/dashboard/my-loan-officer` (3 small queries, only when Today loads), `POST /api/dashboard/leads/:leadId/ask-lo` (owner-checked, notifies the LO via bell + email, once per 30 min per lead, stores `source_meta.lo_asked_at`), and the leads list now returns `intent_reason` + `can_ask_lo` from rows it already loads (no extra queries).
- **State:** tsc, lint, backend 136, Jest 43, build OK. Not exercised live yet (needs a real agent login with a linked LO). Plain form leads still have no Hot/Warm/Cold unless pre-approval or a reply rated them.

## 2026-10-02 10:00 — Claude: agent dashboard — second lockdown (about 60 routes)

Re-audited every route with no login guard and tested the live site with no token. These answered 200: `GET /api/listings` (returned real drafts for anyone), `/api/email|notifications/preferences|security/settings/:userId`, `/api/conversations*`, `/api/sidekicks*`, `/api/funnels|analytics/*/:userId`, `/api/leads/:id/{tracking-stats,score}`, `/api/ai-card/*` writes, and `market-analysis`.
- New hoisted helpers in `server.cjs`: `authOwnsId`, `requireParamOwner`, `requireLeadOwner`, `requireConversationAccess`, `requireNamedUserIsCaller`, `requireSidekickOwner`. A named id must be the caller's login id or agents profile id (403 otherwise, 401 with no token).
- `GET/POST /api/listings` now use the signed-in user only (body/query owner ignored). `/api/security/{audit,backup,alerts/:id}` are `verifyAdmin`. `PUT /api/ai-card/profile` no longer trusts `x-user-id`.
- Frontend: new `src/services/authedFetch.ts` (fetch + Bearer). Used by email/security/feedback/chat/sidekicks/aiCard services, `App.tsx` listings load, `UnifiedTrainingStudio`; `getMarketAnalysis` sends Bearer. `GET /api/ai-card/profile` stays public on purpose (public business card).
- **Known side effect:** admin `LeadDetailDashboard` calls `listConversations()` with no id; it now returns the admin's own (empty) list, not the platform default's.
- Left open on purpose: `GET /api/listings/:id/lo-assignment` (public LO card data), `/api/listings/:id/marketing` (legacy in-memory), `/api/agents/:slug`.
- tsc, lint, backend 136/136, build OK. Live re-test after deploy is below if filled in.

## 2026-10-02 08:00 — Claude: Jev now scores inbound lead replies

- **Did:** `LeadScoringService.recalculateLeadScore(..., 'CHAT_REPLY', {message, channel, subject})` asks Jev (intent / readiness / urgency) and adds the points to the rule score as a "JEV Semantic Qualification" breakdown line (scoring_version `v2.1-jev`). Mailgun inbound email and inbound SMS handlers in `server.cjs` pass the message in. New `backend/services/TypeSafeLeadQualificationService.js` (+tests).
- **Changed from the draft:** it required `@typesafe-ai/sdk` directly. Moved it onto the shared `typesafeClient.js` (one client rule) and dropped the SDK dependency from `package.json`. (The SDK does load under `require`, so it was a rule fix, not a crash fix.)
- **State:** backend 136/136. Fails open: no key or API error keeps the plain rule score.
- **Verified:** Chris tested a real inbound reply on 2026-10-02 and the score updated. `AI_HANDOFF.md` also holds two uncommitted Codex entries from Sep 30; left for Codex to commit.

## 2026-10-01 09:30 — Claude: agent dashboard — 17 unauthenticated routes closed

Audited every `/api/dashboard/*` route (67 of them) plus the agent-owned routes outside that prefix. **17 took their owner id straight from a query param or an `x-user-id` header with `DEFAULT_LEAD_USER_ID` as a fallback, so no token was needed at all.** Verified live before the fix: `GET /api/dashboard/command-center` and `GET /api/dashboard/automation-recipes` both returned **200** for a made-up `x-user-id` with no Authorization header.

Worst of them:
- `DELETE /api/dashboard/leads/:leadId` — delete any agent's lead.
- `PATCH /api/dashboard/leads/:leadId/status` — **no owner check of any kind**, not even a spoofable one: rewrite the status and notes of ANY lead in the platform.
- `GET /api/dashboard/leads/:leadId`, `/conversation`, `/export-conversations` — read any agent's leads and full chat transcripts.
- `GET/PUT /api/agent/identity` — read and **rewrite the From / Reply-To address on an agent's outgoing email** (phishing vector). No frontend calls these; locked anyway.

Changes:
- `resolveDashboardOwnerId` is now **async and authenticated** — it resolves the owner from the signed-in session via `resolveRequesterUserId(req, { allowDefault: false })`, returns null on a bad/expired token (→ 401, never 500), and allows the one legitimate mismatch where a caller sends the `agents` profile id while the token carries the login id. All 7 call sites plus 8 inline `String(req.query.agentId || req.headers['x-user-id'] || … || DEFAULT_LEAD_USER_ID)` expressions now go through it, each followed by `if (!agentId) return res.status(401).json(UNAUTHORIZED_DASHBOARD)`.
- `PATCH /api/dashboard/leads/:leadId/status` gained the same fetch-then-compare ownership check the delete route uses (404 if the lead is gone, 403 `listing_access_denied` if it is someone else's).
- The reminder, command-center, listing-leads and listing-performance handlers already scoped their queries by `agentId` — they were only missing the proof that the caller owns that id. Nothing downstream changed.
- **Frontend: one header builder now.** `defaultJsonHeaders` in `src/services/dashboard/utils.ts` was the sync, token-less version and was still used by 32 call sites across `appointments / commandCenter / leads / listingContent / listingPerformance / video`. It is now an alias of `authHeaders` (async, sends Bearer) and every call site awaits it. This closes the recurring root cause from the last three sessions — there is no longer a token-less builder to reach for. `listingBuilderService.ts` has its own local async version that already sent Bearer; left as-is.
- Demo mode: `fetchAutomationRecipes` / `updateAutomationRecipe` were the only two dashboard calls with no demo short-circuit, so they would have 401'd the demo. Both now answer locally in demo mode.

Verification: tsc clean, lint clean, Jest 43/43, backend 129/129, `npm run build` ✓. Live 401 checks after deploy are in the PR.

**Found, NOT fixed (needs a decision, none are agent-dashboard):** `POST /api/listings`, `GET /api/listings/:listingId/market-analysis`, `GET /api/video-credits/:listingId`, `POST /api/security/audit`, `GET /api/training/feedback/:sidekick`, and the whole `/api/ai-card/*` group (6 routes — that UI is hidden as unused per CLAUDE.md) are all still spoofable the same way. Also `app.use('/api/dashboard')` has a `last_seen_at` middleware that bumps `agents.last_seen_at` for whatever id is sent — cosmetic only, left alone.

## 2026-10-01 08:35 — Claude: AI Brain guard card now reports WHY
- The PR #56 guard card fired for Chris on the live site. His config row is intact (knowledge_base 3265 chars, bot_name "Chris Potter AI"), so the guard did its job, but the load is genuinely failing and I could not determine the status code from here. Ruled out: duplicate `lo_chatbot_configs` rows (none), missing `DEFAULT_RULEBOOKS` export (present at runtime), and an unauthenticated call (returns 401 correctly).
- Added: one silent retry after 1.5s before showing the card (covers a Render free-plan cold start or a dropped request), and the card now prints `Reason: <status> <error>` so the next report identifies it in one step instead of another guessing round.
- **Open:** Chris's Compliance Brain is empty — `company_name`, `company_nmls`, `licensed_states`, `required_disclosure` are all blank, and `faq` is empty. The AI currently answers loan questions without naming the company, NMLS or licensed states.

## 2026-10-01 08:05 — Claude: listing photo upload was 401 in production
- Chris: "I try to load a pic and it states unauthorized." `listingMediaService.uploadListingPhoto` POSTed to `/api/listings/photo-upload` with ONLY `Content-Type: application/json` — no Bearer, no `x-user-id`. That endpoint is `requireAuth`, and in production `resolveRequesterUserId` ignores a body `userId` without a token (`allowExplicitWithoutAuth` is false), so **every photo upload 401'd**. Pre-existing, not from this audit's changes.
- Fix: send `waitForAuthenticatedSession()`'s `accessToken` as Bearer plus `x-user-id`, matching `listingBuilderService.defaultJsonHeaders`.
- Checked the sibling upload paths: `listingBuilderService.uploadListingBrainDoc` already sends Bearer; no other service posts a file without auth.
- **This is the third instance of the same root cause (ROI/onboarding earlier, dashboard appointments, now photo upload): a fetch written before the Bearer-token convention existed.** CLAUDE.md §3 already documents the rule; the remaining risk is older files that predate it.

## 2026-10-01 07:50 — Claude: listing editor publish rules
- `canPublish` required beds > 0 AND baths > 0 AND sqft > 0, so **land, lots and parking spaces could never be published**. Now publishing needs: address + price + **at least one photo**. Beds/baths/sqft are optional.
- A photo is newly REQUIRED: the public listing page, flyer (`LOShareKitPage` design C uses `listing.photos[0]`) and WOW link are all built around the first photo and render blank without one.
- Replaced the dead grey Publish button with `publishBlockers`: a visible "To publish, add …" line plus a title tooltip naming exactly what is missing.
- Added a `beforeunload` guard for unsaved edits (same as the AI Brain page).
- Audit note: this editor already handles the load-failure case correctly (falls back to a cached local draft, else shows an error — never a blank form), with a comment calling out the "broken-API-then-save-stale-data feedback loop". It does NOT have the AI Brain's wipe bug.

## 2026-10-01 07:45 — Claude: AI Brain tab — DATA-LOSS bug fixed
- **🔴 The LO's trained brain could be silently erased.** `LOBrainPage` loaded `GET /api/lo/chatbot-config` with `if (res.ok)` and NO else branch: any non-OK response (401 after session expiry, 500, blip) left `config` at `EMPTY_CONFIG` and rendered a blank-but-working form. The next `persist()` PUT — including the automatic one from `addSource`/`removeSource` — upserted blanks over `lo_chatbot_configs` (knowledge_base, faq, compliance, banned_phrases, licensed_states) and toasted "AI Brain saved". Fix: a failed load sets `loadFailed`, the page renders a hard-stop card instead of the form, and `persist()` refuses to write while `loadFailed` is true. Verified by forcing a 500 on the config call — the guard card renders and no form is reachable.
- Unsaved edits now trigger a `beforeunload` warning.
- `POST /api/lo/chatbot/extract-file` now runs `requireAuth` BEFORE multer, so an anonymous 25MB upload is rejected without being buffered. (This closes Codex's open question — auth WAS present, just after the upload middleware.)
- Audit result otherwise clean: every `/api/lo/brain/*`, `/api/lo/chatbot-config`, `/api/lo/phone-*` route is `requireLoAgent`; `extract-url` is `requireAuth`; test chat, voice preview, number purchase and handoff number all surface errors properly.
- **Pattern worth remembering across this whole audit: `if (res.ok) {…}` with no else is a data-loss bug whenever the loaded value is later written back.**

## 2026-10-01 07:35 — Claude: Listings tab + per-listing call forwarding
- **NEW: "Send hot callers to" per listing** (Chris's ask). `lo_phone_lines.transfer_number` and `transferTarget()` already existed but were main-line only and had no UI. `setTransferNumber(loAgentId, value, listingId)` now takes a listing; new `PUT /api/lo/listings/:listingId/phone-line/transfer` (requireLoAgent + `listing_lo_assignments` check → 403 `listing_access_denied`); the field lives in `ListingPhonePanel` under an active number. Blank falls back to the LO's own phone, which is the pre-existing behaviour.
- Branding switches no longer lie: a failed PATCH rolls the switch back and toasts, and a failed GET shows the backend default (all on) instead of spinning forever.
- Listing list + search now have real failure states; "Build a Listing" says so if the co-brand assignment fails instead of silently leaving the LO unbranded.
- `/api/listings/search` now returns **drafts as well as published** (Chris: "yes") so an LO can co-brand a home before it goes live.
- **Audit result: this page was the best-protected so far.** Every endpoint already had `requireAuth`/`requireLoAgent`, assign checks an active `lo_agent_partnerships` row, search is scoped to partner-owned listings, and `dashboard-link` checks assignment or ownership. No auth holes found.
- Removed the stale CLAUDE.md line claiming `/dashboard/listings/:listingId/edit` is not routed — it is (App.tsx 1607/1632/1740).

## 2026-10-01 07:10 — Claude: Settings tab locked down
- **`GET`/`PATCH /api/notifications/settings/:userId` were unauthenticated** — live-confirmed 200 for both with no token, so anyone could read a user's notification prefs or silently switch off their new-lead alerts. New `ownsNotificationSettings(req)` gate: token required, and the `:userId` must be the caller's auth id or their `agents.id` profile id (or `default`). (A PATCH probe sent `smsNewLeadAlerts`, which is not a column — Chris's row was unchanged apart from `updated_at`.)
- `notificationSettingsService` now goes through `buildApiUrl` and sends `x-user-id` + Bearer on both calls; `SettingsPage`'s SMS probe uses the service instead of a bare relative `fetch`.
- `SettingsPage` account type now comes from `fetchOnboardingState()` instead of `localStorage.hla_account_type` (user-editable). localStorage stays as a first paint guess only, and is refreshed from the server answer.
- **Email and Calendar tabs are now visible to LOs** (`loVisible: true`). Verified the LO path works: Email reads the slug from `/api/agent/profile` (test LO slug `LoTest_One` → `lotest_one@mg.homelistingai.com`) and Calendar saves through `calendarSettingsService`.
- Profile and Security tabs audited clean: `/api/agent/profile` is `requireAuth`, password + MFA go straight to Supabase auth.

## 2026-09-30 19:30 — Claude: appointments 500 hardening (cause not fully pinned)
- Chris's console showed `/api/appointments` **500** alongside `/api/me/brand` 401 and `rpc/is_user_admin` 403 — i.e. his session token was being rejected across the board.
- Hardened `appointmentOwnerIds()`: `resolveRequesterUserId` is now inside try/catch, so a malformed/expired token returns a clean 401 ("sign in again") instead of falling through to the handler's catch as a 500. Also made the `fetchAiCardProfileForUser` lookup non-fatal in `GET /api/appointments`.
- **Still unproven:** could not reproduce the 500 — Supabase signup is locked down (`email_address_invalid`) so no throwaway token could be minted, and Render logs aren't reachable from here. Evidence is ambiguous: the page rendered the empty state rather than the new retry card, which suggests the GET actually succeeded and the 500 line was from the earlier (pre-#52) POST attempt. **If it recurs, the next step is Render logs for `Error getting appointments:`.**
- Verified the live bundle is current: `assets/LOAppointmentsPage-BbX27ROp.js` contains both the retry card and "Remind me 1 hour before".

## 2026-09-30 19:20 — Claude: appointment form follow-up
- Chris hit "Failed to schedule meeting" right after PR #51. Cause: his tab still had the PRE-#51 bundle, which sent only `x-user-id` and no Bearer — the newly owner-scoped `POST /api/appointments` correctly returned 401. Verified the live bundle IS current (`assets/LOAppointmentsPage-MIG81piL.js` contains `Authorization`, `status:"canceled"`, and no `method:"DELETE"`), and the Netlify production deploy (6abdbf18) published commit ee7b66ac at 02:02:34Z. A hard refresh clears it.
- A 401 from create / complete / cancel now says "Your session expired. Refresh the page and sign in again." instead of a generic failure, so a stale tab explains itself.
- **Added the Reminders checkboxes that silently never landed in PR #51**: that python edit raised `ValueError: substring not found` BEFORE its `write()`, so the whole script was discarded while a later script's changes went in. The `remindMe`/`remindThem` form fields and the POST wiring were already there (defaulting true), only the UI was missing. **Lesson: when a scripted multi-part edit fails, re-verify every part of it, not just the part that errored.**

## 2026-09-30 19:05 — Claude: Appointments tab locked down
- **All four `/api/appointments` routes were unauthenticated.** Live-confirmed: `GET` returned 200 for a fake `x-user-id`; `PUT` and `DELETE` took any appointment id with no token at all (anyone could edit or permanently delete any meeting on the platform). Now: new `appointmentOwnerIds(req)` + `ownedAppointment(req, id)` helpers; GET/PUT/DELETE require a token and scope to the owner (401 `agent_auth_required` / 403 `appointment_access_denied`).
- **POST keeps public booking working without the body choosing an owner.** Signed in → owner is the authed user. Not signed in → owner is derived from the listing (`properties.agent_id/user_id` via `listingId|listing_id|propertyId`), else 401. `ViewingModal` now passes `propertyId` so the public showing flow still resolves an owner.
- Callers updated to send Bearer: `LOAppointmentsPage` (new `apiHeaders`), `services/dashboard/appointments.ts` (create/status/reschedule), `services/schedulerService.ts` (`schedulerAuthHeaders`).
- Cancel is now a soft cancel (`PUT status:'canceled'`) instead of `DELETE` — the meeting stays in Past Meetings and pending reminders are called off.
- Schedule form: real reminder checkboxes (me 1h before, them 1 day before; the second needs an email or phone). They were hard-coded `false`, so no reminder ever fired for an LO meeting.
- Load failure shows a retry card instead of a silently empty week.

## 2026-09-30 18:50 — Claude: pre-approval form 500 (supabase thenable has no .catch) + email option
- **ROOT CAUSE of the live 500 on `POST /api/leads/pre-qual`:** a Supabase query builder is a thenable with `then` but NO `catch` (verified: supabase-js 2.81.1 → `typeof builder.catch === 'undefined'`). `await supabaseAdmin.from('notifications').insert({...}).catch(() => null)` therefore threw `TypeError: catch is not a function` AFTER the lead + pre-qual rows were written, so data saved but the buyer saw "Could not send". New `bestEffort(query)` helper wraps the builder in a real promise; applied to all 6 builder-`.catch()` sites in `server.cjs` (lines ~33672–33896: pre-qual LO alert, sold alert, 24h nudge x3, nudge_sent_at). **Never call `.catch()` directly on a Supabase builder.** (+3 tests in `__tests__/bestEffort.test.js`.)
- **LO alert never landed:** `notifications.user_id` FKs to `auth.users`, but the pre-qual handler passed `loAgentId` (agents.id profile id). Now resolves `agents.auth_user_id` first.
- `PreApprovalSheet`: name + **phone OR email** (either reaches the LO), with an "or" divider, inline hint, success line that matches the channel given, and disclaimer updated to text/phone/email.
- **Jev confirmed live in production**: lead afe2ee5b has `source_meta.intent_source = "jev"`, reason "Buying within three months." (ASAP / not pre-approved / 680–739 / 5–10% → Hot).
- 4 duplicate `pre_qual_submissions` rows from the failed retries point at one lead — harmless, the Leads page keys off the lead.

## 2026-09-30 18:40 — Claude: Leads tab + Jev lead rating
- **Jev now rates buyer leads.** New `backend/services/leadIntentRater.js` (+15 tests): a `choice` question (Hot/Warm/Cold, same criteria shape as `loPhoneCallService.INTENT_CRITERIA`) over the four pre-approval answers. Falls back to a plain rules table on unconfigured key, API error, unknown choice, or confidence < 0.4 — `source` says which path ran. `POST /api/leads/pre-qual` uses it instead of hard-coding `intent_level:'Hot'`; the reason lands in `source_meta.intent_reason` and the LO notification title/priority follow the rating. Chris confirmed `TYPESAFE_API_KEY` is set on Render.
- **Duplicate leads fixed (regression from PR #41).** `GET /api/lo/leads` listed `pre_qual_submissions` AND `leads`, so every pre-approval showed twice. Now only pre-quals with no `lead_id` (legacy) are listed on their own; linked ones enrich their `leads` row (type `pre_qual`, answers + intentReason on the card). Pre-qual status edits now stick, since every card is a real lead row.
- `LOLeadsPage`: server-side search (debounced), Load more (100/page via `hasMore`), load-failure retry card instead of a false "No leads yet", empty state CTA to Partners, Cold badge + Jev's reason line.
- Jev still NOT used by `LeadScoringService` (the separate points score). Unchanged, still unused on LO pages.

## 2026-09-30 18:30 — Claude: Partners polish (4 items)
- New `backend/services/wowReminderEmail.js` (+4 tests): one email builder (same look as the first WOW invite) used by the manual nudge (`sendWowLinkReminderEmail`) and the hourly follow-up cron in `schedulerService.js`. Old dark-header/"I wanted to follow up" copy is gone. Closes the "reminder + follow-up WOW emails use old copy" open item.
- Partners page: "Call this week" chip when no contact for 14 days (from `lastFollowUp`, else join date); partners sorted by leads; Recap now opens a preview (`POST /api/lo/partners/:id/recap` with `{preview:true}` returns subject/html and sends nothing) before sending.
- Recap "live listings" now counts only that partner's published, branded homes (was every home the LO has).

## 2026-09-30 18:00 — Claude: LO Partners tab fixes
- `GET /api/lo/partners` now returns real per-listing `totalLeads` (leads.lo_agent_id + listing_id) and `totalViews` (listing_events type 'view'). Were hard-coded 0.
- `DELETE /api/lo/partners/:id` now really turns off co-branding: finds the removed agent's homes in `properties` (agent_id/user_id = auth id) and sets `listing_lo_assignments.branding_enabled=false` with the LO PROFILE id. Old code queried legacy `listings` and used the auth id, so it never matched.
- Partners page: load failure shows a retry card instead of a fake empty list; side-panel header leaves room for the bell; "Schedule Appointment" opens LO Appointments with the agent pre-filled (`?name&email&phone&kind`, read by `LOAppointmentsPage`).
- Deleted Chris's unclaimed test invite (anaiyou@pm.me). Fred Potter (foodtrucknai@gmail.com) left as a partner on purpose.
- Not changed: appointment reminder/lead-detail routes still trust x-user-id (Leads/Appointments tab audit).

## 2026-09-30 17:40 — Claude: LO Today page cleanup
- `LOTodayPage.tsx`: stat cards now New leads today / Hot leads / Pre-approvals / Partners (with "N opened"); drafts collapse into one line under My Listings; empty Recent Leads has a "Send a WOW link" button; Quick Actions (dupe of sidebar) replaced by one primary "Send a WOW link" card; bottom padding so the chat bubble does not cover it.
- `GET /api/lo/dashboard/today` now returns `stats.hotLeads` (leads.intent_level='Hot'), `stats.partnersOpened` (agent_invites.opened_at not null) and `intentLevel` on recent leads (the red/amber dots were always amber before).
- Verified in DB: zero `pre_qual_submissions` so far, so the 0s on Chris's dashboard were correct.

## 2026-09-30 17:20 — Claude: Today tab audit + fixes
- SECURITY: `GET /api/dashboard/leads`, `/api/dashboard/appointments`, `/api/dashboard/roi-metrics` trusted `x-user-id`/`agentId` with no login (confirmed live: 200 for a fake id). Now `resolveRequesterUserId(req)` → 401 `agent_auth_required`. Frontend `fetchDashboardLeads`/`fetchDashboardAppointments` now send `authHeaders`.
- STILL OPEN (same hole, Leads/Appointments tabs): `/api/dashboard/leads/:leadId`, `/conversation`, `/status`, appointment reminder routes, `/api/dashboard/agent-actions` use `resolveDashboardOwnerId` (no auth). Fix when auditing tabs 3 and 4.
- New public `POST /api/public/listing/:listingId/view` records `listing_events` type `view` (1 per visitor/hour); `PublicListingPage` calls it once per session. ROI "Views" now fills in.
- Today page: toast text, cancelled/completed appointments hidden, share-kit lookup runs in parallel.

## 2026-09-30 16:50 — Claude: flyer viewer + price-alert card shows once
- Share Kit flyer no longer uses a blank pop-up tab (broke on phones). It opens an in-page viewer with "Print / Save as PDF". File: `LOShareKitPage.tsx`.
- Price-drop alert card (`ListingAlertOptIn.tsx`) remembers per listing in localStorage (`hlai_alert_seen_<id>`): after signup or the new close button it never shows again on that phone.

## Entry template

```
### YYYY-MM-DD HH:MM — <Claude | Codex> — <one-line summary>
- **Did:** what changed (files)
- **State:** committed? pushed? tests passing?
- **Open / next:** what's unfinished, what the other agent should know
- **Heads-up:** anything that could trip up the other agent
```

## Standing rules (both agents)

1. **Project rules live in `CLAUDE.md`** (Golden Rules, conventions, architecture gotchas, how to work with Chris). Codex: treat it as your project context too.
2. **Use Jev (TypeSafe) for judgment calls.** Any yes/no, pick-a-category, or rank/score decision about text (lead intent, lead quality, job-title filtering, chatbot question routing) → use Jev, not keyword matching or a free-form LLM prompt.
   - Key: `TYPESAFE_API_KEY` — **backend only**, never `VITE_`-prefixed.
   - **Fail open:** no key or an API error must never break the feature; fall back to existing behavior and log once.
   - **One client, not many.** Reuse the existing TypeSafe wrapper before creating another one (see open item below).
   - Pattern + rationale: `docs/adr/0003-typesafe-jev-integration.md`. Skill: `typesafe-ai` (installed in both Claude Code and Codex).
3. **Don't commit or revert the other agent's uncommitted work.** If `git status` shows changes you didn't make, check this log first.

---

### 2026-09-30 19:10 — Claude: 4-tap pre-approval form on the public listing page
- **Did:** new `src/components/public/PreApprovalSheet.tsx` (bottom sheet: timeline, already pre-approved, credit range, down payment, then first name + mobile). Property type comes from the listing, so it is not asked. Wired through `PublicListingPage` -> `PublicPropertyApp` (`onGetPreApproved`; the green Financing card gets a primary "Get pre-approved" button). Posts to `POST /api/leads/pre-qual`, which now also stores `currently_preapproved`. `GET /api/public/listing/:id/lo-chatbot` also returns `lo_nmls` for the disclaimer.
- **State:** tsc 0, lint 0, Jest 43, backend 107. Screenshot-checked at 390px.
- **Open:** `/api/leads/pre-qual` is public with no rate limit or bot check (Codex: consider a simple per-IP limit). SMS consent wording is in the sheet's footer; legal has not reviewed it. Income was deliberately left out.
- **Standing rule from Chris:** after a build passes all checks, Claude merges the PR automatically. No need to ask.

### 2026-09-30 18:30 — Claude: fixed everything in Codex's BUG_REPORT_2026-09-30
- **#1** `/api/public/lo-chat` now resolves the LO server-side (`backend/services/loAssignmentGuard.js`, 5 tests). Forged LO id returns 403 `lo_not_assigned_to_listing`.
- **#2/#3** Mark Sold, Archive and the ROI widget now send the Bearer token and use `properties` (not legacy `listings`). Migration `properties-sold-archive-migration.sql` (adds `sold_at`, `sold_price`, `archived_at`) is **already applied** in Supabase. ROI widget has a visible error state. Views come from `listing_events` type `view` (nothing writes those yet, so 0).
- **#4/#7** LO Today uses `resolveLoAgentId` and real count queries (no 200 cap).
- **#5** `POST /api/leads/pre-qual` now creates or updates a `leads` row (context `pre_approval`), links `pre_qual_submissions.lead_id`, and notifies both LO and listing agent. **The public 5-question form is still not in the UI** (buyers use the chat panel). Needs a product call before building.
- **#6/#8** tsc is clean (0 errors). `npm run lint` is clean (0 errors, 0 warnings). 8 `any` warnings were silenced with targeted disables, not retyped.
- **Checks:** tsc 0, lint 0, Jest 43, backend 107, build passes. Nothing was exercised against live Render.
- **Still Codex's:** delete the dead AI Sidekicks and Google Meet code.

### 2026-09-30 17:05 — Claude: bug sweep (for Codex to pick up)
- **Fixed (PR `fix/lo-assignment-auth`):** `POST/DELETE /api/listings/:id/lo-assignment` had NO auth, so anyone could attach or remove an LO on any listing. Now `requireAuth` + `requesterOwnsListing`. `ListingEditorPage` now sends the Bearer token (search, attach, detach) via `authHeaders`.
- **Clean:** backend 102/102, Jest 43/43, tsc = the 2 known errors + 1 known jest-namespace error.
- **Codex, please take these (not fixed):**
  1. `/api/public/lo-chat` trusts the browser's `lo_agent_id`. Validate it against `listing_lo_assignments`.
  2. ESLint has 423 problems, mostly unused vars and `any`. Start with the errors in `UnifiedTrainingStudio.tsx`, `useRealtimeClient.ts`, `leadsService.ts`.
  3. Dead code to delete (Chris approved removing it): AI Sidekicks pages and `/api/blueprint/ai-sidekicks*` calls, and Google Meet `/api/email/google/oauth-url`.
  4. `POST /api/lo/chatbot/extract-file` has no auth check before the upload. Confirm that is intended.
- **Heads-up:** frontend calls that only send `x-user-id` will 401 in production on any `requireAuth` route. Use `authHeaders()`.

### 2026-09-30 16:30 — Claude: CLAUDE.md refresh + frontend/backend match audit
- CLAUDE.md section 7 updated (PRs #34–#38, email/text/DMARC, still-open list).
- Audit found 14 frontend calls with no backend route. Built the 3 that hurt LOs: `PATCH /api/lo/leads/:leadId/status`, `POST /api/lo/leads/:leadId/sms` (blocks opted-out numbers via `sms_suppression`), `GET /api/lo/search?q=`.
- Pre-qual leads have no status column; status is written to the linked `leads` row.
- Left for Chris's call (likely legacy): `/api/blueprint/ai-sidekicks*`, `/api/email/google/oauth-url`.
- Backend tests 102/102.

### 2026-09-30 15:10 — Claude — WOW email = mix of A + B; WOW text = C (copy, sent by the LO)
- **Did:** `buildWowLinkEmail` now opens with B's "YOUR LISTING, UPGRADED / {street} can now answer buyers by itself." headline, keeps A's App Store layout, adds B's 3-step "How it works", and shows the LO's NMLS in the footer. New `buildWowLinkText` (concept C wording); `POST /api/lo/partners/invite` returns `smsText`, and the invite modal in `LOPartnersPage.tsx` has a "Copy the text to send" button. The LO sends the text from their own phone (human send, so Textbelt's link block and 10DLC don't apply).
- **State:** committed and pushed on `feat/wow-email-text-mix` (PR open); tsc (2 known errors), eslint and backend tests run; email rendered and checked visually.
- **Open:** automated text sending still needs Telnyx + 10DLC. Reminder/follow-up emails still use the old copy. Listing address only appears when the invite has a listing picked.

### 2026-09-30 14:20 — Claude — Partner-agent experience: iPhone-style WOW Link page + App Store-style invite email
- **Did:** `PartnerInvitePage.tsx` rebuilt as an iPhone-style app (phone frame on desktop): letterboxed photo, blue listing-agent card + Contact sheet, green loan-officer card + "Loan questions" chat with payment-schedule card + CSV download, glass tab bar. Agent = blue, LO = green. `GET /api/public/partner-invite/:token` now returns `agent`. `buildWowLinkEmail` rewritten email-safe with 3 hosted previews (`public/email/wow-preview-*.png`, 404 until deployed) and the agent card under "What's included".
- **State:** committed and pushed on `feat/wow-link-ios-app` (PR #35); tsc, eslint, jest and backend tests pass; page and email checked visually.
- **Open:** live payment schedule (demo only; LO uploads are free text), social buttons (demo only), real tour booking, reminder/follow-up email copy still old, text message blocked on Telnyx + 10DLC. PR #35.
- **Codex:** the old dark pitch hero on the WOW page is gone on purpose. Don't restore it without asking Chris.

### 2026-09-30 09:40 — Claude — LO Share Kit (co-branded link / QR / flyer / social)
- **Did:** the agent Share Kit is owner-only (`loadListingForVideoAccess`), so LOs on a partner's listing could not reach flyers. Added a lighter LO version: `GET /api/lo/listings/:listingId/share-kit` (LO must be assigned; listing must be published with a stored `public_slug`, else 409 NOT_PUBLISHED / NO_SHARE_LINK; returns listing basics, LO profile, branding toggles), page `LOShareKitPage.tsx` at `/dashboard/lo-listings/:listingId/share-kit`, and a "📤 Share Kit" button on each assigned listing card. Pieces: tracked link, QR (client-side `qrcode`), printable flyer (opens a print window), social caption. Each piece has its own branding switch (same `listing_branding_toggles` table).
- **State:** tsc + eslint clean (2 known tsc errors), jest 43/43, backend 102/102. Not visually checked while logged in; flyer print window untested in a real browser.
- **Open / next:** Open House piece and the `share_kit` toggle are not wired to anything here. Toggle OFF only removes the LO block from that piece; it does not yet change the agent-side listing page. UTM params (`utm_source=lo_share_kit`) are not yet tied to lead attribution.


### 2026-09-30 08:50 — Claude — Trimmed the listing editor's Listing Brain tab
- **Did:** `ListingEditorPage.tsx` brain tab: 5 boxes -> 2. "Teach this home's AI" (paste/upload/scan + plain source list; "Train AI" button only when something is untrained; no "0 sources / last trained" bar) and one closed "Financing" card holding Payment Reference, rate sheet CSV, notes, and a tucked-away optional "Custom fine print" (old Payment Disclosures box; same state + save handler, so data is unchanged). Removed fake sample text (TX/CA/FL, "Close in 21 days").
- **State:** tsc + eslint clean (except 2 known tsc errors), jest 43/43. Not visually checked in a logged-in browser.
- **Open / next:** unverified whether the buyer-facing payment estimates fall back to the Compliance Brain when a listing has no custom fine print — that's why the box was tucked away, not deleted.


### 2026-09-29 10:30 — Claude — Per-listing AI phone numbers (LO / LO Pro)
- **Did:** `lo_phone_lines.listing_id` (migration `lo-phone-listing-lines-migration.sql`, APPLIED in Supabase). Main line = `listing_id IS NULL` (still one per LO); a listing line = one per listing. `loPhoneLineService` methods take an optional `listingId`; new `listingLines()`. `loPhoneCallService` focuses the AI on that one home (`focusListing`). Routes: `GET /api/lo/listing-phone-lines`, `POST /api/lo/listings/:id/phone-line/{preview,buy}` — gated to tiers `lo` / `lo_pro` (+ office/white_label) and to listings the LO owns or is assigned to. UI: `ListingPhonePanel.tsx` + "📞 AI phone number" button on each assigned listing card. Calls share the LO's monthly minute pool (`minuteUsage` counts by `lo_agent_id`).
- **State:** backend tests 102/102, tsc clean apart from the 2 known pre-existing errors.
- **Open / next:** numbers are never auto-released (by design), so a sold listing's number keeps costing ~$1/mo until someone releases it — a "retire after 60 days" job is NOT built. The $20 / 200-minute pack is NOT built. Live buy on a listing not yet clicked through by Chris.
- **Heads-up:** run the migration before deploying any code that reads `listing_id` (already done in prod).


## Log

### 2026-09-30 — Codex — Reviewed AI phone placement on landing and listings
- **Did:** Audited the LO pitch page, homepage, public listing page, phone line API, and inbound call flow. No application code changed.
- **State:** AI phone is available in AI Brain but not exposed on public listings. The listing's Call button dials the listing agent. One number belongs to each LO; calls currently have no automatic listing attribution.
- **Open / next:** Put a clearly labeled AI financing call action on eligible public listings and explain it on the LO pitch page. Add listing attribution before claiming per-listing call tracking; separate numbers per listing remain planned for LO / LO Pro.

### 2026-09-30 — Codex — LO build guide bug audit
- **Did:** Read `LO_BUILD_GUIDE.md` and created `BUG_REPORT_2026-09-30.md` with 8 source-backed findings covering public LO chat binding, sold/archive and ROI production auth, LO Today identity/counting, pre-qual flow, and quality gates.
- **State:** Report only; no application code changed. Build passes; backend 106/106 and frontend 43/43 tests pass; typecheck and lint fail. Existing uncommitted lead-scoring work left untouched.
- **Open / next:** Fix the P1 findings, then add integration coverage with distinct auth/profile IDs and canonical `properties.id`. Live integrations were not exercised.

### 2026-09-29 09:10 — Claude — Phone costs: mini model + monthly AI-minute caps
- **Did:** Default realtime model is now `gpt-realtime-2.1-mini` (~1/3 cost; override with `OPENAI_REALTIME_MODEL`). Monthly AI minutes per plan (`LO_PHONE_MINUTES` in server.cjs): trial 30, lo_lite 100, lo 300, lo_pro/office/comp 1000, none 0. Counted from `lo_phone_calls` (AI-answered, this UTC month). Out of minutes → call rings the LO's cell (or polite message). AI Brain page shows a minutes bar under the number. `GET /api/lo/phone-line` returns `minutes {used, limit, left}`.
- **Decided with Chris:** LO Lite target cost ~$7/mo for phone (100 min on mini + number + carrier). Per-listing numbers only on LO / LO Pro (not built yet). Extra-minute pack ($20 / 200 min, like An AI You) planned, not built.
- **Open / next:** caller-side transcript bug (needs a test call + logs); per-listing numbers; minute pack via Stripe; Render web off FREE plan.

### 2026-09-28 19:20 — Claude — AI phone live-tested; state saved
- **Did:** PR #22/#23 comp plan (`payment_status='comp'` → LO Pro, constraint updated). Chris's test LO comped and given (754) 243-8686 (row updated directly; number re-pointed to HomeListingAI Phone app in Telnyx). First live call: AI answered correctly. PR #24: logs realtime `error` / `input_audio_transcription.failed` / session transcription config; no summary when caller said nothing.
- **State:** Everything merged to main and deployed. CLAUDE.md section 7 updated with the full phone picture.
- **Open / next:** Only the AI side got transcribed on call #1 (caller turns missing → no lead). Next: Chris makes a 30-second test call; read Render logs `[LO Call]` for the transcription error; fix (likely transcribe model — try `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`). Render web still on FREE plan (must upgrade before real LOs use phone). A real 206 reservation was left to expire (free).

### 2026-09-28 16:45 — Claude — AI answers the LO's phone (Telnyx → OpenAI Realtime SIP)
- **Did:** backend/services/loPhoneCallService.js: Telnyx webhook `POST /api/webhooks/telnyx/voice` answers, then transfers the call over SIP to `sip:$OPENAI_PROJECT_ID@sip.api.openai.com` with X-HLAI-Call + HMAC token (keyed by the line's tool_token). OpenAI webhook `POST /api/webhooks/openai/realtime` (realtime.call.incoming) checks the token and accepts with the LO Brain prompt + phone rules, the LO's voice, tools (save_caller_details, transfer_to_loan_officer, end_call). A side WebSocket collects the transcript and runs tools. After hangup, finalize() (once): Jev intent (hot/warm/cold), OpenAI summary, compliance flags (channel `phone`), lead upsert (source_type `phone`), hot-lead alert. Fallbacks: AI not ready/fails → rings LO cell; no cell → polite message + hang up. 15-min cap. New `webhookSignatures.js` (Telnyx Ed25519 + OpenAI standard-webhooks). Table `lo_phone_calls` (migration applied). UI: hand-off cell + Recent calls with transcripts under the number.
- **State:** Needs on Render: OPENAI_PROJECT_ID, OPENAI_WEBHOOK_SECRET, TELNYX_PUBLIC_KEY, TELNYX_LIVE_PROVISIONING=true (to buy a real number). OpenAI project webhook must point at /api/webhooks/openai/realtime. Telnyx app "HomeListingAI Phone" needs an Outbound Voice Profile (SIP transfer + cell hand-off are outbound legs). Render web is on the FREE plan: it sleeps, so a call to a sleeping server fails — needs Starter.
- **Open / next:** Live test call. Then outbound calls (consent-gated), texts after 10DLC, delete Vapi/Hume paths. Old web-voice path still defaults to removed gpt-4o-realtime-preview (server.cjs ~15151, useRealtimeClient.ts).

### 2026-09-28 13:30 — Claude — Get my AI phone number (PR #20, live, off by default)
- **Did:** Ported An AI You number provisioning into HLAI: backend/services/telnyxClient.js (numbers + mock), loPhoneLineService.js, GET /api/lo/phone-line, POST /preview, POST /buy. Table lo_phone_lines (migration applied). UI lives in AI Brain > Calls & Texts.
- **State:** Merged + live but hidden: needs TELNYX_PHONE_ENABLED=true or PHONE_BETA_LO_IDS. Mock (no cost) unless TELNYX_LIVE_PROVISIONING=true + TELNYX_API_KEY. TELNYX_CONNECTION_ID for a NEW HLAI Voice API app not created yet (do not reuse ai-you-phone).
- **Open / next:** Step 2: AI answering = Telnyx inbound -> OpenAI Realtime (SIP) with LO Brain + compliance, transfer to LO cell, lead + transcript saved. Only then turn live provisioning on.

### 2026-09-28 10:45 — Claude — AI Brain light redesign + Calls & Texts settings (PRs #18, #19, live)
- **Did:** AI Brain page now matches LO Today (light, one column, collapsible). New Calls & Texts section: OpenAI voice picker (Marin/Cedar) + "Hear it" (`POST /api/lo/brain/voice-preview`, gpt-4o-mini-tts), Off/Ask/Auto for calls + texts, call opening, voicemail, text templates. New columns on `lo_chatbot_configs` (`lo-brain-calls-texts-migration.sql`, applied).
- **State:** Merged + live. Settings save only — nothing dials or texts yet (badge says "Phone line not connected yet").
- **Open / next:** Wire outbound/inbound calls: Telnyx number → OpenAI Realtime (gpt-realtime-2.1, SIP) using the LO Brain prompt + compliance; texts through the An AI You comms engine port. Then delete Vapi/Hume paths. Chris decided: voice = OpenAI only, no third-party voice apps; Telnyx is only the phone line.
- **Heads-up:** Consent rules must gate every call/text (only opted-in, STOP, 8am–9pm local, says it's an AI).

### 2026-09-28 09:00 — Claude — Built LO Brain slice 1 (branch `feat/lo-brain`, PR #17)
- **Did:** New `backend/services/loBrainService.js` (stacked prompt: platform safety > LO Compliance Brain > identity > ONE rulebook picked by Jev > knowledge > listing + payment schedule; plain-code reply check: banned words block, disclosure appended, logged). `/api/public/lo-chat` now runs it. New `/api/lo/brain/summary|test|feedback`. New AI Brain page `LOBrainPage.tsx` (replaces `LOChatbotSetupPage`, same route `/dashboard/lo-chatbot`, sidebar "AI Brain"). `lo-brain-migration.sql` (idempotent).
- **State:** Pushed to GitHub branch `feat/lo-brain`, PR https://github.com/AIyou-chris/home-listing-ai-app/pull/17. MERGED to main 2026-09-28 and LIVE (Render + Netlify verified). Migration RUN in Supabase (HOMELISTINGAI project) by Claude. Tests: 16 new, backend 78/78, jest 43/43, build OK.
- **Open / next:** Chris runs the migration, then merge. Next slices: Listing Brain page, Admin Brain, AI Team control levels, texting onto the comms engine.
- **Heads-up:** Jev routing uses `typesafeClient.js` `choice` (the one client — no SDK). Codex: your uncommitted lead-scoring work should reuse this same client. `/api/public/lo-chat` still trusts the `lo_agent_id` the browser sends (pre-existing) — worth checking it against `listing_lo_assignments`.

### 2026-09-28 07:50 — Claude — Chris's decisions on the plan
- **Chris decided:** (1) **Take An AI You's Marketing Studio and Prospect Finder the SAME** (overrides Codex's 'skip' in section 6B). Chris uses the finder to find LOs and others for HLAI. (2) **HLAI's AI Brain page must work the same as An AI You's Business Brain screen** (knowledge library, voice/personality, 3 rulebooks, test chat, all sources).
- **State:** Layout mockup made for Chris to review (AI Brain page, AI Team + control levels Off / Ask me first / Do it-tell me, how-it-works diagram). No code yet. Chris wants to dig into the layout before any build.
- **Open / next:** Wait for Chris's layout feedback before building. Codex's safety points still stand (Jev decides but doesn't send; small steps; delete old paths).

### 2026-09-27 20:14 — Codex — Reviewed An AI You reuse plan and overhaul risks
- **Did:** Verified Claude's phone/comms/one-brain claims and reviewed marketing, image/video, prospect/social and QR code in `/tmp/ai-landing-template-review`. Appended `docs/overhaul/ANAIYOU_REUSE.md` section 6 with take/skip decisions, revised build order, API choices, Jev-client decision and HLAI blockers.
- **State:** Review docs only; not committed. No application/backend code changed. Focused TypeSafe/scoring tests pass (14/14).
- **Open / next:** Keep `backend/services/typesafeClient.js` as the single Jev boundary. The uncommitted lead-scoring prototype should not merge until its direct SDK client is removed/consolidated and integration/idempotency/compliance tests are added. Start 10DLC paperwork in parallel; implement one-brain + comms as vertical slices, not a big-bang replacement.
- **Heads-up:** Treat the uncommitted TypeSafe lead-scoring files as Codex work and leave them untouched. HLAI already has stronger QR tracking, Buffer publishing and a specialized Lead Finder; do not port those An AI You subsystems wholesale. OpenAI's Sora Videos API shut down 2026-09-24; use deterministic FFmpeg first and evaluate Gemini video only later.

### 2026-09-27 20:00 — Claude — Reviewed An AI You (anaiyou.com) for the HLAI overhaul
- **Did:** Read the `AIyou-chris/ai-landing-template` backend. Wrote `docs/overhaul/ANAIYOU_REUSE.md` (what to port: Telnyx AI phone employee, comms/SMS engine, one-brain-many-doors + Jev as router).
- **State:** Doc committed locally on `main`. No code changed.
- **Open / next:** **Codex:** review section 5 of that doc (marketing studio, image/video, prospect finder, new APIs) and add your findings there. Chris wants the overhaul to be "one brain, different AI agents, more AI control".
- **Heads-up:** Both apps still send SMS via Textbelt. The Telnyx SMS adapter is step 1 of the overhaul.

### 2026-09-27 19:30 — Claude — Set up this handoff system + Jev audit
- **Did:** Created `AI_HANDOFF.md`. Added a "read this first" pointer to the top of `AGENTS.md` (Codex) and `CLAUDE.md` (Claude).
- **State:** Committed locally on `main`. Not pushed.
- **Open / next — Jev status:**
  - ✅ Live in code (commit `8db08ebe`): `backend/services/typesafeClient.js` + Lead Finder job-title filter (`loLeadScraperService.classifyRoleMatches`).
  - 🚧 **Uncommitted, in progress (likely Codex):** Jev in lead scoring — `LeadScoringService.js`, new `TypeSafeLeadQualificationService.js`, tests, and `@typesafe-ai/sdk` added to `backend/package.json`. Left untouched.
  - ⚠️ **Two TypeSafe clients now exist.** `typesafeClient.js` uses raw `fetch` (the ADR says the SDK was ESM-only). But `@typesafe-ai/sdk` 0.6.0 ships a CommonJS build (`dist/index.cjs`), so the SDK works here. Pick ONE and update ADR 0003 before merging the lead-scoring work.
  - 🔑 `TYPESAFE_API_KEY` is **set on Render** (web service) and tested by Chris 2026-09-27. Not in local `.env` — local dev falls back (by design).
- **Heads-up:** `SESSION_HANDOFF.md` is stale (last updated 2026-06-06). Use this file instead.
