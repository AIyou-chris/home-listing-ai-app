# Active Pages Reference Guide

## How to Access Each Page

### 🌐 PUBLIC PAGES (No Login Required)

| Page | URL | Description |
|------|-----|-------------|
| **Landing Page** | `http://localhost:5173/` or `http://localhost:5173/#/landing` | Main marketing homepage |
| **Sign Up** | `http://localhost:5173/#/signup` | New user registration |
| **Sign In** | `http://localhost:5173/#/signin` | User login |
| **Checkout** | `http://localhost:5173/#/checkout` | Payment/subscription page |
| **Agent Onboarding** | `http://localhost:5173/#/welcome` | Post-signup onboarding flow |

---

### 👤 AGENT DASHBOARD (Login Required)

After logging in, access these via the sidebar or URLs:

| Page | URL | Sidebar Menu | Description |
|------|-----|--------------|-------------|
| **Main Dashboard** | `http://localhost:5173/#/dashboard` | Dashboard | Overview with stats & tasks |
| **Listings** | `http://localhost:5173/#/listings` | Listings | Property listings management |
| **Add Listing** | `http://localhost:5173/#/add-listing` | ➕ (from Listings) | Create new property |
| **Property Details** | `http://localhost:5173/#/property` | Click any listing | Single property view |
| **Leads & Appointments** | `http://localhost:5173/#/leads` | Leads | Lead management & calendar |
| **AI Conversations** | `http://localhost:5173/#/ai-conversations` | Conversations | Chat & voice interactions |
| **AI Card Builder** | `http://localhost:5173/#/ai-card` | AI Card | Digital business card |
| **AI Sidekicks** | `http://localhost:5173/#/ai-sidekicks` | AI Sidekicks | AI personality management |
| **AI Training** | `http://localhost:5173/#/ai-training` | Train AI | Feedback & training interface |
| **Analytics** | `http://localhost:5173/#/analytics` | Analytics | Performance dashboard |
| **Settings** | `http://localhost:5173/#/settings` | Settings | Profile & preferences |

---

### 🔧 ADMIN PAGES (Admin Login Required)

Access after admin login at `/admin-setup`:

| Page | URL | Sidebar Menu | Description |
|------|-----|--------------|-------------|
| **Admin Dashboard** | `http://localhost:5173/#/admin-dashboard` | Dashboard | Admin overview |
| **Users/Agents** | `http://localhost:5173/#/admin-users` | Users | User management |
| **Clients** | `http://localhost:5173/#/admin-leads` | Clients | Client list (AdminClientsPage) |
| **Contacts** | `http://localhost:5173/#/admin-contacts` | Contacts | Contact management |
| **Knowledge Base** | `http://localhost:5173/#/admin-knowledge-base` | Knowledge | KB management |
| **AI Training** | `http://localhost:5173/#/admin-ai-training` | AI Agents | AI personality admin |
| **Marketing** | `http://localhost:5173/#/admin-marketing` | Marketing | Marketing tools |
| **Analytics** | `http://localhost:5173/#/admin-analytics` | Analytics | System analytics |
| **Security** | `http://localhost:5173/#/admin-security` | Security | Security dashboard |
| **Billing** | `http://localhost:5173/#/admin-billing` | Billing | Billing management |
| **Settings** | `http://localhost:5173/#/admin-settings` | Settings | System settings |

---

### 🎮 DEMO & DEVELOPMENT PAGES

| Page | URL | Description |
|------|-----|-------------|
| **Demo Dashboard** | `http://localhost:5173/#/demo/dashboard` or click "Try Demo" | Demo mode (no login) |
| **Dashboard Blueprint** | `http://localhost:5173/#/dashboard-blueprint` | New dashboard design prototype |

---

## 📂 Component Files List

### Public Pages (5 files)
- `LandingPage.tsx`
- `SignUpPage.tsx`
- `SignInPage.tsx`
- `CheckoutPage.tsx`
- `AgentOnboardingPage.tsx`

### Agent Dashboard Pages (12 files)
- `Dashboard.tsx` (not in page list but core component)
- `ListingsPage.tsx`
- `AddListingPage.tsx`
- `PropertyPage.tsx`
- `LeadsAndAppointmentsPage.tsx`
- `AIConversationsPage.tsx`
- `AICardPage.tsx`
- `EnhancedAISidekicksHub.tsx`
- `AIInteractiveTraining.tsx`
- `SettingsPage.tsx`
- `AnalyticsPage.tsx` / `AnalyticsDashboard.tsx`

### Admin Pages (4 dedicated files + AdminLayout)
- `AdminClientsPage.tsx`
- `AdminContactsPage.tsx`
- `AdminKnowledgeBasePage.tsx`
- `AdminAgentsPage.tsx`
- `AdminLayout.tsx` (handles most admin views)

### Demo/Development (1 file)
- `DemoListingPage.tsx`
- `AgentDashboardBlueprint.tsx`

### Utility (1 file)
- `PageTipBanner.tsx` (component, not a page)

---

## 🚀 Quick Test Commands

### Start Dev Server
```bash
npm run dev
```

### Test All Public URLs
```bash
# Landing
open http://localhost:5173/

# Sign Up
open http://localhost:5173/#/signup

# Sign In
open http://localhost:5173/#/signin

# Demo Mode
open http://localhost:5173/#/demo/dashboard
```

### Test Agent Dashboard (Login First)
```bash
# After logging in, test these:
open http://localhost:5173/#/dashboard
open http://localhost:5173/#/listings
open http://localhost:5173/#/leads
open http://localhost:5173/#/ai-conversations
open http://localhost:5173/#/ai-card
open http://localhost:5173/#/settings
```

### Test Admin Pages (Admin Login Required)
```bash
# First go to admin setup
open http://localhost:5173/#/admin-setup

# After admin login:
open http://localhost:5173/#/admin-dashboard
open http://localhost:5173/#/admin-users
open http://localhost:5173/#/admin-contacts
```

---

## 🔍 How to Find Pages in Code

### Search for Route Definitions
```bash
# Find all route cases in App.tsx
grep "case '" src/App.tsx | grep -v "//"

# Find all view types
grep "View =" src/types.ts -A 50
```

### Find Sidebar Menu Items
```bash
# Agent sidebar
grep "onClick.*setView" src/components/Sidebar.tsx

# Admin sidebar
grep "onClick.*setView" src/components/AdminSidebar.tsx
```

---

## 📋 Total Active Pages: **19 Page Components**

**Public:** 5 pages  
**Agent Dashboard:** 9 pages  
**Admin:** 5 pages  
**Demo/Dev:** 2 pages (+ blueprint)

---

*Last Updated: November 19, 2025*
*After cleanup: 13 unused pages removed*
