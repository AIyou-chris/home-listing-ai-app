'use strict';
const crypto = require('crypto');

// TikTok's sign-in code below is kept for when its posting audit is done, but
// it is not offered: until then a TikTok post is visible only to the poster.
const PLATFORMS = ['facebook', 'instagram', 'youtube', 'linkedin'];

function clean(value) {
  return String(value || '').trim();
}

function publicOrigin(env = process.env) {
  return clean(env.PUBLIC_SITE_ORIGIN).replace(/\/+$/, '');
}

function callbackUri(platform, env = process.env) {
  const specific = clean(env[`${platform.toUpperCase()}_REDIRECT_URI`]);
  const origin = publicOrigin(env);
  return specific || (origin ? `${origin}/api/marketing/oauth/${platform}/callback` : '');
}

function tokenEncryptionReady(env = process.env) {
  return /^[0-9a-f]{64}$/i.test(clean(env.MARKETING_TOKEN_ENCRYPTION_KEY));
}

function credentials(platform, env = process.env) {
  if (platform === 'facebook' || platform === 'instagram') {
    return { clientId: clean(env.META_APP_ID), clientSecret: clean(env.META_APP_SECRET) };
  }
  if (platform === 'youtube') {
    return {
      clientId: clean(env.SOCIAL_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID),
      clientSecret: clean(env.SOCIAL_GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET)
    };
  }
  if (platform === 'linkedin') {
    return { clientId: clean(env.LINKEDIN_CLIENT_ID), clientSecret: clean(env.LINKEDIN_CLIENT_SECRET) };
  }
  if (platform === 'tiktok') {
    return { clientId: clean(env.TIKTOK_CLIENT_KEY), clientSecret: clean(env.TIKTOK_CLIENT_SECRET) };
  }
  return { clientId: '', clientSecret: '' };
}

function providerStatus(platform, env = process.env) {
  const creds = credentials(platform, env);
  const redirect = callbackUri(platform, env);
  const encryption = tokenEncryptionReady(env);
  let missing = '';
  if (!encryption) missing = 'Secure token storage';
  else if (!publicOrigin(env) && !redirect) missing = 'Public site address';
  else if (!creds.clientId || !creds.clientSecret) missing = 'Platform app keys';
  else if ((platform === 'facebook' || platform === 'instagram') && !clean(env.META_GRAPH_VERSION)) missing = 'Meta API version';
  return { configured: !missing, missing, redirectUri: redirect, ...creds };
}

