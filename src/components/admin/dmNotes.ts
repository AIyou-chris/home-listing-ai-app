// LinkedIn notes in Chris's voice: friendly, plain, no emoji, no dashes, no link or
// pitch in the connection note. Uses only facts we really have.
export type DmLead = { id: string; name: string | null; employer: string | null; city: string | null };

const PITCH_URL = 'homelistingai.com/for-loan-officers';

const first = (l: DmLead) => (l.name || '').trim().split(/\s+/)[0] || '';
// A long or messy business name reads badly in a sentence, so skip it.
const company = (l: DmLead) => {
  const c = (l.employer || '').trim();
  return c && c.length <= 40 && !c.includes('|') ? c : '';
};
const town = (l: DmLead) => (l.city || '').split(',')[0].trim();
const pickVariant = (l: DmLead) => (l.id.charCodeAt(l.id.length - 1) % 2 === 0 ? 0 : 1);

// LinkedIn caps the connection note at 300 characters. Written in Chris's voice
// (docs/brand/CHRIS_POTTER_VOICE.md): one person to another, no pitch yet.
export function connectNote(l: DmLead): string {
  const co = company(l);
  const tn = town(l);
  const intro = `${first(l) ? `Hey ${first(l)}` : 'Hey'}, Chris here.`;
  const about = `I've been in mortgage 15 years and I like meeting other loan officers.`;
  let saw = '';
  if (co && tn) saw = pickVariant(l) === 0 ? `Saw you're with ${co} in ${tn}.` : `Noticed ${co} in ${tn}.`;
  else if (co) saw = `Noticed ${co}.`;
  else if (tn) saw = `Saw you're in ${tn}.`;
  return [intro, about, saw, 'Would love to connect.'].filter(Boolean).join(' ').slice(0, 300);
}

export function followupNote(l: DmLead): string {
  return `${first(l) ? `Thanks for connecting, ${first(l)}.` : 'Thanks for connecting.'} I built a tool that gives a loan officer one link to hand agents, so the agents send you their listings and you get the buyer leads. It's free for 7 days, no card. Here's the link if you want a look: ${PITCH_URL}. No pressure.`;
}
