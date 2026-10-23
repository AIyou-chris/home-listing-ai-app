> **2026-10-16 owner-approved update:** Use the five originals in `backend/marketing-engine/assets/marketing-pop/` as the visual reference. Dark navy, huge white headlines, a colored key phrase, and one concrete topic-specific visual. Cyan/lime connected homes for referrals; violet/coral chess and home for strategy; cobalt/pink bridges for partnerships; blue/yellow architecture for open houses; turquoise/magenta glass brain and homes for AI. Tactile conceptual 3D is allowed. Stop repeating orange doorways and silhouettes. This direction supersedes older orange-only palettes and bans on conceptual brains below. Keep all compliance, ownership, paid-attempt and review rules. The runnable prompt guidance lives in `launchScene.cjs`, `direction.cjs` and `brand.cjs`; the MDX companion is `marketing-image-directions.mdx`.

# HomeListingAI — Marketing Image Playbook
**Version:** 1.0 | **For:** Claude Code, Marketing Studio, blog and social autoposting

## 1. North star
Create **scroll-stopping, professional visuals** with the energy of our approved campaign example: cinematic realism, dramatic contrast, dark charcoal/black, powerful white typography, and bold fire-red / tangerine-orange highlights. Make **HomeListingAI** recognizable instantly. Make the message readable on a phone. Every image should have one main idea.

**Current launch audience:** mortgage loan officers, brokers and branch managers. **Current flagship story:** shrinking or less-productive Realtor referral networks and the importance of developing new Realtor relationships. Do **not** turn launch marketing into a homeowner-direct real-estate-agent replacement campaign.

**Creative principle:** Visualize the business problem on one side and possibility on the other. Avoid gratuitous fear, false certainty, and overcrowded visuals.

## 2. Brand rules
- Palette: near-black `#08090D`, charcoal `#1A1D24`, white `#FFFFFF`, fire red `#ED1C24`, tangerine `#FF7A18`. Treat hex codes as design defaults, **not** official brand tokens unless the app configuration confirms them.
- Brand: use the **actual approved HomeListingAI logo asset**, not an AI-invented logo. Keep correct spelling and capitalization: `HomeListingAI`.
- Type: condensed heavyweight display headings for ads; clean sans-serif for body and blog. Avoid fonts embedded by the image model; use the site's approved fonts in a composition layer.
- Tone: confident, sharp, practical and human. No cheesy robot mascots, sci-fi brains, gratuitous dashboards or stock-photo handshakes.
- Layout: one dominant focal point, strong contrast, breathing room, legible mobile text and obvious hierarchy.
- **Reference image:** the owner's approved dramatic real-estate campaign visual with sunset home, dark side, warm opportunity side, floating feature cards, strong headline/logo/CTA. Use as visual inspiration **not** as a promise that every depicted UI or capability exists.

## 3. Model roles and cost control
- **Mini text model**: turn a campaign brief into the creative concept, headline, image prompt, caption and alt text; classify channel, check constraints, and rank variations. Mini is a **prompt/copy assistant**, not assumed to be an image renderer.
- **Full text model (when needed)**: higher-stakes creative review, long-form campaign consistency and difficult compliance or QA checks.
- **Supported image-generation model**: render artwork. Select a model that the application's actual provider account/API supports; do not hard-code or assume a 'mini image' endpoint exists. Record model, estimated cost, size, usage and output ID.
- Draft cheap, render once. Do not render image variations automatically for every paragraph or social channel. Reuse/crop an approved master where practical.
- Deduplicate by campaign + concept + image prompt hash; cache approved artwork; use low/medium-quality previews if provider supports them; render high-quality only for approved finalists. Keep a per-campaign budget limit.

## 4. Mandatory two-stage production pipeline
**Stage A — AI generates background artwork:** photorealistic subject, house, abstract referral graph, lighting and empty space. **No text, no fake software screenshots, no button, no invented logo**.

**Stage B — deterministic compositor (Sharp, Canvas, SVG or HTML/CSS):** apply exact headline, verified subhead, approved HomeListingAI logo, CTA, disclosure if required. Export final PNG/JPEG/WebP. Social/video covers should never rely on image-model lettering.

