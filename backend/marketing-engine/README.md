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

`express`, `openai` (writing, pictures, voice, the video reviewer), `sharp` (pictures and the picture video), `@napi-rs/canvas` (the explainer videos), `ffmpeg-static` (optional: the server's own `ffmpeg` is used when the bundled one is missing).
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

- **Nothing posts without a person's OK**, except Autopilot, which only runs while its switch is ON for that customer, and checks every post first.
- **Never invent a number.** Only the `facts` in the settings file may be quoted; any other statistic, price, promise or outside link is blocked by `services/autopilot/safety.js`.
- **Say "Not available" when there is no data.**
- **Every row belongs to one customer** (`owner_id`). Code never relies on an upsert key; it updates, then inserts.
- **Videos must say what the post says.** The reviewer (`services/videoReview.js`, three reviews, middle score) can stop a video; Autopilot then uses the moving-picture video.

## Tests

`npm run test:backend` runs everything, including this folder's `__tests__/`. The tests use fake databases, so they need no keys.
