# HomeListingAI — Page-by-Page Audit Log

> Running audit of every page in the app. Each page gets a severity table, a fix log, and a status stamp.
> Format: audit → fix 🔴 first → fix 🟡 → mark done.

---

## Severity Key

| Symbol | Meaning |
|---|---|
| 🔴 Broken | Actively wrong — data missing, broken link, bad logic. Fix immediately. |
| 🟡 Watch | Suboptimal UX, visual bug, or incomplete feature. Fix after reds. |
| 🟢 Minor | Polish or cleanup. Fix when convenient. |
| ✅ Fixed | Resolved and verified. |

---

## Audit Report Format

### [Page Name] — `/route`
**Account type:** Realtor / LO / Office / All  
**Audited:** YYYY-MM-DD

#### Issues Found

| # | Issue | Severity | Blocks Users? |
|---|---|---|---|
| 1 | Short description | 🔴 / 🟡 / 🟢 | Yes / No |

#### Fixes Applied

| # | What Was Fixed | Status |
|---|---|---|
| 1 | Short description of change | ✅ Fixed |

---

---

## Pages Audited

---

### Landing Page — `/`
**Account type:** Public  
**Audited:** 2026-05-22

#### Issues Found

| # | Issue | Severity | Blocks Users? |
|---|---|---|---|
| 1 | SEO schema price hardcoded `$34` — actual plans are Free / $39 / $79 | 🔴 Broken | No (SEO impact) |
| 2 | Footer "About Us" → `/#about-us` — section not rendered, scroll target doesn't exist | 🔴 Broken | Yes |
| 3 | Footer "Features" → `/#what-you-get` — section not rendered, link goes nowhere | 🔴 Broken | Yes |
| 4 | Nav "Demo" link → `/#demo` — no anchor ID on page, direct URL fails | 🟡 Watch | Partial |
| 5 | Nav "Contact" link → `/#contact` — no anchor ID on page, direct URL fails | 🟡 Watch | Partial |
| 6 | 500+ lines of dead code (`_PricingSection`, `_AboutUsSection`, etc.) bloating a 1351-line file | 🟢 Minor | No |

#### Fixes Applied

| # | What Was Fixed | Status |
|---|---|---|
| 1 | Schema price `"34.00"` → `"0"` (free entry tier) | ✅ Fixed |
| 2 | Footer "About Us" dead link → replaced with Blog (real route) | ✅ Fixed |
| 3 | Footer "Features" → now points to `/#how-it-works` (real rendered section) | ✅ Fixed |
| 4 | Added `<div id="demo">` anchor before ConversionWedge section | ✅ Fixed |
| 5 | Added `<div id="contact">` anchor before TeamsCTASection | ✅ Fixed |

**Status:** 🔴 All reds fixed · 🟡 All yellows fixed · 🟢 Dead code cleanup pending

---

### LO Today Dashboard — `/dashboard/today` (LO accounts)
**Account type:** LO  
**Audited:** 2026-05-22

#### Issues Found

| # | Issue | Severity | Blocks Users? |
|---|---|---|---|
| 1 | "PARTNERS REACHED" always shows 0 — backend `/api/lo/dashboard/today` never queries `agent_invites` | 🔴 Broken | Yes |
| 2 | Chatbot/WOW Link leads (`pre_qual_submissions`) not counted in Today stats — only `leads` table queried, two sources never merged | 🔴 Broken | Yes |
| 3 | PRE-APPROVALS card highlighted green when count is 0 — looks like a bug | 🟡 Watch | No |
| 4 | "Trial Mode" badge shows on LO accounts — LO is a partner type, not a trial user | 🟡 Watch | No |

#### Fixes Applied

| # | What Was Fixed | Status |
|---|---|---|
| 1 | Backend now queries `agent_invites` count and returns `partnersReached` in stats | ✅ Fixed |
| 2 | Backend now fetches both `leads` + `pre_qual_submissions`, merges by recency, dedupes by email | ✅ Fixed |
| 3 | PRE-APPROVALS card: green highlight conditional on `preApprovalLeads > 0` | ✅ Fixed |
| 4 | Trial Mode badge hidden for LO and Office account types in `Sidebar.tsx` | ✅ Fixed |
| 5 | Greeting now shows LO's first name from agents profile ("Good morning, Chris 👋") | ✅ Fixed |
| 6 | Upcoming appointments (today → +7 days) fetched and displayed in right column | ✅ Fixed |
| 7 | "Send WOW Link" button added to page header — always visible, primary action | ✅ Fixed |
| 8 | Quick Actions: Billing replaced with Partners (correct priority for LO workflow) | ✅ Fixed |

**Status:** ✅ All issues resolved — page complete

---

## Pages Queue (not yet audited)

| Page | Route | Account Type | Priority |
|---|---|---|---|
| LO Partners | `/dashboard/lo-partners` | LO | Next |
| LO Listings | `/dashboard/lo-listings` | LO | Next |
| LO AI Bot Setup | `/dashboard/lo-chatbot` | LO | Next |
| LO Leads | `/dashboard/lo-leads` | LO | Next |
| Appointments | `/dashboard/appointments` | All | — |
| Settings | `/dashboard/settings` | All | — |
| Realtor Today | `/dashboard/today` | Realtor | — |
| Realtor Command Center | `/dashboard/command-center` | Realtor | — |
| Realtor Listings | `/dashboard/listings` | Realtor | — |
| Realtor Leads | `/dashboard/leads` | Realtor | — |
| Office Dashboard | `/dashboard/office` | Office | — |
| Public Listing Page | `/listing/:id` | Public | — |
| WOW Link / Partner Invite | `/partner-invite/:token` | Public | — |
| Listing Dashboard | `/listing-dashboard/:token` | Public | — |
