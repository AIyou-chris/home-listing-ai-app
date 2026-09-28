# What HomeListingAI takes from An AI You (anaiyou.com)

> Source: `AIyou-chris/ai-landing-template` (the code behind anaiyou.com), reviewed 2026-09-27 by Claude.
> Purpose: backend reuse plan for the HomeListingAI overhaul ("one brain, many agents, voice + SMS + Jev").
> Codex: marketing studio, image/video and new-API ideas are yours to review. See the last section.

## The short version

An AI You already has the three hardest parts of the overhaul **built and tested**:

1. **An AI phone employee** that answers a real phone number (Telnyx).
2. **A safe texting/email engine** with consent, opt-outs, quiet rules and one send queue.
3. **"One brain, many doors"**: one trained AI that answers website chat, live voice and the phone with the same knowledge.

Same stack as HomeListingAI (Express CommonJS + Supabase + React + OpenAI), so we **port** instead of rebuilding.

---

## 1. Take: AI phone employee (Telnyx Voice AI)

| Piece | File(s) in An AI You | What it does |
|---|---|---|
| Telnyx client | `server/lib/telnyx/client.cjs`, `config.cjs` | Buy/reserve numbers, calls. Real + mock mode. |
| Webhook security | `server/lib/telnyx/signature.cjs` | Ed25519 signature check on every Telnyx webhook. |
| Assistant builder | `server/lib/telnyx/assistant.cjs` | Creates the Telnyx AI assistant + its tools. Tenant id comes from Telnyx, never from the model. |
| Tenant routing | `server/lib/phone/routing.cjs` | "Whose phone rang?" decided ONLY by the dialled number. No fallbacks. |
| Phone brain | `server/lib/phone/brain.cjs` | Reuses the chat brain + phone rules (say you're an AI, recording notice, no URLs read aloud). |
| Tools | `server/lib/phone/tools.cjs` | `get_business_information`, `search_business_knowledge`, `get_available_appointment_times`, `book_appointment`, `capture_or_update_lead`, `take_message`, `transfer_to_owner`. |
| Transfer | `server/lib/phone/transfer.cjs` | Safe hand-off to the owner's cell (typo / premium-number guards). |
| Minutes + billing | `server/lib/phone/usage.cjs`, `phone_minute_packs` migration | Metered minutes, $20/200-min overage pack via Stripe. Running out never = dead line. |
| Provisioning | `server/lib/phone/provisioning.cjs` | Shows real number + real price before buying. |
| Routes | `server/routes/phone.cjs`, `phone-webhooks.cjs` | Owner settings API + Telnyx webhook/tool endpoints. |
| DB | `20260815*_phone_*.sql`, `20260820120000_phone_greeting.sql` | `phone_lines`, `phone_calls`, webhook event ledger. |
| Setup doc | `docs/telnyx-phone-setup.md` | Every env var + safe test steps. |

**HomeListingAI use:** every LO gets an AI line. A buyer calls from a listing sign / QR / WOW link → AI answers about **that listing + financing (rate sheets)** → captures the lead → books with the LO or transfers live.

**Change for HLAI:** tools need listing context (`properties.id`) and LO rate-sheet knowledge (`lo_listing_kb_docs`). Use `resolveLoAgentId()` for owner ids.

**Inbound only.** No outbound AI calling exists, which is right. Outbound AI voice calls legally need prior written consent. Keep it that way unless we add a consent step.

## 2. Take: messaging engine (SMS + email)

`server/lib/comms/`, which is the best-built part of that repo.

| Piece | What it does |
|---|---|
| `scheduler.cjs` + `runner.cjs` + `ticker.cjs` | **One queue** (`scheduled_communications`) for every message. DB unique index blocks duplicates. Never throws. |
| `purposes.cjs` | Every message must have a fixed **purpose** (confirmation, reminder, follow-up…). No free-form blasts. |
| `consent.cjs` | Stores **what the person was shown and when**, not just a checkbox. |
| `sms-decision.cjs` / `email-decision.cjs` | Pure "should we send?" rules. Refusals are logged outcomes. |
| `reply-window.cjs` | Owner can reply only if the customer messaged first and recently. |
| `inbound-sms.cjs` + `sms-keywords.cjs` + `unsubscribe.cjs` | Replies + STOP/HELP handling. |
| `provider-contract.cjs` | Provider plug. Textbelt today; **Telnyx SMS = one new adapter file.** |

**HomeListingAI today:** SMS is scattered (`smsService`, `listingAlertService`, drip emails, LO outreach, owner alerts), each with its own rules. **Replace all of it with this one engine.**

**Both apps still send SMS through Textbelt.** Writing the Telnyx SMS adapter once fixes both apps (links in texts, better delivery). Needs 10DLC business registration, so **start that paperwork first.**

## 3. Take: "one brain, many doors" (this is the overhaul's core idea)

| Piece | What it does |
|---|---|
| `server/lib/ai-surface.cjs` | One trained employee, several doors. A door may only change the **greeting** and add a **short task framing**. It can never swap the knowledge or the personality. |
| `server/lib/prompt.cjs`, `ai-settings.cjs` | One system prompt builder. |
| `server/lib/client-brains.cjs`, `platform-ai-settings.cjs` | **Layered brains:** house rules (ours) sit under owner rules (Marketing Manager, Customer Service, Sales). An owner can say "we never discount" but not "invent a price". |
| `server/routes/realtime.cjs` | Live voice on the website (OpenAI `gpt-realtime`, WebRTC), capped at 6 sessions/hour per visitor. |
| `server/lib/ai-quota.cjs`, `rate-limit.cjs` | Daily AI spend caps per owner. |

**HomeListingAI brain design:**

```
                ┌──────────── ONE BRAIN (per LO) ────────────┐
                │ knowledge: listings, rate sheets, LO bio    │
                │ rules: house rules > LO rules               │
                │ memory: one lead timeline (all channels)    │
                └──────┬──────────────────────────────────────┘
                       │  Jev decides: hot? what do they want? who handles it?
   ┌──────────┬────────┼─────────┬──────────────┬──────────────┐
 Chat agent  Voice    Phone     SMS follow-up  Agent-partner
 (listing    (talk    (Telnyx   (comms engine) (WOW links,
  page)      to house) line)                    realtor updates)
```

**Add what An AI You doesn't have: Jev as the router.** An AI You uses a free-form LLM to decide everything. In HLAI, Jev makes the yes/no/category calls (lead heat, intent: financing vs property vs showing, which agent acts, is this reply a STOP/complaint) and the LLM only does the talking.

## 4. Don't take

| Thing | Why not |
|---|---|
| Website builder, design lock, section library (`website.cjs`, `site-plan.cjs`, `design-*`) | HLAI isn't a website builder. |
| Copy-per-client setup | HLAI is multi-tenant. Every ported query must be **owner-scoped** (An AI You added owner scoping in its `owner_scoped_*` migrations, so follow that pattern). |
| Google Drive brain | Already removed in An AI You. |

## 5. For Codex: image, text and new-API tools to review

Codex to look at these in `ai-landing-template` and report what fits HLAI:

- `server/routes/marketing.cjs`, `customer-marketing.cjs`, `server/lib/marketing/*`: marketing studio, social posting, campaigns
- `server/lib/marketing/picture-animation.cjs`, `render-picture-animation.cjs`, `auto-animate.cjs`, `server/video-worker.cjs`: photo to animated video (listing reels?)
- `server/lib/hero-image-prompt.cjs`, `site-images.cjs`: AI image generation
- `server/routes/marketing-prospect-finder.cjs`, `marketing-linkedin.cjs`, `marketing-facebook-group.cjs`: overlaps HLAI's LO Lead Finder
- `server/routes/qr-codes.cjs`: QR codes (HLAI has QR tooling)

## Effect on the overhaul estimate

Porting instead of building cuts **Voice + SMS from ~2 weeks to ~1 week**. The full overhaul drops from **6–8 weeks to about 5–6**.

Suggested order:
1. Port the comms engine + write the Telnyx SMS adapter (fixes both apps).
2. Build the one-brain layer + Jev router in HLAI.
3. Port the phone employee with listing/rate-sheet tools.
4. Trim HLAI bloat + LO "AI control" screen.
