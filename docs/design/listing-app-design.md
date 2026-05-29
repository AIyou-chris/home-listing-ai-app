# HomeListingAI — Canonical App Design

> **This is the locked design standard for HomeListingAI.**
> Every listing-facing page, WOW link, and agent-facing screen must match this visual language.
> Do not deviate without explicit owner approval.

---

## The Reference Implementation

**File:** `src/pages/PartnerInvitePage.tsx`
**Route:** `/partner-invite/:token` (live) · `/partner-invite/demo` (preview)

This page IS the app. It is the gold standard for how HomeListingAI looks and feels. All future listing pages, share kits, and agent-facing screens inherit from this design.

---

## Design Philosophy

**One guiding principle:** It must look like an app you downloaded from the Apple App Store — not a website, not a landing page, not a marketing funnel.

- Native iOS feel throughout
- One unified surface — no competing gradient cards
- Sections flow like a real app, not a webpage
- Phone frame visible on desktop so the agent immediately understands what they're looking at
- Every interaction feels instant and intentional

---

## Phone Shell (Desktop)

On screens ≥ 640px, the page renders inside an iPhone 15 Pro–style phone frame.

```
Outer page:       dark radial gradient background  (#0a1628 → #000)
Phone shell:      bg-[#f2f2f7]  (iOS system gray)
                  w-[393px] h-[852px]
                  border-radius: 55px
                  box-shadow: 0 0 0 10px #1c1c1e,   ← black bezel
                              0 0 0 12px #48484a,   ← titanium edge
                              0 80px 160px rgba(0,0,0,0.85)
Dynamic island:   54px absolute overlay, top-0
                  128px × 36px black pill, centered
Status bar:       9:41 time left · signal/wifi/battery right
```

On mobile (< 640px): shell fills the full screen, no bezel visible. Seamless.

---

## App Background

```
Page background:  #f2f2f7   (iOS system gray — applies to all sections)
Content sections: bg-white   (white cards sit on the gray)
Section gaps:     h-2.5 bg-[#f2f2f7]   (thin gray separator between sections)
```

**Rule:** No alternating colored gradient backgrounds between sections. Every section is white on gray. Color is used only for interactive elements (buttons, CTAs, brand accents).

---

## Section Structure & Order

```
1.  Dynamic island spacer (desktop only — hidden sm:block h-[54px])
2.  Sticky LO header bar (white, frosted glass blur)
3.  Hero listing photo (264px tall, full-bleed)
4.  Property details card (white: price, address, beds/baths/sqft, primary CTA)
5.  ── separator ──
6.  About this home (white: listing description)
7.  ── separator ──
8.  Listing Agent card (white: headshot, name, company, DRE, call/email icons)
9.  ── separator ──
10. Monthly Payment / Mortgage Calculator (white: collapsible, section header above)
11. ── separator ──
12. Your Financing Expert (white: LO card, quick-question buttons, pre-approval CTA)
13. ── separator ──
14. Partner CTA (bg-[#eff6ff] light blue: agent card, pitch copy, "I'm In" button)
15. ── separator ──
16. Footer (white: LO headshot, name, company, "HomeListingAI" label)
17. Bottom tab bar (flex-none inside shell: Home / Finance / Tour / Contact)
```

---

## Section Header Style (iOS-style)

All section labels use this exact pattern:

```tsx
<p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
  Section Title
</p>
```

Never use `<h2>` or large bold headers for section labels. Small caps, slate-400, tracking-wider.

---

## Typography Scale

| Role | Size | Weight | Color |
|---|---|---|---|
| Price | 28px | black (900) | slate-900 |
| Section heading | 17px | black (900) | slate-900 |
| Person name | base (14px) | bold (700) | slate-900 |
| Body copy | 14px | normal (400) | slate-700 |
| Section label | 11px | bold (700) | slate-400 |
| Meta / caption | 11–12px | normal | slate-400–500 |
| Address / subtitle | 13px | normal | slate-500 |

Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

---

## Buttons

