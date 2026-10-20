import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FunnelMobileNav from './FunnelMobileNav';
import { highlightCards } from './funnelDefaults';

describe('FunnelMobileNav', () => {
  it('shows one button per card and reports the one pressed', () => {
    const onSelect = jest.fn();
    render(<FunnelMobileNav activeSection="funnels" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(highlightCards.length);
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onSelect).toHaveBeenCalledWith(highlightCards[highlightCards.length - 1].targetSection);
  });
});
