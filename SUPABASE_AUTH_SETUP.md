# Supabase Auth + RLS Setup Guide

## Overview
This app uses **Supabase Auth + Row Level Security (RLS)** for secure, scalable access control. Users authenticate via Supabase, and all database queries are automatically scoped to their `auth.uid()`.

---

## Step 1: Run the SQL Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-setup.sql`
4. Paste and run it in the SQL Editor
5. Verify tables and policies were created successfully

This creates:
- `ai_sidekick_profiles` - Agent and listing-specific AI personas
- `ai_kb` - Knowledge base entries (text, files, URLs)
- `audit_logs` - Backend audit trail
- `ai_usage_monthly` - AI usage tracking
- `security_alerts` - Security monitoring
- `backups` - Backup manifest
- `appointments` - Agent <> client scheduling with reminder metadata
- `ai_card_profiles` - Agent AI business card content and branding
- `ai_card_qr_codes` - Stored QR codes and scan stats for AI cards
- Storage buckets `ai-kb` (knowledge base files) and `ai-card-assets` (AI card media)
- RLS policies for all tables

---

## Step 2: Configure Environment Variables

### Frontend (.env.local)
```bash
# Copy env.example to .env.local
cp env.example .env.local
```

Edit `.env.local` and set:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

### Backend (backend/.env)
```bash
# Copy backend/.env.example to backend/.env
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
OPENAI_API_KEY=sk-your-openai-key
DEFAULT_LEAD_USER_ID=your-first-user-uuid
```

**Where to find these keys:**
- Supabase Dashboard → **Settings** → **API**
  - `SUPABASE_URL` = Project URL
  - `SUPABASE_ANON_KEY` = anon/public key
  - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (⚠️ keep secret!)

---

## Step 3: Enable Auth Providers

### Enable Email Auth (Recommended)
1. Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional but recommended):
   - Confirmation email
   - Magic link email
   - Password recovery email

### Enable Magic Link (Optional)
1. Same section, enable **Magic Link**
2. Users can sign in without passwords

### Enable OAuth (Optional)
- Google, GitHub, etc.
- Follow Supabase docs for each provider

---

## Step 4: Test Authentication

### Create a Test User
```sql
-- In Supabase SQL Editor, create a test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

Or sign up via the app UI once auth is enabled.

### Verify RLS is Working
```sql
-- As your test user, try to insert a profile
-- This should work (user inserting their own data)
INSERT INTO public.ai_sidekick_profiles (user_id, scope, persona_preset)
VALUES (auth.uid(), 'agent', 'professional');

-- Try to read another user's data (should return empty)
SELECT * FROM public.ai_sidekick_profiles WHERE user_id != auth.uid();
```

---

## Step 5: Update Frontend Auth Flow

The app should already handle auth via `src/services/supabase.ts`. Verify these methods work:

```typescript
import { supabase } from './services/supabase'

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
```

---

## Step 6: Backend Service Role Usage

The backend uses the **service role key** for privileged operations only:

### ✅ Use Service Role For:
- Cross-user analytics (admin dashboard)
- Scheduled jobs (backups, cleanups)
- Audit logging
- System health checks
- Privileged admin actions

### ❌ Don't Use Service Role For:
- Regular CRUD operations (use client-side with RLS)
- User-scoped queries (RLS handles this automatically)

**Example:** Backend audit logging endpoint
```javascript
// backend/server.cjs
app.post('/api/security/audit', async (req, res) => {
  const { action, resourceType, severity, details } = req.body
  
  // Use supabaseAdmin (service role) to write audit logs
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    user_id: req.headers['x-user-id'] || 'server',
    action,
    resource_type: resourceType,
    severity: severity || 'info',
    details: details || null
  })
  
  if (error) throw error
  res.json({ success: true })
})
```

---

## Security Checklist

- [ ] RLS is enabled on all user tables
- [ ] Service role key is only in `backend/.env` (not in frontend)
- [ ] `.env.local` and `backend/.env` are in `.gitignore`
- [ ] Anon key is safe to expose (it's rate-limited by RLS)
- [ ] Email confirmation is enabled (prevents spam signups)
- [ ] Auth session persists in localStorage (handled by Supabase)
- [ ] CORS is configured on backend for your frontend domain

---

## Troubleshooting

### "new row violates row-level security policy"
- User is not authenticated
- `auth.uid()` doesn't match the `user_id` in the query
- Check `supabase.auth.getUser()` returns a user

### "permission denied for table X"
- RLS is enabled but no policies exist
- Re-run `supabase-setup.sql`

### Backend can't connect to Supabase
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
- Verify keys in Supabase Dashboard → Settings → API

### Frontend shows "Missing Supabase configuration"
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Restart Vite dev server after changing env vars

---

## Next Steps

1. **Implement Sign Up/Login UI** (if not already done)
2. **Test creating sidekick profiles** as authenticated users
3. **Add admin dashboard** routes (backend service role only)
4. **Set up email templates** in Supabase for better UX
5. **Monitor auth logs** in Supabase Dashboard → Authentication → Logs

---

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
