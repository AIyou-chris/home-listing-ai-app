#!/usr/bin/env node
const fs = require('fs');

const BASE_API = String(process.env.BASE_API || 'http://127.0.0.1:3002').replace(/\/+$/, '');
const LISTING_ID = String(process.env.LISTING_ID || '95ead1fb-e9f3-4f3e-b45d-425b5f828ba0').trim();
const USER_ID = String(process.env.USER_ID || '1c72dde2-b1d2-4426-a2c5-b6277d93c5d7').trim();
const OUTPUT_PATH = String(process.env.OUTPUT_PATH || '/tmp/open-house-flyer.pdf').trim();

async function main() {
  if (!LISTING_ID) throw new Error('LISTING_ID is required');
  if (!USER_ID) throw new Error('USER_ID is required');

  const url = `${BASE_API}/api/dashboard/listings/${encodeURIComponent(LISTING_ID)}/open-house-flyer.pdf?agentId=${encodeURIComponent(USER_ID)}`;
  const response = await fetch(url, {
    headers: {
      'x-user-id': USER_ID
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Flyer request failed (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(OUTPUT_PATH, buffer);

  console.log(`Saved flyer to ${OUTPUT_PATH}`);
  console.log(`File size: ${buffer.length} bytes`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
