import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminBusinessStrip, BillingSummary } from '../components/AdminBusinessStrip';

const billing: BillingSummary = { total: 30, paying: 18, trial: 9, comped: 2, late: 0, estMonthly: 1422, founding: { taken: 18, max: 25 }, signupsByDay: [] };

describe('AdminBusinessStrip', () => {
  it('shows the money, trials and founding spots', () => {
    render(<AdminBusinessStrip billing={billing} loaded leadsToday={37} needsItems={[]} onGo={() => undefined} />);
    expect(screen.getByText('$1,422')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText(/18 of 25 taken/)).toBeTruthy();
    expect(screen.getByText(/7 left at \$79/)).toBeTruthy();
    expect(screen.getByText('Nothing is waiting on you right now.')).toBeTruthy();
  });

  it('puts failed payments first and opens the right page', () => {
    const go = jest.fn();
    render(<AdminBusinessStrip billing={{ ...billing, late: 2 }} loaded leadsToday={0} needsItems={[{ kind: 'posts', text: '3 drafts', count: 3, to: 'marketing' }]} onGo={go} />);
    expect(screen.getAllByText('2 payments failed').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('See who'));
    expect(go).toHaveBeenCalledWith('/admin/users');
  });

  it('says Not available instead of inventing numbers when billing could not load', () => {
    render(<AdminBusinessStrip billing={null} loaded leadsToday={null} needsItems={[]} onGo={() => undefined} />);
    expect(screen.getAllByText('Not available').length).toBe(4);
  });
});
