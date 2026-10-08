'use strict';
// Storage for HomeListingAI's own connected social accounts (shared by every admin).
// Ported from the An AI You admin so both use the same connection flow.
const crypto = require('crypto');
const { encryptToken } = require('./tokenCrypto');

const STATE_TTL_MS = 15 * 60 * 1000;
const stateHash = (state) => crypto.createHash('sha256').update(String(state)).digest('hex');

// Where the admin lands after the provider sends them back.
function studioReturn(platform, result, message = '') {
  const params = new URLSearchParams({ social: platform, result });
  if (message) params.set('message', String(message).slice(0, 240));
  return `/admin/marketing-funnels?${params}`;
}

function createHouseSocialStore({ supabaseAdmin }) {
  async function rememberState(startedBy, platform, verifier) {
    const state = crypto.randomBytes(32).toString('hex');
    await supabaseAdmin.from('house_social_oauth_states').delete().lt('expires_at', new Date().toISOString());
    const { error } = await supabaseAdmin.from('house_social_oauth_states').insert({
      state_hash: stateHash(state), platform, code_verifier: verifier,
      started_by: startedBy, expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString()
    });
    if (error) throw error;
    return state;
  }

  // Trade a returned state for the attempt that started it. One use only.
  async function claimState(state, platform) {
    const { data, error } = await supabaseAdmin.from('house_social_oauth_states')
      .delete().eq('state_hash', stateHash(state)).eq('platform', platform)
      .gt('expires_at', new Date().toISOString())
      .select('platform, code_verifier, started_by').maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function saveConnection(platform, { account, tokens, connectedBy }) {
    const expiresIn = Number(tokens.expires_in || 0);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('house_social_connections').upsert({
      platform, status: 'connected',
      account_label: account.accountLabel,
      external_account_id: account.externalAccountId,
      access_token_encrypted: encryptToken(account.accessToken),
      refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scope: String(tokens.scope || ''),
      metadata: account.metadata || {},
      connected_by: connectedBy || null,
      last_checked_at: now, last_error: '', connected_at: now, updated_at: now
    }, { onConflict: 'platform' });
    if (error) throw error;
  }

  async function list() {
    const { data, error } = await supabaseAdmin.from('house_social_connections')
      .select('platform, status, account_label, last_error, connected_at, updated_at');
    if (error) throw error;
    return data || [];
  }

  async function remove(platform) {
    const { error } = await supabaseAdmin.from('house_social_connections').delete().eq('platform', platform);
    if (error) throw error;
  }

  return { rememberState, claimState, saveConnection, list, remove };
}

module.exports = { createHouseSocialStore, studioReturn, stateHash, STATE_TTL_MS };
