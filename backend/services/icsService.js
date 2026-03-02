const DEFAULT_ORGANIZER_EMAIL = 'notifications@mg.homelistingai.com';

function formatDateIcs(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line) {
  let currentLine = String(line || '');
  if (currentLine.length <= 75) return currentLine;

  let folded = '';
  while (currentLine.length > 75) {
    folded += `${currentLine.slice(0, 75)}\r\n `;
    currentLine = currentLine.slice(75);
  }
  return `${folded}${currentLine}`;
}

function buildIcsInvite({
  uid,
  title,
  description,
  location,
  start,
  end,
  organizerName,
  organizerEmail,
  attendeeEmail,
  method = 'REQUEST',
  sequence = 0
}) {
  const dtstamp = formatDateIcs(new Date());
  const dtstart = formatDateIcs(start);
  const dtend = formatDateIcs(end);
  const normalizedMethod = String(method || 'REQUEST').toUpperCase() === 'CANCEL' ? 'CANCEL' : 'REQUEST';

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HomeListingAI//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${normalizedMethod}`,
    'BEGIN:VEVENT',
    `UID:${uid || `${Date.now()}@homelistingai.com`}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location || 'TBD')}`,
    `SEQUENCE:${Number.isFinite(Number(sequence)) ? Number(sequence) : 0}`,
    `ORGANIZER;CN="${escapeIcsText(organizerName || 'HomeListingAI')}":mailto:${organizerEmail || DEFAULT_ORGANIZER_EMAIL}`,
    attendeeEmail ? `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${attendeeEmail}` : null,
    normalizedMethod === 'CANCEL' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  return icsLines.map((line) => foldLine(line)).join('\r\n');
}

function buildAppointmentIcsUid(appointmentId) {
  return `${appointmentId}@homelistingai.com`;
}

function buildAppointmentIcsInvite({
  appointmentId,
  kind,
  leadName,
  leadEmail,
  leadPhone,
  notes,
  location,
  propertyAddress,
  start,
  end,
  organizerName,
  organizerEmail,
  method = 'REQUEST',
  sequence = 0
}) {
  const normalizedKind = (kind || 'Appointment').trim();
  const safeLeadName = (leadName || 'Client').trim();
  const summary = `${normalizedKind}: ${safeLeadName}`;
  const descriptionLines = [
    `${normalizedKind} with ${safeLeadName}`,
    `Email: ${leadEmail || 'N/A'}`,
    `Phone: ${leadPhone || 'N/A'}`,
    notes ? '' : null,
    notes ? String(notes).trim() : null
  ].filter(Boolean);

  return buildIcsInvite({
    uid: buildAppointmentIcsUid(appointmentId),
    title: summary,
    description: descriptionLines.join('\n'),
    location: location || propertyAddress || 'TBD',
    start,
    end,
    organizerName: organizerName || 'HomeListingAI',
    organizerEmail: organizerEmail || DEFAULT_ORGANIZER_EMAIL,
    attendeeEmail: leadEmail || undefined,
    method,
    sequence
  });
}

module.exports = {
  buildIcsInvite,
  buildAppointmentIcsInvite,
  buildAppointmentIcsUid
};
