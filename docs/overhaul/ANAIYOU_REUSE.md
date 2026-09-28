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

## 6. Codex review (2026-09-27)

### A. Verdict and build order

**Verdict: agree with the architecture, disagree with treating it as a straight port or starting with a wholesale messaging replacement.** The An AI You source supports Claude's main claims: its phone path has signature verification, dialled-number tenant routing, tool-token isolation, call ledgers and transfer guards; its comms path has consent evidence, fixed purposes, decision functions, opt-outs and a deduplicated queue; and its phone/web surfaces share layered owner knowledge. Those are the right patterns.

The catch is that HLAI has different IDs, tables, billing, existing queues and live side effects. A big-bang port would create two systems before it removes either one.

| Decision | Codex change | Why |
|---|---|---|
| One brain | Keep | This is the overhaul. Define it as immutable platform/compliance rules → company rules → LO voice/preferences → listing/task context → channel adapter. "Agents" are roles and tools, not separate brains. |
| Jev router | Narrow it | Use Jev for semantic judgments such as intent, lead quality and routing category. Do **not** let Jev authorize sends, transfers, bookings, or compliance decisions. Code/policy owns side effects. Exact STOP keywords remain hard-coded; Jev may add a conservative natural-language opt-out signal, never replace the deterministic rule. |
| Comms engine | Take in slices | Port the schema and pure send-decision rules first. Move one message purpose at a time behind an adapter, with idempotency and audit comparison, then remove the old path. "Replace all of it" in one release is too risky. |
| Phone employee | Keep, inbound pilot first | The implementation is real and thoughtfully tenant-safe. Pilot with one LO and one number before provisioning everyone. HLAI listing/rate-sheet tools and profile-ID resolution are new work, not configuration. |
| Marketing studio | Cut from core overhaul | It does not earn a place in the first release. Voice, compliant SMS, shared memory and fast lead handoff serve the Golden Rules more directly. |
| Estimate | Do not promise 5–6 weeks yet | That may cover happy-path porting. It does not include telecom approval, migrations/backfills, identity cleanup, shadow migration, prompt/evaluation work and deleting the old voice/SMS paths. Re-estimate after the first vertical slice. |

**Recommended order:**

1. Start Telnyx 10DLC paperwork now, in parallel; it has outside waiting time.
2. Write the canonical brain contract, channel event contract and compliance hierarchy. Consolidate the TypeSafe client. Add a small cross-channel evaluation set before moving prompts.
3. Port the comms tables plus pure consent/purpose/send-decision functions. Put current Textbelt/email sends behind the new interface first; do not change providers and orchestration in the same step.
4. Move listing chat onto the one-brain contract as the tracer bullet. It is the safest surface and proves listing, rate-sheet, LO and compliance layering.
5. Add the Telnyx SMS adapter and migrate message purposes one at a time. Keep deterministic STOP/HELP handling outside AI.
6. Port inbound phone for a single LO/listing, then expand after webhook, transfer, billing and lead-timeline tests pass.
7. Build the LO AI-control screen against real shared controls. Then delete Vapi/Hume/old prompt/SMS paths that have proven replacements.
8. Consider listing reels and a narrow campaign generator only after the core is stable.

### B. Section 5 reuse decisions

| Area | Take / skip | Decision |
|---|---|---|
| Marketing studio (`marketing.cjs`, `customer-marketing.cjs`, `lib/marketing/*`) | **Skip the product; take a few patterns** | The backend surface is more than 6,000 lines and overlaps HLAI's blog, funnels and Buffer publisher. Porting it would violate the "less bloated" goal. Reuse owner-scoping, quotas, draft/approve states, asset ownership and prompt layering. Later, build one narrow action: "make a listing campaign" from real listing data, with review before publish. Do not port the duplicated staff/customer route sets or the web-process background generation pattern. |
| Picture animation renderer | **Take later** | The Sharp + FFmpeg renderer is useful because it animates real listing photos without inventing the home. Rebrand it as **Listing Reel**, keep only portrait/square/wide, slideshow/pan/zoom, brand overlay and CTA. No general-purpose animation studio in the core overhaul. |
| `video-worker.cjs` / auto-animate | **Take the worker boundary, not the whole feature** | Rendering outside the web server, explicit queued/rendering/done/failed states, in-flight limits and retry are good. Auto-animation must remain opt-in. HLAI's Render worker is currently missing required Supabase environment variables, so fix and prove the worker before adding video jobs. Prefer the deterministic FFmpeg reel first; generative video comes later. |
| AI image generation | **Do not port as written** | An AI You defaults to `gpt-image-1` and falls back to older variants. That is already stale. HLAI should never generate or materially alter MLS/property photos because a hallucinated room or feature damages trust and can create compliance problems. Allow generated, clearly labelled marketing art/backgrounds only. |
| Generic prospect finder + automated email | **Skip** | It searches local businesses, audits websites and queues cold email. That is not HLAI's product and it duplicates the specialized LO Lead Finder. Its search runs fire-and-forget inside the web process, so a restart abandons work. Reuse only heartbeat/staleness, preview and suppression ideas if needed. |
| LinkedIn opportunity scanner | **Take the human-assisted pattern, later** | Paste a post, analyze it, draft a helpful reply, then let the human act. No scraping, auto-connect or auto-DM is the right boundary. For HLAI, narrow it to agent-partnership opportunities. Use Jev for `buying_intent`/fit/risk judgments and the text model only for the reply draft. |
| Facebook groups / Reddit opportunity tools | **Skip for overhaul** | They require manual source text and a large tracking UI. Useful someday, but weaker than improving WOW Links and speed-to-lead now. Keep the rule-aware, help-first prompt ideas for a later agent-partnership tool. |
| QR code routes | **Skip** | HLAI already has authenticated, listing-owned QR generation tied to `listing_sources`, tracked URLs, source keys, UTM data, events and share-kit tests. An AI You's short-code redirect/scan counter is simpler, not an upgrade. |

