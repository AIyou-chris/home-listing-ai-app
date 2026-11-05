'use strict';
// Storage for each customer's own connected social accounts.
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

// `tables` lets the loan officers' own accounts use the same code on their own tables.
function createHouseSocialStore({ supabaseAdmin, tables = {} }) {
  const STATES = tables.states || 'house_social_oauth_states';
  const CONNECTIONS = tables.connections || 'house_social_connections';
  async function rememberState(owner, platform, verifier) {
    const state = crypto.randomBytes(32).toString('hex');
    await supabaseAdmin.from(STATES).delete().lt('expires_at', new Date().toISOString());
    const { error } = await supabaseAdmin.from(STATES).insert({
      state_hash: stateHash(state), platform, code_verifier: verifier,
      owner_id: owner, started_by: owner, expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString()
    });
    if (error) throw error;
    return state;
  }

  // Trade a returned state for the attempt that started it. One use only.
  async function claimState(state, platform) {
    const { data, error } = await supabaseAdmin.from(STATES)
      .delete().eq('state_hash', stateHash(state)).eq('platform', platform)
      .gt('expires_at', new Date().toISOString())
      .select('platform, code_verifier, started_by, owner_id').maybeSingle();
    if (error) throw error;
    return data || null;
  }

  // One connection per customer per platform. Update-then-insert so it works under the old and the new database key alike.
  async function saveConnection(owner, platform, { account, tokens, connectedBy }) {
    if (!owner) throw new Error('A connection needs an owner');
    const expiresIn = Number(tokens.expires_in || 0);
    const now = new Date().toISOString();
    const row = {
      status: 'connected',
      account_label: account.accountLabel,
      external_account_id: account.externalAccountId,
      access_token_encrypted: encryptToken(account.accessToken),
      refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scope: String(tokens.scope || ''),
      metadata: account.metadata || {},
      connected_by: connectedBy || null,
      last_checked_at: now, last_error: '', connected_at: now, updated_at: now
    };
    const updated = await supabaseAdmin.from(CONNECTIONS).update(row).eq('owner_id', owner).eq('platform', platform).select('platform');
    if (updated.error) throw updated.error;
    if (!updated.data?.length) {
      const { error } = await supabaseAdmin.from(CONNECTIONS).insert({ ...row, owner_id: owner, platform });
      if (error) throw error;
    }
  }

  async function list(owner) {
    if (!owner) return [];
    const { data, error } = await supabaseAdmin.from(CONNECTIONS)
      .select('platform, status, account_label, last_error, connected_at, updated_at').eq('owner_id', owner);
    if (error) throw error;
    return data || [];
  }

  async function remove(owner, platform) {
    if (!owner) throw new Error('A connection needs an owner');
    const { error } = await supabaseAdmin.from(CONNECTIONS).delete().eq('owner_id', owner).eq('platform', platform);
    if (error) throw error;
  }

  return { rememberState, claimState, saveConnection, list, remove };
}

// Where loan officers' own accounts are kept (see lo-social-migration.sql).
const LO_TABLES = { states: 'lo_social_oauth_states', connections: 'lo_social_connections' };

module.exports = { createHouseSocialStore, LO_TABLES, studioReturn, stateHash, STATE_TTL_MS };
