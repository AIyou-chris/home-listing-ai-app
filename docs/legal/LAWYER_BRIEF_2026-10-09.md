---
title: "HomeListingAI: brief for a mortgage compliance attorney"
subtitle: "Prepared 2026-10-09 by Chris Potter. Not legal advice. Facts are from the live product."
---

## What I am asking for

A flat-fee review (a few hours) from an attorney who handles **mortgage origination compliance (RESPA, Reg Z, SAFE Act) and TCPA/privacy**. I want three things back: (1) a clear yes, no or "only if we change X" on the business arrangement below; (2) edits to the wording and disclosures listed in section 5; (3) a short list of what I must never say or do. I am a founder with a mortgage background, not a lawyer, and I want to launch carefully.

## 1. What the product is

HomeListingAI sells a monthly subscription to **loan officers (LOs)**: $79, $149 or $299 per month after a 7-day free trial (no card). The LO invites **real estate agents** they work with. The agent gets a **free account** and a **free AI listing page** (photos, details, a chat that answers buyer questions, QR code, flyer, short video). The page carries the LO's name, photo, company and NMLS number ("Financing by ...") and a link "Powered by HomeListingAI". A buyer who chats and chooses to share a phone or email is a **lead**, delivered to **both the listing agent and the LO**.

## 2. How money and value move (the part I most want reviewed)

- **LO pays us.** The agent pays nothing to us.
- **Agent receives something of value for free:** the listing page, AI chat, QR code, flyer, video and lead alerts, all branded with the LO.
- **LO receives leads:** buyers who asked about a home the agent listed and agreed to be contacted. The LO also sees the agent's buyer chat summary for that lead.
- **No payment goes between LO and agent through us.** There is an optional **invoice tool**: an LO can send an agent an invoice for "their share of a marketing cost". The LO types the description and the dollar amount. We create, email and track the invoice only. We do not collect money. The tool does **not** check fair market value or ask the LO to document services.
- **How agents are recruited:** the LO sends a link by email (from our system) or copies a ready-made text and sends it from their own phone. The link opens a demo of a listing with the LO's chat built in, then "claim your free account".
- **Nothing in our product or terms asks an agent to refer buyers to the LO.** The page does show the LO as the financing contact, and the chat offers a pre-approval form.

## 3. What happens when a buyer uses a listing page

1. The AI chat answers questions about the home. It is told never to give legal advice, guarantee rates or approvals, discuss protected classes (Fair Housing), or guess; it hands off to the agent when unsure. The LO's own compliance rules are added on top.
2. A payment estimate calculator shows a default of 7.1%, 30-year fixed, with this text: "Equal Housing Opportunity. Payment figures are estimates, not a loan offer or commitment to lend. Rates, terms and approval depend on your situation. AI answers are general information; your loan officer confirms the details."
3. The buyer is asked for an email or phone. A checkbox must be ticked: "I agree that the listing agent and [LO name], the loan officer may contact me about this home by call, text or email. Msg & data rates may apply. Reply STOP to opt out. No obligation." We record consent for texts. The confirmation names both the agent and the LO.
4. A separate short **pre-approval form** (contact, timeline, price range style questions) says: "No credit check. This is not a loan application or a commitment to lend. [LO], NMLS [number], may contact you by text, phone or email."
5. The LO and the agent are alerted by in-app notice and email (and text where set up) within seconds.
6. Optional per-listing **AI phone number** for the LO: the AI answers, says it is an AI assistant and that the call is transcribed, can transfer to the LO, then stores a transcript, summary and a hot/warm/cold rating. Callers are not asked for a separate recording consent beyond that statement.
7. Optional **price-drop text alerts**: a buyer enters a phone number; the box says "By tapping, you agree to get texts about this home... Reply STOP to opt out."

## 4. Other facts that may matter

