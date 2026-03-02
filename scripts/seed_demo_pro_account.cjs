#!/usr/bin/env node

const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DEMO_EMAIL = 'demo@homelistingai.com';
const CANONICAL_BASE_URL = 'https://homelistingai.com';
const DEMO_AGENT_FALLBACK_NAME = {
  first: 'Demo',
  last: 'Agent'
};

const LISTING_SEEDS = [
  {
    key: 'oak',
    title: '124 Oak Street, Austin, TX',
    address: '124 Oak Street',
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    price: 875000,
    bedrooms: 4,
    bathrooms: 3,
    square_feet: 2650,
    description: {
      title: 'Property Overview',
      paragraphs: [
        'Modern Austin home with bright open living spaces, flexible office, and strong weekend showing appeal.'
      ]
    },
    hero_photos: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop'
    ],
    gallery_photos: [
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?q=80&w=1600&auto=format&fit=crop'
    ],
    features: ['Open concept kitchen', 'Dedicated office', 'Backyard deck']
  },
  {
    key: 'maple',
    title: '156 Maple Grove Ln, Austin, TX',
    address: '156 Maple Grove Ln',
    city: 'Austin',
    state: 'TX',
    zip: '78738',
    price: 1195000,
    bedrooms: 5,
    bathrooms: 4,
    square_feet: 3420,
    description: {
      title: 'Property Overview',
      paragraphs: [
        'Luxury family listing with large entertaining layout, updated finishes, and premium neighborhood amenities.'
      ]
    },
    hero_photos: [
      'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?q=80&w=1600&auto=format&fit=crop'
    ],
    gallery_photos: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1600&auto=format&fit=crop'
    ],
    features: ['Resort-style backyard', 'Media room', 'Three-car garage']
  }
];

const SOURCE_DEFAULTS = [
  { source_type: 'link', source_key: 'link' },
  { source_type: 'open_house', source_key: 'open_house' },
  { source_type: 'qr', source_key: 'sign' },
  { source_type: 'social', source_key: 'social' }
];

const LEAD_SEEDS = [
  { key: 'lead-001', listingKey: 'oak', name: 'Ava Brooks', source: 'open_house', status: 'New', intent: 'Hot', minutesAgo: 5 },
  { key: 'lead-002', listingKey: 'oak', name: 'Noah Patel', source: 'sign', status: 'New', intent: 'Warm', minutesAgo: 32 },
  { key: 'lead-003', listingKey: 'oak', name: 'Mia Turner', source: 'social', status: 'Contacted', intent: 'Hot', minutesAgo: 58 },
  { key: 'lead-004', listingKey: 'oak', name: 'Ethan Reed', source: 'link', status: 'New', intent: 'Warm', minutesAgo: 87 },
  { key: 'lead-005', listingKey: 'oak', name: 'Sophia Kim', source: 'open_house', status: 'Qualified', intent: 'Warm', minutesAgo: 122 },
  { key: 'lead-006', listingKey: 'maple', name: 'Liam Carter', source: 'social', status: 'New', intent: 'Hot', minutesAgo: 8 },
  { key: 'lead-007', listingKey: 'maple', name: 'Isabella Price', source: 'sign', status: 'Contacted', intent: 'Warm', minutesAgo: 41 },
  { key: 'lead-008', listingKey: 'maple', name: 'James Flores', source: 'link', status: 'New', intent: 'Warm', minutesAgo: 74 },
  { key: 'lead-009', listingKey: 'maple', name: 'Charlotte Diaz', source: 'open_house', status: 'Qualified', intent: 'Hot', minutesAgo: 133 },
  { key: 'lead-010', listingKey: 'maple', name: 'Benjamin Hall', source: 'social', status: 'New', intent: 'Warm', minutesAgo: 167 }
];

