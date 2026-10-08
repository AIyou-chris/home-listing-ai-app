'use strict';
// Listing reel: a 9:16 video built from a listing's own photos.
// script -> voiceover -> sentence timing -> Ken Burns slides -> captions -> mp4.
// Only real listing facts go in the script. Nothing is invented, no rates or approvals.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { findVoiceViolations } = require('./brandVoice');

const run = promisify(execFile);
const FPS = 30;
const XFADE = 0.5;
const END_CARD_SECONDS = 4;
const MAX_PHOTOS = 6;
const MIN_PHOTOS = 2;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const JOB_TTL_MS = 60 * 60 * 1000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

function wrapLines(text, width) {
  const lines = [];
  let line = '';
  for (let word of String(text).trim().split(/\s+/)) {
    while (word.length > width) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if ((`${line} ${word}`).trim().length > width) { lines.push(line); line = word; } else line = (`${line} ${word}`).trim();
  }
  if (line) lines.push(line);
  return lines;
}

// The spoken script. Short, plain, real facts only.
function buildReelScript({ listing }) {
  const address = String(listing.address || '').trim();
  const beds = Number(listing.bedrooms) || 0;
  const baths = Number(listing.bathrooms) || 0;
  const price = Number(listing.price) || 0;
  const parts = [];
  parts.push(address ? `Take a look at ${address}.` : 'Take a look at this home.');
  if (beds && baths) parts.push(`${beds} bedroom${beds === 1 ? '' : 's'}, ${baths} bath${baths === 1 ? '' : 's'}.`);
  else if (beds) parts.push(`${beds} bedroom${beds === 1 ? '' : 's'}.`);
  if (price) parts.push(`Listed at ${money(price)}.`);
  parts.push(`Tap the link to see every photo, and ask me anything about this home, including what a monthly payment could look like.`);
  return parts.join(' ');
}

// Break the script into caption cues (sentences and clauses).
function splitCues(script) {
  return String(script).trim().split(/(?<=[.!?,])\s+/).map((s) => s.trim()).filter(Boolean);
}

// Time each cue in proportion to its length. The last cue absorbs the rounding.
function cueTimings(cues, seconds, lead = 0.15, tail = 0.15) {
  const total = cues.reduce((sum, c) => sum + c.length, 0) || 1;
  const span = Math.max(0.5, seconds - lead - tail);
  let t = lead;
  return cues.map((text, i) => {
    const end = i === cues.length - 1 ? lead + span : t + (span * text.length) / total;
    const cue = { text, start: t, end };
    t = end;
    return cue;
  });
}

// Photo slide length so voice + end card line up. Crossfades overlap by XFADE.
function slideDurations(voiceSeconds, photoCount) {
  const total = voiceSeconds + 2.5;
  const photoDur = Math.max(2, (total - END_CARD_SECONDS) / photoCount);
  return { photoDur, total: photoDur * photoCount + END_CARD_SECONDS };
}

