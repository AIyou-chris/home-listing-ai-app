# LO Compliance Guardrails — Design Spec
**Date:** 2026-06-03
**Status:** Approved

---

## Problem

LOs work inside regulated environments. Their companies (banks, credit unions, mortgage brokers) have compliance departments that set strict rules about what can and cannot be said in marketing and borrower communications. Without built-in compliance controls, HomeListingAI cannot be sold to enterprise mortgage companies — their compliance departments will block it.

This feature solves two things simultaneously:
1. Hard-coded platform-level guardrails that are always on, regardless of what any LO configures
2. Per-LO compliance doc upload so each LO can layer their company's specific rules on top

---

## Golden Rules Impact

**New Rule 4 added to GOLDEN_RULES.md:**

> **4. Be Compliant by Default**
> The AI never puts an LO's license or their company's reputation at risk. Hard-coded platform rules are always on. LOs can layer their company's own compliance guidelines on top — uploaded once, enforced everywhere the AI speaks or writes on their behalf.

---

## Scope

Compliance rules apply to **all LO AI surfaces**:
- LO chatbot (live buyer chat on listing pages)
- Any AI-generated content the LO initiates (blog posts, marketing copy, captions)

---

## Platform Guardrails (Hard-Coded, Always On)

These are injected at the top of every LO AI system prompt. They cannot be removed or overridden by the LO.

1. **No legal advice** — Never provide legal advice of any kind. Always direct buyers to consult a qualified attorney for legal questions.
2. **No guessing** — If you don't know the answer to a question, never guess or speculate. Always refer the buyer directly to the loan officer or the real estate agent for clarification.
3. **Rate quotes only from LO** — Never quote specific interest rates or APRs unless they were provided by the loan officer in their knowledge base or uploaded rate sheets. Always encourage buyers to contact the LO directly for personalized numbers.
4. **Fair Housing** — Never discriminate or make comments based on race, religion, national origin, sex, disability, or familial status (Fair Housing Act).
5. **No guarantees** — Never guarantee loan approval, closing timelines, or specific loan terms without qualification.

---

## LO Compliance Doc Upload

LOs receive a compliance doc from their company's compliance officer and upload it once. The extracted text is stored and injected into every AI prompt as additional hard constraints.

**Supported formats:** PDF, Word (.docx), TXT
**Storage:** `lo_chatbot_configs.compliance_rules TEXT`

---

## Database

Single migration — one new column on the existing table:

```sql
ALTER TABLE lo_chatbot_configs
ADD COLUMN IF NOT EXISTS compliance_rules TEXT DEFAULT '';
```

No new tables required.

---

## System Prompt Architecture

Every LO AI call assembles its system prompt in this fixed order:

```
[1] PLATFORM GUARDRAILS
    Hard-coded. Always present. Always first.

[2] LO COMPLIANCE RULES
    Extracted text from uploaded doc. Injected as hard behavioral constraints.
    Omitted if LO hasn't uploaded a doc.

[3] PERSONALITY + KNOWLEDGE BASE
    LO's tone, product knowledge, rate sheets, FAQs.

[4] TASK / USER MESSAGE
```

Ordering is intentional — compliance at the top gives it highest precedence.

---

## UI — Compliance Tab in Chatbot Setup

A new **"🛡️ Compliance Rules"** tab added to the existing LO Chatbot Setup page (`/dashboard/lo-chatbot`).

**Tab layout:**

1. **Platform Guardrails section** (read-only)
   - Header: "Platform Guardrails · Always On · Cannot be removed"
   - Lists all 5 rules with a locked visual treatment (red left border)
   - No controls — display only

2. **Your Company's Compliance Rules section**
   - Helper text: "Get a compliance doc from your compliance officer. Upload it here and the AI will follow those rules in every response."
   - If no doc uploaded: file drop zone (PDF, Word, TXT, max 10MB)
   - If doc uploaded: shows filename, upload date, "X rules extracted" count, active status, and a Remove button
   - Replace option always available

3. **Save button**

---

## Backend Changes

### New column in PUT /api/lo/chatbot-config
Accept and save `compliance_rules` in the existing upsert.

### Compliance text extraction
Reuse the existing `chatbotFileUpload` multer config and PDF/text extraction logic from `/api/lo/chatbot/extract-file`. No new extraction infrastructure needed.

### New endpoint: DELETE /api/lo/chatbot/compliance-doc
Clears `compliance_rules` for the authenticated LO.

### System prompt helper: `buildLoSystemPrompt(config)`
Extract prompt assembly into a shared helper so both the chatbot route and any future LO content generation routes use the same compliance-first ordering. Called from `/api/public/lo-chat` and any LO AI content endpoints.

---

## What Doesn't Change

- `knowledge_base` column — unchanged, still stores product/rate knowledge
- Existing FAQ, personality, bot_name fields — unchanged
- Agent-side AI features (listing descriptions, blog) — not affected; compliance rules are LO-scoped only

---

## Files Affected

| File | Change |
|---|---|
| `GOLDEN_RULES.md` | Add Rule 4 |
| `backend/server.cjs` | Add `compliance_rules` to PUT config, add DELETE endpoint, extract `buildLoSystemPrompt()`, update `/api/public/lo-chat` to use helper |
| `src/components/dashboard-command/LOChatbotPage.tsx` (or equivalent) | Add Compliance Rules tab |
| Migration SQL | `ALTER TABLE lo_chatbot_configs ADD COLUMN IF NOT EXISTS compliance_rules TEXT DEFAULT ''` |
