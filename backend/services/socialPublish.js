/**
 * Posts one approved Marketing Studio draft to the customer's own connected
 * account. One function per platform, each taking the decrypted connection
 * and returning where the post landed.
 *
 * Every call is made on the customer's behalf with the token they granted;
 * nothing here ever posts to an account the customer did not connect.
 *
 * TikTok is deliberately absent. Until TikTok audits the app, anything it
 * posts is private to the poster, which would read as "posted" and be seen by
 * nobody.
 */
'use strict';
const { providerStatus } = require('./houseSocialOauth');

/** Channels we post to. Each one is also the name of the connected account. */
const CHANNELS = ['facebook', 'instagram', 'linkedin', 'youtube'];

/** The platform said the token is no good; the customer has to reconnect. */
class ReconnectError extends Error {}

async function call(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, options);
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) {
    const message = body.error?.message || body.error_description || body.message || (typeof body.error === 'string' ? body.error : '') || `HTTP ${response.status}`;
    // 190 is Meta's "token invalid"; 401 is everybody else's.
    if (response.status === 401 || body.error?.code === 190) throw new ReconnectError(String(message));
    throw new Error(String(message));
  }
  return { body, headers: response.headers };
}

function withHashtags(text, hashtags) {
  const tags = Array.isArray(hashtags) ? hashtags.filter(Boolean).join(' ') : '';
  return [String(text || '').trim(), tags].filter(Boolean).join('\n\n');
}

function graph(env) {
  return `https://graph.facebook.com/${String(env.META_GRAPH_VERSION || '').trim()}`;
}

async function postFacebook({ connection, payload, imageUrl, env, fetchImpl }) {
  const pageId = connection.external_account_id;
  const token = connection.accessToken;
  const message = String(payload.caption || '').trim();
  if (!message) throw new Error('This post has no caption to send.');

  const form = imageUrl
    ? { url: imageUrl, caption: message, access_token: token }
    : { message, access_token: token };
  const { body } = await call(`${graph(env)}/${pageId}/${imageUrl ? 'photos' : 'feed'}`, {
    method: 'POST', body: new URLSearchParams(form)
  }, fetchImpl);
  const postId = body.post_id || body.id;
  return { url: `https://www.facebook.com/${postId}` };
}

/**
 * Instagram publishes in two steps: upload a container, wait until Instagram
 * has processed it, then publish. A Reel can take a minute to process, so the
 * wait is bounded; if it runs out, the container id is handed back so the next
 * try picks up the same upload instead of starting another one.
 */
async function postInstagram({ connection, payload, imageUrl, env, fetchImpl, wait = ms => new Promise(r => setTimeout(r, ms)), maxWaitMs = 90_000 }) {
  const igUser = connection.external_account_id;
  const token = connection.accessToken;
  const caption = withHashtags(payload.captionText, payload.hashtags);
  const videoUrl = payload.videoStatus === 'ready' && typeof payload.videoUrl === 'string' ? payload.videoUrl : '';
  if (!videoUrl && !imageUrl) throw new Error('Instagram needs a picture or a video. Generate the video first.');

  let containerId = payload.instagramContainerId || '';
  if (!containerId) {
    const media = videoUrl
      ? { media_type: 'REELS', video_url: videoUrl, caption, access_token: token }
      : { image_url: imageUrl, caption, access_token: token };
    const { body } = await call(`${graph(env)}/${igUser}/media`, { method: 'POST', body: new URLSearchParams(media) }, fetchImpl);
    containerId = body.id;
  }

  const started = Date.now();
  for (;;) {
    const { body } = await call(`${graph(env)}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`, {}, fetchImpl);
    if (body.status_code === 'FINISHED') break;
    if (body.status_code === 'ERROR' || body.status_code === 'EXPIRED') throw new Error('Instagram could not process this video.');
    if (Date.now() - started > maxWaitMs) return { pending: true, instagramContainerId: containerId };
    await wait(5000);
  }

  const { body: published } = await call(`${graph(env)}/${igUser}/media_publish`, {
    method: 'POST', body: new URLSearchParams({ creation_id: containerId, access_token: token })
  }, fetchImpl);
  let url = 'https://www.instagram.com/';
  try {
    const { body } = await call(`${graph(env)}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`, {}, fetchImpl);
    if (body.permalink) url = body.permalink;
  } catch { /* posted either way; the link is a nicety */ }
  return { url };
}