**Stage C — QA and approval:** verify spelling, contrast, safe margins, crop, logo clear space, claims, brand fit, duplicate image detection and alt text. Default to **draft / requires human approval**. Automatically publishing is allowed only if the account owner explicitly enabled it, the channel is connected, the rights/claims are verified and checks pass. On any failure, save draft and report the issue; never silently post or invent a missing asset.

## 5. Channel templates (aspect ratios are targets; map to supported render sizes, then crop/composite)
| Asset | Target ratio | Composition | Text overlay |
|---|---|---|---|
| Blog hero | 16:9 | Editorial, believable, uncluttered | Usually **none**; title belongs in HTML for SEO/accessibility |
| LinkedIn feed | 1.91:1 or 4:5 | Strong business idea, recognizable subject | 1 headline + tiny logo + optional CTA |
| Facebook feed | 4:5 or 1:1 | Emotional immediate hook | 1 headline; do not overload |
| Instagram feed | 4:5 | Clear subject, readable phone layout | 3–8 words ideal |
| Stories / Reels / Shorts | 9:16 | Center-safe subject; top/bottom UI-safe zones | Punchy hook in safe zone |
| Email / landing banner | 16:9 or ~2:1 | Broad open space for copy | Prefer HTML text separate from art |
| Campaign hero graphic | 16:9 | Most cinematic; dark-to-warm transformation | Headline, wordmark, tagline, CTA |

Use actual channel specs at export time, and test crops at phone size. Keep critical text and subjects comfortably inside safe areas; do not place them at extreme edges.

## 6. Reusable creative-director system prompt
```text
You are the visual creative director for HomeListingAI, a business-growth platform currently marketed to mortgage loan officers and brokers. Make premium, high-contrast, cinematic campaign images. One concept per image. Clear dark composition, selective fire-red and tangerine accents, realistic humans/homes, mobile legibility. Lead with loan-officer business growth and Realtor referral-network rebuilding. Never invent statistics, customer results, endorsements, product screens, features, or pricing. Never imply all Realtors are quitting. Do not use homeowner-direct positioning during this LO launch. Generate an ART-ONLY prompt that leaves room for separately composited headlines, official HomeListingAI logo, and CTA. Also provide recommended exact overlay copy, alt text, caption, and a QA checklist. Use simple language; do not add fluff.
```

## 7. Universal image-generation prompt template
```text
Premium cinematic commercial photography for HomeListingAI [CHANNEL] about [ONE AUDIENCE PAIN OR OPPORTUNITY].
SUBJECT: [specific realistic person/place/action].
VISUAL STORY: [one concrete contrast, before/after or metaphor].
COMPOSITION: [subject placement]; reserve [left/right/top] negative space for later copy; maintain safe crops for [RATIO].
LIGHTING: dramatic, lifelike; dark charcoal shadows, selective fire-red and warm tangerine edge lighting; confident, optimistic finish.
DETAILS: modern American real-estate/mortgage business context, believable setting, precise visual focus, restrained sophistication.
NO embedded text, NO logos, NO fabricated UI screenshots, NO watermarks, NO stock-art look, NO unrealistic anatomy, NO robots.
```
**Text belongs in the compositor.** Provide headline/CTA as separate structured fields, not inside the render prompt.

## 8. Eight ready-to-use examples

### Example A — Launch flagship: disappearing network (16:9 hero)
**Art prompt:** Photorealistic midcareer mortgage loan officer at a desk in a dark contemporary office, thoughtful and determined. To the left, a softly glowing network of portrait *silhouettes* with several connections fading; to the right, new warm orange connections illuminate across a city skyline. Premium cinematic lighting, charcoal and deep black with red and tangerine accents, dramatic depth, left third kept dark and clear for headline. No text/logos/fake UI.
**Overlay:** `YOUR REFERRAL NETWORK IS CHANGING.` / `WHAT'S YOUR PLAN?` / `HomeListingAI` / `BUILD YOUR NEXT NETWORK.` / CTA `EXPLORE THE LAUNCH OFFER`.
**Alt text:** A loan officer studies a fading referral network as new connections form in warm orange light.
**Caption:** Your next strong Realtor partnership may be one introduction away. Start building tomorrow's network.

