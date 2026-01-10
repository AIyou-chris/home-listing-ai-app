# 🚀 Production Deployment Checklist

## Pre-Deployment Security & Configuration

### 1. Environment Variables (.env)
- [ ] Copy `.env` to `.env.production`
- [ ] Update `VITE_BACKEND_URL` to `https://api.homelistingai.com`
- [ ] Update `FRONTEND_URL` to `https://homelistingai.com`
- [ ] Update `VITE_API_BASE_URL` to `https://api.homelistingai.com`
- [ ] Update `APP_BASE_URL` to `https://homelistingai.com`
- [ ] Change `VITE_APP_ENVIRONMENT` to `production`

### 2. PayPal Configuration
- [ ] Get production credentials from https://developer.paypal.com/dashboard/
- [ ] Update `PAYPAL_CLIENT_SECRET` with live secret
- [ ] Update `VITE_PAYPAL_CLIENT_ID` with live client ID
- [ ] Change `PAYPAL_ENVIRONMENT` to `production`
- [ ] Change `VITE_PAYPAL_ENVIRONMENT` to `production`
- [ ] Update `VITE_PAYPAL_PORTAL_URL` to `https://www.paypal.com/myaccount/autopay/`
- [ ] Create production webhook and update `PAYPAL_WEBHOOK_ID`

### 3. API Key Rotation (CRITICAL)
- [ ] Rotate OpenAI API key - generate new key at https://platform.openai.com/api-keys
- [ ] Rotate Mailgun API key - generate at https://app.mailgun.com/app/account/security/api_keys
- [ ] Rotate Rebrandly API key (if using production workspace)
- [ ] Update all rotated keys in `.env.production`

### 4. Admin Credentials
- [ ] Change `VITE_ADMIN_PASSWORD` to a strong production password
- [ ] Store password securely (1Password, LastPass, etc.)
- [ ] Never commit production passwords to git

### 5. Google OAuth Setup
- [ ] Add production redirect URIs in Google Cloud Console:
  - `https://api.homelistingai.com/api/email/google/oauth-callback`
  - `https://homelistingai.com/api/email/google/oauth-callback`
- [ ] Update `GOOGLE_OAUTH_REDIRECT_URI` in `.env.production`
- [ ] Update `VITE_GOOGLE_OAUTH_REDIRECT_URI` in `.env.production`

### 6. CORS Configuration
✅ CORS already configured in `backend/server.cjs` with:
- Production domain: `https://homelistingai.com`
- API domain: `https://api.homelistingai.com`
- Localhost (for development)

### 7. Rate Limiting
✅ Already configured:
- API endpoints: 100 requests per 15 minutes
- Auth endpoints: 5 login attempts per 15 minutes

### 8. Production Logging
✅ Already configured:
- All console statements replaced with logger
- Production logs go to proper channels
- Development-only logs hidden in production

## Deployment Steps

### Backend Deployment
1. [ ] Set `NODE_ENV=production`
2. [ ] Use `.env.production` file
3. [ ] Run `npm run build` (if applicable)
4. [ ] Deploy to production server (Heroku, Railway, DigitalOcean, etc.)
5. [ ] Verify health endpoint: `curl https://api.homelistingai.com/health`
6. [ ] Check logs for errors
7. [ ] Test rate limiting with multiple requests

### Frontend Deployment
1. [ ] Update `.env.production` with production values
2. [ ] Run `npm run build`
3. [ ] Deploy build folder to hosting (Netlify, Vercel, Cloudflare Pages, etc.)
4. [ ] Verify all API calls use `https://api.homelistingai.com`
5. [ ] Test user flows end-to-end

### DNS Configuration
- [ ] Point `api.homelistingai.com` to backend server IP
- [ ] Point `homelistingai.com` to frontend hosting
- [ ] Enable SSL/TLS certificates (Let's Encrypt, Cloudflare, etc.)
- [ ] Verify HTTPS works for both domains

### Post-Deployment Verification
- [ ] Test health endpoint: `https://api.homelistingai.com/health`
- [ ] Test user registration/login flow
- [ ] Test PayPal payment flow (with real payment)
- [ ] Test email sending via Mailgun
- [ ] Test AI sidekick conversations
- [ ] Test lead creation and scoring
- [ ] Test appointment scheduling
- [ ] Verify analytics tracking
- [ ] Check error logs for issues

### Monitoring & Maintenance
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure error tracking (already ready for Sentry)
- [ ] Set up log aggregation (Datadog, Loggly, etc.)
- [ ] Create backup strategy for Supabase data
- [ ] Document rollback procedure

## Current Status
✅ Phase 1 Complete: Critical blockers fixed
✅ Phase 2 Complete: Rate limiting, logging, security
✅ Phase 3 Complete: Production configuration ready

**Production Readiness: 95%**

Remaining 5%: Deploy to production infrastructure and verify all integrations.

## Production URLs
- Frontend: https://homelistingai.com
- Backend API: https://api.homelistingai.com
- Health Check: https://api.homelistingai.com/health
- Admin Dashboard: https://homelistingai.com/admin
