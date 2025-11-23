# Page & Component Audit
**Date:** November 19, 2025

## Summary
- **Total Page Components:** 34 files
- **Active/In Use:** 18 pages
- **Outdated/Unused:** 6+ pages
- **Test/Debug Only:** 4 pages
- **Needs Review:** 6 pages

---

## ✅ ACTIVE PAGES (Currently Used)

### Public Pages
| Page | File | Route | Status |
|------|------|-------|--------|
| Landing | `LandingPage.tsx` | `/` | ✅ Active |
| Sign Up | `SignUpPage.tsx` | `/signup` | ✅ Active |
| Sign In | `SignInPage.tsx` | `/signin` | ✅ Active |
| Checkout | `CheckoutPage.tsx` | `/checkout`, `/checkout/:slug` | ✅ Active |
| Agent Onboarding | `AgentOnboardingPage.tsx` | `/welcome` | ✅ Active |

### Agent Dashboard (Authenticated)
| Page | File | Route | Status |
|------|------|-------|--------|
| Main Dashboard | `Dashboard.tsx` | `/dashboard`, `/:slug/dashboard` | ✅ Active |
| Listings | `ListingsPage.tsx` | `/listings`, `/:slug/ai-listings` | ✅ Active |
| Property Details | `PropertyPage.tsx` | `/property/:id` | ✅ Active |
| Add Listing | `AddListingPage.tsx` | `/add-listing` | ✅ Active |
| Leads & Appointments | `LeadsAndAppointmentsPage.tsx` | `/leads`, `/:slug/leads` | ✅ Active |
| AI Conversations | `AIConversationsPage.tsx` | `/ai-conversations`, `/:slug/ai-conversations` | ✅ Active |
| AI Card Builder | `AICardPage.tsx` | `/ai-card`, `/:slug/ai-card` | ✅ Active |
| AI Sidekicks Hub | `EnhancedAISidekicksHub.tsx` | `/ai-sidekicks`, `/:slug/ai-sidekicks` | ✅ Active |
| AI Training | `AIInteractiveTraining.tsx` | `/ai-training`, `/:slug/ai-training` | ✅ Active |
| Settings | `SettingsPage.tsx` | `/settings`, `/:slug/settings` | ✅ Active |
| Analytics | `AnalyticsDashboard.tsx` | `/analytics` | ✅ Active |

### Admin Pages
| Page | File | Route | Status |
|------|------|-------|--------|
| Admin Dashboard | `AdminLayout.tsx` | `/admin`, `/:slug/admin` | ✅ Active |
| Admin Users | `AdminLayout.tsx` | `/admin/users` | ✅ Active |
| Admin Clients | `AdminClientsPage.tsx` | `/admin/clients` | ✅ Active |
| Admin Contacts | `AdminContactsPage.tsx` | `/admin/contacts` | ✅ Active |
| Admin Knowledge Base | `AdminKnowledgeBasePage.tsx` | `/admin/knowledge-base` | ✅ Active |
| Admin AI Agents | `AdminAgentsPage.tsx` | `/admin/ai-training` | ✅ Active |
| Admin Setup | `AdminSetup.tsx` | `/admin-setup` | ✅ Active |

---

## 🟡 NEEDS REVIEW (Possibly Outdated)

| Page | File | Last Known Use | Notes |
|------|------|----------------|-------|
| Marketing Page | `MarketingPage.tsx` | Unknown | Not in routing, may be legacy |
| AI Content | `AIContentPage.tsx` | `case 'ai-content'` exists | Listed in types but no active route |
| Social Studio | `SocialStudioPage.tsx` | Unknown | Not in current routing |
| Interaction Hub | `InteractionHubPage.tsx` | `case 'inbox'` | Being replaced by AI Conversations? |
| Lead Follow-Ups | `LeadFollowUpsPage.tsx` | Unknown | Not in routing, may be merged elsewhere |
| AI Marketing Proposal | `AIMarketingProposalPage.tsx` | Unknown | Not in routing |

---

## ❌ OUTDATED/UNUSED PAGES

| Page | File | Reason | Action |
|------|------|--------|--------|
| New Landing Page | `NewLandingPage.tsx` | Route exists (`/new-landing`) but never used | **DELETE** |
| Blog Page | `BlogPage.tsx` | Route exists (`/blog`) but not production ready | **DELETE or Mark as Draft** |
| Blog Post Page | `BlogPostPage.tsx` | Route exists (`/blog-post`) but not production ready | **DELETE or Mark as Draft** |
| QR Code Management | `QRCodeManagementPage.tsx` | Standalone page, functionality moved to AI Card | **DELETE** |
| AI Blog Writer | `AIBlogWriterPage.tsx` | Admin feature, not in main routing | **Move to Admin or DELETE** |

---