const APPOINTMENT_SEEDS = [
  { key: 'appt-001', listingKey: 'oak', leadKey: 'lead-001', offsetHours: 3, status: 'scheduled', confirmation_status: 'needs_confirmation' },
  { key: 'appt-002', listingKey: 'oak', leadKey: 'lead-003', offsetHours: 8, status: 'scheduled', confirmation_status: 'needs_confirmation' },
  { key: 'appt-003', listingKey: 'maple', leadKey: 'lead-006', offsetHours: 14, status: 'reschedule_requested', confirmation_status: 'unknown' },
  { key: 'appt-004', listingKey: 'maple', leadKey: 'lead-007', offsetHours: 20, status: 'scheduled', confirmation_status: 'needs_confirmation' },
  { key: 'appt-005', listingKey: 'maple', leadKey: 'lead-009', offsetHours: 26, status: 'confirmed', confirmation_status: 'confirmed' }
];

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const nowIso = () => new Date().toISOString();
const startOfMonthIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
};
const endOfMonthIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0)).toISOString();
};

const asDate = (date) => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateOnly = (date) => {
  const d = asDate(date);
  if (!d) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const formatTimeLabel = (date) => {
  const d = asDate(date);
  if (!d) return null;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles'
  });
};

const getTableColumns = async (client, tableName) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
};

const pickKnownColumns = (record, columns) => {
  const picked = {};
  for (const [key, value] of Object.entries(record)) {
    if (columns.has(key) && value !== undefined) {
      picked[key] = value;
    }
  }
  return picked;
};

const runConfirmPrompt = async (message) => {
  if (process.argv.includes('--yes')) return true;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(`${message} Type "seed-demo" to continue: `, (answer) => {
      rl.close();
      resolve(String(answer || '').trim() === 'seed-demo');
    });
  });
};

const ensureAuthDemoUser = async ({ supabaseAdmin, password }) => {
  let page = 1;
  const perPage = 200;
  let existingUser = null;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = Array.isArray(data?.users) ? data.users : [];
    existingUser = users.find((user) => String(user.email || '').toLowerCase() === DEMO_EMAIL);
    if (existingUser || users.length < perPage) break;
    page += 1;
  }

  if (!existingUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { is_demo: true, demo_account: true }
    });
    if (error) throw error;
    existingUser = data?.user || null;
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      email: DEMO_EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        is_demo: true,
        demo_account: true
      }
    });
    if (error) throw error;
  }

  if (!existingUser?.id) {
    throw new Error('Failed to create or resolve demo auth user.');
  }
  return existingUser;
};

const ensureAgentDemoRow = async ({ client, authUserId, columns }) => {
  const existing = await client.query(
    `
      SELECT *
      FROM public.agents
      WHERE auth_user_id = $1 OR lower(email) = lower($2)
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1
    `,
    [authUserId, DEMO_EMAIL]
  );

  const metadataBase = existing.rows[0]?.metadata && typeof existing.rows[0].metadata === 'object'
    ? existing.rows[0].metadata
    : {};
  const metadata = {
    ...metadataBase,
    is_demo: true,
    demo_account: true
  };

  const basePayload = pickKnownColumns(
    {
      id: authUserId,
      auth_user_id: authUserId,
      email: DEMO_EMAIL,
      first_name: DEMO_AGENT_FALLBACK_NAME.first,
      last_name: DEMO_AGENT_FALLBACK_NAME.last,
      full_name: `${DEMO_AGENT_FALLBACK_NAME.first} ${DEMO_AGENT_FALLBACK_NAME.last}`,
      slug: 'demo-account',
      status: 'active',
      plan: 'pro',
      subscription_status: 'active',
      payment_status: 'active',
      is_demo: true,
      metadata,
      onboarding_completed: true,
      onboarding_step: 5,
      created_at: nowIso(),
      updated_at: nowIso()
    },
    columns
  );

  if (existing.rows.length > 0) {
    const agentRow = existing.rows[0];
    const updatePayload = {
      ...basePayload,
      updated_at: nowIso()
    };
    delete updatePayload.id;
    if (Object.keys(updatePayload).length > 0) {
      const assignments = Object.keys(updatePayload)
        .map((column, idx) => `${column} = $${idx + 1}`)
        .join(', ');
      await client.query(
        `UPDATE public.agents SET ${assignments} WHERE id = $${Object.keys(updatePayload).length + 1}`,
        [...Object.values(updatePayload), agentRow.id]
      );
    }
    return { ...agentRow, id: agentRow.id, auth_user_id: authUserId };
  }

  const insertColumns = Object.keys(basePayload);
  const insertValues = Object.values(basePayload);
  const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
  const inserted = await client.query(
    `INSERT INTO public.agents (${insertColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`
    , insertValues
  );
  return inserted.rows[0];
};

