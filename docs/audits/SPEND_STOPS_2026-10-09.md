# Spend stops — what can never cost a lot (2026-10-09)

One module, `backend/services/spendGuard.js`. Counters are in memory (a restart resets them): this is a ceiling against a bug or abuse, not an exact meter. When a stop trips, **Chris gets one email per stop per day** ("Safety stop tripped…"). Every number below can be changed on Render with the setting name shown, no code change.

| What costs money | Stop (default) | Render setting |
|---|---|---|
| All OpenAI calls (chat, voice clips, pictures, phone-call setup), platform-wide | 8,000 units a day (chat = 1, voice clip = 3, picture = 20) | `SPEND_OPENAI_UNITS_DAY` |
| OpenAI pictures | 60 a day | `SPEND_OPENAI_IMAGES_DAY` |
| TypeSafe (Jev) calls | 20,000 a day | `SPEND_TYPESAFE_CALLS_DAY` |
| Google translation | 1,500 a day | `SPEND_TRANSLATE_CALLS_DAY` |
| Texts, platform-wide | 300 a day | `SPEND_SMS_DAY` |
| Texts to one phone number | 3 a day | `SPEND_SMS_PER_NUMBER_DAY` |
| Texts per account | Lite 50, LO 250, LO Pro 2,000 a month; other accounts 300 | `SPEND_SMS_ACCOUNT_MONTH` (default for non-LO) |
| Email, platform-wide (all senders, cold email too) | 3,000 a day | `SPEND_EMAIL_DAY` |
| Email to one address | 12 a day | `SPEND_EMAIL_PER_ADDRESS_DAY` |
| AI phone calls, platform-wide / from one caller | 150 a day / 4 a day (extra calls ring the LO's cell instead) | `SPEND_AI_CALLS_DAY`, `SPEND_AI_CALLS_PER_CALLER_DAY` |
| AI phone minutes per account | 30 trial, 100 Lite, 300 LO, 1,000 Pro a month (already existed) | in code |
| Buying phone numbers | 3 a day | `SPEND_NUMBER_PURCHASES_DAY` |
| Reels | 60 a day total, 40 a month per account (and 5 an hour, already) | `SPEND_REELS_DAY`, `SPEND_REELS_ACCOUNT_MONTH` |
| Document reader (Condo Check) | 80 a day total, 15 a day per account (and 10 an hour) | `SPEND_HOA_READS_DAY`, `SPEND_HOA_READS_ACCOUNT_DAY` |
| Voice previews | 30 a day per account | `SPEND_VOICE_PREVIEWS_ACCOUNT_DAY` |
| Public buyer chat | 20 a minute and 150 a day per visitor, 5,000 a day platform-wide (already existed; now emails you when hit) | `AI_PUBLIC_DAILY_IP_CAP`, `AI_PUBLIC_DAILY_GLOBAL_CAP` |
| WOW links per month | trial 10, Lite 50, LO 250, **Pro 1,000** (was unlimited) | in code |
| Listings | Lite 5, LO 20, Pro 50, office **500 per LO** (was unlimited) | in code |
| Marketing Studio pictures/video | 3 tries per campaign (already) | in code |

How it is wired: the OpenAI, TypeSafe, translation, Mailgun and Telnyx number-order calls are all stopped at the network layer (a wrapper on `fetch` installed first in `server.cjs`), so SDKs and old code are covered too. Texts, per-address email, reels, document reads, voice previews and AI phone calls have their own checks.

Things to know:
- At 100+ paying accounts the 8,000-unit AI day and 5,000 public chats a day will be too tight. Raise them on Render when the alert email shows real traffic, not before.
- Stops do not cover: OpenAI/Telnyx/Mailgun/Textbelt dashboards themselves. Also set a **monthly spend limit in the OpenAI dashboard** as the last line of defense (needs Chris).
- Not covered by a stop: Apify (admin Lead Finder, run by hand), Stripe, Supabase, Render.

Advertised wording now: LO Pro "up to 2,000 texts a month", "up to 1,000 WOW links a month", office "up to 500 listings per LO". No public page, plan list, AI text file or sales prompt says "unlimited" (a test enforces that).
