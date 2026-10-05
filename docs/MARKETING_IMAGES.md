# Marketing pictures

Your pictures live in **Marketing Studio → Picture library**. Nothing here publishes a post. Blog auto-publishing and automatic social sharing stay off.

## Make a picture

1. Open a saved campaign and save any changes to its words.
2. In **Make your picture**, choose the size. Leave Scene on **Choose a scene for me**, or pick one of the 40 scenes.
3. Add a short headline: eight words at most. The small line is optional.
4. Read the price shown beside **Make three choices**, then press it once.
5. Choose a picture and open the full picture to inspect it.

The photos use natural working moments. Words and the HomeListingAI logo are added afterward, so the image model never draws your headline or logo.

## Tweak it

For another photo, type a few words such as “warmer,” “less busy,” or “move the person left,” then press **Regenerate this choice**. Only that choice is remade. The original stays saved.

To change only the headline, small line or size, press **Apply size and words · free**. That uses the saved photo and makes no AI call. Check the new layout before using it.

After using a checked choice, **Make high-quality final** refines that exact background. The final is another private choice and needs its own review.

## Check and use it

The tool checks picture dimensions, file size, readable words or marks in the generated background, headline space, contrast, and a plain picture description. A failed check blocks **Use this** and gives a reason.

Look carefully at the full photo. Check **Real-looking?**, **One idea?**, **Matches brand?**, and **Nothing misleading?**, then press **Use this**. In a campaign, that attaches the picture. In the library, that saves it as a checked reusable picture. Neither button publishes anything.

These checks help find problems; they do not replace your judgment about hands, faces, misleading scenes or legal requirements.

## Use your own photo

The existing upload button still works. Your uploaded photo takes priority and starts no AI picture call. The existing “Describe the picture” choice keeps your description and adds the house style. A free branded card is still available too.

## Reuse a checked picture

Open another campaign and choose a checked library picture. Press **Use this** to attach it. Use the free layout button for another size.

In the blog editor, press **Choose from picture library** to select a checked cover. Save and preview the article first. The cover remains private until the article is manually published. The next blog post must use a different hero from the previous published post.

The editor keeps its own uploaded-photo and photo-search choices. This new review gate applies to pictures made through the AI library.

## Sizes and downloads

Available sizes: blog 1536 × 1024; blog share 1200 × 630; LinkedIn header 1584 × 396; LinkedIn post 1200 × 1200 or 1200 × 627; Instagram/Facebook 1080 × 1350 or 1080 × 1080; story/Reel cover 1080 × 1920; email 1200 × 600; landing hero 1536 × 1024.

Photos are cropped to fit, never stretched. Web pictures are WebP by default, limited to 250 KB. Social pictures are JPG by default, limited to 1 MB. The compositor also supports AVIF and PNG. **Open full picture** opens the finished file for download.

## Cost

Three medium drafts cost about **3.3 cents for square pictures** or **4.5 cents for wide/tall pictures**. One medium remake is about 1.1 or 1.5 cents. One chosen high-quality final is about 3.6 or 5.2 cents, plus its reference-image charge. Prompt writing and the small visual word/mark check add usage charges. These are estimates, not an invoice. There are no automatic paid retries, and a campaign has at most three paid picture requests. One request can be the three drafts, one can be a tweak, and one can be the final.

These figures use the existing GPT Image 1 Mini model. [OpenAI image documentation and prices](https://developers.openai.com/api/docs/guides/image-generation).

## Sample ideas

**Load sample ideas · free** adds six ideas with three choices each: two blog heroes, two LinkedIn pictures, one email header and one landing hero. They are already made; loading them makes no AI calls. All wait for your review. Repeated loading does not duplicate them.

The original private files are saved in `backend/assets/marketing-images-review/`. They are not exposed as public website assets. The local review page is http://127.0.0.1:5177/tmp/marketing-images/index.html; the phone review is http://127.0.0.1:5177/tmp/marketing-images/mobile.html. These links work on this computer while its preview server is running.

## Results

**Best performing scenes** uses real article views, button clicks and deep reads from the existing blog tracker. New events carry the actual cover's ID. Old events without an image ID are not guessed or reassigned. The writer gently favors scenes with at least 20 tracked views. This is a helpful signal, not proof that a picture caused a result. Social results wait until accounts are connected.

## Still waiting

The private image-library database update was applied with Chris’s OK on October 5, 2026. Live saving and private-download checks passed. The new screen still needs deployment. No push or publication was made as part of this build.

Ads that require lending identification need an official Equal Housing Lender asset and a verified NMLS number. The tool refuses a lending-ad render without them. It never invents either. No official lender asset or verified number is present in this project yet.

## Maintainer notes

- Reuses `createMediaService`, its private bucket, owner checks, version checks, paid-attempt cap and media approval gate. The former one-picture AI shortcut now points users to the reviewed picker; uploads, free cards, narration and FFmpeg rendering retain their existing paths.
- Shared brand-aware `heroImagePrompt` was adapted from An AI You. HLAI blue/font values match Tailwind tokens; indigo/amber match Tailwind's defaults. An AI You's palette comes from its MarketingShell tokens. Only HomeListingAI's compositor/logo is integrated into this app.
- Migration: `supabase/migrations/20261005233000_marketing_image_library.sql`. Private service-only RLS table, WebP/AVIF bucket types and image IDs on blog events. Applied to production with Chris’s approval on October 5, 2026.
- OCR uses local Tesseract when present, plus the existing OpenAI client for word/mark extraction. On servers without Tesseract, the vision extraction is the OCR fallback. A failed extraction blocks use. The empty-space check is a conservative edge-density heuristic; the human review is mandatory.
- Inter is bundled under its SIL Open Font License from Google's font repository. Sharp's font-file support ensures the actual brand font renders without relying on a server-installed font. [Sharp text API](https://sharp.pixelplumbing.com/api-constructor/), [Inter license](https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt).
- The explicit local sample script accepts `--generate` and saves receipts before composition, so layout fixes reuse already paid backgrounds. It is never run by a scheduler or startup hook.
- Blog previews use signed private picture URLs. Public hero bytes require a due published article referencing a checked image; guessed draft/sample IDs return 404.
