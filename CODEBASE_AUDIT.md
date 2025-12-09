# Codebase Audit & Roadmap

## 1. High Priority: Code Consolidation (Cleanup)

**Challenge:**
There is redundant logic for sending emails via Mailgun.
- `backend/server.cjs` contains a `sendMailgunEmail` function and `createMailgunHandler`.
- `backend/services/emailService.js` (which I recently updated) *also* contains `sendViaMailgun`.

**Action:**
We should rely on `emailService.js` as the single source of truth for email logic. The code in `server.cjs` is likely legacy or a disconnected implementation.

**Fix:**
- Remove `sendMailgunEmail` and `createMailgunHandler` from `server.cjs`.
- Ensure all email sending routes in `server.cjs` use the imported `emailService` instance.

## 2. Persistence & Scalability

**Challenge:**
The backend heavily relies on "In-Memory Fallbacks" (`localAiCardStore`, `localConversationStore`, `bpMemoryStore`).
- Code check: `const useLocalAiCardStore = !Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);`
- If you were to deploy this to a serverless environment (like Vercel functions or AWS Lambda) or restart the server, **all data in these Maps would be lost** unless the Supabase key is correctly configured and the tables exist.

**Action:**
- Confirm Supabase connection is critical.
- Ensure the database schema actually supports all the features (`ai_conversations`, `ai_kb`, etc.).
- Deprecate the in-memory stores to prevent "it works on my machine" bugs where data disappears on restart.

## 3. AI Conversation Management

**Challenge:**
The `/api/continue-conversation` endpoint blindly accepts a list of messages.
- As conversations grow (e.g., 50+ messages), sending the entire history to OpenAI will eventually hit token limits or become very expensive.
- There is no "context window" management (e.g., summarizing older messages or dropping them).

**Action:**
- Implement a sliding window approach (keep last N messages).
- Or implement a summarization step for older history.

## 4. Security & Validation

**Challenge:**
- Webhook endpoints (like the one I just added) are open. In production, we should verifying signatures (e.g., verifying the request came from the expected sender).
- User ID handling: Some endpoints accept `userId` in the body (`req.body.userId`). In a secure app, `userId` should be derived from a validated Authentication Token (JWT) in the headers, not trusted from the user's input.

## 5. Frontend Cleanliness

**Challenge:**
- Temporary/Backup files detected: `src/components/AdminLayout.tsx.bak`, `AdminLayout.tsx.bak2`.
- These clutter the codebase and can lead to confusion.

**Action:**
- Delete `.bak` files.

---

## Recommended Immediate Next Steps

1.  **Refactor Server:** Remove the duplicate Mailgun code in `server.cjs`.
2.  **Clean Up:** Delete `.bak` files.
3.  **Verify DB:** Ensure strictly using `emailService` for all mail operations.
