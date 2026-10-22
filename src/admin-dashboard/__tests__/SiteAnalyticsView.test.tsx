import React from 'react';
import { render, screen } from '@testing-library/react';
import { SiteAnalyticsView, SiteAnalytics } from '../components/SiteAnalyticsCard';

const data: SiteAnalytics = {
  days: 7, visitors: 12, views: 40, clicks: 5, clickRate: 12.5,
  daily: [{ day: '2026-10-21', views: 40, visitors: 12 }],
  topPages: [{ path: '/', count: 30 }], topClicks: [{ label: 'Start free', count: 4 }],
  topReferrers: [], devices: [{ device: 'phone', count: 30 }]
};

describe('SiteAnalyticsView', () => {
  it('shows the numbers', () => {
    render(<SiteAnalyticsView data={data} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Start free')).toBeTruthy();
    expect(screen.getByText('12.5%')).toBeTruthy();
  });
  it('says so when not available', () => {
    render(<SiteAnalyticsView data={null} error />);
    expect(screen.getByText(/Not available yet/)).toBeTruthy();
  });
});
