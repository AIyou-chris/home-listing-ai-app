'use strict';

// The production database is missing some columns the chat code writes (for example
// ai_conversation_messages.intent_tags and ai_conversations.visitor_id). A write that names a
// missing column fails as a whole, so every buyer chat message failed to save and the chat fell
// back to canned answers. This retries a write without whichever column the database says it
// lacks, one at a time, so the rest of the row still saves.

function parseMissingColumn(error) {
  const message = String(error?.message || '');
  const postgrest = message.match(/Could not find the '([^']+)' column/i);
  if (postgrest?.[1]) return postgrest[1];
  const postgres = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+(?:of relation\s+\S+\s+)?does not exist/i);
  if (postgres?.[1]) return postgres[1];
  return null;
}

// `run(payload)` performs one attempt and returns { data, error }. Never throws for a column problem.
// `payload` may be one row or an array of rows (a missing column is dropped from every row).
async function writeWithColumnFallback(run, payload) {
  const isBatch = Array.isArray(payload);
  let current = isBatch ? payload.map((row) => ({ ...(row || {}) })) : { ...(payload || {}) };
  const keysOf = (value) => Object.keys(isBatch ? (value[0] || {}) : value);
  const hasKey = (value, key) => (isBatch ? value.some((row) => Object.prototype.hasOwnProperty.call(row, key)) : Object.prototype.hasOwnProperty.call(value, key));
  const without = (value, key) => {
    if (!isBatch) {
      const next = { ...value };
      delete next[key];
      return next;
    }
    return value.map((row) => {
      const next = { ...row };
      delete next[key];
      return next;
    });
  };
  const maxAttempts = keysOf(current).length + 1;
  const dropped = [];
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await run(current);
    if (!error) return { data, error: null, dropped };
    const missing = parseMissingColumn(error);
    if (!missing || !hasKey(current, missing)) return { data: null, error, dropped };
    current = without(current, missing);
    dropped.push(missing);
  }
  return { data: null, error: new Error('too_many_missing_columns'), dropped };
}

module.exports = { parseMissingColumn, writeWithColumnFallback };
