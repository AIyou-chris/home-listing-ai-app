import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayView, TodayData } from '../components/TodayView';

const full: TodayData = {
  wentOut: { available: true, postCount: 2, emailsSent: 5, posts: [{ channel: 'LinkedIn', title: 'Open house tips', postedAt: '2026-10-19T10:00:00Z', url: null }] },
  needsMe: { available: true, items: [{ kind: 'approve', text: '2 drafts waiting for your OK', count: 2, to: 'marketing' }] },
  worked: { available: true, verdicts: ['2 posts went out in the last 7 days.'], gaps: [], signups: 0, leads: 0 },
  notes: []
};

describe('Today page', () => {
  it('shows the three boxes with real values', () => {
    const go = jest.fn();
    render(<TodayView data={full} onGo={go} />);
    expect(screen.getByText('What went out')).toBeTruthy();
    expect(screen.getByText('What needs you')).toBeTruthy();
    expect(screen.getByText('What worked')).toBeTruthy();
    fireEvent.click(screen.getByText('2 drafts waiting for your OK'));
    expect(go).toHaveBeenCalledWith('marketing');
  });

  it('says not available instead of showing numbers when data is missing', () => {
    const data: TodayData = { ...full, wentOut: { ...full.wentOut, available: false }, worked: { ...full.worked, available: false, verdicts: [] } };
    render(<TodayView data={data} />);
    expect(screen.getAllByText('Not available right now.').length).toBe(2);
  });

  it('says not available when the whole page fails to load', () => {
    render(<TodayView data={null} error />);
    expect(screen.getByText('Not available right now.')).toBeTruthy();
  });
});