const ensurePlansRows = async (client) => {
  await client.query(
    `
      CREATE TABLE IF NOT EXISTS public.plans (
        id text PRIMARY KEY,
        name text NOT NULL,
        price_monthly_usd integer NOT NULL DEFAULT 0,
        stripe_price_id text,
        limits jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `
  );

  await client.query(
    `
      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL,
        plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
        stripe_customer_id text,
        stripe_subscription_id text,
        status text NOT NULL DEFAULT 'free',
        current_period_start timestamptz,
        current_period_end timestamptz,
        cancel_at_period_end boolean NOT NULL DEFAULT false,
        allow_overages boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `
  );

  await client.query(
    `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_agent_id
      ON public.subscriptions(agent_id)
    `
  );

  await client.query(
    `
      INSERT INTO public.plans (id, name, price_monthly_usd, stripe_price_id, limits)
      VALUES
        ('free', 'Free', 0, NULL, '{"active_listings":1,"reports_per_month":1,"reminder_calls_per_month":0,"stored_leads_cap":25}'::jsonb),
        ('starter', 'Starter', 34, NULL, '{"active_listings":5,"reports_per_month":10,"reminder_calls_per_month":0,"stored_leads_cap":250}'::jsonb),
        ('pro', 'Pro', 79, NULL, '{"active_listings":25,"reports_per_month":50,"reminder_calls_per_month":200,"stored_leads_cap":2000}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `
  );
};

const ensureProSubscription = async ({ client, ownerId }) => {
  const existing = await client.query(
    `
      SELECT id
      FROM public.subscriptions
      WHERE agent_id = $1
      LIMIT 1
    `,
    [ownerId]
  );

  const payload = {
    plan_id: 'pro',
    status: 'active',
    current_period_start: startOfMonthIso(),
    current_period_end: endOfMonthIso(),
    cancel_at_period_end: false,
    allow_overages: false,
    updated_at: nowIso()
  };

  if (existing.rows.length > 0) {
    await client.query(
      `
        UPDATE public.subscriptions
        SET plan_id = $1,
            status = $2,
            current_period_start = $3,
            current_period_end = $4,
            cancel_at_period_end = $5,
            allow_overages = $6,
            updated_at = $7
        WHERE id = $8
      `,
      [
        payload.plan_id,
        payload.status,
        payload.current_period_start,
        payload.current_period_end,
        payload.cancel_at_period_end,
        payload.allow_overages,
        payload.updated_at,
        existing.rows[0].id
      ]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
      INSERT INTO public.subscriptions (
        id,
        agent_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        allow_overages,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `,
    [
      crypto.randomUUID(),
      ownerId,
      payload.plan_id,
      payload.status,
      payload.current_period_start,
      payload.current_period_end,
      payload.cancel_at_period_end,
      payload.allow_overages,
      nowIso(),
      nowIso()
    ]
  );
  return inserted.rows[0].id;
};

const ensureUniqueSlug = async ({ client, preferredSlug, currentListingId = null }) => {
  let candidate = preferredSlug;
  let count = 1;
  while (count < 500) {
    const row = await client.query(
      `
        SELECT id
        FROM public.properties
        WHERE public_slug = $1
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [candidate, currentListingId]
    );
    if (row.rows.length === 0) return candidate;
    count += 1;
    candidate = `${preferredSlug}-${count}`;
  }
  return `${preferredSlug}-${Date.now()}`;
};

const makeQrCodeUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(value)}`;

const ensureListing = async ({ client, columns, ownerId, seed }) => {
  const existing = await client.query(
    `
      SELECT id
      FROM public.properties
      WHERE lower(address) = lower($1)
        AND (agent_id = $2 OR user_id = $2)
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1
    `,
    [seed.address, ownerId]
  );

  const listingId = existing.rows[0]?.id || crypto.randomUUID();
  const preferredSlug = slugify(`demo-${seed.address}-${seed.city}-${seed.state}`) || `demo-${seed.key}`;
  const publicSlug = await ensureUniqueSlug({
    client,
    preferredSlug,
    currentListingId: existing.rows[0]?.id || null
  });
  const shareUrl = `${CANONICAL_BASE_URL}/l/${publicSlug}`;
  const qrCodeUrl = makeQrCodeUrl(`${shareUrl}?src=sign`);

  const record = pickKnownColumns(
    {
      id: listingId,
      agent_id: ownerId,
      user_id: ownerId,
      title: seed.title,
      address: seed.address,
      city: seed.city,
      state: seed.state,
      zip: seed.zip,
      price: seed.price,
      bedrooms: seed.bedrooms,
      bathrooms: seed.bathrooms,
      square_feet: seed.square_feet,
      sqft: seed.square_feet,
      status: 'active',
      description: seed.description,
      hero_photos: seed.hero_photos,
      gallery_photos: seed.gallery_photos,
      features: seed.features,
      is_published: true,
      published_at: nowIso(),
      public_slug: publicSlug,
      share_url: shareUrl,
      qr_code_url: qrCodeUrl,
      qr_code_svg: null,
      open_house_mode_enabled: true,
      listing_date: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso()
    },
    columns
  );

  if (existing.rows.length > 0) {
    const updatePayload = { ...record, updated_at: nowIso() };
    delete updatePayload.id;
    delete updatePayload.created_at;

    const assignments = Object.keys(updatePayload)
      .map((column, idx) => `${column} = $${idx + 1}`)
      .join(', ');
    await client.query(
      `UPDATE public.properties SET ${assignments} WHERE id = $${Object.keys(updatePayload).length + 1}`,
      [...Object.values(updatePayload), existing.rows[0].id]
    );
  } else {
    const insertColumns = Object.keys(record);
    const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
    await client.query(
      `INSERT INTO public.properties (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      Object.values(record)
    );
  }

  return {
    id: listingId,
    key: seed.key,
    address: `${seed.address}, ${seed.city}, ${seed.state} ${seed.zip}`,
    share_url: shareUrl,
    public_slug: publicSlug,
    qr_code_url: qrCodeUrl
  };
};