- We store buyer details for both the agent and the LO. Retention: lead data 3 years unless deletion is requested. Vendors: Supabase (database), OpenAI (AI answers), Stripe (billing), Mailgun (email), a text-message provider, Telnyx (phone).
- AI-written content: listing descriptions and marketing drafts follow a rule set; the LO or agent reviews before use. A condo/HOA document reader extracts facts from PDFs; the LO must tick "I checked these against the document" before facts are used, and the AI is told never to say a loan is or is not approved or eligible.
- **Our own outreach to loan officers** (to sell the product): email with an unsubscribe link and a postal address, a do-not-contact list, and a limit on sending; texts and LinkedIn messages are copied and sent by a human. Contacts are found with a lead-finder tool from public business listings.
- Public pages already state a "Compliance Policy" and "Marketing Guidelines" (RESPA, Reg Z, TCPA, CAN-SPAM, SAFE Act summaries written by me, dated May 2026, with a "not legal advice" line).
- Privacy policy is dated May 2026 and does not yet mention AI phone calls, call transcripts, or all vendors.
- Customers: none yet. This is pre-launch.

## 5. Questions

**A. The core arrangement (RESPA Section 8 / Regulation X)**

1. Is giving agents a free branded listing tool, funded by the LO, a "thing of value" given in exchange for referrals? What facts would make it safe (no promise to refer, LO-branded advertising only, written terms)? What facts would make it unsafe?
2. The LO also gets the buyer lead from the agent's listing. Does that change the analysis?
3. The invoice tool lets an LO bill an agent a "share" of a marketing cost. What must exist for that to be defensible (fair market value, documented services, who may set the amount)? Should I remove the tool, add guardrails, or add a required attestation?
4. Does the product need a required acknowledgement from LO and agent (for example "no referral obligation") at invite or claim time?
5. Should an affiliated business or similar disclosure appear on the page?

**B. Advertising and disclosures (Reg Z, SAFE Act, state rules)**

6. Does the payment estimate (default 7.1% rate) make the listing page a credit advertisement with trigger terms? Is the current text enough, and what should the default be?
7. Is "Financing by [LO], NMLS [number]" plus the Equal Housing line enough? Do some states need more (license number, state license language, company NMLS)?
8. The page is the agent's listing page and also the LO's advertisement. Who is the "advertiser" and what must each party disclose?

**C. Contact and consent (TCPA, state telemarketing laws)**

9. Is one checkbox that names the agent and the LO enough consent for both to call and text? Must consent name each party separately, or be a separate box per party?
10. Is a consent recorded at the moment of sharing a phone number enough for automatic text alerts (new lead, reminders, price drops)? What records must I keep and for how long?
11. Our texts to **loan officers** (sales outreach) are sent by a human from their own phone. Is that approach sound, and what about LinkedIn and cold email (CAN-SPAM)?

**D. AI, recording and privacy**

12. What disclosures do state laws require for AI chat and AI phone calls? Is "this is an AI assistant and the call is transcribed" enough in all-party-consent states?
13. Is it appropriate for the AI to answer general mortgage questions on the LO's behalf? What must the platform and LO rules forbid?
14. The LO is likely a GLBA financial institution, the agent is not, and we hold data for both. What roles do we hold (service provider)? What must the privacy policy and terms say, including California and other state privacy laws?
15. Should the AI refuse or hand off questions about loans in a state where the LO is not licensed? (We store licensed states, but the buyer chat does not block yet.)

**E. Our own risk**

16. Do the Terms of Service, Refund Policy, Compliance Policy and Marketing Guidelines pages say anything that reads as legal advice, a guarantee, or that creates liability for me? Please mark up what to change.
17. Which statements must I never make in marketing (for example "pre-qualified leads," "compliant," "guaranteed")? I removed several this week; please review the rest.
18. Is there an entity, insurance (E&O, cyber) or contract (LO agreement) I should have in place before the first customer?

## 6. Pages and files to review

- Marketing Guidelines: https://homelistingai.com/marketing-guidelines
- Compliance Policy: https://homelistingai.com/compliance
- Terms: https://homelistingai.com/terms
- Privacy: https://homelistingai.com/privacy
- Refund policy: https://homelistingai.com/refund-policy.html
- Pitch page for loan officers: https://homelistingai.com/for-loan-officers
- Demo of what an agent sees (no login): https://homelistingai.com/partner-invite/demo
- Demo listing page with buyer chat and consent box: https://homelistingai.com/l/test1234
- Launch audit and plan (technical, optional): `docs/audits/INVESTOR_REVIEW_PLAN_2026-10-08.md`

## 7. What I will not do until I hear back

I will not run an outreach campaign to loan officers, and I will not promote the invoice tool.
