// backend/services/listingAlertService.js
'use strict';

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

function normalizeAlertPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function isStopKeyword(text) {
  if (!text) return false;
  return STOP_KEYWORDS.has(String(text).trim().toUpperCase());
}

function formatPrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  return `$${Math.round(num).toLocaleString('en-US')}`;
}

function detectPriceDrop(oldPrice, newPrice) {
  const o = Number(oldPrice);
  const n = Number(newPrice);
  if (!Number.isFinite(o) || !Number.isFinite(n)) return false;
  if (o <= 0 || n <= 0) return false;
  return n < o;
}

function buildPriceDropMessage({ address, oldPrice, newPrice }) {
  const where = address || 'a home you saved';
  return `Price drop on ${where} — now ${formatPrice(newPrice)} (was ${formatPrice(oldPrice)}). Reply for details. Reply STOP to opt out.`;
}

module.exports = {
  normalizeAlertPhone,
  isStopKeyword,
  formatPrice,
  detectPriceDrop,
  buildPriceDropMessage,
};
