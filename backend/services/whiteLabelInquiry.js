'use strict';

const { createPublicBookingLimiter, validatePublicBookingFields } = require('./publicBookingGuard');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isAdmin = user => Boolean(user?.app_metadata?.admin || user?.app_metadata?.claims_admin);

function validateInquiry(body, now = Date.now()) {
  if (!body || typeof body !== 'object') return 'Please complete the form.';
  for (const [key, max] of Object.entries({ name: 80, email: 254, office: 120, message: 1000, date: 10, time: 5, timezone: 100, startIso: 40, requestId: 36 })) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) return 'Please check all form fields.';
  }
  if (!UUID.test(body.requestId) || validatePublicBookingFields({ name: body.name, email: body.email })) return 'Please check your name and email.';
  const start = new Date(body.startIso);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= now || start.getTime() > now + 180 * 86400000) return 'Choose a future time within the next six months.';
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: body.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(start).map(p => [p.type, p.value]));
    if (`${parts.year}-${parts.month}-${parts.day}` !== body.date || `${parts.hour}:${parts.minute}` !== body.time || start.getUTCSeconds() || start.getUTCMilliseconds()) return 'Please check your date, time, and time zone.';
  } catch { return 'Please check your time zone.'; }
  return null;
}

function createWhiteLabelInquiryHandler({ db, now = () => Date.now(), logger = console }) {
  const limiter = createPublicBookingLimiter({ now });
  let cachedOwner = null;
  let cacheUntil = 0;
  async function ownerId() {
    if (!cachedOwner || now() >= cacheUntil) {
      const admins = [];
      for (let page = 1; ; page += 1) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        admins.push(...data.users.filter(isAdmin));
        if (data.users.length < 1000) break;
      }
      // Never let a visitor choose an owner; fail closed if ownership is ambiguous.
      if (admins.length !== 1) throw new Error('White label inquiry requires one platform admin');
      cachedOwner = admins[0].id;
      cacheUntil = now() + 300000;
    }
    const { data, error } = await db.auth.admin.getUserById(cachedOwner);
    if (error || !isAdmin(data?.user)) throw new Error('Inquiry owner is unavailable');
    return cachedOwner;
  }

  return async (req, res) => {
    const body = req.body;
    const validation = validateInquiry(body, now());
    if (validation) return res.status(400).json({ success: false, message: validation });
    const limit = limiter.check({ ip: req.ip, listingId: 'white-label', email: body.email.trim().toLowerCase() });
    if (!limit.allowed) {
      res.set('Retry-After', String(limit.retryAfterSeconds));
      return res.status(429).json({ success: false, message: 'Please try again later, or email homelistingai@gmail.com.' });
    }
    let leadSaved = false;
    try {
      const owner = await ownerId();
      const id = body.requestId;
      const email = body.email.trim().toLowerCase();
      const notes = `White label platform inquiry\nTeam / office: ${body.office.trim()}\nPreferred meeting: ${body.date} ${body.time} (${body.timezone})\nTime requested, not yet confirmed.\n\n${body.message.trim()}`;
      // A stable random request ID makes retries safe after a lost response or partial save.
      const { error: leadError } = await db.from('leads').insert({ id, user_id: owner, name: body.name.trim(), email, email_lower: email, notes, source: 'White Label Inquiry', status: 'New', manual_follow_up: true });
      if (leadError) {
        if (leadError.code !== '23505') throw leadError;
        const { data, error } = await db.from('leads').select('id').eq('id', id).eq('user_id', owner).eq('email', email).eq('source', 'White Label Inquiry').maybeSingle();
        if (error || !data) throw new Error('Inquiry could not be saved');
      }
      leadSaved = true;
      const startIso = new Date(body.startIso).toISOString();
      const endIso = new Date(new Date(startIso).getTime() + 30 * 60000).toISOString();
      const { error: appointmentError } = await db.from('appointments').insert({
        id, user_id: owner, lead_id: id, kind: 'Consultation', name: body.name.trim(), email,
        date: body.date, time_label: `${body.time} (${body.timezone})`, start_iso: startIso, end_iso: endIso,
        starts_at: startIso, ends_at: endIso, timezone: body.timezone, notes,
        status: 'scheduled', confirmation_status: 'needs_confirmation', remind_agent: false, remind_client: false
      });
      if (appointmentError) {
        if (appointmentError.code !== '23505') throw appointmentError;
        const { data, error } = await db.from('appointments').select('id').eq('id', id).eq('user_id', owner).eq('lead_id', id).maybeSingle();
        if (error || !data) throw new Error('Meeting request could not be saved');
      }
      return res.status(201).json({ success: true });
    } catch (error) {
      logger.error('[WhiteLabelInquiry] Save failed', error?.code || error?.message);
      return res.status(503).json({ success: false, leadSaved, message: leadSaved ? 'Your inquiry was saved, but the calendar request could not be added. Please retry once, or email homelistingai@gmail.com.' : 'We could not save your inquiry. Please retry, or email homelistingai@gmail.com.' });
    }
  };
}

module.exports = { validateInquiry, createWhiteLabelInquiryHandler };
