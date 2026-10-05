# HomeListingAI Marketing Images — Art Direction + Codex Build Prompt

Paste everything below the line into Codex, run from the root of the HomeListingAI repo.

---

## YOUR JOB

Make every marketing image HomeListingAI produces (blog hero, LinkedIn/Facebook/Instagram post, email header, ad, landing page section) look like it came from a top creative agency, and make it **stop a loan officer (LO) mid-scroll.** Right now image generation uses one generic style line. Replace it with a real art-direction system.

Work without asking questions. Read the repo first, reuse what exists, finish every item in "Definition of done". If something truly cannot be done, finish the rest and list the blocker in one line.

---

## PART 1 — WHAT THE IMAGE MUST DO

One job per image: **make an LO feel "that's my week" in under two seconds,** then make them curious. Each image carries ONE idea, ONE focal point, and generous empty space where text can sit.

The feeling to hit: the buyer who texts at 9pm Sunday; the agent who stopped calling; the empty open house; the phone that lights up with a warm lead; a house with a name on it. **Real, human, slightly cinematic. Never stock-photo cheesy, never "AI art."**

## PART 2 — HOUSE STYLE (applies to every image)

- **Look:** premium editorial photography. Natural light, golden hour or soft overcast, shallow depth of field, real textures, slightly film-like color. Think magazine feature, not catalog.
- **Palette:** anchor on the HomeListingAI brand: deep blue into violet/indigo, with warm window-light amber as the accent. Read the exact brand colors from the site's tokens/Tailwind config and use those hex values in prompts — do not guess.
- **Composition:** one clear subject, rule-of-thirds, 35–40% empty space on one side for headline text, strong foreground/background separation, eye-level or low-angle, never flat-on.
- **People:** real working adults in real settings (loan officers, agents, buyers) — candid, mid-moment, faces mostly natural and not staring at the camera. Diverse and realistic. No identifiable real people or celebrities. Hands, phones, doors, keys and windows tell the story when faces are not needed.
- **Subjects that work:** a lit phone on a kitchen counter at night; a "For Sale" yard sign at golden hour with a warm lit window; two professionals shaking hands on a porch; an agent and a loan officer at a laptop in a coffee shop; a quiet open house with a single buyer standing in the doorway; a keys-in-hand closing moment; a desk with a calendar, coffee and a ringing phone.
- **Never:** robots, glowing brains, circuit boards, holograms, neon cyberpunk, floating UI panels, humanoid AI faces, generic handshake-over-globe stock, fake charts, dollar signs raining down, stock-photo smiles at camera, clip-art houses.
- **No text, logos, numbers, rates, badges or watermarks inside the generated image.** AI image models misspell words and invent fake logos. All words, the HomeListingAI logo, and any required badges are added afterward in code (see Part 5). The generated image is the background only.
- **Real estate / lending safety:**
  - Do not depict specific real addresses, real brokerage signs or competitor logos (Zillow, Redfin, Rocket, etc.).
  - Fair Housing: never imply who "belongs" in a neighborhood or home; no images that suggest a preference or exclusion based on race, religion, family status, disability, etc. Show a range of normal people naturally.
  - Do not show interest rates, payment amounts, approval claims, or "guaranteed" anything in the picture.
  - Never fake a testimonial, a customer photo, or a before/after result.
  - The **Equal Housing Lender** mark (and NMLS number) are added in code from the official asset on ads that need them — the AI never draws them.

## PART 3 — THE PROMPT FORMULA

Every image prompt is built from these 8 parts, in this order, as one flowing paragraph (not a list). The writer model fills them in per use case; the house-style block is appended automatically.

1. **Format & purpose:** "Wide 3:2 editorial photograph for a LinkedIn header" etc.
2. **Subject & action:** who or what, doing exactly what, at what moment.
3. **Setting:** specific place, time of day, season, weather, props.
4. **Emotion / story:** the one-line feeling ("quiet tension, then relief").
5. **Camera & lens:** e.g. "35mm, f/1.8, shallow depth of field, eye level."
6. **Light:** e.g. "warm window light at dusk with cool blue ambient shadows."
7. **Color:** brand palette hexes, named in words and values.
8. **Composition:** where the subject sits and where the empty text space is.