## 🧪 TEST/DEBUG PAGES (Keep for Development)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| Demo Listing | `DemoListingPage.tsx` | `/demo/dashboard` | Demo mode showcase |
| Dashboard Blueprint | `AgentDashboardBlueprint.tsx` | `/dashboard-blueprint`, `/:slug/dashboard` | New dashboard design |
| Help Sales ChatBot Test | `HelpSalesChatBotTestPage.tsx` | Not routed | Testing only |
| AI Lead Qualification Test | `AILeadQualificationTestPage.tsx` | Not routed | Testing only |

---

## 📊 VIEW TYPE BREAKDOWN

### From `types.ts` View Union (Total: 42 views)

**Production Routes (18):**
- dashboard, analytics, listings, leads, ai-conversations
- ai-card-builder, ai-card, ai-sidekicks, property, add-listing
- edit-listing, inbox, knowledge-base, ai-training, funnel-analytics
- settings, signup, signin, checkout

**Admin Routes (12):**
- admin-dashboard, admin-users, admin-leads, admin-contacts
- admin-knowledge-base, admin-ai-training, admin-ai-card
- admin-ai-personalities, admin-ai-content, admin-marketing
- admin-analytics, admin-security, admin-billing, admin-settings
- admin-setup, admin-blog-writer

**Public/Landing (3):**
- landing, new-landing, blog, blog-post

**Demo/Test (5):**
- demo-dashboard, dashboard-blueprint, demo-listing
- ai-content, openai-test, vapi-test, test

---

## 🎯 RECOMMENDATIONS

### HIGH PRIORITY - Remove Unused Pages
```bash
# Delete these files (save 6-10 files)
rm src/components/NewLandingPage.tsx
rm src/components/BlogPage.tsx
rm src/components/BlogPostPage.tsx
rm src/components/QRCodeManagementPage.tsx
rm src/components/AIBlogWriterPage.tsx (or move to admin)
rm src/components/LeadFollowUpsPage.tsx
```

### MEDIUM PRIORITY - Consolidate Similar Pages
1. **Merge Interaction Hub → AI Conversations**
   - `InteractionHubPage.tsx` functionality → `AIConversationsPage.tsx`
   - Remove inbox route

2. **Clarify Marketing/Social**
   - Decide if `MarketingPage.tsx` and `SocialStudioPage.tsx` are needed
   - If not, delete both

3. **AI Content Decision**
   - Either implement `AIContentPage.tsx` properly or remove it
   - Remove from types.ts if deleting

### LOW PRIORITY - Clean up types.ts
Remove unused view types:
```typescript
// Remove from View type union:
- 'new-landing'
- 'blog'
- 'blog-post'
- 'ai-content' (if not implementing)
- 'openai-test' (test only)
- 'vapi-test' (test only)
- 'test'
```

---

## 📁 CURRENT ROUTING STRUCTURE

### Actual Routes in App.tsx (Cleaned Up List)

**Public:**
- `/` → LandingPage
- `/signup` → SignUpPage
- `/signin` → SignInPage
- `/checkout` → CheckoutPage
- `/checkout/:slug` → CheckoutPage

**Agent Dashboard:**
- `/dashboard` or `/:slug/dashboard` → Dashboard
- `/listings` or `/:slug/ai-listings` → ListingsPage
- `/property/:id` → PropertyPage
- `/add-listing` → AddListingPage
- `/leads` or `/:slug/leads` → LeadsAndAppointmentsPage
- `/ai-conversations` or `/:slug/ai-conversations` → AIConversationsPage
- `/ai-card` or `/:slug/ai-card` → AICardPage
- `/ai-sidekicks` or `/:slug/ai-sidekicks` → EnhancedAISidekicksHub
- `/ai-training` or `/:slug/ai-training` → AIInteractiveTraining
- `/settings` or `/:slug/settings` → SettingsPage
- `/analytics` → AnalyticsDashboard

**Admin:**
- `/admin` or `/:slug/admin` → AdminLayout
- `/admin/users` → AdminLayout
- `/admin/contacts` → AdminClientsPage / AdminContactsPage
- `/admin/knowledge-base` → AdminKnowledgeBasePage
- `/admin/ai-training` → AdminAgentsPage
- Other admin routes via AdminLayout

**Demo/Test:**
- `/demo/dashboard` → DemoListingPage
- `/dashboard-blueprint` → AgentDashboardBlueprint

---

## ✅ NEXT STEPS

1. **Delete 6 unused pages** listed above
2. **Update types.ts** to remove unused view types
3. **Consolidate InteractionHub** into AIConversations
4. **Document or delete** Marketing/Social Studio pages
5. **Update routing documentation** to match actual implementation

**Estimated cleanup:** Remove ~10 files, reduce codebase by 2000-3000 lines

---

*Generated by Page Audit Script*
*Review and approve before making changes*
