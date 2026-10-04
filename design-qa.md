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
