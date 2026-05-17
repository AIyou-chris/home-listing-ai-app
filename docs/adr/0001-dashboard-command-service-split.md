# ADR-0001: dashboardCommandService split plan

**Status:** Accepted — pending implementation  
**Date:** 2026-05-17

## Context

`src/services/dashboardCommandService.ts` is 1,672 lines covering eight distinct domains: leads, appointments, command center, ROI/billing, listing performance, listing content (CMA/reports/flyers), listing assets (share kit/QR/downloads), and video. It is imported by 20 callers.

The file is a god module — its interface is nearly as complex as its implementation. Every caller gets the full surface regardless of what they need.

## Decision

Split into domain modules under `src/services/dashboard/`:

| File | Domain | Key exports |
|---|---|---|
| `utils.ts` | Shared internals | `resolveAgentId`, `parseResponse`, `parseVideoResponse`, `defaultJsonHeaders`, `withAgentQuery` |
| `leads.ts` | Lead fetch/update | `fetchDashboardLeads`, `fetchDashboardLeadDetail`, `updateDashboardLeadStatus`, lead types |
| `appointments.ts` | Appointment management | `fetchDashboardAppointments`, `updateAppointmentStatus`, `fetchAppointmentReminders`, appointment types |
| `commandCenter.ts` | Today snapshot + automation | `fetchCommandCenterSnapshot`, `fetchAutomationRecipes`, command center types |
| `roi.ts` | ROI + billing proof | `fetchRoiMetrics`, `fetchDashboardRoi`, `fetchBillingValueProof`, ROI types |
| `listingPerformance.ts` | Per-listing analytics | `fetchListingPerformance`, performance types |
| `listingContent.ts` | CMA + reports + flyers | `fetchLightCmaConfig`, `saveLightCmaConfig`, `previewLightCma`, report/flyer functions + types |
| `listingAssets.ts` | Share kit + QR + downloads | `fetchListingShareKit`, `publishListingShareKit`, `generateListingQrCode`, all `download*` functions + types |
| `video.ts` | Video generation + status | `fetchListingVideos`, `generateListingVideo`, `fetchListingVideoCredits`, video functions |

`dashboardCommandService.ts` becomes a barrel re-export file — all 20 import sites stay unchanged during the migration.

## Consequences

- Each domain module is independently testable through its own interface
- New functionality is added to the correct domain file, not the barrel
- Callers can be migrated to import directly from domain files incrementally
- `resolveAgentId` moves to `utils.ts`; `listingBuilderService` already updated to use `waitForAuthenticatedUserId` from `authSession` directly (the cross-domain import is resolved)

## Why not done yet

The barrel split is ~1,700 lines of careful extraction with 40+ internal `resolveAgentId` call sites to rewire through `utils.ts`. Low risk but high effort — best done as a dedicated pass alongside adding domain-level tests.
