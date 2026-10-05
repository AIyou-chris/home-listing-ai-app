# Cold email to loan officers: how to use it

Where: **Admin > Marketing Funnels > Cold email to loan officers**.

The goal of every email is one thing: a reply or a click from a loan officer who then starts the 7-day free trial or books a demo. The number that matters is **good replies per 100 emails**, not opens.

## One-time setup (Chris)

1. Run `cold-email-migration.sql` in the Supabase SQL editor (creates the prospect, batch, send and reply tables).
2. Pick a separate sending domain and add its DNS records: see `docs/COLD_EMAIL_DNS.md`. Check them with `node backend/scripts/check-cold-email-dns.cjs yourdomain.com`.
3. Set the Render variables in that doc, then connect the Mailgun reply route and webhooks.
4. Open the **1. Setup** tab. Every line should show a check mark. Press **Send a test to me** and look at the email's headers in your inbox (you should see `List-Unsubscribe`).

Until all of that is done, you can write, check and approve batches, but **nothing sends**.

## Each batch

1. **2. Prospects.** Paste a CSV (`email, first_name, last_name, company, city, state, fact, fact_url`) or press **Add from Lead Finder**. Press **Check the new ones** to confirm each address can receive mail. Business emails only. A personal "fact" is kept only when you give the source link; otherwise the writer uses a safe, general opener and never pretends to know them.
2. **3. Write and send.** Pick one angle and one opener, give the batch a test name (change one thing per batch), and press **Write a sample email** to see what it will say. Pick people (up to 100) and press **Make a batch**.
3. Press **Write the emails**. Each first email is written, then checked. A green check means it passed every rule; a red cross shows exactly which rule it broke. Open any email to edit it; **Save and check** re-runs the rules.
4. Press **Approve this batch**. This is the only thing that lets mail go out. Each approved person gets 5 emails over about 16 days (day 0, 3, 7, 11, 16): the opener, a live example, the math, the answer to their likely objection, and a friendly break-up. The first batch you ever approve is capped at 20 people.

## What the rules block

First email 55 to 110 words and 4 to 6 short sentences. Subject 2 to 6 words, no emoji, no ALL CAPS, no "Re:". No banned words (leverage, solution, seamless, "quick question" and the rest). At most one link, and none on a reply-only first email. Plain text only. No numbers or claims that are not in the approved facts (`backend/services/coldEmail/facts.js`). No promise words (approved, guarantee, lowest rate) and nothing that hints at paying for referrals. Every send also needs the postal address and a working unsubscribe line, which the server adds itself.

Before every send: not on the suppression list, address looks valid and its domain can receive mail, not a role address (info@, admin@), not emailed in the last 30 days.

## How sending works

- Only **Tuesday to Thursday, 7:30 to 9:30 am in the person's time zone** (or the afternoon test window), never on US holidays.
- Warm-up: 20 a day per mailbox, plus 12 a day each week, up to 60 (set `COLD_EMAIL_MAX_PER_MAILBOX` between 50 and 75). Several mailboxes take turns.
- It **pauses everything by itself** if bounces pass 3% or spam complaints pass 0.1%.
- It **stops a person's sequence** the moment they reply, unsubscribe, bounce or complain.

## Replies

A reply is sorted into: interested, not now, wrong person, unsubscribe, angry, out of office, other. "Interested" creates a lead (source `cold-email`) and emails you with a drafted answer. **Nothing is ever sent for you.** You write the second sentence of the conversation. Stop words ("stop", "remove me") suppress that person for good. If a reply landed in your own inbox, file it in the **Replies** tab.

## Results

The **Results** tab shows sent, replies, good replies per 100, clicks, bounces and spam complaints by angle, opener, email number and test name. A group needs 100 sends before it can be called a winner. The writer is told the current winner on the next batch. Trials started counts prospects who later signed up as a loan officer with the same email.

## Where things live

- Rules and the checker: `backend/services/coldEmail/rules.js`
- Writer prompt: `writer.js`. Emails 2 to 5 are fixed, checked wording in `templates.js` (no AI call, nothing that can drift).
- Schedule, caps, pause: `sequence.js`. Sending and replies: `engine.js`, `sender.js`.
- Routes: `backend/routes/coldEmailRoutes.js`. Screen: `src/components/admin/AdminColdEmailPanel.tsx`.
