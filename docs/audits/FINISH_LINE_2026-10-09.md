# Finish line (2026-10-09)

Honest rule: nobody can promise "100%, no gaps". This is the list of what stands between today and "a real customer can pay and use it safely". Everything not on this list was tested live or is a small cosmetic item.

## Already proven on the live site
Invite email, WOW page, claim + auto sign-in, publish, loan officer auto-attached, buyer chat answers (with the listing description), consent box, lead saved and sent to the right agent and loan officer with email + in-app alerts, STOP replies (signed, saved, honored), delete my account, spend stops, Sentry daily check.

## A. Blocker found today (money)
Stripe webhook for HomeListingAI sends invoice/payment events but NOT `checkout.session.completed` or `customer.subscription.*`. The app stores the customer's Stripe id from those events, so a paying loan officer would be treated as unpaid after the trial. Fix: add 5 events to the webhook in Stripe (needs Chris's yes) and add a safety net in code (look the customer up in Stripe if our record is empty).

## B. Chris only
1. Lawyer review: `docs/legal/LAWYER_BRIEF_2026-10-09.docx` and `PRIVACY_POLICY_DRAFT_2026-10-09.docx`. Then publish the privacy/terms and put links next to the consent boxes.
2. Render: confirm the web service is on the paid Starter plan (free sleeps and misses calls) and the September invoice is paid.
3. One real payment test with his own card ($79, then cancel).

## C. I can test with Chris's OK (each uses his own phone/email)
1. Brand-new loan officer signs up (7-day trial, onboarding, first WOW Link).
2. Automatic follow-ups: funnel emails/texts after a lead, appointment reminders, price-drop alerts.
3. AI phone call to the number (known bug: the caller's side of the transcript).
4. Reel render on the live server; Condo Check with a real PDF.
5. Phone view of the main pages by Chris's own eyes (the automated screenshots could not be viewed).

## D. After launch (not blockers)
Admin "uptime" and "last login" numbers look wrong; some tap targets are small; one old blueprint page logs an error; two-loan-officer edge case on listing caps; first-time agent still lands in an empty dashboard (no pre-filled listing).
