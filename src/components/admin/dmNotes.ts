// LinkedIn notes written to read like a person typed them: plain words, no emoji,
// no dashes, no link in the connection note. Uses only facts we really have.
export type DmLead = { id: string; name: string | null; employer: string | null; city: string | null };

const PITCH_URL = 'homelistingai.com/for-loan-officers';

const first = (l: DmLead) => (l.name || '').trim().split(/\s+/)[0] || '';
const hello = (l: DmLead) => (first(l) ? `Hi ${first(l)},` : 'Hi,');
// A long or messy business name reads badly in a sentence, so skip it.
const company = (l: DmLead) => {
  const c = (l.employer || '').trim();
  return c && c.length <= 40 && !c.includes('|') ? c : '';
};
const town = (l: DmLead) => (l.city || '').split(',')[0].trim();
const pickVariant = (l: DmLead) => (l.id.charCodeAt(l.id.length - 1) % 2 === 0 ? 0 : 1);

// LinkedIn caps the connection note at 300 characters.
export function connectNote(l: DmLead): string {
  const co = company(l);
  const tn = town(l);
  const tail = `I've been in mortgage 15 years and built a small tool that helps loan officers get agents sending them listings. Would be glad to connect.`;
  let lead: string;
  if (co && tn) lead = pickVariant(l) === 0 ? `I came across ${co} while looking at loan officers in ${tn}.` : `Saw ${co} in ${tn} and wanted to reach out.`;
  else if (co) lead = pickVariant(l) === 0 ? `I came across ${co} and wanted to reach out.` : `Saw ${co} and wanted to say hello.`;
  else if (tn) lead = `I'm connecting with loan officers in ${tn}.`;
  else lead = `I'm connecting with other loan officers.`;
  return `${hello(l)} ${lead} ${tail}`.slice(0, 300);
}

export function followupNote(l: DmLead): string {
  return `${first(l) ? `Thanks for connecting, ${first(l)}.` : 'Thanks for connecting.'} I run HomeListingAI. It gives a loan officer one link to hand agents so they send you their listings, and it catches buyer leads for you. There is a 7 day trial, no card: ${PITCH_URL}. Happy to answer any questions.`;
}
