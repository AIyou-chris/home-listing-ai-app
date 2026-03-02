#!/usr/bin/env node
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const BACKEND_URL = (process.env.PROD_BACKEND_URL || 'https://home-listing-ai-backend.onrender.com').replace(/\/+$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(JSON.stringify({
    ok: false,
    failing_step: 0,
    error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  }, null, 2));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseBody = async (res) => {
  const text = await res.text();
  try {
    return { raw: text, json: JSON.parse(text) };
  } catch (_) {
    return { raw: text, json: null };
  }
};

(async () => {
  const report = {
    backend_url: BACKEND_URL,
    started_at: new Date().toISOString(),
    listing: null,
    video_id: null,
    transitions: [],
    final_row: null,
    signed_url_http_status: null,
    download_http_status: null,
    download_bytes: null
  };

  // STEP 1
  const { data: listings, error: listingsError } = await supabase
    .from('properties')
    .select('id, agent_id, user_id, address, is_published, public_slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (listingsError || !Array.isArray(listings) || listings.length === 0) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 1,
      error: 'No published listings found or query failed',
      db_error: listingsError?.message || null
    }, null, 2));
    process.exit(1);
  }

  let selected = null;
  let generateResponse = null;
  const attempts = [];

  for (const row of listings) {
    const ownerId = String(row.agent_id || row.user_id || '').trim();
    if (!ownerId) continue;

    const url = `${BACKEND_URL}/api/dashboard/listings/${encodeURIComponent(row.id)}/videos/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-id': ownerId
      },
      body: JSON.stringify({ template_style: 'luxury' })
    });
    const body = await parseBody(res);
    attempts.push({
      listing_id: row.id,
      owner_id: ownerId,
      status: res.status,
      body: body.json || body.raw
    });

    if (res.ok && (body.json?.video_id || body.json?.videoId)) {
      selected = { ...row, owner_id: ownerId };
      generateResponse = body.json;
      break;
    }
  }

  if (!selected || !generateResponse) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 1,
      error: 'Failed to create video on any published listing',
      attempts
    }, null, 2));
    process.exit(1);
  }

  report.listing = {
    id: selected.id,
    address: selected.address || null,
    owner_id: selected.owner_id,
    public_slug: selected.public_slug || null
  };
  report.video_id = String(generateResponse.video_id || generateResponse.videoId);
  report.transitions.push({ at: new Date().toISOString(), status: String(generateResponse.status || 'queued') });

  // STEP 2
  const timeoutMs = 8 * 60 * 1000;
  const started = Date.now();
  let lastStatus = null;
  let finalRow = null;

  while (Date.now() - started < timeoutMs) {
    const { data: row, error: rowError } = await supabase
      .from('listing_videos')
      .select('id, agent_id, listing_id, status, error_message, storage_bucket, storage_path, file_name, mime_type, creatomate_render_id, created_at, updated_at')
      .eq('id', report.video_id)
      .maybeSingle();

    if (rowError || !row) {
      console.error(JSON.stringify({
        ok: false,
        failing_step: 2,
        error: 'listing_videos row missing during transition check',
        db_error: rowError?.message || null,
        video_id: report.video_id
      }, null, 2));
      process.exit(1);
    }

    finalRow = row;
    const status = String(row.status || '').toLowerCase();
    if (status !== lastStatus) {
      report.transitions.push({ at: new Date().toISOString(), status, render_id: row.creatomate_render_id || null });
      lastStatus = status;
    }

    if (status === 'succeeded' || status === 'failed') break;
    await sleep(5000);
  }

  if (!finalRow) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 2,
      error: 'No final listing_videos row found',
      video_id: report.video_id
    }, null, 2));
    process.exit(1);
  }

  report.final_row = finalRow;

  if (String(finalRow.status || '').toLowerCase() !== 'succeeded') {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 2,
      error: 'Video did not succeed',
      transitions: report.transitions,
      row_snapshot: finalRow
    }, null, 2));
    process.exit(1);
  }

  // STEP 3
  const expectedPath = `agent/${report.listing.owner_id}/listing/${report.listing.id}/${report.video_id}.mp4`;
  if (String(finalRow.storage_bucket || '') !== 'videos' || String(finalRow.storage_path || '') !== expectedPath) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 3,
      error: 'Storage path/bucket mismatch',
      expected: { storage_bucket: 'videos', storage_path: expectedPath },
      row_snapshot: finalRow
    }, null, 2));
    process.exit(1);
  }

  const folder = `agent/${report.listing.owner_id}/listing/${report.listing.id}`;
  const { data: listedFiles, error: listError } = await supabase.storage
    .from('videos')
    .list(folder, { limit: 100, search: `${report.video_id}.mp4` });

  if (listError || !Array.isArray(listedFiles) || !listedFiles.some((f) => f?.name === `${report.video_id}.mp4`)) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 3,
      error: 'MP4 not found in Supabase Storage list()',
      storage_error: listError?.message || null,
      folder,
      files: listedFiles || []
    }, null, 2));
    process.exit(1);
  }

  // STEP 4
  const signedRes = await fetch(`${BACKEND_URL}/api/dashboard/videos/${encodeURIComponent(report.video_id)}/signed-url`, {
    headers: { 'x-agent-id': report.listing.owner_id }
  });
  report.signed_url_http_status = signedRes.status;
  const signedBody = await parseBody(signedRes);

  if (!signedRes.ok || !signedBody.json?.signedUrl) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 4,
      error: 'Signed URL endpoint failed',
      http_status: signedRes.status,
      body: signedBody.json || signedBody.raw,
      row_snapshot: finalRow
    }, null, 2));
    process.exit(1);
  }

  const fileRes = await fetch(signedBody.json.signedUrl);
  report.download_http_status = fileRes.status;
  if (!fileRes.ok) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 4,
      error: 'Signed URL download failed',
      http_status: fileRes.status,
      signed_url_http_status: signedRes.status,
      content_type: fileRes.headers.get('content-type') || null
    }, null, 2));
    process.exit(1);
  }

  const bytes = (await fileRes.arrayBuffer()).byteLength;
  report.download_bytes = bytes;
  if (!bytes) {
    console.error(JSON.stringify({
      ok: false,
      failing_step: 4,
      error: 'Downloaded file is empty',
      http_status: fileRes.status,
      content_type: fileRes.headers.get('content-type') || null
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    report
  }, null, 2));
})();
