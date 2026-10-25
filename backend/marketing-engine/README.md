# Marketing engine

One folder that runs a business's marketing: **Marketing Studio** (campaigns, pictures, voice, video), **connected social accounts**, **posting**
(by hand or on a timer), **Autopilot** (three checked posts a day), **animated explainer videos** (drawn in code, free, with an AI voice and a second AI
that checks the video says what the post says), and the **Today** and **results** numbers.

It is built to be **copied to another business**. Everything about the business (name, site, prices, approved facts, topics, calendar, video scenes)
is in one file, `config/business.json`. Everything is kept **per customer** (each row has an `owner_id`).

## What is in the folder

| Path | What it is |
|---|---|
| `config/business.json` | The business: name, site, prices, approved facts, topics, 30-day plan, posting times, video scenes. `config/business.js` checks it on start. |
| `host.cjs` | **The only place the engine touches the rest of the app** (wording rules, business brain, cold-email results). Replace this file in a copy. |
| `routes.cjs` | Every marketing route. The server calls `mount(app, deps)` once. |
| `services/` | Studio, media, posting, Autopilot (`autopilot/`), pictures (`marketingImages/`), explainer video parts, Today, results. |
| `tools/code-video/` | The self-contained video drawing tool (has its own README). |
| `assets/` | Fonts, the logo (`logo.png`), the picture samples. |
| `__tests__/` | The engine's tests, including `boundary.test.js` (fails if the engine reaches outside this folder except through `host.cjs`). |

## Copy it to a new business

1. Copy the whole `marketing-engine/` folder into the new app's `backend/`.
2. Edit `config/business.json` (name, `siteUrl`, `alertEmail`, prices, `facts`, `topics`, `launch`, `schedule`, `video`). Put the business's logo at `assets/logo.png`.
   A bad file is refused on start with a plain message. To keep the file somewhere else, set `BUSINESS_CONFIG_PATH`.
3. Replace `host.cjs` with that business's own wording rules (what words the AI must never use, how it should sound) and business brain.
   The comment at the top of `host.cjs` lists the eight things it provides.
4. In the new app's server, call once, after the login guard (`verifyAdmin`) exists:
   ```js
   require('./marketing-engine/routes.cjs').mount(app, { verifyAdmin, supabaseAdmin, openai, loadBusinessBrain, createJevClient, blogService, emailService, APP_RUNTIME_MODE });
   ```
5. Run the SQL in the repo root, in this order, in the Supabase SQL editor: `admin-marketing-posts-migration.sql`, `house-social-connections-migration.sql`,
   `admin-switches-migration.sql`, `platform-brain-migration.sql`, then `owner-scoping-a-migration.sql` and `owner-scoping-c-migration.sql`.
   (The Studio campaign, media and picture tables come from the Marketing Studio migrations already in the repo.)
6. Set the environment (below), connect the social accounts on the Connected accounts tab, and run `npm run test:backend`.

## Outside packages it needs

