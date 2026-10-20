import React from 'react';
import { render, screen } from '@testing-library/react';
import { CampaignStatsWidget } from '../components/CampaignStatsWidget';

const stats = { emailsSent: 73, deliveryRate: null, activeLeads: 0, bounced: 2, opens: 0, clicks: 0, unsubscribed: 0 };

describe('CampaignStatsWidget', () => {
  it('shows real numbers and "Not available" for a delivery rate we cannot work out', () => {
    render(<CampaignStatsWidget stats={stats} />);
    expect(screen.getByText('73')).toBeTruthy();
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });
  it('shows a real rate when there is one', () => {
    render(<CampaignStatsWidget stats={{ ...stats, deliveryRate: 97.3 }} />);
    expect(screen.getByText('97.3%')).toBeTruthy();
  });
  it('says so when the whole card could not load', () => {
    render(<CampaignStatsWidget stats={null} />);
    expect(screen.getByText('Not available right now.')).toBeTruthy();
  });
});
