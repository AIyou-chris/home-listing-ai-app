# Admin 2FA — Break-Glass Recovery

Admin login uses **Supabase Auth MFA (TOTP)**. 2FA is **opt-in**: an admin enables it
in Admin → Settings → Security. Once enabled, that admin is asked for a 6-digit code
from their authenticator app at every admin login.

## If an admin is locked out (lost phone / authenticator)

There is **no self-serve recovery by design** — recovery requires Supabase service-role
access (you). To clear an admin's 2FA so they can log in with password only and re-enroll:

**Supabase Dashboard → SQL Editor**, run:

```sql
delete from auth.mfa_factors
where user_id = (select id from auth.users where email = 'THE_ADMIN_EMAIL');
```

That removes their TOTP factor. They can then:
1. Log in with email + password (no code needed now).
2. Go to Admin → Settings → Security → **Set up 2FA** to re-enroll.

## Notes

- Removing the factor only affects 2FA — it does not change the password or admin role.
- Server enforcement (`verifyAdmin` in `backend/server.cjs`) **fails open** on any error,
  so a Supabase API hiccup can never lock an admin out — only a *verified, present* TOTP
  factor + an un-elevated (AAL1) session triggers the block.
- To later make 2FA **required for all admins** (instead of opt-in), gate the admin
  dashboard render on enrollment and reject AAL1 admins without a factor. Not enabled yet.
