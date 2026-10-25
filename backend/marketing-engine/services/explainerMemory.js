'use strict';
// What the video writer remembers, kept on each campaign's own record (no extra table): the scenes made lately (so the next video
// does not repeat them) and the owner's thumbs up or down (so the writer leans toward what was liked). Always one customer's rows only.
const OWNER = /^[0-9a-f-]{36}$/i;

async function history(db, owner, limit = 60) {
  if (!db || !OWNER.test(owner || '')) return [];
  try {
    const { data } = await db.from('admin_marketing_campaigns').select('id, brief, updated_at').eq('owner_id', owner).order('updated_at', { ascending: false }).limit(limit);
    return (data || []).filter((r) => r.brief?.explainerScene);
  } catch { return []; }
}

async function recentScenes(db, owner, limit = 8) {
  return (await history(db, owner)).slice(0, limit).map((r) => r.brief.explainerScene);
}

async function tasteFor(db, owner, scene) {
  const rated = (await history(db, owner)).filter((r) => r.brief.videoFeedback?.rating && (!scene || r.brief.explainerScene?.scene === scene));
  const pick = (rating) => rated.filter((r) => r.brief.videoFeedback.rating === rating).slice(0, 3)
    .map((r) => `${r.brief.explainerScene.summary || r.brief.explainerScene.line || ''}${r.brief.videoFeedback.reason ? ` (${r.brief.videoFeedback.reason})` : ''}`.slice(0, 320)).filter(Boolean);
  return { liked: pick('up'), disliked: pick('down') };
}

module.exports = { recentScenes, tasteFor };