### Example B — Blog: the mortgage market has changed (16:9 editorial)
**Art prompt:** Editorial photograph of a mortgage professional reviewing a realistic but unreadable market trend visualization near a window overlooking a residential neighborhood at dawn; reflective but ready to act; no sensational imagery. Deep charcoal with subtle warm sunrise, generous right-side breathing room, sophisticated realistic business photography. No text, no charts with readable invented numbers, no logos.
**Overlay:** None; display blog headline as page text.
**Alt text:** Mortgage professional reviews changing market conditions in an office overlooking homes.
**Blog title suggestion:** `The Mortgage Market Changed. Has Your Referral Strategy?`

### Example C — Blog: rebuilding Realtor referrals (16:9 editorial)
**Art prompt:** Authentic coffee-shop meeting between a professional loan officer and real estate agent, candid, engaged conversation, tablet with no readable content, contemporary small-town US commercial street visible outside, warm side light contrasted with deep charcoal shadows. Premium documentary realism, no handshake cliché, no text, no logo.
**Overlay:** None.
**Alt text:** Loan officer and real estate agent discuss a new professional partnership over coffee.
**Blog title suggestion:** `How Loan Officers Can Rebuild Realtor Relationships`.

### Example D — LinkedIn: competition is moving (1.91:1 or 4:5)
**Art prompt:** Two parallel office desks at dusk: one empty and dark, the other occupied by a focused mortgage professional organizing a meeting calendar and contact list, details abstract/unreadable. Clean cinematic commercial photography, black charcoal with orange edge lighting, leave top-left negative space. No text or logos.
**Overlay:** `THE MARKET WON'T WAIT.` / `NEITHER SHOULD YOUR NETWORK.` / HomeListingAI wordmark.
**Alt text:** An active mortgage professional works on business relationships while an adjacent desk sits idle.
**Caption:** Waiting for referrals isn't a plan. Building relationships is.

### Example E — Facebook/Instagram: next top Realtor partner (4:5)
**Art prompt:** Close cinematic portrait of an assured mortgage professional standing at the threshold of a busy networking event with softly blurred real-estate professionals beyond; an inviting path of subtle warm tangerine lights leads forward. Black/charcoal contrast, red highlights, generous upper negative space, no text/logo.
**Overlay:** `YOUR NEXT TOP REALTOR PARTNER` / `DOESN'T KNOW YOU YET.` / `HomeListingAI`.
**Alt text:** Mortgage professional looks toward a room of potential real estate referral partners.
**Caption:** Tomorrow's opportunities start with new conversations today.

### Example F — Blog: 24/7 listing assistant (16:9 editorial)
**Art prompt:** Tasteful dusk exterior of a welcoming listed home, a person reviewing property details on a phone from a patio; faint abstract speech-bubble-shaped light reflections, absolutely no legible fake chat or product interface. Warm amber interior lights, cinematic dark sky, polished photorealism. No words/logos.
**Overlay:** None; heading on webpage.
**Alt text:** Prospective homebuyer reviews property information on a phone outside an illuminated home at dusk.
**Blog title suggestion:** `What a 24/7 AI Listing Assistant Can Do` (only if this feature is confirmed available).

### Example G — Blog: property marketing in motion (16:9 editorial)
**Art prompt:** Realistic creative workspace with a property photo shoot contact sheet, staged house in background and phone/camera tools on desk; no readable app screens or fabricated social posts. Cinematic high-end real estate campaign atmosphere, warm tangerine sunset, understated red accents, clean hero composition.
**Overlay:** None.
**Alt text:** Real estate marketing workspace with property photography and campaign planning materials.
**Blog title suggestion:** `Make Every Listing Work Harder With Smarter Marketing` (verify promised functions).

### Example H — Reel/Shorts cover: new network (9:16)
**Art prompt:** Tall vertical cinematic image, confident mortgage loan officer in sharp foreground; behind, gray faint lines connecting silhouettes shift upward into a vibrant, widening orange-lit network. Black city-at-dusk background, dramatic depth and composition. Keep main subject in center safe area and clean dark space across upper middle for text. No words/logos.
**Overlay:** `REFERRALS SLOWING?` / `BUILD NEW RELATIONSHIPS.` / `HomeListingAI` / `SEE HOW`.
**Alt text:** Loan officer stands before a referral network transforming from dim connections to bright new ones.
**Video hook:** `If your referral partners aren't producing, what's your plan to find the next ones?`