// A LinkedIn picture takes three steps: ask for an upload address, send the picture, then attach it to the post.
async function uploadLinkedInImage({ connection, author, imageUrl, fetchImpl }) {
  const source = await fetchImpl(imageUrl);
  if (!source.ok) throw new Error('Could not read the picture file.');
  const bytes = Buffer.from(await source.arrayBuffer());
  const type = source.headers?.get?.('content-type') || 'image/png';
  const headers = { Authorization: `Bearer ${connection.accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' };
  const { body: registered } = await call('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST', headers,
    body: JSON.stringify({ registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: author,
      serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
    } })
  }, fetchImpl);
  const uploadUrl = registered.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  const asset = registered.value?.asset;
  if (!uploadUrl || !asset) throw new Error('LinkedIn did not give an upload address for the picture.');
  const put = await fetchImpl(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${connection.accessToken}`, 'Content-Type': type }, body: bytes });
  if (!put.ok) throw new Error(`LinkedIn would not take the picture (HTTP ${put.status}).`);
  return asset;
}

async function postLinkedIn({ connection, payload, imageUrl, fetchImpl }) {
  const text = String(payload.caption || '').trim();
  if (!text) throw new Error('This post has no caption to send.');
  const author = `urn:li:person:${connection.external_account_id}`;
  const asset = imageUrl ? await uploadLinkedInImage({ connection, author, imageUrl, fetchImpl }) : null;
  const content = asset
    ? { shareCommentary: { text }, shareMediaCategory: 'IMAGE', media: [{ status: 'READY', media: asset }] }
    : { shareCommentary: { text }, shareMediaCategory: 'NONE' };
  const { body, headers } = await call('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': content },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    })
  }, fetchImpl);
  const urn = body.id || headers?.get?.('x-restli-id') || '';
  return { url: urn ? `https://www.linkedin.com/feed/update/${urn}` : 'https://www.linkedin.com/feed/' };
}

/** Google access tokens last an hour; the stored refresh token gets a new one. */
async function youtubeAccessToken(connection, { env, fetchImpl }) {
  const fresh = connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000;
  if (fresh || !connection.refreshToken) return { token: connection.accessToken };
  const { clientId, clientSecret } = providerStatus('youtube', env);
  const { body } = await call('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: connection.refreshToken, client_id: clientId, client_secret: clientSecret })
  }, fetchImpl).catch(error => { throw new ReconnectError(error.message); });
  return { token: body.access_token, expiresIn: Number(body.expires_in || 0) };
}

async function postYouTube({ connection, payload, env, fetchImpl }) {
  const videoUrl = payload.videoStatus === 'ready' && typeof payload.videoUrl === 'string' ? payload.videoUrl : '';
  if (!videoUrl) throw new Error('Generate the video first, then post it.');

  const access = await youtubeAccessToken(connection, { env, fetchImpl });
  const video = await fetchImpl(videoUrl);
  if (!video.ok) throw new Error('Could not read the video file.');
  const bytes = Buffer.from(await video.arrayBuffer());

  const title = String(payload.title || 'New video').slice(0, 90);
  const metadata = {
    snippet: {
      title: /#shorts/i.test(title) ? title : `${title} #Shorts`,
      description: String(payload.description || ''),
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 15) : []
    },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false }
  };
  const boundary = `hlai${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`)
  ]);
  const { body: uploaded } = await call('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  }, fetchImpl);
  return { url: `https://www.youtube.com/shorts/${uploaded.id}`, refreshedToken: access.expiresIn ? access : null };
}

const PUBLISHERS = { facebook: postFacebook, instagram: postInstagram, linkedin: postLinkedIn, youtube: postYouTube };

async function publishToPlatform(platform, args) {
  const publisher = PUBLISHERS[platform];
  if (!publisher) throw new Error('Posting to this platform is not available yet.');
  return publisher({ env: process.env, fetchImpl: fetch, ...args });
}

module.exports = { CHANNELS, ReconnectError, publishToPlatform, postFacebook, postInstagram, postLinkedIn, postYouTube };
