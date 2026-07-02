# Social Posting Runbook (LinkedIn + Facebook)

**Who this is for:** anyone on the team posting to our LinkedIn and Facebook from the HomeListingAI admin. No coding needed — this is all point-and-click.

**What it does:** You write a post once, pick which pages it goes to (LinkedIn and/or Facebook), and it posts to all of them. New blog posts can also share themselves automatically.

Behind the scenes it goes through **Buffer** (buffer.com), which is already connected to our LinkedIn and Facebook pages. You don't need a Buffer login to use the admin panel — but if you want to *reschedule or delete* something after it's queued, you'd do that in Buffer.

---

## 1. Where to go

1. Log in to the **admin dashboard** (ask Chris for access if you don't have it).
2. Left sidebar → **Marketing Funnels**.
3. Top card: **📣 Social Auto-Posting**.

You should see a green dot and **"Connected as homelistingai@gmail.com."**
If it says *"Not connected,"* stop — that's a setup issue, tell Chris.

---

## 2. Pick your pages

Under **"Post to these channels"** you'll see checkboxes:

| Channel | Network | Notes |
|---|---|---|
| Chris Potter | 💼 LinkedIn | text-only OK |
| AI You | 📘 Facebook | text-only OK |
| homelistingai | 📷 Instagram | **requires an image** |

*(This list mirrors whatever is connected in Buffer — if channels are added/removed there, the checkboxes update automatically.)*

✅ **Check the pages you want this post to go to.** Your selection is saved automatically and is also what auto-blog-sharing uses. A checked box turns blue.

> Tip: For HomeListingAI marketing, the usual pick is **AI You + Chris Potter**. Confirm the right set with Chris.

---

## 3. Write a post

1. In **"Compose a post,"** type **1–2 sentences** about your topic — just the idea.
2. Click **🪄 Write full post** — AI expands your idea into a complete, keyword-rich post (in our brand voice) with hashtags already on the last line. **Read it and edit anything you don't like** — it's your name on the post.
3. Or skip the magic wand and write it yourself, then click **✨ Add hashtags** to append ~5 relevant tags.
4. *(Optional)* **Add an image** — three ways:
   - **Drag a file** onto the dashed box (or click it to browse). Max 8MB.
   - **🔍 Stock photo** — search Unsplash (e.g. "modern home exterior"), click a thumbnail to attach.
   - **🎨 AI image from post** — generates a custom graphic based on your post text (~10 seconds).
   A preview appears; click **Remove** to swap it. ⚠️ **Instagram requires an image** — text-only posts to Instagram will be refused (LinkedIn/Facebook are fine without one).
5. *(Optional)* **Schedule** — pick a date/time to post later.
6. Click **Post**. ⚠️ **With no schedule set, the post goes LIVE immediately** on every checked channel — there is no undo from our panel. If a channel fails, a red toast tells you **which one and why**.

> You never need to open Buffer — posting is fully automatic from this panel.
> Blog auto-shares get hashtags added automatically — no button needed.

You'll get a green ✓ toast like *"Queued on 2 channels ✓."* Done.

### Timing
- **No schedule** → posts **immediately**.
- **Schedule set** → posts at exactly that date/time (our audience is **Pacific time**).

---

## 4. Auto-sharing blog posts

There's a toggle: **"Auto-share new blog posts to the selected channels."** The same setting also shows as a pill at the top of the **Blog Control Center** (📣 Auto-share on publish: ON → 3 channels) — click it there to flip it without leaving the blog page. It's one setting; both places stay in sync.

- **ON** → every time a blog post is **published**, it auto-posts to your checked channels (with the blog's featured image + auto hashtags). It only fires **once per post**, on first publish — editing a live post never re-posts.
- **OFF** → nothing auto-posts; you post everything by hand.

**Manual blog sharing:** in the **Blog editor** post list, every published post has a **📣 Share** button — click it to post that article to all checked channels *right now*. Works for old posts and re-shares (it will ask you to confirm first).

---

## 5. 📐 Image Golden Rules

**One rule to remember: post SQUARE (1080×1080) unless you have a reason not to.** Square renders well on LinkedIn, Facebook, and Instagram alike.

| Situation | Size | Ratio |
|---|---|---|
| **Default — safe everywhere** | **1080×1080** | 1:1 |
| Max Instagram engagement | 1080×1350 | 4:5 portrait |
| Wide "banner" look (LinkedIn/FB only) | 1200×627 | 1.91:1 |

Hard limits to know:
- **Instagram rejects** anything wider than 1.91:1 or taller than 4:5. Common casualties: widescreen screenshots (16:9) and full phone screenshots (9:16). Crop to square first.
- **File limit: 8MB**, PNG or JPG.
- The built-in helpers already follow these rules: **🎨 AI image** generates square, and **🔍 Stock photo** searches square-ish images. Rules only matter when you drag in your own file.

## 6. Brand voice (what good looks like)

- Plain-spoken, confident, a little contrarian. Value first, hype never.
- We sell to **loan officers** (and the agents they partner with). Two themes: **getting warm leads** and **building agent partnerships**.
- Signature line we've used: *"It's looking like 2006 out there."*
- Always sound like a real person, not a brochure. Short sentences. One idea per post.
- End with a light call to action when it fits (e.g. *"7 days free, no card."*).

*(Chris: confirm/adjust this section — it's the voice coworkers will copy.)*

---

## 7. If something goes wrong

| You see… | What it means | Do this |
|---|---|---|
| "Not connected" banner | Buffer token/org env vars missing on the server | Tell Chris |
| "No channels found" | Pages aren't linked in Buffer | Tell Chris (connect in Buffer → Channels) |
| "Post failed: …" or "(1 failed)" | One channel rejected it (often a disconnected/expired page) | Re-check that page in Buffer; try again |
| Post never appeared | It's probably sitting in the Buffer queue waiting for the next slot | Check Buffer → that channel's queue |
| Need to edit/delete a queued post | Our panel only creates posts | Do it in Buffer directly |

**Golden rule:** these posts go to our real, public pages. When unsure, save it as a draft idea and ask before posting.

---

*Questions or access → Chris.*
