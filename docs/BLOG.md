# HomeListingAI blog

The blog is for loan officers and their agent partners. It reuses the existing Blog Control Center and `blog_posts` table. Publishing creates review drafts in Marketing Studio; it never connects or posts to social accounts.

## Write an article

1. Open the admin Blog page.
2. Pick a topic. Open a draft with **Edit**, or choose **Write article from brief**.
3. Read everything. Check every example, product statement and compliance point.
4. Edit the article, short answer, questions, picture description and search listing.
5. Click **Save Draft**, then **Preview saved draft**.

AI writing uses the existing OpenAI account and costs money. Each saved brief has three writing attempts, with no automatic paid retry. Editing, previewing, the calculator and PDF creation make no AI calls. The ten starter articles have already been written: review them instead of regenerating them.

## Publish or schedule

Click **Publish** when the article is ready, or pick **Publish later** and click **Review & schedule publication**. The date picker uses your local time; the server stores UTC. A checked schedule is your instruction to publish at that time. The backend checks due articles every minute while it is running.

Publishing is blocked if the article fails its writing checks. Fix the listed items and save again. Drafts can be saved while incomplete. Reload before saving if another editor changed the article.

A complete guide needs 2,500–4,000 words. A focused article needs 1,100–1,800. Every article needs five to eight descriptive sections, two step lists, a copyable script, a short answer of two to four sentences, three to five questions, useful internal links and picture alt text. Product mentions belong in the second half, at most twice. Compliance articles end with the required note. Checks support your review; they cannot verify every factual or legal claim.

Publishing also prepares LinkedIn, Facebook, email and three quote-card lines in Marketing Studio. They remain drafts. It adds incoming links from two older articles when available, preferring the same topic and using older unassigned articles if needed. Saving a published article retries incomplete sharing/link work. It does not replace sharing drafts you already edited.

## Keep the blog useful

- First month: publish the five complete guides and five referral articles, two to three a week.
- Months two and three: two focused articles a week; one in five is for agents.
- Your separate social plan is two posts each day.
- Each month, refresh two old articles: check facts, sources, examples and links, then save the update.
- Each quarter, look at Search Console queries where the site ranks 8–20. Improve the relevant article or write a new brief.

## Downloads and privacy

Calculator results are free without an email. Pitch scripts, the co-marketing review checklist and the calculator PDF require name, email and explicit download consent. They save to the existing lead inbox with source `blog` and the article slug. This does not grant newsletter or text-message consent. Downloads have signed links that expire after 15 minutes. No email or SMS is sent by the download handler.

The lead owner comes from the server-only `blog_settings` record, not the visitor. It is configured. Download signing reuses a derived backend database secret unless `BLOG_DOWNLOAD_SECRET` is supplied. Browser clients never receive either secret. Article/scroll/click/download/trial events store a slug and event type without contact details in server-only `blog_events`.

## Routes and search

`/blog`, topic pages, articles, the author page, RSS and the calculator return complete HTML. Netlify forwards these paths to the existing Render backend. The build also creates static versions with the same renderer. Draft article URLs return 404 publicly; authenticated previews are private and noindex. Drafts, briefs and scheduled articles never appear in RSS or the sitemap. Existing published articles remain in the CMS.

On publication, IndexNow submits the article and sitemap URLs. Set a valid `INDEXNOW_KEY` in the backend environment; its proof file is served at `/blog/indexnow-key.txt`. This key is currently missing. Submit the sitemap in Search Console separately; Google's Indexing API is not used for ordinary articles. Scheduled publishing requires the existing backend to stay running.

## Current state and verification

The database migration and starter library are saved: 36 records, ten complete drafts and 26 briefs. This is five complete guides, 28 focused article records and three tool briefs. No starter article was published. Code is local and not deployed yet. Chris's real author photo and verified LinkedIn URL are still needed; no substitute identity was invented.

Local review: http://127.0.0.1:5181/blog and http://127.0.0.1:5177/tmp/blog-studio/index.html. These display actual saved draft content using the production page/editor components, with local in-memory edits. Paid writing, public publishing and lead submission are disabled in that review copy. Real database lead capture and signed-PDF generation were tested separately; the disposable test lead was removed.

Mobile Lighthouse article audit: performance 100, accessibility 100, SEO 100. This is a local production-template measurement, not a claim about deployed network speed. Automated checks cover all ten drafts, HTML/schema, sitemap exclusions, publication blocking, concurrent-edit protection, linked sharing drafts, older incoming links, scheduled invalid content, consent and signed PDF expiry/tampering. Frontend tests cover visible publication errors and UTC scheduling. See `design-qa.md` for browser proof.

## Implementation notes

- `backend/blog/` adapts the original An AI You editorial rules, renderer helpers and IndexNow helper from `/Volumes/GFY/EatADick/ai-landing-template/server/lib/marketing/`. HomeListingAI uses its existing CMS columns (`content`, `seo_description`, `featured_image`) rather than a second article store.
- `blog-brief.cjs` and `rules.cjs` are the shared writing standard. Hub length, separate FAQ fields, mortgage voice and planned internal links are HomeListingAI adaptations.
- `seed.cjs` is an explicit idempotent import, never startup publishing. It skips existing slugs and cannot overwrite an edited article.
- `blog_settings` and `blog_events` deliberately have RLS and no browser policy. Only the verified backend can write them. Old broad agent-write policies on the platform blog were removed.
- Official compliance sources used in drafts: [CFPB Regulation X §1024.14](https://www.consumerfinance.gov/rules-policy/regulations/1024/14/) and [CFPB RESPA FAQs](https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/real-estate-settlement-procedures-act/real-estate-settlement-procedures-act-faqs/).
