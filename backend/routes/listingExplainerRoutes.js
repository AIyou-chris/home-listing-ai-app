'use strict';
// POST /api/lo/listings/:listingId/explainer — one tap makes the "Ask the AI" video for a listing (free, drawn in code).
// Same rules as the listing reel: the loan officer must be assigned to the listing, the home must be published
// and have its public link, and the loan officer's NMLS goes on the end card.
const express = require('express');
const explainer = require('../services/listingExplainer');

const PER_HOUR = 5;

function register(app, { requireLoAgent, supabaseAdmin, isListingPublished, toTrimmedOrNull, available = () => require('../services/explainerVideo').available(), make = explainer.makeAndStore }) {
  const log = new Map(); // loAgentId -> [timestamps]
  app.post('/api/lo/listings/:listingId/explainer', requireLoAgent, express.json({ limit: '2kb' }), async (req, res) => {
    try {
      const loAgentId = req.loAgentId;
      const { listingId } = req.params;
      if (!(await available())) return res.status(503).json({ error: 'video_unavailable' });

      const { data: assignment } = await supabaseAdmin.from('listing_lo_assignments').select('listing_id').eq('listing_id', listingId).eq('lo_agent_id', loAgentId).limit(1).maybeSingle();
      if (!assignment) return res.status(403).json({ error: 'listing_access_denied' });

      const now = Date.now();
      const recent = (log.get(loAgentId) || []).filter((t) => now - t < 3600000);
      if (recent.length >= PER_HOUR) return res.status(429).json({ error: 'video_rate_limited' });

      const { data: listing } = await supabaseAdmin.from('properties').select('id, address, title, price, bedrooms, bathrooms, status, is_published, public_slug').eq('id', listingId).maybeSingle();
      if (!listing) return res.status(404).json({ error: 'listing_not_found' });
      if (!isListingPublished(listing)) return res.status(409).json({ error: 'NOT_PUBLISHED' });
      if (!toTrimmedOrNull(listing.public_slug)) return res.status(409).json({ error: 'NO_SHARE_LINK' });

      const { data: lo } = await supabaseAdmin.from('agents').select('first_name, last_name, company, nmls_number').eq('id', loAgentId).maybeSingle();
      if (!lo?.nmls_number) return res.status(409).json({ error: 'NEED_NMLS' });

      log.set(loAgentId, [...recent, now]);
      const variant = Number.isInteger(req.body?.variant) ? req.body.variant : 0;
      const made = await make({
        supabaseAdmin, variant,
        listing: { id: listing.id, address: listing.address || listing.title || '', price: Number(listing.price) || 0, bedrooms: Number(listing.bedrooms) || 0, bathrooms: Number(listing.bathrooms) || 0 },
        lo: { name: `${lo.first_name || ''} ${lo.last_name || ''}`.trim(), company: lo.company || null, nmls_number: lo.nmls_number }
      });
      res.json({ success: true, url: made.url });
    } catch (err) {
      if (err?.message === 'NEED_NMLS' || err?.message === 'NEED_LO_NAME') return res.status(409).json({ error: err.message });
      console.error('[LO Explainer] failed:', err?.message || err);
      res.status(500).json({ error: 'video_failed' });
    }
  });
}

module.exports = { register, PER_HOUR };
