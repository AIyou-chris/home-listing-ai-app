'use strict';
// Facebook groups for HomeListingAI's own marketing. Facebook does not allow apps to post into groups,
// so this keeps a library of groups with their rules, writes the post, and logs what a person posted by hand.
const { VOICE_RULES, findVoiceViolations } = require('./brandVoice');

const JOIN_STATUSES = new Set(['researching', 'requested', 'joined', 'paused']);

// yes / no / not checked yet. A guess would read as a fact about someone else's group.
function triState(value) {
  if (value === true || value === 'true' || value === 'yes') return true;
  if (value === false || value === 'false' || value === 'no') return false;
  return null;
}

function cleanGroup(body = {}) {
  const name = String(body.name || '').trim().slice(0, 180);
  const facebookUrl = String(body.facebookUrl || '').trim().slice(0, 1000);
  if (!name) return { error: 'Add the group name' };
  if (facebookUrl && !/^https:\/\/(www\.|m\.)?facebook\.com\/groups\//i.test(facebookUrl)) {
    return { error: 'Use a group link that starts with https://facebook.com/groups/' };
  }
  const promotionDays = Array.isArray(body.promotionDays)
    ? body.promotionDays
    : String(body.promotionDays || '').split(',');
  return {
    value: {
      name,
      facebook_url: facebookUrl,
      audience: String(body.audience || '').trim().slice(0, 240),
      member_count: Math.max(0, Math.min(100000000, Number(body.memberCount) || 0)),
      join_status: JOIN_STATUSES.has(body.joinStatus) ? body.joinStatus : 'researching',
      promotion_days: promotionDays.map((d) => String(d).trim().slice(0, 30)).filter(Boolean).slice(0, 7),
      links_allowed: triState(body.linksAllowed),
      rules: String(body.rules || '').trim().slice(0, 5000),
      notes: String(body.notes || '').trim().slice(0, 3000),
      updated_at: new Date().toISOString()
    }
  };
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['valueFirst', 'noLink', 'promotional'],
  properties: { valueFirst: { type: 'string' }, noLink: { type: 'string' }, promotional: { type: 'string' } }
};

function buildPostPrompt({ group, topic, link }) {
  const linkRule = group.links_allowed === true
    ? `Links are allowed. The link is ${link}.`
    : group.links_allowed === false
      ? 'This group BANS links. No link, no web address, in any version.'
      : 'Nobody has checked this group\'s link rule yet. Treat links as banned: no link, no web address, in any version.';
  return `You write Facebook group posts for HomeListingAI. HomeListingAI gives loan officers and real estate agents a tool that turns every listing into a page buyers can chat with. The loan officer gets the warm leads and the agent gets a partner. Free 7-day trial, no card.

${VOICE_RULES}

GROUP: ${group.name}
WHO IS IN IT: ${group.audience || 'unknown'}
GROUP RULES: ${group.rules || 'No rules saved. Treat any promotion as high risk.'}
${linkRule}
${group.promotion_days?.length ? `PROMOTION ALLOWED ON: ${group.promotion_days.join(', ')}` : ''}
WHAT THE POST IS ABOUT: ${topic || 'A useful tip for this group, with a light mention of what we built.'}

Write three versions, each under 120 words, ready to paste:
- valueFirst: leads with something useful for this group, then one soft line about what we built.
- noLink: a pure conversation starter or tip. Does not name HomeListingAI at all.
- promotional: a direct, honest post about the product. Only fit for groups that allow promotion.
No emojis. No stock phrases like "everyone wins" or "give it a spin". Sound like a loan officer talking to other loan officers, not an ad. Never promise leads, results, rates or approvals. Never invent a number or a customer. At most one exclamation mark. Return only the structured result.`;
}

function createFbGroupWriter({ openaiApiKey, model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o', fetchImpl = fetch } = {}) {
  async function write({ group, topic, link }) {
    if (!openaiApiKey) throw new Error('writer_not_configured');
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0.7,
        messages: [{ role: 'user', content: buildPostPrompt({ group, topic, link }) }],
        response_format: { type: 'json_schema', json_schema: { name: 'fb_group_posts', strict: true, schema: SCHEMA } }
      })
    });
    if (!res.ok) throw new Error(`writer_failed_${res.status}`);
    const json = await res.json();
    const out = JSON.parse(json.choices?.[0]?.message?.content || '{}');
    const linkAllowed = group.links_allowed === true;
    const variants = {};
    for (const key of ['valueFirst', 'noLink', 'promotional']) {
      let text = String(out[key] || '').trim();
      if (!linkAllowed) text = text.replace(/https?:\/\/\S+|\b[a-z0-9-]+\.(com|ai|io|net)\b\S*/gi, '').replace(/[ \t]+\n/g, '\n').trim();
      variants[key] = { text, voiceIssues: findVoiceViolations(text) };
    }
    return variants;
  }
  return { write };
}

module.exports = { cleanGroup, triState, buildPostPrompt, createFbGroupWriter, JOIN_STATUSES };
