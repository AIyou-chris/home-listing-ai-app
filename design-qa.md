# White label inquiry design QA — 2026-11-05

Source: /Volumes/GFY/EatADick/.codex/generated_images/01a1acb7-489a-72a1-afff-54dca1d6a324/exec-f27261ae-7523-4dc5-bf23-51305351dfc4.png (displayed option 1, 1435 × 1096).
Implementation: http://localhost:4180/#white-label; desktop 1440 × 1100 CSS px, mobile 390 × 844 CSS px; screenshot density 1.
Evidence under tmp/white-label-qa/: desktop-final.jpg, desktop-form.jpg, mobile.jpg, mobile-form.jpg, comparison-final.jpg. The comparison places source and implementation in the same image at 720 px each, preserving aspect ratios. Source includes pricing and a form inset; implementation captures the actual section and an independently opened modal. This intentional state difference is not treated as fidelity drift.

Findings: no remaining P0/P1/P2 issues.
- Typography: existing Inter/system font, heavy navy headings with royal blue highlight; original copy and hierarchy preserved. Responsive wrapping remains legible.
- Layout: section sits directly after pricing and before FAQ. Two columns on desktop, one on phones. Native dialog has bounded scrolling and a 44 px close control.
- Tokens: existing blue buttons, pale blue surface, dark navy text, rounded corners; visible focus and error states.
- Imagery: built-in ImageGen recreated the selected team workspace and phone illustration; 1024 px WebP (63 KB). Source image remains unchanged. Prompt: recreate only option 1's Your Office team workspace and overlapping navy listing phone, using the same pale blue/royal blue style, without page copy, pricing, form or CTA.
- Content: selected section copy retained. Requested date/time and local time-zone label added. Form explicitly requests a meeting and promises manual confirmation, not an available or confirmed slot. Illustration labeled as an example.

Comparison history: initial comparison found excessive vertical art whitespace. Applied a 1.3 aspect ratio with object-fit cover, preserving the workspace/phone subject; recaptured desktop-final.jpg and inspected comparison-final.jpg. No remaining actionable differences; the centered real dialog replaces the explanatory inset, and the existing desktop header is retained.

Interactions: Inquire opens dialog; Escape closes it and restores focus; close and Done work. Submitted through the real handler against a local mock database: exactly one lead and one linked 30-minute unconfirmed appointment. Error/retry, validation, owner tampering, role validation, duplicate submits and partial saves are covered by tests. Mobile form stays within viewport (344 px dialog, 390 px viewport); document has no horizontal overflow. Browser console error check returned none.

Checks: 13 backend tests, 2 frontend tests, typecheck, targeted lint, backend syntax and production build passed. Existing build chunk warnings remain. Live schema/constraints/admin owner verified read-only. No live inquiry write, external calendar sync, automatic email, or new AI runtime wiring tested or added. Calendar means the existing admin appointments calendar. No migration required.

final result: passed

---

# Marketing Studio stage-one visual check — October 4, 2026

Source visual truth: `/Volumes/GFY/EatADick/.codex/generated_images/01a1078b-c354-7911-8ef4-e6ca93bbc9f8/exec-fafea11d-d85f-470f-b450-1c5e1fdfa6e9.png`.

Implementation: local isolated preview of the production component at `http://127.0.0.1:5177/tmp/marketing-studio-stage-one/index.html`. Production integration replaces exactly the former social panel and preserves the page header and all following panels. Signed-in production screen was not tested.

Evidence: `tmp/marketing-studio-stage-one/desktop.jpg` (1432 × 994 screenshot, requested CSS viewport 1440 × 1000); `studio-detail.jpg` (1020 × 820 clip); `mobile-qr.jpg` (390 × 844 viewport requested). Source is 1684 × 934. Compared source and desktop capture together in one image input; assessed studio regions proportionally, without claiming pixel equality across unequal viewport sizes. Focused implementation capture provided readable control/text detail. No device frame. Browser captures are JPEG; full-view compression is visible, focused capture resolves text.

## Findings

No actionable P0/P1/P2 differences within the stage-one studio scope.