const ensureListingSources = async ({ client, listingId, ownerId }) => {
  for (const source of SOURCE_DEFAULTS) {
    await client.query(
      `
        INSERT INTO public.listing_sources (
          id,
          listing_id,
          agent_id,
          source_type,
          source_key,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (listing_id, source_key)
        DO UPDATE SET
          source_type = EXCLUDED.source_type,
          agent_id = EXCLUDED.agent_id
      `,
      [crypto.randomUUID(), listingId, ownerId, source.source_type, source.source_key, nowIso()]
    );
  }
};

const ensureListingVideoCredits = async ({ client, listingId, ownerId }) => {
  await client.query(
    `
      INSERT INTO public.listing_video_credits (
        listing_id,
        agent_id,
        included_credits,
        extra_credits,
        used_credits,
        created_at,
        updated_at
      )
      VALUES ($1,$2,3,0,0,$3,$4)
      ON CONFLICT (listing_id)
      DO UPDATE SET
        agent_id = EXCLUDED.agent_id,
        included_credits = 3,
        used_credits = 0,
        updated_at = EXCLUDED.updated_at
    `,
    [listingId, ownerId, nowIso(), nowIso()]
  );
};

const ensureLeadRows = async ({ client, leadColumns, ownerId, listingByKey }) => {
  const leadIds = new Map();

  for (let index = 0; index < LEAD_SEEDS.length; index += 1) {
    const seed = LEAD_SEEDS[index];
    const listing = listingByKey.get(seed.listingKey);
    if (!listing) continue;

    const marker = `demo-seed:${seed.key}`;
    const email = `demo+${seed.key}@homelistingai.com`;
    const phoneDigits = `512555${String(1200 + index).padStart(4, '0')}`;
    const phoneE164 = `+1${phoneDigits}`;
    const createdAt = new Date(Date.now() - seed.minutesAgo * 60 * 1000).toISOString();

    const existing = await client.query(
      `
        SELECT id
        FROM public.leads
        WHERE agent_id = $1
          AND (source_meta->>'demo_seed_key') = $2
        LIMIT 1
      `,
      [ownerId, seed.key]
    );

    const baseLeadPayload = pickKnownColumns(
      {
        id: existing.rows[0]?.id || crypto.randomUUID(),
        agent_id: ownerId,
        user_id: ownerId,
        listing_id: listing.id,
        full_name: seed.name,
        name: seed.name,
        phone: phoneE164,
        phone_e164: phoneE164,
        email,
        email_lower: email.toLowerCase(),
        source: seed.source,
        source_type: seed.source,
        source_key: seed.source === 'open_house' ? 'open_house' : seed.source === 'sign' ? 'sign' : seed.source,
        source_meta: {
          demo_seed: true,
          demo_seed_key: seed.key,
          marker
        },
        status: seed.status,
        intent_level: seed.intent,
        timeline: seed.intent === 'Hot' ? '0-30' : '1-3mo',
        financing: seed.intent === 'Hot' ? 'preapproved' : 'exploring',
        working_with_agent: 'unknown',
        consent_sms: true,
        consent_timestamp: createdAt,
        first_touch_at: createdAt,
        last_touch_at: createdAt,
        last_message_at: createdAt,
        last_message_preview: 'Demo seed lead ready for follow-up.',
        created_at: createdAt,
        updated_at: nowIso()
      },
      leadColumns
    );

    if (existing.rows.length > 0) {
      const updatePayload = { ...baseLeadPayload, updated_at: nowIso() };
      delete updatePayload.id;
      delete updatePayload.created_at;
      const assignments = Object.keys(updatePayload).map((column, idx) => `${column} = $${idx + 1}`).join(', ');
      await client.query(
        `UPDATE public.leads SET ${assignments} WHERE id = $${Object.keys(updatePayload).length + 1}`,
        [...Object.values(updatePayload), existing.rows[0].id]
      );
      leadIds.set(seed.key, existing.rows[0].id);
    } else {
      const insertColumns = Object.keys(baseLeadPayload);
      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      await client.query(
        `INSERT INTO public.leads (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        Object.values(baseLeadPayload)
      );
      leadIds.set(seed.key, baseLeadPayload.id);
    }
  }

  return leadIds;
};

const deriveConfirmationStatus = (status) => {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'reschedule_requested') return 'unknown';
  if (status === 'canceled' || status === 'completed') return 'unknown';
  return 'needs_confirmation';
};

const ensureAppointments = async ({
  client,
  appointmentColumns,
  ownerId,
  leadIdsByKey,
  listingByKey
}) => {
  for (const seed of APPOINTMENT_SEEDS) {
    const listing = listingByKey.get(seed.listingKey);
    const leadId = leadIdsByKey.get(seed.leadKey);
    if (!listing || !leadId) continue;

    const leadRow = await client.query(
      `SELECT id, full_name, name, email, email_lower, phone, phone_e164 FROM public.leads WHERE id = $1 LIMIT 1`,
      [leadId]
    );
    const lead = leadRow.rows[0];
    if (!lead) continue;

    const startIso = new Date(Date.now() + seed.offsetHours * 60 * 60 * 1000).toISOString();
    const endIso = new Date(Date.now() + (seed.offsetHours + 1) * 60 * 60 * 1000).toISOString();
    const marker = `[demo-seed:${seed.key}]`;
    const existing = await client.query(
      `
        SELECT id
        FROM public.appointments
        WHERE user_id = $1
          AND notes = $2
        LIMIT 1
      `,
      [ownerId, marker]
    );

    const status = seed.status;
    const confirmationStatus = seed.confirmation_status || deriveConfirmationStatus(status);
    const payload = pickKnownColumns(
      {
        id: existing.rows[0]?.id || crypto.randomUUID(),
        user_id: ownerId,
        agent_id: ownerId,
        lead_id: lead.id,
        listing_id: listing.id,
        property_id: listing.id,
        property_address: listing.address,
        kind: 'showing',
        name: lead.full_name || lead.name || 'Demo Lead',
        email: lead.email_lower || lead.email || null,
        phone: lead.phone_e164 || lead.phone || null,
        date: formatDateOnly(startIso),
        time_label: formatTimeLabel(startIso),
        start_iso: startIso,
        end_iso: endIso,
        starts_at: startIso,
        ends_at: endIso,
        timezone: 'America/Los_Angeles',
        location: listing.address,
        status,
        confirmation_status: confirmationStatus,
        last_reminder_outcome: status === 'reschedule_requested' ? 'reschedule_requested' : null,
        last_reminder_at: status === 'reschedule_requested' ? nowIso() : null,
        remind_agent: true,
        remind_client: true,
        agent_reminder_minutes_before: 60,
        client_reminder_minutes_before: 120,
        notes: marker,
        created_at: nowIso(),
        updated_at: nowIso()
      },
      appointmentColumns
    );
    const supportsUpdatedAt = appointmentColumns.has('updated_at');

    if (existing.rows.length > 0) {
      const updatePayload = { ...payload };
      if (supportsUpdatedAt) {
        updatePayload.updated_at = nowIso();
      }
      delete updatePayload.id;
      delete updatePayload.created_at;
      const assignments = Object.keys(updatePayload).map((column, idx) => `${column} = $${idx + 1}`).join(', ');
      await client.query(
        `UPDATE public.appointments SET ${assignments} WHERE id = $${Object.keys(updatePayload).length + 1}`,
        [...Object.values(updatePayload), existing.rows[0].id]
      );
    } else {
      const insertColumns = Object.keys(payload);
      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      await client.query(
        `INSERT INTO public.appointments (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        Object.values(payload)
      );
    }
  }
};

const suppressDemoNotifications = async ({ client, ownerId }) => {
  const agentNotificationColumns = await getTableColumns(client, 'agent_notification_settings').catch(() => new Set());
  if (agentNotificationColumns.size > 0) {
    const notificationPayload = pickKnownColumns(
      {
        agent_id: ownerId,
        email_enabled: false,
        daily_digest_enabled: false,
        unworked_lead_nudge_enabled: false,
        appt_confirm_nudge_enabled: false,
        reschedule_nudge_enabled: false,
        voice_enabled: false,
        sms_enabled: false,
        notify_email: 'demo-inbox@homelistingai.com',
        notify_phone_e164: null,
        digest_time_local: '08:00',
        timezone: 'America/Los_Angeles'
      },
      agentNotificationColumns
    );

    const keys = Object.keys(notificationPayload);
    if (keys.length > 0) {
      const values = Object.values(notificationPayload);
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const updates = keys
        .filter((key) => key !== 'agent_id')
        .map((key, idx) => `${key} = EXCLUDED.${key}`)
        .join(', ');
      await client.query(
        `
          INSERT INTO public.agent_notification_settings (${keys.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (agent_id)
          DO UPDATE SET ${updates}
        `,
        values
      );
    }
  }

  const userSettingsColumns = await getTableColumns(client, 'user_settings').catch(() => new Set());
  if (userSettingsColumns.size > 0) {
    const data = {
      email_enabled: false,
      voice_enabled: false,
      sms_enabled: false,
      newLead: false,
      leadAction: false,
      appointmentScheduled: false,
      aiInteraction: false,
      weeklySummary: false,
      appointmentReminders: false,
      voiceAppointmentReminders: false,
      taskReminders: false,
      marketingUpdates: false,
      propertyInquiries: false,
      showingConfirmations: false,
      hotLeads: false,
      browserNotifications: false,
      weekendNotifications: false,
      weeklyReport: false,
      monthlyInsights: false,
      dailyDigest: false,
      securityAlerts: false,
      notificationEmail: 'demo-inbox@homelistingai.com',
      notificationPhone: '+15550000000'
    };
    await client.query(
      `
        INSERT INTO public.user_settings (user_id, category, data, updated_at)
        VALUES ($1, 'notifications', $2::jsonb, $3)
        ON CONFLICT (user_id, category)
        DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      `,
      [ownerId, JSON.stringify(data), nowIso()]
    );
  }
};

const printSummary = async ({ client, ownerId, listingMap, authUser }) => {
  const authProof = authUser
    ? {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at || null,
      is_demo: Boolean(authUser.user_metadata?.is_demo)
    }
    : null;
  const agentProof = await client.query(
    `
      SELECT id, auth_user_id, email, is_demo, plan, subscription_status
      FROM public.agents
      WHERE id = $1
      LIMIT 1
    `,
    [ownerId]
  );
  const sub = await client.query(
    `
      SELECT agent_id, plan_id, status, current_period_end
      FROM public.subscriptions
      WHERE agent_id = $1
      LIMIT 1
    `,
    [ownerId]
  );
  const counts = await client.query(
    `
      SELECT
        (SELECT count(*)::int FROM public.properties WHERE agent_id = $1 OR user_id = $1) AS listings_count,
        (SELECT count(*)::int FROM public.leads WHERE agent_id = $1) AS leads_count,
        (SELECT count(*)::int FROM public.appointments WHERE user_id = $1) AS appointments_count
    `,
    [ownerId]
  );

  console.log('\n✅ Demo Pro account seed complete');
  console.log(`- AUTH proof: ${JSON.stringify(authProof)}`);
  console.log(`- AGENT proof: ${JSON.stringify(agentProof.rows[0] || null)}`);
  console.log(`- Demo login: ${DEMO_EMAIL}`);
  console.log(`- Owner ID: ${ownerId}`);
  console.log(`- Subscription: ${JSON.stringify(sub.rows[0] || null)}`);
  console.log(`- Counts: ${JSON.stringify(counts.rows[0] || {})}`);

  for (const listing of listingMap.values()) {
    const credits = await client.query(
      `
        SELECT included_credits, extra_credits, used_credits
        FROM public.listing_video_credits
        WHERE listing_id = $1
        LIMIT 1
      `,
      [listing.id]
    );
    const sources = await client.query(
      `
        SELECT source_type, source_key
        FROM public.listing_sources
        WHERE listing_id = $1
        ORDER BY source_key
      `,
      [listing.id]
    );
    console.log(
      `- Listing: ${listing.address}\n  share=${listing.share_url}\n  slug=${listing.public_slug}\n  credits=${JSON.stringify(
        credits.rows[0] || null
      )}\n  sources=${JSON.stringify(sources.rows)}`
    );
  }
};

async function run() {
  const DATABASE_URL = requiredEnv('DATABASE_URL');
  const SUPABASE_URL = requiredEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const DEMO_ACCOUNT_PASSWORD = requiredEnv('DEMO_ACCOUNT_PASSWORD');

  const confirmed = await runConfirmPrompt(
    `About to seed/update demo Pro account (${DEMO_EMAIL}) against DATABASE_URL.`
  );
  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query('ALTER TABLE IF EXISTS public.agents ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;');
    await ensurePlansRows(client);

    const authUser = await ensureAuthDemoUser({
      supabaseAdmin,
      password: DEMO_ACCOUNT_PASSWORD
    });
    const ownerId = String(authUser.id);

    const agentColumns = await getTableColumns(client, 'agents');
    await ensureAgentDemoRow({
      client,
      authUserId: ownerId,
      columns: agentColumns
    });

    await ensureProSubscription({ client, ownerId });

    const propertyColumns = await getTableColumns(client, 'properties');
    const listingMap = new Map();
    for (const seed of LISTING_SEEDS) {
      const listing = await ensureListing({
        client,
        columns: propertyColumns,
        ownerId,
        seed
      });
      listingMap.set(seed.key, listing);
      await ensureListingSources({
        client,
        listingId: listing.id,
        ownerId
      });
      await ensureListingVideoCredits({
        client,
        listingId: listing.id,
        ownerId
      });
    }

    const leadColumns = await getTableColumns(client, 'leads');
    const leadIdsByKey = await ensureLeadRows({
      client,
      leadColumns,
      ownerId,
      listingByKey: listingMap
    });

    const appointmentColumns = await getTableColumns(client, 'appointments');
    await ensureAppointments({
      client,
      appointmentColumns,
      ownerId,
      leadIdsByKey,
      listingByKey: listingMap
    });

    await suppressDemoNotifications({
      client,
      ownerId
    });

    await client.query('COMMIT');
    await printSummary({
      client,
      ownerId,
      listingMap,
      authUser
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('❌ Failed to seed demo Pro account');
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
