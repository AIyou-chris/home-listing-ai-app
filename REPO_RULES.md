SCOPE
- Web app (Vite React TS): /
- Firebase Functions (Node 20 TS): /functions

CONVENTIONS
- Files: kebab-case; Components/Types: PascalCase; vars/functions: camelCase
- Imports: single quotes only; no semicolons; wrap at 80 chars
- React: functional components; server-first; add 'use client' only if needed
- Styling: Tailwind only (no raw .css imports in components)
- State: useState/useReducer/useContext; avoid global unless required
- Forms: React Hook Form + Zod
- Accessibility: Radix/Shadcn patterns; proper aria-*
- Security: sanitize HTML with DOMPurify before dangerouslySetInnerHTML

MIGRATION: FIREBASE → SUPABASE
- Client-side Firebase is deprecated. All new code uses Supabase services.
- Frontend `src/services/firebase.ts` is a no-op shim (compile OK, no calls).
- Supabase services live in `src/services/supabase.ts` and siblings. 
- Example migration reference: `src/components/AdminCRMContactsSupabase.tsx`
- Analytics/callables: stubbed no-ops in `src/services/analyticsService.ts`
- Functions backend may remain on Firebase during transition; emulators OK.

READ-ONLY / GENERATED
- /dist/**
- /functions/lib/**
- /firebase-export-*/**
- /firebase-debug.log
- /firestore-debug.log

ARCH BOUNDARIES
- Web must not import Firebase SDK or react-firebase-hooks.
- Web talks to Supabase only (auth, DB, storage, realtime).
- Functions code stays in /functions/src/**; no imports from /dist or /functions/lib
- No deep imports into generated or build outputs.

CONTRACTS (DO NOT BREAK WITHOUT EXPLICIT APPROVAL)
- .env shape (.env.example is source of truth)
- Firestore/Storage rules files (until fully removed)
- Public web API in /functions/src/index.ts and /functions/src/api.ts
- Shared types: /src/types.ts and /functions/src/types.d.ts

TASK SCOPE
- UI tasks: /src/** (and /public/** if needed)
- Functions tasks: /functions/src/**
- Rules-only tasks: /firestore.rules, /storage.rules, /firestore.indexes.json

OUTPUT FORMAT (MANDATORY)
- PLAN
  - file: reason
- PATCH
  ```diff
  # only diffs for files in PLAN
  # tests must run via `npm test`
  ```