function base64url(buffer) {
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function newVerifier() {
  return base64url(crypto.randomBytes(48));
}

function challengeFor(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

function authorizeUrl(platform, { state, codeVerifier, env = process.env }) {
  const config = providerStatus(platform, env);
  if (!config.configured) throw new Error(`${platform} is not configured`);
  const redirectUri = config.redirectUri;

  if (platform === 'facebook' || platform === 'instagram') {
    const version = clean(env.META_GRAPH_VERSION);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'
    });
    return `https://www.facebook.com/${version}/dialog/oauth?${params}`;
  }

  if (platform === 'youtube') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent',
      scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      code_challenge: challengeFor(codeVerifier),
      code_challenge_method: 'S256'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (platform === 'linkedin') {
    const params = new URLSearchParams({
      response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri,
      state, scope: 'openid profile email w_member_social'
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  if (platform === 'tiktok') {
    const params = new URLSearchParams({
      client_key: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.upload,video.publish',
      state,
      code_challenge: challengeFor(codeVerifier),
      code_challenge_method: 'S256'
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  }
  throw new Error('Unsupported platform');
}

async function jsonRequest(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) {
    const detail = body.error_description || body.error?.message || body.message || body.error || `HTTP ${response.status}`;
    throw new Error(String(detail));
  }
  return body;
}

async function exchangeStandard(url, fields, fetchImpl) {
  return jsonRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields)
  }, fetchImpl);
}

async function exchangeCode(platform, { code, codeVerifier, env = process.env, fetchImpl = fetch }) {
  const config = providerStatus(platform, env);
  if (!config.configured) throw new Error(`${platform} is not configured`);
  const common = {
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  };

  if (platform === 'facebook' || platform === 'instagram') {
    const version = clean(env.META_GRAPH_VERSION);
    let tokens = await exchangeStandard(`https://graph.facebook.com/${version}/oauth/access_token`, common, fetchImpl);
    try {
      const longParams = new URLSearchParams({
        grant_type: 'fb_exchange_token', client_id: config.clientId,
        client_secret: config.clientSecret, fb_exchange_token: tokens.access_token
      });
      const longLived = await jsonRequest(`https://graph.facebook.com/${version}/oauth/access_token?${longParams}`, {}, fetchImpl);
      tokens = { ...tokens, ...longLived };
    } catch { /* A usable short-lived token is better than losing the connection. */ }
    return tokens;
  }
  if (platform === 'youtube') {
    return exchangeStandard('https://oauth2.googleapis.com/token', {
      ...common, grant_type: 'authorization_code', code_verifier: codeVerifier
    }, fetchImpl);
  }
  if (platform === 'linkedin') {
    return exchangeStandard('https://www.linkedin.com/oauth/v2/accessToken', {
      ...common, grant_type: 'authorization_code'
    }, fetchImpl);
  }
  if (platform === 'tiktok') {
    return exchangeStandard('https://open.tiktokapis.com/v2/oauth/token/', {
      code, grant_type: 'authorization_code', client_key: config.clientId,
      client_secret: config.clientSecret, redirect_uri: config.redirectUri,
      code_verifier: codeVerifier
    }, fetchImpl);
  }
  throw new Error('Unsupported platform');
}

async function grantedPages(bearer, { env, fetchImpl, fields }) {
  const version = clean(env.META_GRAPH_VERSION);
  const { clientId, clientSecret } = credentials('facebook', env);
  const params = new URLSearchParams({ input_token: bearer, access_token: `${clientId}|${clientSecret}` });
  const debug = await jsonRequest(`https://graph.facebook.com/${version}/debug_token?${params}`, {}, fetchImpl);
  const scopes = Array.isArray(debug.data?.granular_scopes) ? debug.data.granular_scopes : [];
  const ids = [...new Set(scopes
    .filter(scope => scope.scope === 'pages_show_list' || scope.scope === 'pages_manage_posts')
    .flatMap(scope => scope.target_ids || []))];
  const pages = [];
  for (const id of ids) {
    try {
      pages.push(await jsonRequest(
        `https://graph.facebook.com/${version}/${encodeURIComponent(id)}?fields=${fields}&access_token=${encodeURIComponent(bearer)}`,
        {}, fetchImpl
      ));
    } catch { /* A Page that can't be read is skipped, not fatal. */ }
  }
  return pages;
}

async function accountFor(platform, tokens, { env = process.env, fetchImpl = fetch } = {}) {
  const bearer = tokens.access_token;
  if (platform === 'facebook' || platform === 'instagram') {
    const version = clean(env.META_GRAPH_VERSION);
    const fields = encodeURIComponent('id,name,access_token,instagram_business_account{id,username}');
    const pages = await jsonRequest(
      `https://graph.facebook.com/${version}/me/accounts?fields=${fields}&access_token=${encodeURIComponent(bearer)}`,
      {}, fetchImpl
    );
    let rows = Array.isArray(pages.data) ? pages.data : [];
    // Facebook Login for Business leaves out Pages reached through a business
    // portfolio or the new Pages experience, even when the person just ticked
    // them. The token's granular scopes still name them, so read them directly.
    if (!rows.length) rows = await grantedPages(bearer, { env, fetchImpl, fields });
    const page = platform === 'instagram'
      ? rows.find(row => row.instagram_business_account?.id)
      : rows[0];
    if (!page) {
      throw new Error(platform === 'instagram'
        ? 'No Instagram professional account connected to a Facebook Page was found.'
        : 'No Facebook Page managed by this account was found.');
    }
    const instagram = page.instagram_business_account;
    return {
      accountLabel: platform === 'instagram' ? (instagram.username ? `@${instagram.username}` : page.name) : page.name,
      externalAccountId: platform === 'instagram' ? instagram.id : page.id,
      accessToken: page.access_token || bearer,
      metadata: { pageId: page.id, pageName: page.name }
    };
  }
  if (platform === 'youtube') {
    const profile = await jsonRequest('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${bearer}` }
    }, fetchImpl);
    return { accountLabel: profile.email || profile.name || 'YouTube account', externalAccountId: profile.sub || '', accessToken: bearer, metadata: {} };
  }
  if (platform === 'linkedin') {
    const profile = await jsonRequest('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${bearer}` }
    }, fetchImpl);
    return { accountLabel: profile.name || profile.email || 'LinkedIn account', externalAccountId: profile.sub || '', accessToken: bearer, metadata: {} };
  }
  if (platform === 'tiktok') {
    const profile = await jsonRequest('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username', {
      headers: { Authorization: `Bearer ${bearer}` }
    }, fetchImpl);
    const user = profile.data?.user || {};
    return { accountLabel: user.username ? `@${user.username}` : user.display_name || 'TikTok account', externalAccountId: user.open_id || tokens.open_id || '', accessToken: bearer, metadata: {} };
  }
  throw new Error('Unsupported platform');
}

module.exports = {
  PLATFORMS, providerStatus, newVerifier, authorizeUrl, exchangeCode,
  accountFor, callbackUri, tokenEncryptionReady, challengeFor
};

