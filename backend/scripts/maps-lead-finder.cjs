#!/usr/bin/env node
// Free Google Maps lead finder. Runs the open-source gosom scraper in Docker on
// THIS computer (the live server cannot run Docker) and saves a CSV that the
// admin Lead Finder "Import CSV" button reads.
//   node backend/scripts/maps-lead-finder.cjs "mortgage loan officer in Tampa FL"
// Output: maps-leads/<query>.csv in the current folder. Nothing is sent anywhere.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.error('Usage: node backend/scripts/maps-lead-finder.cjs "mortgage loan officer in Tampa FL"');
  process.exit(1);
}
if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('Docker is not running. Open Docker Desktop and try again.');
  process.exit(1);
}
const dir = path.resolve('maps-leads');
fs.mkdirSync(dir, { recursive: true });
const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
fs.writeFileSync(path.join(dir, `${slug}.txt`), `${query}\n`);
const run = spawnSync('docker', [
  'run', '--rm', '-v', `${dir}:/gm`, 'gosom/google-maps-scraper:latest',
  '-input', `/gm/${slug}.txt`, '-results', `/gm/${slug}.csv`,
  '-depth', '1', '-email', '-exit-on-inactivity', '60s',
], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.rmSync(path.join(dir, `${slug}.txt`), { force: true });
if (run.status !== 0 || !fs.existsSync(path.join(dir, `${slug}.csv`))) {
  console.error('The search did not finish.');
  process.exit(1);
}
const rows = fs.readFileSync(path.join(dir, `${slug}.csv`), 'utf8').split('\n').length - 2;
console.log(`Saved about ${rows} businesses to maps-leads/${slug}.csv. Upload it with "Import CSV" in the Lead Finder.`);
