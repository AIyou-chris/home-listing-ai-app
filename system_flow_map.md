# 🗺️ HomeListingAI System Flow & Architecture Map

## 1. Core User Journey (Current)

### Phase 1: Acquisition
1.  **Landing Page** (`/`)
    *   Visitor lands, sees value prop.
    *   Click "Start Free Trial" -> Goes to `/signup`.
2.  **Sign Up** (`/signup`)
    *   User enters First Name, Last Name, Email.
    *   Calls `agentOnboardingService.registerAgent()`.
    *   **Backend:** Creates `auth.users` record and `agents` table entry.
    *   Redirects to `/checkout`.
3.  **Checkout** (`/checkout`)
    *   Stripe Payment Element.
    *   On Success -> Redirects to `/dashboard`.

### Phase 2: Onboarding & Dashboard
4.  **Dashboard** (`/dashboard`)
    *   **Protected Route:** Requires Active Session.
    *   **Current Behavior:** Shows data for the *logged-in user*.
    *   **URL:** `homelistingai.com/dashboard` (Generic URL).

---

## 2. Feature: Slug-Based Access (Implemented vs. Planned)

The system currently uses **Slugs** (URL-friendly names like `chris-potter`) for *public* pages, but the user wants to extend this to the *private* dashboard.

| Feature | URL Pattern | Status | Description |
| :--- | :--- | :--- | :--- |
| **Storefront** | `/store/:slug` | ✅ **Live** | Public page showing an agent's products. Uses `slug` to fetch Agent ID. |
| **AI Card** | `/card/:id` | ⚠️ **Mixed** | Currently uses ID. Should ideally move to `/card/:slug` for SEO. |
| **Dashboard** | `/dashboard` | 🔄 **Change Req** | Currently generic. **Goal:** Move to `/dashboard/:slug`. |

---

## 3. 🚀 Future Requirement: Slug-Based Dashboard
**Objective:** The user wants the Dashboard URL to reflect the agent's identity, e.g., `homelistingai.com/dashboard/chris-potter`.

### Implementation Plan for Next Agent
To achieve this, the following changes are needed:

1.  **Update Routing (`App.tsx`):**
    ```typescript
    // Change from:
    <Route path="/dashboard" element={<Dashboard />} />
    // To:
    <Route path="/dashboard/:slug" element={<Dashboard />} />
    ```

2.  **Validation Logic (`Dashboard.tsx`):**
    *   Get `slug` from URL params (`useParams()`).
    *   Get `currentUser` from Supabase Auth.
    *   **Security Check:** Verify that `currentUser.slug === slug`.
        *   If match -> Render Dashboard.
        *   If mismatch -> Redirect to correct slug OR 403 Forbidden (prevent iterating other dashboards).

3.  **Redirects:**
    *   Update Login/Signup flows to redirect to `/dashboard/${user.slug}` instead of just `/dashboard`.

### Why this matters?
*   **Identity:** Confirms to the agent they are in *their* specific space.
*   **Multi-Tenancy:** Sets groundwork for potential agency features (e.g., Admin viewing `/dashboard/agent-a`).

