import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FunnelHeader from './FunnelHeader';

const props = () => ({
  title: 'Agent Outreach Funnel', subtitle: 'Sequence for leads', availableFunnels: { realtor: {}, broker_team: {} }, selectedFunnelId: 'realtor',
  onSelectFunnel: jest.fn(), savedFunnelKeys: ['realtor'], showFunnelActions: true, isAnalyticsOpen: false,
  onOpenAnalytics: jest.fn(), onCloseAnalytics: jest.fn(), onImportLeads: jest.fn(), onOpenEmailLibrary: jest.fn()
});

describe('FunnelHeader', () => {
  it('shows the title, lets you pick a funnel and presses the three buttons', () => {
    const p = props();
    render(<FunnelHeader {...p} />);
    expect(screen.getByText('Agent Outreach Funnel')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'broker_team' } });
    expect(p.onSelectFunnel).toHaveBeenCalledWith('broker_team');
    fireEvent.click(screen.getByText('Import Leads'));
    fireEvent.click(screen.getByText('Email Library'));
    fireEvent.click(screen.getByText(/View Scoring/));
    expect(p.onImportLeads).toHaveBeenCalled();
    expect(p.onOpenEmailLibrary).toHaveBeenCalled();
    expect(p.onOpenAnalytics).toHaveBeenCalled();
  });
  it('says plainly when the funnel is an unsaved starter', () => {
    render(<FunnelHeader {...props()} selectedFunnelId="broker_team" />);
    expect(screen.getByRole('status').textContent).toMatch(/Nothing is sent until you do/);
  });
  it('hides the main buttons and offers a way back while analytics is open', () => {
    const p = props();
    render(<FunnelHeader {...p} showFunnelActions={false} isAnalyticsOpen />);
    expect(screen.queryByText('Import Leads')).toBeNull();
    fireEvent.click(screen.getByText('Back to Funnel'));
    expect(p.onCloseAnalytics).toHaveBeenCalled();
  });
});
