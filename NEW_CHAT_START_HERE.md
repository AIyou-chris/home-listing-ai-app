# New chat: start here (written 2026-10-11)

**Read these in order, then reply in 2 lines saying what you understood:**
1. `HOW_TO_TALK_TO_CHRIS.md`
2. `CLAUDE.md` (short; section 7 is the current state)
3. Top 5 entries of `AI_HANDOFF.md`

## Who and how
Chris Potter: founder, not a coder, 15 years in mortgages. Plain 10-year-old language. Verdict first, 1 to 3 short lines. Anything he must do = ONE bold step with the exact link or button. Never say "100%".

## Standing rules
- **Wait for "push"** before pushing. Commit locally, show what changed, then ask.
- No live database changes, texts, emails, paid calls, pricing changes or automations without his OK in chat.
- Blog auto-publishing stays OFF. Reels stay OFF.
- Test with throwaway accounts; delete test data only with his OK (use the real `/api/account/delete`).
- Never put `.catch()` on a Supabase query (use `bestEffort`). Verify a column exists before selecting it.
- Any price change must also update: `public/llms.txt`, `public/ai.txt`, `scripts/generate-seo-pages.mjs`, `index.html` JSON-LD, `src/services/helpSalesChatBot.ts`.
- Update `AI_HANDOFF.md` (new entry at the top) at the end of each piece of work.

## Where things stand
**Live and tested:** one plan ($79, launch price $49 for the first 25 via Stripe coupon `FOUNDING49`, Render env `FOUNDING_COUPON_ID`); 7-day no-card trial (trial caps: 10 AI minutes, 10 texts; one trial per phone); real checkout test passed (trial, Stripe, account linked, cancel, delete); WOW Link, claim, buyer chat, consent, lead routing, alerts; STOP texts; delete my account; AI phone line (754) 243-8686 (needs Telnyx balance; auto-recharge is ON; low-balance email at $20); custom phone greeting box (AI Brain, How it talks, Advanced); spend stops on everything; simplified LO menu (6 items), Today, Partners, landing page; Help page; privacy policy and terms published 2026-10-11 (Privacy approved by lawyer per Chris).

**Accounts:** LO test (comped) anaiyou@pm.me; admin cdipotter@me.com; agent test foodtrucknai@gmail.com. For new test signups use `anaiyou+something@pm.me` and leave the Phone box empty.

## Open items (in order)
1. **Check privacy live:** homelistingai.com/privacy says October 11, 2026; check Terms and the Privacy/Terms links next to the consent checkboxes on a real listing page.
2. **Webhook for n8n/Make/Zapier** ("send every new lead to this web address"): Chris decided **LATER** (after launch, do not build now). Plan: one Settings box, consented leads only, signed with a secret, retries + small log, never texts anyone.
3. **Lawyer follow-ups:** Terms wording was written by us from the lawyer's list (not reviewed word for word); governing law says California but the company is in Washington; cookie banner question; data processing addendum with loan officers.
4. **Render:** confirm the web service is on the paid Starter plan and the September invoice is paid.
5. **First real customer:** watch the day-7 charge (not yet proven). Daily Sentry health check runs about 8:11 AM and reports; resolve anything new.
6. **After launch:** buyer follow-up automation (waiting on lawyer); reels (need ffmpeg in the Render build + more memory); price-drop alert test; delete unused files `src/components/admin/AdminSocialPostPanel.tsx` and `src/services/supabaseKb.ts` (only with Chris's OK); trim `CLAUDE.md` further if needed.

## How to verify before saying "done"
`npm run test:backend` (395 pass), `npm test` (156 pass), `npx tsc --noEmit -p .`, `npm run lint`, `npm run build`. For anything live, probe the real site or database. Say what was NOT tested.