- Typography: existing app sans family and tokens retained, clear 24px studio title, 18px form heading, 14px controls, smaller supporting text. All six tab labels readable at desktop; phone tabs scroll horizontally.
- Layout: approved two-column form/output card composition, outlined white cards, gutters and dividers retained. Phone form stacks with no document overflow (390px viewport, 382px document width). Calendar uses list on phone.
- Color: existing blue primary, slate text, pale blue notices and white cards match HomeListingAI, rather than importing AI You orange.
- Assets: existing real HomeListingAI logo and Lucide library icons used. No synthetic logo or raster screen replacement. Generic library channel icons are an acceptable stage-one simplification.
- Copy: preserved intended fields and channel list including Bluesky. Intentional scope differences: save brief instead of generate campaign, later-stage output labels, disabled daily publishing, explicit browser-only persistence and photo filename-only storage. No pretend connected accounts or publish jobs.
- P3: mock uses more compact field spacing and rounder picture chips; current app control styles are slightly taller. Acceptable for readable stage-one preparation UI.

## Comparison history

The preview harness initially placed the sidebar above the content because its parent lacked the real dashboard flex layout. Fixed the harness to reflect the app's flex layout, then captured corrected desktop and phone states. This was a preview harness issue, not a production component issue. Final full-view comparison and focused capture showed the intended composition.

## Interactions and limits

Six targeted tests pass: remount persistence, account isolation, separate video/campaign saves, quota failure, malformed-data protection, keyboard tabs and account-required storage. Actual browser QR generation produces a PNG image/download link. Checked browser error logs: none. Typecheck, full lint and production build pass. Actual admin authentication, later backend features and published site remain untested here.

## Implementation checklist

- Studio replaces Buffer panel only.
- Existing tools remain in their original order.
- No credentials, images or publish jobs stored by the stage-one component.
- Responsive composition and QR generation checked.
- Later integration recorded in BUILD.md and AI_HANDOFF.md.

final result: passed


## Stage-two wiring check — October 4, 2026

Same approved source visual above; compared it and the corrected stage-two create capture together in one image input. Evidence: `tmp/marketing-studio-stage-two/create-desktop.jpg` (1440 × 1000), readable `create-crop.jpg` (1091 × 867), and `review-mobile.jpg` (390 × 844). Preview: `http://127.0.0.1:5177/tmp/marketing-studio-stage-two/index.html?mobile=1`.

Six blue/white tabs and two-column create composition remain faithful to the approved layout. Existing typography, logo, Lucide icons, card outlines and responsive stacked form remain. Intentional scope copy now identifies text drafts/picture prompts and adds Save brief only beside creation. Slightly taller controls remain an acceptable P3 difference. No actionable P0/P1/P2 findings. Mobile document width 382px within 390px viewport; review controls readable with no horizontal overflow.

Review checked in browser: edit disables approval until saved, saved edits enable approval, approval clearly says nothing was posted, and console error log is empty. Preview uses a real generated fixture with isolated mock persistence, explicitly labeled preview-only. Real Supabase/OpenAI save → generate → list → edit → approve → delete was verified separately against the service. Full authenticated deployed admin flow remains unverified. All 113 frontend tests, 195 backend tests, typecheck, lint and production build pass.

Stage-two final result: passed


## Stage-three media check — October 4, 2026

New media flow follows the approved studio’s existing blue/slate/white card styles. Evidence under `tmp/marketing-studio-stage-three/`: `media-desktop.jpg` (1440×1000 viewport), `media-mobile.jpg` (390×844 viewport), real AI picture, branded picture and actual vertical/landscape MP4s. Existing six-tab composition retained; media preview is added inside saved campaign review. No new reference image required for the added behavior.

Desktop media cards are side by side; phone stacks them. Verified 1432px document within 1440px desktop and 382px within 390px phone; no console errors. Corrected primary video button to actual blue background/white text and removed mobile sticky approval overlay covering video controls. Video uses readable escaped captions over a dimmed picture, grouped by sentence with proportional timing. Free card, optional paid AI choice and private-save/download wording are explicit. Current videos are silent and this is visible in the UI. Accounts stay disconnected by Chris’s instruction.

Browser exercised preview picture creation, length/format saving and actual local rerendering. Separate real Supabase/OpenAI/FFmpeg integration verified durable storage/cleanup. Preview editing stays in memory; it is clearly labeled and has no production authentication bypass. Full signed-in deployed app remains untested. No remaining actionable P0/P1/P2 visual findings within this stage.

