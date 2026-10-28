# Audit fix status — October 27, 2026

The interrupted fixing chat's saved changes were reviewed and completed in the original app checkout. Eighteen audit items have code fixes. Two still need follow-up: rotating the exposed database password and assessing the remaining dependency advisories that need major upgrades.

This records code/test results, not a claim that every live customer journey or external integration has been verified. The [initial audit](2026-10-27-deep-audit.md) remains a snapshot of the problems before these fixes.

| Audit # | Original priority | Status | Change / remaining work |
|---|---|---|---|
| 1 | 🔴 | Code fixed; rotation outstanding | Removed the password from the tracked linking script. The CLI now prompts for it. Checked tracked files for other copies of that exact removed value; none remain. Old Git history still contains it. No live password was changed; it must be rotated if it was real. |
| 2 | 🔴 | Fixed and tested | IPv4-mapped IPv6 is normalized and classified before URL fetches; dotted, compressed, expanded and URL-normalized loopback forms are rejected. |
| 3 | 🔴 | Fixed and tested | Signup issues an email confirmation link instead of an already-confirmed login. Working passwords and verification links are never returned by the public registration API. Both signup screens wait for email verification. |
| 4 | 🔴 | Fixed and tested | Lead-forwarding requires the separate Mailgun signing key, a fresh signed timestamp/token, and rate limiting. Text-only multipart forwarding is parsed with limits; attachments are rejected. Existing integrations must supply Mailgun signatures. |
| 5 | 🔴 | Fixed and tested | Property chat reads trusted published listing facts on the server and scopes listing knowledge by property/owner/listing sidekick. Drafts stop before KB reads or AI calls. Client history is bounded to eight turns and 2,000 characters per message. |
| 6 | 🔴 | Fixed by removal | Removed the unused standalone Netlify AI-card function; the app uses the guarded backend API. Removal takes effect on deployment. |
| 7 | 🔴 | Fixed by removal | Removed the legacy in-memory listing PUT endpoint. Supported edits continue through the owner-checked properties/dashboard APIs. |
| 8 | 🔴 | Fixed and tested | Funnel resolution only selects the requesting owner's matching funnel. No arbitrary or other-customer fallback remains. An account without its own matching funnel receives an explicit missing-funnel error rather than sending another customer's content. |
| 9 | 🔴 | Fixed and tested | Admin factor lookup failure returns 503; it cannot skip MFA. Verified AAL2 sessions continue normally. |
| 10 | 🔴 | Fixed and tested | Account deletion stops before deleting records/login if subscription lookup or cancellation fails. It also checks the saved Stripe customer's subscriptions and refuses incomplete results. |
| 11 | 🟡 | Fixed and tested | Failed funnel actions keep the step index and mark the enrollment failed. They are not silently advanced/completed or blindly retried after an uncertain send. |
| 12 | 🟡 | Fixed and tested | Restored client email reminders after reviewing the interrupted change that removed them. They honor the appointment's reminder toggle and chosen offset. Queued phone/SMS reminders also check the toggle before scheduling and dispatch. |
| 13 | 🟡 | Fixed and tested | Public chat reads the newest 20 rows, then restores chronological reading order. A 30-message regression verifies messages 10–29 are returned. |
| 14 | 🟡 | Fixed and tested | Server-controlled safety rules are always prepended. AI outages return a neutral unavailable response instead of invented homes, features or claims. |
| 15 | 🟡 | Fixed | Speech uses the existing authenticated request helper. Empty/fallback audio clears the playing state; finished audio releases its object URL. Anonymous business-card conversations remain a separate live journey to verify. |
| 16 | 🟡 | Fixed and tested in isolation | Restored the protected LinkedIn assistant endpoint using the existing service and spending guard. Extension requests use a fresh app-tab bearer token, not an owner header. Tokens are not written into extension settings. Expired/wrong-account sessions are refused. Extension origins are accepted only on this API path. Manual browser installation/login verification remains outstanding. |
| 17 | 🟡 | Fixed and tested | Signup reuses an unconfirmed partial account, resumes missing assets and resends a private email link. Confirmed accounts cannot be changed by public signup; payment success reuses existing verified logins. |
| 18 | 🟡 | Partially fixed | Updated DOMPurify to 3.4.17, body-parser to 2.4.0 in both installs, and compatible Express/Axios/Multer/Undici-related lockfile versions. No forced major upgrade. Remaining npm production advisories: root 6 package entries (2 high, 4 moderate); backend 16 (12 high, 4 moderate), with overlapping/transitive entries. These require separate compatibility/reachability work, especially older OpenAI/Zod, Puppeteer and Google APIs, React Router and Quill. Presence is not proof every advisory is exploitable here. |
| 19 | 🟡 | Fixed | The admin production TypeScript config excludes its test helper, matching the main config's test exclusions. |
| 20 | 🟡 | Fixed and tested | Anonymous appointment creation requires a published property before resolving the owner or writing a booking. Authenticated scheduling keeps its existing ownership checks. |

## Verification

Validation: the complete backend suite passed 647 tests with zero failures/skips. The existing complete frontend suite passed 262 tests in 58 suites; two additional signup-screen tests also passed. Main/admin TypeScript checks, ESLint, production build and diff whitespace checks passed. After checking compatibility with legacy published status values, the backend core/service suite was rerun against the final publication checks. Added meaningful regressions for signup confirmation/recovery and payment login reuse, admin MFA failure, private KB access, cancellation failure, cross-customer funnels, failed sends, reminder preferences/timing, recent chat context, safe AI fallback, and extension authentication.

Frontend signup tests verify both real screens show confirmation rather than trying to log in with a public API password. Tests use fake mail, auth, database and AI services. No real customer messages, provider purchases or live database writes were used to validate these changes.

## Runtime and deployment limits

- Verify signup email delivery/redirects, Mailgun signed forwarding, public-card chat and installed-extension login on the deployed app. No live end-to-end success is claimed.
- Rotate the exposed database password with owner approval; deleting source does not invalidate a leaked credential or erase Git history.
- Remaining package advisories were not hidden or dismissed. Major SDK/router/editor upgrades need their own compatibility checks.
- AI calls keep their existing providers, credentials and endpoint configuration. The existing platform spending guard still wraps fetch. Existing recent-message windows are used; no Headroom/Caveman middleware or gateway was added or claimed active, and stored originals were not compressed.
- Existing unrelated local work and tools/configuration were preserved. The production build retains existing large-bundle warnings.
