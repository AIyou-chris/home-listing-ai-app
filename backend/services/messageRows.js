'use strict';

// The live ai_conversation_messages table only accepts sender in (lead, agent, ai) and channel in
// (chat, voice, email). The app speaks in richer words (visitor, system, web, sms, phone). Every buyer
// chat message was rejected by the database because of that, so the listing chat never answered live
// (found in the 2026-10-09 end-to-end test). These two functions translate at the database edge:
// store the allowed word, keep the original in metadata, and translate back when reading.

const DB_SENDERS = new Set(['lead', 'agent', 'ai']);
const DB_CHANNELS = new Set(['chat', 'voice', 'email']);

const toDbSender = (sender) => {
  const s = String(sender || '').toLowerCase();
  if (DB_SENDERS.has(s)) return s;
  if (s === 'assistant' || s === 'bot' || s === 'system') return 'ai';
  if (s === 'human' || s === 'owner' || s === 'staff') return 'agent';
  return 'lead'; // visitor, user, buyer, anything unknown
};

const toDbChannel = (channel) => {
  const c = String(channel || '').toLowerCase();
  if (DB_CHANNELS.has(c)) return c;
  if (c === 'phone' || c === 'call') return 'voice';
  return 'chat'; // web, sms, widget, anything unknown
};

// Returns a row that the database will accept, with the original words kept in metadata.
const normalizeMessageRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };
  const originalSender = row.sender;
  const originalChannel = row.channel;
  if (originalSender !== undefined) next.sender = toDbSender(originalSender);
  if (originalChannel !== undefined) next.channel = toDbChannel(originalChannel);
  const changed = (originalSender !== undefined && next.sender !== originalSender)
    || (originalChannel !== undefined && next.channel !== originalChannel);
  if (changed) {
    next.metadata = {
      ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
      ...(originalSender !== undefined && next.sender !== originalSender ? { sender_label: String(originalSender) } : {}),
      ...(originalChannel !== undefined && next.channel !== originalChannel ? { channel_label: String(originalChannel) } : {}),
    };
  }
  return next;
};

const normalizeMessagePayload = (payload) => (Array.isArray(payload) ? payload.map(normalizeMessageRow) : normalizeMessageRow(payload));

// What screens and AI prompts expect: the buyer is "visitor"; keep the original label when we stored one.
const fromDbSender = (row) => {
  const label = row?.metadata?.sender_label;
  if (label && typeof label === 'string') return label === 'user' || label === 'buyer' ? 'visitor' : label;
  return String(row?.sender || '').toLowerCase() === 'lead' ? 'visitor' : row?.sender;
};

const fromDbChannel = (row) => row?.metadata?.channel_label || row?.channel || 'web';

const isVisitorRow = (row) => fromDbSender(row) === 'visitor';

module.exports = { toDbSender, toDbChannel, normalizeMessageRow, normalizeMessagePayload, fromDbSender, fromDbChannel, isVisitorRow };
