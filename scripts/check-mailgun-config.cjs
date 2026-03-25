#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const dotenvPathCandidates = [
  '.env',
  '.env.local',
  path.join('backend', '.env')
]

for (const candidate of dotenvPathCandidates) {
  const resolved = path.resolve(process.cwd(), candidate)
  if (fs.existsSync(resolved)) {
    require('dotenv').config({ path: resolved })
  }
}

const hasSenderEmail = Boolean(process.env.MAILGUN_FROM_EMAIL || process.env.FROM_EMAIL)
const missingVars = ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN']
  .filter((key) => !process.env[key])

if (!hasSenderEmail) {
  missingVars.push('MAILGUN_FROM_EMAIL or FROM_EMAIL')
}
const isCi = process.env.CI === 'true' || process.env.NETLIFY === 'true'

if (missingVars.length > 0) {
  const message = `[Mailgun] Missing required environment variables: ${missingVars.join(', ')}`
  if (isCi) {
    console.error(message)
    process.exit(1)
  } else {
    console.warn(`${message}. Set these variables to enable transactional email.`)
  }
} else {
  console.log('[Mailgun] Environment configuration looks good.')
}



