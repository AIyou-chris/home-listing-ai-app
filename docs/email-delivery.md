## Outbound Email Provider

- We ship with Mailgun for transactional email.
- Required environment variables (place real values in `.env` / deployment secrets):
  ```
  MAILGUN_API_KEY=<mailgun-private-key>
  VITE_MAILGUN_API_KEY=<mailgun-public-key-if-needed>
  MAILGUN_DOMAIN=mg.homelistingai.com
  MAILGUN_FROM_EMAIL=us@homelistingai.com
  MAILGUN_FROM_NAME=HomeListingAI
  ```
- Legacy fallback:
  `FROM_EMAIL` and `FROM_NAME` are still accepted, but `MAILGUN_FROM_EMAIL` and `MAILGUN_FROM_NAME` are the preferred names.
- Production deployment must load these secrets before enabling email automations.
