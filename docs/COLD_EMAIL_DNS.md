# Cold email: sending domain and DNS

Cold email to loan officers must go out from its **own domain**, never from `homelistingai.com` or `mg.homelistingai.com`. If cold mail ever gets flagged, the product's login and receipt emails must not suffer for it.

## What you need

1. A separate domain you own, for example a lookalike such as `homelistingai-mail.com` or a subdomain of a different domain you control. It should clearly be yours and read as HomeListingAI.
2. A Mailgun sending domain for it (Mailgun > Sending > Domains > Add new domain). Use the same Mailgun account.
3. Two or more mailboxes on it, for example `chris@yourmaildomain.com`. They must be real, because replies come back to them.

## DNS records to add at the domain's DNS provider

Mailgun shows the exact values on the domain's **DNS records** page. Copy them from there. The shape is:

| Type | Name | Value | Why |
|---|---|---|---|
| TXT | `yourmaildomain.com` | `v=spf1 include:mailgun.org ~all` | SPF: says Mailgun may send for you |
| TXT | `<selector>._domainkey.yourmaildomain.com` | the long `k=rsa; p=...` key Mailgun gives you | DKIM: signs each message |
| TXT | `_dmarc.yourmaildomain.com` | `v=DMARC1; p=none; rua=mailto:you@yourmaildomain.com` | DMARC: tells inboxes what to do with fakes (start with `p=none`, tighten later) |
| MX | `yourmaildomain.com` | `mxa.mailgun.org` (10) and `mxb.mailgun.org` (10) | Lets Mailgun receive replies |
| CNAME | `email.yourmaildomain.com` | `mailgun.org` | Mailgun's tracking/bounce helper |

## Check it

```bash
node backend/scripts/check-cold-email-dns.cjs yourmaildomain.com
```

It prints PASS or FAIL for each record. If your DKIM selector is not the default, pass it as the second argument. Run it again after each change; DNS can take up to an hour.

## Turn it on (Render environment)

| Variable | Value |
|---|---|
| `COLD_EMAIL_DOMAIN` | `yourmaildomain.com` |
| `COLD_EMAIL_MAILBOXES` | `Chris Potter <chris@yourmaildomain.com>` (more mailboxes: separate with commas) |
| `COLD_EMAIL_MAILGUN_API_KEY` | only if this domain is in a different Mailgun account; otherwise `MAILGUN_API_KEY` is used |
| `COLD_EMAIL_ENABLED` | `true` (leave it unset until the DNS checks pass) |
| `LO_MAILING_ADDRESS` | the postal address printed in every footer |

## Connect replies and bounces (Mailgun dashboard)

1. **Receiving > Routes > Create route.** Match recipient `.*@yourmaildomain.com`. Actions: *Forward* to `https://home-listing-ai-backend.onrender.com/api/webhooks/mailgun/cold-reply`, and *Forward* to your own inbox so you also see every reply.
2. **Sending > Webhooks** for this domain: add *Permanent failure*, *Spam complaint* and *Unsubscribe* pointing to `https://home-listing-ai-backend.onrender.com/api/webhooks/mailgun`.
3. `MAILGUN_WEBHOOK_SIGNING_KEY` must already be set on Render (it signs both webhooks).

## Warm-up (built in)

The sender starts at 20 emails a day per mailbox, adds 12 a day each week, and stops at 60 (set `COLD_EMAIL_MAX_PER_MAILBOX` between 50 and 75). It pauses by itself if bounces pass 3% or spam complaints pass 0.1%.
