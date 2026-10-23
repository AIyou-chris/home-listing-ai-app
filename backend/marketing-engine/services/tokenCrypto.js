/**
 * Encrypts OAuth tokens before they touch Postgres.
 *
 * No table in this codebase stored a real secret at rest before this one --
 * every other provider key lives only in process.env. Social platform tokens
 * are different: they're per-connection, created at runtime by an admin
 * clicking "Connect", so there's nowhere in .env to put them. AES-256-GCM
 * with a server-only key is the minimum bar for that.
 */
'use strict';
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function key() {
  const hex = process.env.MARKETING_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('MARKETING_TOKEN_ENCRYPTION_KEY must be set to a 32-byte hex string (openssl rand -hex 32)');
  }
  return Buffer.from(hex, 'hex');
}

function encryptToken(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

function decryptToken(stored) {
  if (stored == null) return null;
  const [ivB64, tagB64, dataB64] = String(stored).split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted token');
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encryptToken, decryptToken };