## 9. Format the final assembled ad
- **Headline:** one powerful idea, preferably 4–12 words; high-contrast white or fire red.
- **Brand:** approved HomeListingAI logo clearly visible, not competing with the headline.
- **CTA:** short action (`SEE HOW IT WORKS`, `EXPLORE LAUNCH PRICING`) only when a real destination exists.
- **No CTA button baked into blog hero art.** Blog page has its own accessible CTA.
- Keep the reference image's high energy, but **do not** repeat its crowded mini feature panels on every asset. Blog art should be cleaner than a launch banner.
- Text on post graphics must survive phone-sized preview; avoid claims hidden in tiny disclaimers.

## 10. Content and compliance guardrails
1. **Don't claim all agents are quitting.** Prefer `Some Realtor partners have slowed down or left the industry` or `Your referral network may not be producing like it used to` unless verified data supports broader assertions.
2. No invented rates, agent counts, market percentages, testimonials, endorsement faces, prices, conversion rates, or promises of referrals/closings.
3. Only show **confirmed, shipped HomeListingAI capabilities**; never present a generated dashboard as a real product screenshot. For genuine UI, use a reviewed capture of the actual app.
4. Treat mortgage/real-estate ads as regulated: review fair-housing and fair-lending implications. No protected-class targeting or exclusion, misleading credit claims, or discriminatory depictions.
5. Use licensed/owned source imagery and approved logo; obtain necessary likeness rights for identifiable people.
6. Don't fabricate customer names, geographic market success, or listings that imply availability.
7. Images must convey a truthful metaphor, not evidence for unsupported market-wide claims.
8. Post only with publishing permission; log who approved what, when, channel, and asset version.

## 11. Claude Code implementation contract (example schema)
```json
{
  "campaign_id": "campaign-123",
  "asset_type": "linkedin_feed",
  "audience": "mortgage_loan_officers",
  "goal": "new_realtor_partnerships",
  "theme": "referral_network_rebuild",
  "ratio": "4:5",
  "art_prompt": "Cinematic mortgage professional, orange connections, no text...",
  "overlay": {
    "headline": "YOUR NEXT REALTOR PARTNER DOESN'T KNOW YOU YET.",
    "subhead": "Build tomorrow's network.",
    "cta": "SEE HOW IT WORKS",
    "brand_asset_id": "approved-homelistingai-logo-id"
  },
  "caption": "New relationships start with new conversations.",
  "alt_text": "Loan officer looks toward prospective new business connections.",
  "claims_verified": true,
  "feature_flags_verified": true,
  "status": "draft_requires_approval",
  "image_model": "resolve_from_config",
  "cost_ceiling_usd": 0.50
}
```
Do not assume the example cost ceiling fits the actual provider; make budgets configurable. Reject or defer requests that can't fit the budget. Store `base_image_url`, `final_composited_url`, prompt/version/model, rights metadata, hashes, QA results, approval and channel-specific variants. Preserve the final brand image and editable composition layers.

## 12. Automation flow — simple and safe
1. Marketing Suite loads campaign brief, verified product capabilities, brand settings, channel, and approved assets.
2. Mini creates 1–3 concepts and captions; select strongest based on one-message clarity.
3. Image model renders **art only**, respecting budget and duplication rules.
4. Compositor places exact logo/text/CTA and exports the correct channel crop.
5. Automatic QA checks composition, image integrity, text, duplicate, rights, claims, and metadata.
6. Human reviews draft. If auto-post enabled, allow publishing only after explicit approval policy checks.
7. Store reusable artwork in the Media/Content Library; support edit, replace, archive/delete and version history.
8. Publish/schedule to connected channel, log result, retry safely without duplicate posting. On failure, keep draft.

## 13. Fast QA checklist
- [ ] Does the visual communicate **one** idea within two seconds?
- [ ] Is this for mortgage LOs (not homeowner-direct)?
- [ ] Is the HomeListingAI logo official, spelled correctly and legible?
- [ ] Are headline/CTA added by compositor, with perfect spelling?
- [ ] Does the graphic crop safely and read well on a phone?
- [ ] Are product claims and any numbers verified?
- [ ] Are people, properties, rights and fair-housing implications cleared?
- [ ] Is the asset saved and retrievable in the library?
- [ ] Is publication authorized and logged?

**Golden rule:** *The image stops the scroll. The headline speaks to the LO's problem. The product demonstrates the answer. The CTA earns the click.*
