# ADR-0002: Two-layer data access pattern

**Status:** Accepted  
**Date:** 2026-05-17

## Context

The frontend uses two distinct patterns for reading and writing data:

1. **Direct Supabase** — `listingsService`, `leadsService`, `supabaseContactService`, `supabaseKb` call Supabase client directly for entity CRUD (properties, leads, contacts, KB entries).

2. **Express API fetch** — `dashboardCommandService` and most other services call the Express backend via `fetch()` for aggregated dashboard views, AI operations, billing, and any action that requires server-side business logic.

This looks inconsistent but is intentional.

## Decision

Keep the two-layer pattern. The seam is:

- **Direct Supabase** is acceptable when: the operation is simple CRUD on a single table, the caller holds an authenticated Supabase session (RLS enforces ownership), and no server-side logic (billing checks, AI calls, notifications) is needed.
- **Express API** is required when: the operation aggregates multiple tables, triggers AI/email/SMS, enforces billing limits, fires webhooks, or needs the service-role key for elevated access.

## Consequences

- Developers must choose the correct layer consciously — not default to whichever is easier.
- Direct Supabase calls must rely on RLS for ownership enforcement. If a table lacks RLS, it must use the API layer instead.
- New dashboard aggregations always go through the API — never direct Supabase from a dashboard service.
- The `dashboardCommandService` domain never imports from `listingsService` or vice versa — they are parallel layers, not a hierarchy.

## Guard

If a service imports from both `supabase` directly AND calls `fetch()` to the API for the same domain entity, that is a smell worth investigating — it may indicate missing RLS or duplicated logic.
