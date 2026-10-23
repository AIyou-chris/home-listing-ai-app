# Listing video plan: bring the code-video system into sharing

Written 2026-10-20. Nothing here is built yet. Costs marked (estimate) were not measured live.

## What exists today
- **Share Kit** (LO page): link, QR, flyer, social post, and a "Make my reel" card.
- **Reel** (`listingReelService.js`): 9:16 video from the listing's photos, spoken voiceover (OpenAI voice), captions, slow zoom, end card with LO name, NMLS, Equal Housing and "AI-generated voice". Limits already in place: 5 an hour per LO, 40 a month per account, 60 a day overall (`spendGuard`).
- **Reels are OFF.** Handoff of Oct 9: "Could not read the voiceover length." The reel code picks `ffmpeg-static` first, and that package's file is missing on Render (build uses `--ignore-scripts`). The Marketing Studio uses the server's own `ffmpeg` and works live. So the reel most likely just needs to fall back to the server's ffmpeg. Not yet tried.

## What the new code-video system adds
Free videos drawn in code: no paid video AI, about 3 seconds to make, about 0.75 MB each, music included, every word comes from settings.

## Outline
1. **Turn reels on (about 1 hour).** Make the reel find ffmpeg the same way the Studio does (system ffmpeg when the bundled one is missing). Test one live reel. Risk: memory on the 512 MB plan (see cost).
2. **"Ask the AI" video for each listing (about 1 day).** In the Share Kit, one tap makes a 20-second chat video for THIS listing: the buyer asks a real question about the home, the AI answers from the listing's own facts (and says it is an AI), the lead goes to the loan officer. End card carries the LO name, NMLS, photo, Equal Housing and the tracked link. Uses the chat scene with listing and LO details filled in. No paid AI.
3. **Photo scene (1 to 2 days).** A new scene that uses the listing's photos as the background and puts the chat on top, so the video looks like the home, not a sample. This replaces the spoken voiceover (saves the voice cost) or sits at the end of the existing reel.
4. **WOW Link video for agents (about half a day).** A 25-second "here is what your listing looks like with a loan officer's AI" video in the WOW Link email and page. Golden rule #2: the agent sees it before they sign up. Same scenes, the agent's name and the listing address filled in.
5. **Sharing (about 1 day for the simple version).** Download button, copy link, phone share sheet. Posting straight to the LO's own Facebook, LinkedIn or Instagram needs each LO to connect their accounts (like the Connected Accounts we built for the marketing suite); that is a later step.
6. **Per-LO look (small).** Name, NMLS, colour and logo come from the LO profile (the same "one settings file" idea, per LO).

## Safety (already how the scenes work)
- Words are cut to fit; every scene's text is tested against the banned-claims list (no rates, promises, guarantees or statistics).
- The helper always says it is an AI. Equal Housing and NMLS on the end card.
- LO-written text (if allowed) must pass the same check before it is drawn.

## Cost (estimates)
| Item | Cost |
|---|---|
| Drawing a code-video | $0 AI. About 3 seconds of server time. |
| Storage | About 0.75 MB a video. 1,000 videos is about 0.75 GB. Supabase storage is roughly a couple of cents a GB a month (estimate). |
| Spoken voiceover (only the photo reel) | OpenAI speech, roughly 1 cent or less for a 25-second reel (estimate). Already capped by `spendGuard`. |
| Server memory | The server is on Render "Starter" (512 MB). Photo reels at 720 px are the heaviest part. If reels go live for many LOs, plan on the next size up (about 2 GB). Render's price for that step is about $18 a month more (estimate, check Render's pricing page). The explainer videos are light. |
| Build time | Step 1: 1 hour. Step 2: 1 day. Step 3: 1 to 2 days. Step 4: half a day. Step 5 (simple): 1 day. Total about 4 to 6 days of work. |

## Decisions for Chris
1. Do LOs get these free on the $79 plan, with the existing monthly reel caps? (Recommended: yes, 40 a month per account, the cap already in place.)
2. Voiceover or music only? (Recommended: music only for the new videos; keep the voice for the photo reel.)
3. Start with step 1 + 2 (reels on and the per-listing explainer)?
