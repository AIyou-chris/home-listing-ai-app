import { EMAIL_TEMPLATES } from './emailTemplates';

describe('email templates', () => {
  it('every template has a unique id and the parts the library shows', () => {
    const ids = EMAIL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of EMAIL_TEMPLATES) {
      expect(t.name && t.subject && t.content && t.description && t.useCase).toBeTruthy();
      expect(t.tags.length).toBeGreaterThan(0);
    }
  });

  it('has the "link you asked for" reply, with the demo and trial links and no promises', () => {
    const t = EMAIL_TEMPLATES.find((x) => x.id === 'admin_dm_link');
    expect(t).toBeTruthy();
    expect(t?.category).toBe('recruitment');
    expect(t?.content).toContain('https://homelistingai.com/partner-invite/demo');
    expect(t?.content).toContain('https://homelistingai.com/lo-signup');
    expect(t?.content).toContain('{{lead.firstName}}');
    expect(t?.content).toContain('{{agent.signature}}');
    expect(t?.content).toMatch(/7 days and needs no card/);
    expect(t?.content).not.toMatch(/guarantee|lowest rate|\$\d|\d+%/i);
  });
});
