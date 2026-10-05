'use strict';

// 5 touches over 16 days. Stops on reply, unsubscribe, bounce or complaint (the sender enforces this).
const TOUCH_DAYS = [0, 3, 7, 11, 16];

const STATE_TZ = {
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York',
  ME: 'America/New_York', MD: 'America/New_York', MA: 'America/New_York', NH: 'America/New_York', NJ: 'America/New_York',
  NY: 'America/New_York', NC: 'America/New_York', OH: 'America/New_York', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', VT: 'America/New_York', VA: 'America/New_York', WV: 'America/New_York', MI: 'America/Detroit',
  IN: 'America/Indiana/Indianapolis', KY: 'America/New_York',
  AL: 'America/Chicago', AR: 'America/Chicago', IL: 'America/Chicago', IA: 'America/Chicago', KS: 'America/Chicago',
  LA: 'America/Chicago', MN: 'America/Chicago', MS: 'America/Chicago', MO: 'America/Chicago', NE: 'America/Chicago',
  ND: 'America/Chicago', OK: 'America/Chicago', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  WI: 'America/Chicago',
  AZ: 'America/Phoenix', CO: 'America/Denver', ID: 'America/Boise', MT: 'America/Denver', NM: 'America/Denver',
  UT: 'America/Denver', WY: 'America/Denver',
  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles', OR: 'America/Los_Angeles', WA: 'America/Los_Angeles',
  AK: 'America/Anchorage', HI: 'Pacific/Honolulu'
};
const DEFAULT_TZ = 'America/Chicago';
const tzForState = (state) => STATE_TZ[String(state || '').trim().toUpperCase()] || DEFAULT_TZ;

const WINDOWS = {
  morning: { startMin: 7 * 60 + 30, endMin: 9 * 60 + 30 },
  afternoon: { startMin: 15 * 60 + 30, endMin: 17 * 60 + 30 }
};

// Local parts of an instant in a time zone.
const localParts = (date, timeZone) => {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
  });
  const out = {};
  for (const p of f.formatToParts(date)) out[p.type] = p.value;
  const hour = Number(out.hour) % 24;
  return { weekday: out.weekday, year: Number(out.year), month: Number(out.month), day: Number(out.day), minutes: hour * 60 + Number(out.minute) };
};

const nthWeekday = (year, month, weekday, n) => { // month 1-12, weekday 0=Sun
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
};
const lastWeekday = (year, month, weekday) => {
  const last = new Date(Date.UTC(year, month, 0));
  return last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7);
};

// US federal holidays plus the days people are away (day after Thanksgiving, Christmas Eve).
const isUsHoliday = (year, month, day) => {
  const key = `${month}-${day}`;
  const fixed = new Set(['1-1', '6-19', '7-4', '11-11', '12-24', '12-25', '12-31']);
  if (fixed.has(key)) return true;
  if (month === 1 && day === nthWeekday(year, 1, 1, 3)) return true; // MLK
  if (month === 2 && day === nthWeekday(year, 2, 1, 3)) return true; // Presidents
  if (month === 5 && day === lastWeekday(year, 5, 1)) return true; // Memorial
  if (month === 9 && day === nthWeekday(year, 9, 1, 1)) return true; // Labor
  if (month === 10 && day === nthWeekday(year, 10, 1, 2)) return true; // Columbus
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  if (month === 11 && (day === thanksgiving || day === thanksgiving + 1)) return true;
  return false;
};

const SEND_DAYS = new Set(['Tue', 'Wed', 'Thu']);

// Is `date` inside a legal send window for this recipient?
const inSendWindow = (date, { timeZone = DEFAULT_TZ, window = 'morning' } = {}) => {
  const p = localParts(date, timeZone);
  if (!SEND_DAYS.has(p.weekday)) return false;
  if (isUsHoliday(p.year, p.month, p.day)) return false;
  const w = WINDOWS[window] || WINDOWS.morning;
  return p.minutes >= w.startMin && p.minutes <= w.endMin;
};

// First moment at or after `from` that is a valid send time (checked every 10 minutes, up to 3 weeks out).
const nextSendTime = (from, opts = {}) => {
  const step = 10 * 60 * 1000;
  const start = Math.ceil(new Date(from).getTime() / step) * step;
  for (let t = start; t < start + 21 * 86400000; t += step) {
    if (inSendWindow(new Date(t), opts)) return new Date(t);
  }
  return null;
};

// Schedule for all five touches. Each touch lands `TOUCH_DAYS[i]` days after touch 1, pushed to the next open
// window, and never within 2 days of the touch before it.
const scheduleSequence = (startFrom, opts = {}) => {
  const first = nextSendTime(startFrom, opts);
  if (!first) return [];
  const out = [first];
  for (let i = 1; i < TOUCH_DAYS.length; i += 1) {
    const prev = out[i - 1];
    if (!prev) { out.push(null); continue; }
    const target = Math.max(first.getTime() + TOUCH_DAYS[i] * 86400000 - 60 * 60 * 1000, prev.getTime() + 2 * 86400000 - 60 * 60 * 1000);
    out.push(nextSendTime(new Date(target), opts));
  }
  return out;
};

// Warm-up: 20/day per mailbox, +12 each week, capped (default 60, always between 50 and 75).
const dailyCapForMailbox = ({ firstSendAt, now = Date.now(), max = 60 }) => {
  const cap = Math.min(Math.max(Number(max) || 60, 50), 75);
  if (!firstSendAt) return 20;
  const weeks = Math.floor((now - new Date(firstSendAt).getTime()) / (7 * 86400000));
  return Math.min(20 + Math.max(weeks, 0) * 12, cap);
};

// Pause everything when a rate is bad. Needs at least 20 sends for a fair reading.
const shouldPause = ({ sent, bounced, complained }) => {
  if (!sent || sent < 20) return { pause: false };
  const bounceRate = bounced / sent;
  const complaintRate = complained / sent;
  if (bounceRate > 0.03) return { pause: true, reason: `Bounce rate ${(bounceRate * 100).toFixed(1)}% is above 3%.` };
  if (complaintRate > 0.001) return { pause: true, reason: `Complaint rate ${(complaintRate * 100).toFixed(2)}% is above 0.1%.` };
  return { pause: false };
};

// Rotate: the mailbox that has sent the least today and is still under its cap.
const pickMailbox = (mailboxes, sentToday, caps) => {
  const open = mailboxes
    .map((m) => ({ m, sent: sentToday[m] || 0, cap: caps[m] ?? 20 }))
    .filter((x) => x.sent < x.cap)
    .sort((a, b) => a.sent - b.sent);
  return open.length ? open[0].m : null;
};

module.exports = {
  TOUCH_DAYS, WINDOWS, tzForState, inSendWindow, nextSendTime, scheduleSequence, isUsHoliday,
  dailyCapForMailbox, shouldPause, pickMailbox, localParts, DEFAULT_TZ
};
