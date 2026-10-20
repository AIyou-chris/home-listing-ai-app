import React from 'react';
import { render } from '@testing-library/react';
import FunnelTipBanner from './FunnelTipBanner';

jest.mock('../../PageTipBanner', () => ({ __esModule: true, default: ({ pageKey }: { pageKey: string }) => <div data-testid="tip">{pageKey}</div> }));

describe('FunnelTipBanner', () => {
  it('shows the AI funnels tip', () => {
    const { getByTestId } = render(<FunnelTipBanner />);
    expect(getByTestId('tip').textContent).toBe('ai-funnels');
  });
});
