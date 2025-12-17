# 🚀 Deployment Handover Prompt

**Copy and paste this into your new chat:**

---

## 🤖 System Context & Deployment Request

Hi! I am working on **HomeListingAI**, a Real Estate platform.
**Architecture:**
*   **Frontend:** React + Vite (Hosted on **Netlify**).
*   **Backend:** Node.js + Express (Hosted on **Render**).
*   **Database:** Supabase.
*   **Repository:** GitHub (Branch: `main`).

**Current Status:**
I have just implemented **Stripe Connect V2** (Server-side webhooks + Frontend Storefront). The code is written locally but needs to be **deployed**.

**My Request:**
1.  **Deploy Code:** Guide me through the `git add`, `commit`, and `push` commands to trigger the automatic deployments on Netlify and Render.
2.  **Environment Variables:** Remind me which keys I need to add to Render (e.g., `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) for the new features to work.
3.  **Docker Question:** I've heard about "Docker". Do I need to set up a Dockerfile for Render, or does it handle Node.js automatically? (Prefer the simplest path).

**Immediate Goal:** Get the new Stripe Connect features live on `homelistingai.com`.

---
