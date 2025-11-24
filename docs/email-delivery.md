## Outbound Email Provider

- We ship with Mailgun for transactional email.
- Required environment variables (place real values in `.env` / deployment secrets):
  ```
  MAILGUN_API_KEY=<mailgun-private-key>
  VITE_MAILGUN_API_KEY=<mailgun-public-key-if-needed>
  MAILGUN_DOMAIN=mg.homelistingai.com
  FROM_EMAIL=us@homelistingai.com
  FROM_NAME=HomeListingAI
  ```
- Production deployment must load these secrets before enabling email automations.