Stage-three final result: passed


## Marketing Studio — stage four voice/music (2026-10-04)

- Production controls: saved narration preview, AI voice cost label, recorded-voice upload, music selection/volume, captions/colour/speed. Explicit Save video settings gate before paid voice; stale or missing selected voice/music disables finished-video action. AI voice disclosure also burned into output. Phone narration options shortened to Voice on/off to fit narrow selectors.
- Tested local stage-four harness with actual previously generated AI picture and ONE actual AI voice; real FFmpeg voice/music render after speed/music controls changed. Initial minimum15s became29s to preserve voice; faster setting26s. Vertical540×960/landscape960×540 H.264/AAC, valid media metadata, nonzero decoded audio. Own voice/music uploads verified against actual private storage; test records/files cleaned.
- Desktop1440×1000: document1432px, no horizontal overflow. Phone390×844: document382px, video loads29s/no playback error, native audio controls fit, approval bar does not cover controls. No browser errors. Screens: tmp/marketing-studio-stage-four/desktop.jpg and mobile.jpg. Preview paid AI actions disabled explicitly; account edits are in-memory for demonstration. Deployed signed-in page not verified.
- Tests: full120 frontend+205 backend pass plus2 actual renderer regressions; typecheck/lint/build pass. No account connections/posting.


## Marketing Studio — motion/caption/ending polish (2026-10-04)

- Separate moving picture and fixed graphic layers keep text at a steady size and position. Gentle6% zoom, frame-counted soft caption fades; original logo/See a WOW Link ending holds3s after narration. Still/cut/no-ending settings preserve existing writing/voice. Voice-pause detection improves card boundary placement for free; timing still estimated, not word-level captions.
- Actual vertical540×960 and landscape960×540 H.264/AAC exports reused saved picture/voice, with no AI calls/DB writes. Vertical31s retains full narration plus ending. Extracted frames show readable captions, clean white logo tile and full CTA; background pixels change (mean7.19 outside caption area). FFmpeg renderer tests check complete sound, silent output, safe audio decoding and monotonic pause-adjusted timing.15 UI tests and22 combined targeted backend tests pass (21 then one additional regression), typecheck/lint/build/diff pass.
- Local preview tmp/marketing-studio-polish/index.html, helper127.0.0.1:5180. Paid AI buttons explicitly disabled; preview edits only. Browser controls actually rendered still/cut/no-ending and restored gentle/fade/ending. Desktop1440/phone390 layout checked; no overflow/media/browser errors. Evidence: controls-desktop.jpg, controls-mobile.jpg, ending.png, vertical.mp4/landscape.mp4 in same tmp directory. Authenticated deployed admin not verified; no social accounts/posts.


## 2026-10-05 — Loan officer blog

- Desktop index: clear LO headline, five topic filters, search and complete guide cards. Search for AI filters the visible cards; substring matching also returns titles containing “raise”.
- Actual article HTML contains body, canonical/OG, FAQ/Person/BlogPosting/Breadcrumb schema and useful source links before JavaScript. The page stays readable without a frontend bundle.
- Calculator browser test: 1200 + 300 / 3 = $500; zero funded loans is explicitly undefined. Results never require email. Real backend signed PDF and source=blog lead storage verified separately; disposable test lead removed.
- Production BlogEditor with a local in-memory backend: Save Draft and private iframe Preview work. A one-sentence short answer shows a visible publication blocker and leaves edits intact. No paid writing or external publication triggered in preview.
- Responsive reading uses a real390px iframe because IAB's documented viewport override did not change its rendered viewport. Document width and scrollWidth both390: no overflow. Header links wrap, article title fits, body18px. TOC anchor navigates inside the frame. Desktop preview uses normal836px window. Temporary viewport settings reset.
- Mobile Lighthouse on local production article template: performance100, accessibility100, SEO100; excludes production host latency. Full test suite:124 frontend/225 backend; lint, typecheck, build passed.
- Proof: `tmp/blog-studio/index-desktop.png`, `tmp/blog-studio/article-mobile.png`, `tmp/blog-studio/editor.png`. Local previews are review copies: actual starter content, draft banners, never published.
