# Deployment Handover

HomeListingAI deployment setup as of April 11, 2026.

## Hosting

- Frontend: Netlify
- Backend: Render
- Database/Auth/Storage: Supabase
- Source of truth branch: `main`

## What must be in GitHub for a clean deploy

- `package.json` now runs `node scripts/generate-seo-pages.mjs` after `vite build`
- `scripts/generate-seo-pages.mjs` must be committed any time that build script is committed

## Netlify env

Set these on Netlify if they are not already there:

- `SEO_SITE_URL`
- `VITE_APP_URL`
- `VITE_API_URL`
- `VITE_API_BASE_URL`
- `VITE_BACKEND_URL`
- `VITE_REALTIME_WS_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_STARTER_PRICE_ID`
- `VITE_STRIPE_PRO_PRICE_ID`

## Render env

Set these on Render if they are not already there:

- `APP_BASE_URL`
- `FRONTEND_URL`
- `DASHBOARD_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM_EMAIL`
- `MAILGUN_FROM_NAME`
- `STRIPE_SECRET_KEY`
- `STRIPE_STARTER_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`

## Notes

- Render does not need Docker for this app if you are using the normal Node service setup.
- Netlify redirects `/api/*` to Render, but some older frontend paths still read explicit `VITE_*` API values, so keeping those env vars set is the safe production setup.
- The SEO build script can still complete without blog or listing fetches, but you only get full SEO page generation when Supabase env vars are present during the build.
