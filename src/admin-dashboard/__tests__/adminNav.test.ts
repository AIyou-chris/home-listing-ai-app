import { NAV_GROUPS, groupFor } from '../adminNav';

describe('admin menu', () => {
  it('has exactly four items', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Today', 'Marketing', 'Leads', 'Settings']);
  });
  it('puts every old page inside one of the four', () => {
    const old = ['leads', 'ai-conversations', 'inbox', 'knowledge-base', 'marketing-funnels', 'broadcast', 'listings', 'lo-platform', 'users', 'settings', 'blog', 'dashboard', 'property', 'add-listing'] as const;
    for (const v of old) expect(NAV_GROUPS).toContain(groupFor(v));
  });
  it('finds the right group', () => {
    expect(groupFor('inbox').id).toBe('leads');
    expect(groupFor('broadcast').id).toBe('marketing');
    expect(groupFor('users').id).toBe('settings');
    expect(groupFor('dashboard').id).toBe('today');
  });
});
