import { connectNote, followupNote } from './dmNotes';

const full = { id: 'abc2', name: 'Jen Martinez', employer: 'Bay Home Loans', city: 'Tampa, Florida' };

describe('dmNotes', () => {
  it('uses the first name, company and town', () => {
    const n = connectNote(full);
    expect(n).toContain('Hey Jen, Chris here.');
    expect(n).toContain('Bay Home Loans');
    expect(n).toContain('Tampa');
  });
  it('stays under 300 characters and has no emoji, dashes or link', () => {
    for (const l of [full, { ...full, id: 'abc3' }, { id: 'x', name: null, employer: null, city: null }]) {
      const n = connectNote(l);
      expect(n.length).toBeLessThanOrEqual(300);
      expect(n).not.toMatch(/[—–]|http|homelistingai|pitch|\p{Extended_Pictographic}/u);
    }
  });
  it('never invents a name or town when we do not have one', () => {
    const n = connectNote({ id: 'x', name: null, employer: null, city: null });
    expect(n.startsWith('Hey, Chris here.')).toBe(true);
    expect(n).not.toContain('undefined');
  });
  it('skips a messy business name', () => {
    expect(connectNote({ ...full, employer: 'Mortgage Broker & Independent Loan Officer NEXA Mortgage LLC. | Lic. in FL' })).not.toContain('NEXA');
  });
  it('varies the wording between people', () => {
    expect(connectNote(full)).not.toBe(connectNote({ ...full, id: 'abc3' }));
  });
  it('follow-up carries the link only after they connected', () => {
    expect(followupNote(full)).toContain('homelistingai.com/for-loan-officers');
    expect(followupNote(full)).toContain('Thanks for connecting, Jen.');
  });
});