**APIs I would use now:**

| Job | Choice |
|---|---|
| Text/talking | OpenAI Responses API behind one shared model adapter; Jev for typed judgments only. Remove scattered Chat Completions calls and hard-coded model names as surfaces migrate. |
| Fast marketing images | [`gpt-image-2.5-flare`](https://developers.openai.com/api/docs/guides/image-generation) for everyday generation. Use `gpt-image-2.5-sunburst` when precise edits/reference preservation matter. |
| Brand-heavy image work | Benchmark [`gemini-3.1-flash-image` (Nano Banana 2)](https://ai.google.dev/gemini-api/docs/image-generation) for multi-reference brand consistency. Pick one default after a small HLAI-specific bake-off; do not expose two providers to users. |
| Listing video | Deterministic FFmpeg first. If real demand justifies generative video, use [Gemini Omni Flash or Veo 3.1](https://ai.google.dev/gemini-api/docs/video); OpenAI's Sora Videos API was shut down on 2026-09-24, so it is not an option. Never animate a property in a way that invents physical facts. |
| Web voice | [OpenAI Realtime](https://platform.openai.com/docs/api-reference/realtime) with WebRTC. It now supports native speech-to-speech and SIP, so it can replace the old preview/Hume path while sharing the same tools and policy. |
| Phone carrier | Keep Telnyx for numbers, messaging and PSTN. Port the proven Telnyx assistant first; later test direct OpenAI Realtime SIP only if it measurably reduces latency or code. Do not add ElevenLabs by default—another agent platform works against the one-brain/less-vendors goal. |

### C. The two TypeSafe/Jev clients

**Keep `backend/services/typesafeClient.js` as the one project boundary. Remove direct `TypeSafeClient` construction from `TypeSafeLeadQualificationService.js` and remove the SDK dependency unless the shared wrapper itself is deliberately switched to the SDK later.** The committed wrapper is already live, dependency-free, DI-friendly and used by Lead Finder. Choice and score use the same System One request envelope, so the shared wrapper can support the lead questions without a second client.

The uncommitted lead-scoring work is Codex work from the earlier session (uncommitted files have no Git author record, but the timing and handoff match; treat it as mine). Its current state is **working prototype, not merge-ready**:

| State | Finding |
|---|---|
| Wiring | Evaluates inbound Mailgun email and Textbelt SMS replies, then adds/replaces semantic intent/readiness/urgency points in `LeadScoringService`. Other lead/chat surfaces are not wired. |
| Safety | Fails open on missing key/API error and keeps the deterministic score. Good. It logs every failure rather than once, and `stop_contact` changes score only—it must never be mistaken for the actual suppression/STOP action. |
| Client | Adds `@typesafe-ai/sdk` and creates a second client inside the domain service. This violates the agreed one-client rule. |
| Tests | The 14 focused TypeSafe + scoring tests pass. They are unit tests only; no inbound-webhook/database integration test exists. |
| Remaining | Consolidate the client, add integration/idempotency tests, verify choice/score response handling against the live API, cover email natural-language opt-out behavior, and fix/cover the existing case-sensitive booking auto-promotion check (`BOOKING` vs `booking`). Do not merge as-is. |

### D. What makes the overhaul harder

| Friction in current HLAI | Why it matters |
|---|---|
| `backend/server.cjs` is 37,686 lines with about 441 Express registrations | There is no safe big-bang rewrite seam. Extract by vertical slice, keep contracts stable, and delete old routes only after parity tests. |
| Two account IDs and two listing concepts | Auth IDs vs `agents.id`, plus legacy `listings` vs canonical `properties`, will break tenant isolation if An AI You's `owner_id` queries are copied literally. Every port needs explicit ID and table mapping. |
| Voice is already split across Vapi, Hume-era config/scripts, Telnyx webhook remnants and OpenAI Realtime | The phone port adds a fourth path unless removal is part of each slice. Inventory which live workflows still use Vapi before deleting it; old appointment voice reminders are real behavior. |
| AI behavior is scattered | There are many prompt builders and hard-coded `gpt-4o`, `gpt-4-turbo`, `gpt-4o-mini` and `gpt-4o-realtime-preview` calls. "One brain" requires a central policy/context builder plus channel adapters and evaluations, not merely a shared paragraph. |
| Messaging side effects are scattered | Direct `sendSms()` calls exist in reminders, alerts, funnels, outreach and server routes; STOP/suppression logic is split too. Migration needs purpose-by-purpose adapters, idempotency and a single inbound event ledger. |
| Background work is not fully dependable yet | The HLAI worker lacks required Supabase environment variables. An AI You also has some fire-and-forget web-process jobs. Durable queues and worker health must be solved before moving calls, campaigns or video there. |
| Database changes are manual | HLAI migrations are run manually in Supabase. The port adds many interdependent tables and indexes; use a numbered, idempotent migration manifest with verification queries and rollback notes. |
| Existing features already overlap the proposed ports | Buffer publishing, the LO Lead Finder and tracked listing QR are real. Replacing them with more generic An AI You versions would add code and regress capability. Keep the HLAI implementation unless a measured gap exists. |
| Current lead scoring is not a clean event-sourced model | It rebuilds from `lead_score_history`, appends the current trigger and can double-count duplicate deliveries. Jev improves meaning, not event integrity. Add event idempotency before using the score to trigger expensive or external actions. |

**Bottom line:** port the proven safety and orchestration patterns, not the other app's product surface. The successful overhaul ends with fewer providers, one shared brain contract, one Jev client, one communication policy/queue and old paths deleted—not merely hidden.
