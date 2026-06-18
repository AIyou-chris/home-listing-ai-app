# LO Acquisition Link — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design locked, ready for implementation plan)

---

## Goal

A single, shareable marketing page — the "LO Acquisition Link" — that HomeListingAI
sends to prospective Loan Officers to convert them into paying trial customers. It is
the inverse of the WOW Link: where the WOW Link is sent *by an LO to an agent*, this
link is sent *by HomeListingAI to an LO*.

The entire pitch is built around the three things every LO wants:

1. **🔥 Leads** — a pipeline that fills itself
2. **🤝 Partners** — agents who keep coming back
3. **⏰ Time** — the AI handles the busywork

---

## Core Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Experience type | **Dedicated LO pitch page** (Option A) | A purpose-built marketing page converts better than a re-skinned WOW Link or a fake dashboard. Fastest to build, easiest to maintain. |
| Personalization | **Generic** — one link for everyone | No per-LO token, no DB table. Works for mass outreach (email blasts, LinkedIn, text). Keeps it simple. |
| Route | **Static public route** (e.g. `/for-loan-officers`) | No token to generate or look up. Admin just shares the URL. |
| CTA target | **`/lo-signup`** (existing route) | A dedicated LO signup page already exists. CTA buttons route straight there — frictionless, no new signup flow needed. |
| Layout | **Phone-screen / mobile-first** | Most LOs open marketing links on their phone. Matches the WOW Link's app-like feel. |

---

## Page Structure (top → bottom)

The page is a single mobile-first scroll, constrained to a phone-width column
(`max-w-[390px]` / `max-w-[480px]`), matching `PartnerInvitePage.tsx` conventions.

1. **Hero**
   - Badge: "For Loan Officers"
   - Headline: *"Your pipeline doesn't have to slow down when you're not working."*
   - Subhead: how the AI keeps working for them 24/7 and routes warm leads back.
   - Primary CTA button: **"Start My Free 7-Day Trial →"** → `/lo-signup`
   - Trust line: "No credit card · Cancel anytime · Live in under 5 minutes"

2. **Stats bar** — three quick proof points: `24/7` works · `3x` more leads · `5 min` to launch.

3. **How it works** — 3-step vertical flow with icons:
   - 🤝 You send your agent a magic link (the WOW Link)
   - 🏡 Their listing answers buyers 24/7
   - 🔥 Warm leads come straight to you, pre-qualified

4. **Why LOs love it** — the three value props, each an icon + title + description:
   - 🔥 **A pipeline that fills itself** (leads)
   - 🤝 **Agents who actually call you back** (partners)
   - ⏰ **Time to focus on what closes** (time)

5. **"This is what your agents get"** — a small, static visual preview of a WOW Link
   listing card (price, address, "Talk to the Home" / "Ask About Financing" buttons).
   Reinforces that the product is real. Static only — not interactive.

6. **Social proof** — one testimonial card from a representative LO. Copy is placeholder
   and should be swapped for a real quote when available; mark it clearly so the user
   knows to replace it.

7. **Bottom CTA** — *"Start filling your pipeline today."* + **"Claim My Free Trial →"** → `/lo-signup`

8. **Footer** — "Powered by HomeListingAI"

---

## Architecture

- **New page component:** `src/pages/ForLoanOfficersPage.tsx` (mirrors the structure and
  styling conventions of `src/pages/PartnerInvitePage.tsx` — Tailwind, phone-width shell,
  material-symbols icons, brand blue `#2563eb` / slate palette).
- **Route:** add `/for-loan-officers` to `src/App.tsx` as a public, lazy-loaded route,
  alongside the other public routes. Add the path to any public-route allowlists in
  `App.tsx` (the same arrays that already list `/lo-signup`, `/signup`, etc.) so the page
  renders without auth and without the dashboard chrome.
- **No backend.** No new API endpoints, no DB tables, no token generation. The page is
  pure static content. All data shown (stats, testimonial, listing preview) is hardcoded
  in the component.
- **CTAs** use `react-router` `navigate('/lo-signup')` (or `<Link to="/lo-signup">`).

### What this deliberately does NOT include (YAGNI)

- No per-LO personalization or tokens.
- No email-capture form (CTA goes straight to `/lo-signup`).
- No engagement tracking / open events (unlike the WOW Link). If analytics are wanted
  later, that's a separate follow-up.
- No admin UI to "generate" the link — it's a fixed URL the user shares manually.

---

## Components / Units

Single self-contained page component, internally organized into small presentational
sections (Hero, StatsBar, HowItWorks, ValueProps, ListingPreview, Testimonial, BottomCTA)
defined in the same file — matching how `PartnerInvitePage.tsx` co-locates its sub-components.
No shared state; each section is pure props/static markup.

---

## Error Handling

Minimal — the page is static. The only interactive elements are CTA buttons that
navigate to `/lo-signup`. No data fetching, so no loading or error states.

---

## Testing

This is a static marketing page with no logic. Verification is visual:

- Render `/for-loan-officers` in the dev preview; confirm it loads without auth and
  without the dashboard sidebar/chrome.
- Confirm both CTA buttons navigate to `/lo-signup`.
- Confirm mobile-width layout (phone column) and that it's readable on a narrow viewport.

No unit tests are warranted for static presentational markup.

---

## Success Criteria

- A prospective LO can open the link on their phone and immediately understand: this
  gets me leads, gets me partners, and gives me time.
- One clear primary action: start a free trial → `/lo-signup`.
- The user (admin) can share one fixed URL with anyone, no setup per recipient.
