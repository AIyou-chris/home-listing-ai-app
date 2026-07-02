// backend/services/bufferService.js
// Thin client for Buffer's modern GraphQL API (https://api.buffer.com).
// Used to auto-post marketing content (blog shares + ad-hoc composer) to the
// company's connected social channels — LinkedIn first. DI factory so the
// GraphQL transport can be mocked in node:tests.
'use strict';

const BUFFER_API_URL = 'https://api.buffer.com';

// Build a GraphQL string literal from an arbitrary JS string. JSON.stringify
// produces a valid GraphQL string (same escaping rules for " \\ and control
// chars), which lets us inline values without guessing input type names for
// typed variables.
function gqlString(value) {
  return JSON.stringify(String(value == null ? '' : value));
}

function createBufferService(deps = {}) {
  const fetchImpl = deps.fetch || globalThis.fetch;
  const logger = deps.logger || console;
  const token = deps.token || process.env.BUFFER_ACCESS_TOKEN || '';
  const orgId = deps.orgId || process.env.BUFFER_ORG_ID || '';

  function isConfigured() {
    return Boolean(token);
  }

  async function graphql(query) {
    if (!fetchImpl) throw new Error('fetch_unavailable');
    if (!token) throw new Error('buffer_not_configured');
    const resp = await fetchImpl(BUFFER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
    let json = {};
    try { json = await resp.json(); } catch (_) { json = {}; }
    if (json && Array.isArray(json.errors) && json.errors.length) {
      throw new Error(json.errors.map((e) => e && e.message).filter(Boolean).join('; ') || 'buffer_graphql_error');
    }
    if (!resp.ok && !(json && json.data)) {
      throw new Error(`buffer_http_${resp.status}`);
    }
    return (json && json.data) || {};
  }

  async function getAccount() {
    const data = await graphql('query { account { id email organizations { id name } } }');
    return data && data.account ? data.account : null;
  }

  async function listChannels() {
    if (!orgId) throw new Error('buffer_org_missing');
    const data = await graphql(
      `query { channels(input:{organizationId:${gqlString(orgId)}}) { id name displayName service isQueuePaused } }`
    );
    return (data && Array.isArray(data.channels)) ? data.channels : [];
  }

  // Create a post on a channel.
  //  - No dueAt / mode  → addToQueue (next scheduled Buffer slot)
  //  - mode: 'shareNow' → publish immediately
  //  - dueAt (ISO 8601 UTC) → customScheduled for that exact time
  //  - imageUrls: string[] → attached as image assets (must be public URLs)
  //  - service: 'facebook' | 'instagram' | … → adds the per-network metadata
  //    Buffer requires (FB/IG posts are rejected without a `type`).
  // `assets` is a required field in Buffer's schema, so text-only posts send [].
  async function createPost({ channelId, text, dueAt, imageUrls, mode, service } = {}) {
    const chan = channelId || deps.defaultChannelId || process.env.BUFFER_LINKEDIN_CHANNEL_ID || '';
    if (!chan) throw new Error('buffer_channel_missing');
    if (!text || !String(text).trim()) throw new Error('buffer_text_required');

    const urls = (Array.isArray(imageUrls) ? imageUrls : []).filter(Boolean);
    const svc = String(service || '').toLowerCase();

    // Instagram hard requirement: no media → Buffer rejects the post.
    if (svc === 'instagram' && !urls.length) {
      throw new Error('Instagram needs an image — add one and try again.');
    }

    const shareMode = dueAt ? 'customScheduled' : (mode || 'addToQueue');
    const dueClause = dueAt ? `, dueAt: ${gqlString(dueAt)}` : '';

    let metadataClause = '';
    if (svc === 'facebook') {
      metadataClause = ', metadata: { facebook: { type: post } }';
    } else if (svc === 'instagram') {
      metadataClause = ', metadata: { instagram: { type: post, shouldShareToFeed: true } }';
    }

    const assetsLiteral = `[${urls.map((u) => `{ image: { url: ${gqlString(u)} } }`).join(', ')}]`;

    const query = `mutation {
      createPost(input: {
        text: ${gqlString(text)},
        channelId: ${gqlString(chan)},
        schedulingType: automatic,
        mode: ${shareMode},
        assets: ${assetsLiteral}${metadataClause}${dueClause}
      }) {
        __typename
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }`;

    const data = await graphql(query);
    const result = data && data.createPost;
    if (!result) throw new Error('buffer_no_response');
    if (result.__typename === 'MutationError' || result.message) {
      throw new Error(result.message || 'buffer_post_failed');
    }
    return result.post || null; // { id, dueAt }
  }

  return {
    BUFFER_API_URL,
    isConfigured,
    graphql,
    getAccount,
    listChannels,
    createPost,
  };
}

module.exports = { createBufferService, gqlString, BUFFER_API_URL };