`express`, `openai` (writing, pictures, voice, the video reviewer), `sharp` (pictures and the picture video), `@napi-rs/canvas` (the explainer videos), `ffmpeg-static` (optional: the server's own `ffmpeg` is used when the bundled one is missing), `@supabase/supabase-js` (only the `scripts/setup-customer.cjs` helper).
The server also needs the `ffmpeg` program for any video. `GET /api/admin/video-check` proves it works (and Today warns when it does not).

## Environment

| Name | What for |
|---|---|
| `OPENAI_API_KEY` | Writing, pictures, voice and the video reviewer. When credits run out, Autopilot cannot write: add credits. |
| `MARKETING_TOKEN_ENCRYPTION_KEY` | 32-byte hex key that encrypts the saved social logins (`openssl rand -hex 32`). |
| `OWNER_ALERT_EMAIL` | Where Autopilot's digest and "paused itself" emails go (defaults to `alertEmail` in the settings file). |
| `BUSINESS_CONFIG_PATH` | Optional: use a settings file somewhere else. |
| `FFMPEG_BIN` / `FFMPEG_PATH` | Optional: which ffmpeg to run. |
| `VIDEO_REVIEW_MODEL`, `VIDEO_WRITER_MODEL` | Optional: which AI checks and writes the video words (default `gpt-4o`). |
| `AUTOPILOT_AI_PICTURES` | `off` uses the free branded card instead of an AI picture. |
| Social app keys | Each platform's app id and secret; `services/houseSocialOauth.js` names them and says which is missing. |

## Rules the engine keeps (do not break them in a copy)

- **Nothing posts without a person's OK.** Autopilot writes each post and leaves it as a draft ("Waiting for your OK"); the owner presses Approve. Only if the owner also turns on the separate **Post by itself** switch (`autopilot_auto_publish`, OFF by default, per customer) does Autopilot approve and schedule its own posts. Every post is checked first either way.
- **Never invent a number.** Only the `facts` in the settings file may be quoted; any other statistic, price, promise or outside link is blocked by `services/autopilot/safety.js`.
- **Say "Not available" when there is no data.**
- **Every row belongs to one customer** (`owner_id`). Code never relies on an upsert key; it updates, then inserts.
- **Videos must say what the post says.** The reviewer (`services/videoReview.js`, three reviews, middle score) can stop a video; Autopilot then uses the moving-picture video.

## Tests

`npm run test:backend` runs everything, including this folder's `__tests__/`. The tests use fake databases, so they need no keys.


## Sell it as an add-on

- `config/business.json > addon.required`: `false` (this business's own copy: every admin login has it) or `true` (a sold copy).
- When `true`, every marketing route and every background job (Autopilot, the posting timer) only serves a customer whose `marketing_addon` switch is ON. Anyone else gets `402 ADDON_OFF`.
- Turn it on or off for a customer: `node backend/marketing-engine/scripts/setup-customer.cjs --enable <customer login id>` (`--disable` to turn it off).
- Running the script with no flag only checks the settings file, the logo, the environment and the database tables, and prints what is still to do. It writes nothing.
- Proof the customers stay apart: `__tests__/customerIsolation.test.js` (fails if any query on a customer table forgets `owner_id`) and `__tests__/addon.test.js`.

## Set up a new customer: checklist

1. Copy the folder and edit `config/business.json` (see "Copy it to a new business"). Set `addon.required` to `true`. Fill in `look` (colours, art-director voice, scene ideas, wordmark) and `video`. Put their logo at `assets/logo.png`.
2. Replace `host.cjs` with their wording rules and business brain.
3. Run the SQL migrations in the order in step 5 above.
4. Set the environment names in the table below on the server.
5. `node backend/marketing-engine/scripts/setup-customer.cjs --enable <their login id>` and fix every `TODO` it prints.
6. Copy `src/marketing-engine/` (the screens, see its README) into their front end and place the screens in their admin.
7. They connect their social accounts on the Connected accounts screen. Autopilot stays OFF and "Post by itself" stays OFF until they turn them on.
8. Run `npm run test:backend` and the front end tests. Do not hand it over until both pass.

## The look of the pictures

Palette, the art-director voice, lighting, banned content, the wordmark and the fallback scene ideas are all in `config/business.json > look`. `__tests__/lookInSettings.test.js` fails if a business name or a loan-officer word creeps back into the picture code.

## Full-auto video

Every Autopilot post gets an animated explainer video. A topic that names a scene (`explainer` in `business.json`) keeps it; any other topic gets a scene picked by the words in `video.autoScene.rules` (else `video.autoScene.fallback`). The second AI reviewer still checks the video says what the post says; if not, that post uses the moving-picture video. `video.autoScene.enabled: false` goes back to explainers only for topics that name a scene. A copy for another business edits the `scenes` and `autoScene` rules.

## The AI video brain (script-first)

`services/explainerSceneWriter.js` writes EVERY word of an animated video (the chat, the call, the steps, the plan card, the closing words) from the post and its video script, so each video tells its own story. The scene's wording rules, the approved abilities and the variety lists (sample listings, callers, times of day) are in `business.json > video.writer`; the field shapes are in `services/explainerScenes.js`. Code then enforces: the wording rules every post must pass, "I am an AI" on every AI line, no rates or approval talk, prices only from `prices.allowed`, and a free-trial button only when the post offers a trial. A second AI (three reviews, middle score wins) checks the video says what the post says. Words are saved on the post with a fingerprint (`explainerWordsFor`) and reused at render time, so one video is never written (or paid for) twice. Recent scenes and the owner's thumbs up/down are kept on the posts themselves (`explainerScene`, `videoFeedback`) and shown to the writer next time. Moving colourful backgrounds, five scenes (buyer chat, AI phone, WOW Link walkthrough, plan and price) and the upbeat music come from `tools/code-video`.

On the Autopilot screen each post has: scene picker (`Scene: pick for me`), "What should it show?", **Make the explainer video** (new words + voice, then the post is approved again; refused when the post goes out within 12 minutes, is already out, or a video is being made), the match score, the player, the script and thumbs.