function resolveFfmpeg() {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  try { return require('ffmpeg-static') || 'ffmpeg'; } catch { return 'ffmpeg'; }
}
function createListingReelService({ supabaseAdmin, safeFetch, openaiApiKey, bucket = 'ai-card-assets', width = Number(process.env.REEL_WIDTH) || 720, logoPath = null, musicDir = null, fetchImpl = fetch } = {}) {
  const W = width % 2 ? width + 1 : width;
  const H = Math.round((W * 16) / 9 / 2) * 2;
  const k = W / 1080; // font and layout scale
  const ffmpegBin = resolveFfmpeg();
  const jobs = new Map();
  let chain = Promise.resolve(); // one render at a time (memory)

  const ff = (args, timeout = 120000) => run(ffmpegBin, ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', ...args], { timeout, maxBuffer: 8 * 1024 * 1024 });

  async function available() {
    try { await run(ffmpegBin, ['-version'], { timeout: 8000 }); return true; } catch { return false; }
  }

  async function audioSeconds(file) {
    // ffmpeg prints "Duration:" on stderr for any input; no ffprobe needed.
    try { await run(ffmpegBin, ['-nostdin', '-hide_banner', '-i', file], { timeout: 10000 }); } catch (e) {
      const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr || ''));
      if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    }
    throw new Error('Could not read the voiceover length.');
  }

  async function speak(text, voice) {
    if (!openaiApiKey) throw new Error('voice_not_configured');
    const res = await fetchImpl('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: voice || 'ash', input: text, instructions: 'Warm, friendly, natural pace. Real estate walkthrough. Calm, not salesy.' })
    });
    if (!res.ok) throw new Error(`voice_failed_${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async function loadPhoto(url) {
    const res = await safeFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('photo_fetch_failed');
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_PHOTO_BYTES) throw new Error('photo_size');
    return buf;
  }

  async function pickMusic() {
    if (!musicDir) return null;
    try {
      const files = (await fs.readdir(musicDir)).filter((f) => /\.(mp3|m4a|wav)$/i.test(f));
      if (!files.length) return null;
      return path.join(musicDir, files[crypto.randomInt(files.length)]);
    } catch { return null; }
  }

  async function render({ listing, lo, realtor, voice, onProgress }) {
    const sharp = require('sharp');
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hlai-reel-'));
    try {
      const urls = (listing.photos || []).slice(0, MAX_PHOTOS);
      const photos = [];
      for (const url of urls) {
        try { photos.push(await loadPhoto(url)); } catch { /* skip a bad photo */ }
      }
      if (photos.length < MIN_PHOTOS) throw new Error('not_enough_photos');
      onProgress?.(10);

      const script = buildReelScript({ listing });
      const violations = findVoiceViolations(script);
      if (violations.length) throw new Error(`script_blocked:${violations.join(',')}`);
      const voiceFile = path.join(dir, 'voice.mp3');
      await fs.writeFile(voiceFile, await speak(script, voice));
      const T = await audioSeconds(voiceFile);
      if (!(T > 1 && T < 60)) throw new Error('voice_length');
      onProgress?.(30);

      const cues = cueTimings(splitCues(script), T);
      const n = photos.length;
      const { photoDur, total } = slideDurations(T, n);

      // Slides: blurred attention-cropped fill + the whole photo on top. 1.5x for a smooth zoom.
      const SW = Math.round(W * 1.5), SH = Math.round(H * 1.5);
      for (let i = 0; i < n; i++) {
        const bg = await sharp(photos[i]).rotate().resize(SW, SH, { fit: 'cover', position: sharp.strategy.attention }).blur(30).modulate({ brightness: 0.6 }).toBuffer();
        const fg = await sharp(photos[i]).rotate().resize(SW, Math.round(SH * 0.5), { fit: 'inside' }).toBuffer();
        await sharp(bg).composite([{ input: fg, gravity: 'centre' }]).jpeg({ quality: 88 }).toFile(path.join(dir, `slide${i}.jpg`));
      }
      onProgress?.(45);

      // End card: address, price, tap-the-link, and the LO's identity + NMLS.
      const loLine = [lo?.name && lo.name !== 'Loan Officer' ? lo.name : '', lo?.company || '', lo?.nmls_number ? `NMLS #${lo.nmls_number}` : ''].filter(Boolean).join(' · ');
      const agentLine = realtor?.name ? `Listed by ${realtor.name}${realtor.brokerage ? ` · ${realtor.brokerage}` : ''}` : '';
      const link = String(listing.share_url || '').replace(/^https?:\/\//, '').split('?')[0];
      const s = (v) => Math.round(v * k);
      const addrLines = wrapLines(listing.address || 'This home', 22).slice(0, 2);
      const endSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>
        <text x="${W / 2}" y="${s(640)}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${s(40)}">Ask me anything about</text>
        ${addrLines.map((l, i) => `<text x="${W / 2}" y="${s(720 + i * 84)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${s(70)}" font-weight="700">${esc(l)}</text>`).join('')}
        ${listing.price ? `<text x="${W / 2}" y="${s(720 + addrLines.length * 84 + 30)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${s(60)}">${esc(money(listing.price))}</text>` : ''}
        <rect x="${s(190)}" y="${s(1010)}" width="${s(700)}" height="${s(130)}" rx="${s(36)}" fill="white"/>
        <text x="${W / 2}" y="${s(1095)}" text-anchor="middle" fill="#172554" font-family="sans-serif" font-size="${s(48)}" font-weight="700">Tap the link to chat</text>
        <text x="${W / 2}" y="${s(1220)}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${s(32)}">${esc(link)}</text>
        ${agentLine ? `<text x="${W / 2}" y="${s(1560)}" text-anchor="middle" fill="#dbeafe" font-family="sans-serif" font-size="${s(30)}">${esc(agentLine)}</text>` : ''}
        ${loLine ? `<text x="${W / 2}" y="${s(1620)}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${s(30)}">${esc(loLine)}</text>` : ''}
        <text x="${W / 2}" y="${s(1700)}" text-anchor="middle" fill="#93c5fd" font-family="sans-serif" font-size="${s(24)}">Equal Housing Opportunity · Not a commitment to lend · AI-generated voice</text>
        <text x="${W / 2}" y="${s(1760)}" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-size="${s(26)}">Made with HomeListingAI</text></svg>`;
      let endCard = sharp(Buffer.from(endSvg));
      const logoSrc = lo?.logo_url ? await loadPhoto(lo.logo_url).catch(() => null) : (logoPath ? await fs.readFile(logoPath).catch(() => null) : null);
      if (logoSrc) {
        const logo = await sharp(logoSrc).resize(s(220), s(220), { fit: 'contain', background: '#ffffff' }).png().toBuffer();
        endCard = endCard.composite([{ input: logo, left: Math.round(W / 2 - s(110)), top: s(320) }]);
      }
      await endCard.jpeg({ quality: 92 }).toFile(path.join(dir, 'slide_end.jpg'));

      // Overlays: price badge + caption cards.
      const badgeText = listing.price ? money(listing.price) : '';
      const hasBadge = Boolean(badgeText);
      if (hasBadge) {
        await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s(420)}" height="${s(120)}"><rect width="100%" height="100%" rx="${s(30)}" fill="#4338ca"/><text x="${s(210)}" y="${s(82)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${s(62)}" font-weight="700">${esc(badgeText)}</text></svg>`)).png().toFile(path.join(dir, 'badge.png'));
      }
      const capW = W - s(120);
      const capHeights = [];
      for (let i = 0; i < cues.length; i++) {
        const lines = wrapLines(cues[i].text, 26);
        const lh = s(76), h = lines.length * lh + s(50);
        capHeights.push(h);
        await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${capW}" height="${h}"><rect width="100%" height="100%" rx="${s(30)}" fill="#000" fill-opacity=".55"/>${lines.map((x, j) => `<text x="${capW / 2}" y="${s(62) + j * lh}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${s(56)}" font-weight="700">${esc(x)}</text>`).join('')}</svg>`)).png().toFile(path.join(dir, `cap${i}.png`));
      }
      onProgress?.(55);

      // Ken Burns clips (alternate zoom in / zoom out).
      const clips = [];
      for (let i = 0; i < n; i++) {
        const fr = Math.round((photoDur + XFADE) * FPS);
        const z = i % 2 ? `'1.12-0.12*on/${fr}'` : `'1+0.12*on/${fr}'`;
        await ff(['-loop', '1', '-i', path.join(dir, `slide${i}.jpg`), '-vf', `zoompan=z=${z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${fr}:s=${W}x${H}:fps=${FPS},format=yuv420p`, '-frames:v', String(fr), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', path.join(dir, `k${i}.mp4`)]);
        clips.push(path.join(dir, `k${i}.mp4`));
        onProgress?.(55 + Math.round(((i + 1) / n) * 25));
      }
      const endFrames = Math.round((END_CARD_SECONDS + XFADE) * FPS);
      await ff(['-loop', '1', '-i', path.join(dir, 'slide_end.jpg'), '-vf', `scale=${W}:${H},fps=${FPS},format=yuv420p`, '-frames:v', String(endFrames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', path.join(dir, 'kend.mp4')]);
      clips.push(path.join(dir, 'kend.mp4'));

      // Crossfade chain, overlays, audio.
      const inputs = [];
      clips.forEach((c) => inputs.push('-i', c));
      let filter = '';
      let prev = '[0:v]';
      for (let i = 1; i < clips.length; i++) {
        filter += `${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${(i * photoDur).toFixed(3)}[x${i}];`;
        prev = `[x${i}]`;
      }
      let idx = clips.length;
      let cur = prev;
      if (hasBadge) {
        inputs.push('-i', path.join(dir, 'badge.png'));
        filter += `${cur}[${idx}:v]overlay=x=(W-w)/2:y=${s(170)}:enable='lt(t,${(photoDur * n).toFixed(2)})'[ob];`;
        cur = '[ob]'; idx++;
      }
      cues.forEach((c, i) => {
        inputs.push('-i', path.join(dir, `cap${i}.png`));
        filter += `${cur}[${idx}:v]overlay=x=${s(60)}:y=H-h-${s(260)}:enable='between(t,${c.start.toFixed(2)},${c.end.toFixed(2)})'[c${i}];`;
        cur = `[c${i}]`; idx++;
      });
      inputs.push('-i', voiceFile);
      const voiceIdx = idx++;
      const music = await pickMusic();
      let audioFilter;
      if (music) {
        inputs.push('-stream_loop', '-1', '-i', music);
        audioFilter = `[${voiceIdx}:a]apad[v];[${idx}:a]volume=0.12,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[m];[v][m]amix=inputs=2:duration=first:normalize=0[a]`;
      } else {
        audioFilter = `[${voiceIdx}:a]apad[a]`;
      }
      const out = path.join(dir, 'reel.mp4');
      await ff([...inputs, '-filter_complex', `${filter}${audioFilter}`, '-map', cur, '-map', '[a]', '-t', total.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], 240000);
      onProgress?.(92);
      return { buffer: await fs.readFile(out), seconds: total, script };
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  function sweep() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of jobs) if (job.updatedAt < cutoff) jobs.delete(id);
  }

  // Starts a render in the background and returns a job id to poll.
  function start({ ownerId, listing, lo, realtor, voice }) {
    sweep();
    for (const job of jobs.values()) {
      if (job.ownerId === ownerId && job.listingId === listing.id && (job.status === 'queued' || job.status === 'working')) return job.id;
    }
    const id = crypto.randomUUID();
    const job = { id, ownerId, listingId: listing.id, status: 'queued', progress: 0, url: null, error: null, updatedAt: Date.now() };
    jobs.set(id, job);
    chain = chain.then(async () => {
      job.status = 'working'; job.updatedAt = Date.now();
      try {
        const { buffer } = await render({ listing, lo, realtor, voice, onProgress: (p) => { job.progress = p; job.updatedAt = Date.now(); } });
        const storagePath = `reels/${listing.id}/${crypto.randomUUID()}.mp4`;
        const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, buffer, { contentType: 'video/mp4', upsert: false });
        if (error) throw new Error(`upload_failed:${error.message}`);
        const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
        job.url = data?.publicUrl || null;
        job.status = job.url ? 'done' : 'failed';
        if (!job.url) job.error = 'no_public_url';
        job.progress = 100;
      } catch (err) {
        job.status = 'failed';
        job.error = String(err?.message || err).slice(0, 160);
        console.error('[Listing Reel] render failed:', job.error);
      }
      job.updatedAt = Date.now();
    });
    return id;
  }

  function get(id, ownerId) {
    const job = jobs.get(id);
    if (!job || job.ownerId !== ownerId) return null;
    return { id: job.id, status: job.status, progress: job.progress, url: job.url, error: job.error };
  }

  return { start, get, available, render };
}

module.exports = { createListingReelService, buildReelScript, splitCues, cueTimings, slideDurations, wrapLines };
