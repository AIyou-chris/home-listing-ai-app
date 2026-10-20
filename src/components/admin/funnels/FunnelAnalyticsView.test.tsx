import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FunnelAnalyticsView from './FunnelAnalyticsView';

jest.mock('../MarketingAnalyticsPanel', () => ({ __esModule: true, default: () => <div>what-is-working</div> }));
jest.mock('../../AnalyticsPage', () => ({ __esModule: true, default: () => <div>scoring-body</div> }));
jest.mock('../../SequenceFeedbackPanel', () => ({ __esModule: true, default: () => <div>feedback-body</div> }));

describe('FunnelAnalyticsView', () => {
  it('shows all three parts and each card opens and closes', () => {
    render(<FunnelAnalyticsView isDemoMode={false} userId="u1" isBlueprintMode={false} />);
    expect(screen.getByText('what-is-working')).toBeTruthy();
    expect(screen.getByText('scoring-body')).toBeTruthy();
    fireEvent.click(screen.getByText('Lead Scoring Engine'));
    expect(screen.queryByText('scoring-body')).toBeNull();
    expect(screen.getByText('feedback-body')).toBeTruthy();
    fireEvent.click(screen.getByText('Sequence Feedback'));
    expect(screen.queryByText('feedback-body')).toBeNull();
  });
});