### Example finished prompt (match this level of detail)
> Wide 3:2 editorial photograph for a LinkedIn article header. A loan officer in her thirties, seen from behind and slightly to the left, stands in a quiet modern kitchen at night looking down at her phone, which has just lit her face with a soft glow; a single warm pendant light and a laptop with a closed calendar sit on the counter. Quiet anticipation, the moment a warm lead lands. Shot on a 35mm lens at f/1.8, shallow depth of field, eye level, subtle film grain. Warm amber window light against deep indigo and blue evening shadows (#1E1B4B, #3B82F6 as ambient tones; replace with the real brand hexes). Subject on the right third, the left 40% of the frame left calm and uncluttered for a headline. No text, no logos, no screens showing readable content.

## PART 4 — THE SCENE LIBRARY (seed it)

Build a library of **40 scene recipes**, each a ready-to-fill prompt with the 8 parts, grouped by use:

| Use | Count | Examples |
|---|---|---|
| Blog hero by pillar (referrals, warm leads, LO marketing, AI, agent partners) | 15 | "agent stops calling" empty chair, "the 9pm buyer text," co-branded listing on a phone |
| LinkedIn / Facebook post images | 10 | one bold idea each, strong space for a short line |
| Email header (cold email and newsletter) | 5 | quiet, simple, never ad-like |
| Landing page sections | 6 | hero ("Talk to the House"), agent partner, pricing, FAQ, final CTA, trial |
| Paid ad variants | 4 | high contrast, one subject, space for a short headline |

Each recipe stores: `id, use, aspect_ratio, size, prompt_template, text_zone (left|right|top|bottom|none), mood, forbidden[]`.

Sizes to support (generate natively, never stretch):
- Blog hero / OG share image: **1536×1024**, crop-safe to 1200×630
- LinkedIn header: 1584×396 (generate wide, crop to a safe area) and LinkedIn post: 1200×1200 or 1200×627
- Instagram/Facebook feed: 1080×1350 (4:5) and 1080×1080
- Stories/Reels cover: 1080×1920
- Email header: 1200×600

## PART 5 — WHAT TO BUILD

### 5.1 Read the repo first
Find the existing image path: `lib/marketing/hero-image-prompt.cjs` (`BRAND_DIRECTION`, `heroImagePrompt`), the image generation call in `routes/marketing.cjs` and `routes/customer-marketing.cjs` (OpenAI `images.generate`, model fallback `gpt-image-1` → `gpt-image-1-mini`), and the studio UI. **Extend these. Do not build a second image system.** Read GOLDEN_RULES.md / CLAUDE.md / AGENTS.md and follow them.

### 5.2 Replace the one-line brand direction
Rewrite `BRAND_DIRECTION` into the house style in Part 2 (including the new Never list and real-estate safety rules) and keep the existing rule: if the user uploaded a picture, use it and make no image call; if the user described a picture, keep their words and append the house style; if neither, use the writer's art direction. Make the HomeListingAI direction **brand-aware** so An AI You and HomeListingAI can each have their own house style without code duplication (a `brand` parameter selects the direction).

### 5.3 Prompt writer
Add a "write the image prompt" step that takes the article/post (title, angle, persona, mood) and returns a prompt built from the 8-part formula, picking the best scene recipe from the library and filling it in. It must never include readable text, logos, numbers or rates in the prompt, except to say "no text." Output also includes `alt_text` (plain description for accessibility and SEO, no keyword stuffing) and `text_zone`.

### 5.4 Generate 3 options, pick 1
For each request, generate **3 variants** (different compositions of the same idea) at medium quality, show them in the studio as a picker, and let the user regenerate one or ask for a tweak in plain words ("warmer", "less busy", "move the person left"). Keep costs sane: low/medium quality for drafts, high quality only for the chosen final. Show approximate cost before generating the 3.

### 5.5 Add the words in code, not in the image
Build a compositor (server-side, e.g. `sharp` or canvas — check what the repo already uses) that takes the chosen background and adds, in the safe `text_zone`: headline (max 8 words, brand font, high contrast, auto-fit), optional subline, the HomeListingAI logo, and when the use needs it, the Equal Housing Lender mark + NMLS number from the official asset files. Auto-darken or add a soft gradient behind the text if contrast falls below WCAG AA. Export WebP/AVIF for web and PNG/JPG for social, correct sizes per Part 4.

### 5.6 Quality check before an image can be used
Automatic checks, with a plain-words reason on failure: correct size and aspect; text zone actually empty enough; contrast of overlaid text; file size under budget (web ≤ 250 KB, social ≤ 1 MB); alt text present; no generated text detected in the image (run an OCR pass — if it finds words or a logo, flag and offer regenerate); prompt contains no forbidden terms. Also show the human a checklist: "Real-looking? One idea? Matches brand? Nothing misleading?" Nothing publishes with an image the user has not clicked "Use this."

### 5.7 Save and reuse
Store every chosen image with `prompt, recipe_id, variant, size, alt_text, cost, used_in[]`. Add a **brand image library** page in the admin so images can be reused across blog, social and email, and the same hero is not used on two posts in a row.

### 5.8 Learn what works
Tag each published image by scene recipe, mood and text zone. Pull click-through and engagement per image from the existing tracking and show "best performing scenes" in the admin so the writer favors winners.

## DEFINITION OF DONE
1. House style rewritten with the Never list and real-estate/lending safety rules, brand-aware (HomeListingAI vs. An AI You).
2. 40 scene recipes seeded and selectable in the studio.
3. Prompt writer produces 8-part prompts plus alt text and text zone; unit tests confirm no text/logo/rate language ever enters a prompt.
4. 3-variant picker with regenerate-with-a-tweak and cost shown; final render at higher quality.
5. Compositor adds headline, logo and required badges in code, exports every size in Part 4, and passes contrast checks.
6. Quality checks (size, contrast, OCR for stray text, file weight, alt text) block bad images with plain-word reasons.
7. Image library page with reuse and "don't repeat the last hero" rule.
8. Existing upload-your-own and describe-your-own flows still work exactly as before; existing tests pass; typecheck and build pass.
9. Generate and save a **sample set of 6 images** (2 blog heroes, 2 LinkedIn, 1 email header, 1 landing hero) for Chris to review in the library. Do not publish any.
10. `docs/MARKETING_IMAGES.md` in plain words: how to make, tweak, approve and reuse an image.

At the end, report in five lines or fewer: what works, the cost per image set, and anything blocked (for example, no OpenAI image access).
