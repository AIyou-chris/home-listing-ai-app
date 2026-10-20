import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminCommandCenter from '../components/AdminCommandCenter';

const today = {
  wentOut: { available: true, postCount: 1, emailsSent: 0, posts: [] },
  needsMe: { available: true, items: [] },
  worked: { available: true, verdicts: ['No posts have gone out.'], gaps: [], signups: 0, leads: 0 },
  notes: []
};

jest.mock('../../services/authService', () => ({
  AuthService: {
    getInstance: () => ({
      makeAuthenticatedRequest: (url: string) => Promise.resolve(
        url === '/api/admin/today' ? { ok: true, json: async () => today } : { ok: false, json: async () => ({}) }
      )
    })
  }
}));

describe('Admin Today page', () => {
  it('has every card collapsible, and Close all / Open all work', async () => {
    const { container } = render(<MemoryRouter><AdminCommandCenter /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('What went out')).toBeTruthy());
    const titles = ['What went out', 'What needs you', 'What worked', 'System Health', 'Security Monitor', 'Support Snapshot', 'Operational Metrics'];
    titles.forEach((t) => expect(screen.getByText(t).closest('details[data-collapsible]')).toBeTruthy());
    fireEvent.click(screen.getByText('Close all'));
    expect(container.querySelectorAll('details[data-collapsible][open]').length).toBe(0);
    fireEvent.click(screen.getByText('Open all'));
    expect(container.querySelectorAll('details[data-collapsible]:not([open])').length).toBe(0);
  });
});
