# Agent Dashboard Blueprint Roadmap

We now have an `AgentDashboardBlueprint` component that mirrors the existing demo dashboard so we can iterate module by module. Suggested sequence for enhancements:

1. **Hero / Overview header**
   - Swap demo copy for production-ready onboarding text.
   - Surface agent slug + onboarding progress and include quick links to profile, templates, funnels.

2. **Stats row**
   - Replace static counts with Supabase queries (listings, new leads, active automations, pipeline velocity).
   - Add tooltip definitions and CTA links for each metric.

3. **Appointments column**
   - Switch to pulling from `appointments` table via Supabase with filters by agent_id.
   - Provide empty state messaging + CTA to connect calendar if none exist.

4. **Leads column**
   - Integrate live lead scoring surfaces (use `LeadScoringService` once hooked to Supabase).
   - Support quick actions (call, email, open conversation) with confirmation modals.

5. **Listings column**
   - Tie into Supabase `listings` table; allow status badges + “open AI listing app” action.
   - Add “Add new listing” card for empty state.

6. **Global UX polish**
   - Configure breadcrumbs/tab navigation so every downstream tab (Funnels, Templates, Bots, Analytics, Settings) shares the blueprint header.
   - Record baseline Storybook entries or screenshot references for QA.

As we iterate, keep this document updated with decisions and component ownership so new agents inherit a consistent experience.