### Primary action (brand-colored)
```tsx
className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-[14px]
           text-[15px] font-extrabold text-white shadow-[0_4px_20px_rgba(0,0,0,0.18)]
           transition-transform active:scale-[0.99]"
style={{ background: brandColor }}
```

### Pre-approval / financing CTA (emerald green)
```tsx
style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
```

### "I'm In — Let's Work Together" (orange — LOCKED)
```tsx
style={{ background: 'linear-gradient(135deg,#f86f1b,#fb8c3a)' }}
```
> Orange is the ONLY color for the primary partner CTA. Do not change this to green or blue.

### Secondary / ghost
```tsx
className="w-full rounded-2xl border border-slate-200 py-3.5
           text-[14px] font-bold text-slate-600 transition-all active:bg-slate-50"
```

### Icon action buttons (call / email)
```tsx
className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
// material-symbols-outlined text-[18px] text-slate-600
```

---

## Person Cards (LO / Agent)

Both the Listing Agent card and the Financing Expert card use identical structure:

```tsx
<div className="flex items-center gap-3">
  <img className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
  <div className="min-w-0 flex-1">
    <p className="font-bold text-slate-900">{name}</p>
    <p className="text-[12px] text-slate-400">{company} · {license}</p>
  </div>
  <div className="flex gap-2">
    {/* call + email icon buttons */}
  </div>
</div>
```

---

## Partner CTA Section

The one section that adapts between demo and live. Everything else is static.

```
Background:  bg-[#eff6ff]   (light blue — makes the CTA pop)
Agent card:  headshot + name + "Listing Agent · {market}"
Heading:     "This could be your listing page"
Body:        Short pitch copy — keep under 2 lines
Primary CTA: "I'm In — Let's Work Together" — orange #f86f1b gradient — ALWAYS
Secondary:   "See How It Works →" — ghost button
```

**Live behavior:**
- Unclaimed invite → shows agent's real name + market + orange I'm In button
- Already a partner → swap for "You're already connected 🤝" (no CTA)
- Demo (`/partner-invite/demo`) → shows "Sarah Johnson" placeholder

---

## Slide-Up Sheets (Chat / Connect / How It Works)

All overlays are `position: absolute inset-0` inside the phone shell — they stay inside the phone frame on desktop.

```
Backdrop:        bg-black/60 + backdropFilter blur(4px)
Sheet:           bg-white, borderRadius: '22px 22px 0 0'
                 animation: slideUp 0.28s cubic-bezier(0.32,0.72,0,1)
Drag handle:     h-1 w-10 rounded-full bg-slate-200, centered
Sheet header:    flex items-center justify-between, border-b border-slate-100
```

---

## Bottom Tab Bar

```
Tabs:     Home · Finance · Tour · Contact
Active:   brandColor, FILL 1 (filled icon)
Inactive: #94a3b8 (slate-400), FILL 0 (outline icon)
Bar:      bg-white/95 backdrop-blur-xl, border-t border-slate-200/80
Position: flex-none inside phone shell (NOT fixed to viewport)
```

---

## Color Reference

| Token | Value | Usage |
|---|---|---|
| iOS system gray | `#f2f2f7` | App background |
| Light blue CTA bg | `#eff6ff` | Partner CTA section |
| Partner CTA orange | `#f86f1b` | "I'm In" button — LOCKED |
| Finance green | `#059669 → #10b981` | Pre-approval CTA |
| Phone bezel | `#1c1c1e` | Desktop phone border |
| Titanium edge | `#48484a` | Desktop outer ring |
| Brand color | `brandColor` (LO's) | Headers, buttons, accents |

---

## What This Is NOT

- ❌ Not a marketing landing page
- ❌ Not a website with a navbar and footer hero
- ❌ No alternating dark/light section backgrounds
- ❌ No large gradient hero banners between content
- ❌ No floating cards with individual shadows on a gray background
- ❌ No `position: fixed` elements (except on true mobile — bottom bar is flex-none in shell)

---

## Files

| File | Purpose |
|---|---|
| `src/pages/PartnerInvitePage.tsx` | The canonical reference implementation |
| `docs/design/listing-app-design.md` | This document |
