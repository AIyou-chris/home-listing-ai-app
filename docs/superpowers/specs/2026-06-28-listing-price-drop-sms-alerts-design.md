# Listing Price-Drop SMS Alerts — Design Spec

**Date:** 2026-06-28
**Status:** Approved (brainstorm) — pending implementation plan
**Golden rules served:** 🔥 Get warm leads (#1), 🤝 Build agent partnerships (#2), ⚡ Keep it simple (#3)

---

## 1. Problem

When someone scans the QR code at a home, today they become an **anonymous ghost**: we store an anonymous `visitor_id` + attribution in localStorage ([`PublicListingPage.tsx:251`](../../../src/pages/PublicListingPage.tsx)), but no name, email, or phone unless they engage the chatbot. There is **no way to re-engage a scanner** — no saved-listing, no watchlist, no price-change alert. Agents have repeatedly asked: "how do I follow up with people who scanned my sign?"

This spec is **Layer 1** of a two-layer plan. Layer 1 is the reliable backbone: capture a phone number at scan time and let the agent text those people when something changes (price drop, open house, or a custom blast). Layer 2 (a per-listing PWA "save like an app" + web push) is **out of scope** for this spec — it is deferred because iOS only allows web push for manually-installed PWAs and re-enabling a service worker conflicts with the deliberate SW-removal in [`main.tsx`](../../../src/main.tsx) that fixed the stale-build bug.

## 2. Decisions (locked in brainstorm)

| Decision | Choice | Why |
|---|---|---|
| Contact channel | **Phone only (SMS)** | Highest open rate, one field, lowest friction. |
| Triggers | **Price change, Open house scheduled, Manual agent blast** | (Status-change deferred — easy to add later.) |
| Send model | **One-tap agent approval** | Agent sees watcher count, controls cost, avoids accidental blasts. |
| SMS provider | **Textbelt** (existing) | Constraint: must stay on Textbelt for now. |
| Compliance | **Consent at opt-in + STOP via Textbelt reply webhook** | Legally honor opt-outs without switching providers. |

## 3. User flows

### 3.1 Buyer subscribes (public listing)
1. Buyer scans QR → lands on the public listing.
2. A "🔔 Get price-drop alerts" card shows a single phone field + "Text me alerts" button.
3. Required consent line under the button: *"By tapping, you agree to get texts about this home. Msg & data rates may apply. Reply STOP to opt out."*
4. Submit → `POST /api/public/listing-alerts/subscribe` with `{ listing_id, phone, visitor_id, attribution }`.
5. Backend upserts a subscriber row, records consent text + timestamp. The subscriber is now visible to the agent as a **warm lead** (reuse existing visitor/attribution linkage).

### 3.2 Agent sends an alert
- **Price change:** agent edits a listing's price in the dashboard → backend detects the change → creates a *pending alert* → agent sees a card: *"12 people are watching 123 Main St. Send the price-drop alert?"* with message preview → **Send** / **Dismiss**.
- **Open house:** same pending-alert flow when an open house is scheduled. *(Dependency: confirm where open-house scheduling lives during planning; if no scheduling feature exists yet, this trigger ships disabled.)*
- **Manual blast:** agent composes a custom message from the listing detail, sees the watcher count, confirms → send.
- On **Send**, backend loops active (non-suppressed) subscribers and texts them via the existing SMS service in a **background loop** (same pattern as the LO bulk-send, to avoid client timeouts).

### 3.3 Buyer opts out
- Buyer replies **STOP / UNSUBSCRIBE / CANCEL** to any alert.
- Textbelt POSTs the reply to `replyWebhookUrl` → `POST /api/sms/reply`.
- Backend adds the phone to `sms_suppression`; the phone is never texted again on any listing.

## 4. Data model (new tables)

### `listing_alert_subscribers`
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| listing_id | uuid | → `properties.id` (rich-data table, NOT legacy `listings`) |
| agent_id | uuid | resolved owner of the listing (canonical profile id) |
| phone | text | E.164 normalized |
| visitor_id | text | from existing public-listing visitor tracking |
| status | text | `active` \| `unsubscribed` |
| consent_text | text | exact consent string shown at opt-in |
| consent_at | timestamptz | |
| created_at | timestamptz | default now() |
| last_alerted_at | timestamptz | null |

Unique constraint on `(listing_id, phone)`.

### `sms_suppression`
| Column | Type | Notes |
|---|---|---|
| phone | text pk | global opt-out — checked before every send |
| reason | text | `stop_reply` (extensible) |
| created_at | timestamptz | |

### Pending alerts
A lightweight queue (table `listing_alert_pending` or equivalent): `id, listing_id, agent_id, type (price/open_house/manual), payload (jsonb: old/new price, message body, etc.), recipient_count, status (pending/sent/dismissed), created_at, sent_at`. Surfaces the approval card and records the outcome.

## 5. Endpoints (new)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/public/listing-alerts/subscribe` | public | Buyer opts in |
| GET | `/api/listing-alerts/pending` | agent (Bearer) | Approval cards for agent's listings |
| POST | `/api/listing-alerts/:id/send` | agent (Bearer) | Approve + send a pending alert |
| POST | `/api/listing-alerts/:id/dismiss` | agent (Bearer) | Dismiss without sending |
| POST | `/api/listing-alerts/manual` | agent (Bearer) | Compose + send a manual blast |
| GET | `/api/listing-alerts/subscribers?listing_id=` | agent (Bearer) | Watcher count / list |
| POST | `/api/sms/reply` | Textbelt webhook | Inbound replies → STOP handling |

Price-change detection hooks into the existing listing-update path (compare old vs new `properties.price`; on change, create a pending alert).

## 6. Reuse vs new

**Reuse:** existing SMS sending service (Textbelt), LO bulk-send background-loop pattern, public-listing visitor/attribution capture, `authHeaders()` auth pattern, agent dashboard surfaces for the approval card.

**New:** 2 tables + pending-alert queue, public subscribe endpoint, agent approval UI + endpoints, price-change detector, inbound STOP webhook (`/api/sms/reply`), the opt-in card on the public listing.

## 7. Compliance & constraints

- **Consent** captured and stored verbatim at opt-in (TCPA: prior express consent).
- **STOP** auto-suppresses via Textbelt reply webhook; suppression checked before every send.
- **Known Textbelt caveats (accepted):** basic plan uses a shared/rotating number (reply mapping less reliable than a dedicated number) and **no clickable links** in texts. Acceptable for plain price-drop alerts. Swapping to a dedicated-number provider later requires no design change.
- Every send is gated by agent approval → bounded SMS cost.

## 8. Out of scope (this spec)

- Layer 2: per-listing PWA install / "save like an app" / web push.
- Email channel.
- Status-change trigger (back-on-market / pending).
- Clickable links in SMS (blocked by Textbelt until provider swap).

## 9. Open dependencies to confirm during planning

1. Where open-house scheduling lives (if anywhere) — gates the open-house trigger.
2. Exact listing-update code path to hook price-change detection.
3. Where the agent approval card best surfaces (Today dashboard vs listing detail).
4. Textbelt account: confirm `replyWebhookUrl` support on the current plan/key.
