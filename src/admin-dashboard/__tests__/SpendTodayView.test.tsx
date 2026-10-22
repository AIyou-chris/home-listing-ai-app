import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpendTodayView } from '../components/SpendTodayCard';

describe('SpendTodayView', () => {
  it('shows used versus limit', () => {
    render(<SpendTodayView rows={[{ key: 'sms', label: 'Texts', used: 12, limit: 300 }]} />);
    expect(screen.getByText('Texts')).toBeTruthy();
    expect(screen.getByText('12 of 300')).toBeTruthy();
  });
  it('says so when not available', () => {
    render(<SpendTodayView rows={null} error />);
    expect(screen.getByText(/Not available/)).toBeTruthy();
  });
});
