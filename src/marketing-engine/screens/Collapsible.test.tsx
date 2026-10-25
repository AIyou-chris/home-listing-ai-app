import React from 'react';
import { render, screen } from '@testing-library/react';
import Collapsible from './Collapsible';
import { setAllOpen } from './collapsibleAll';

describe('Collapsible', () => {
  it('starts open or closed as asked and can be opened or closed all at once', () => {
    const { container } = render(<div><Collapsible title="One">first</Collapsible><Collapsible title="Two" defaultOpen={false}>second</Collapsible></div>);
    const cards = container.querySelectorAll('details');
    expect(cards[0].open).toBe(true);
    expect(cards[1].open).toBe(false);
    expect(screen.getByText('One')).toBeTruthy();
    setAllOpen(container as HTMLElement, true);
    expect(cards[1].open).toBe(true);
    setAllOpen(container as HTMLElement, false);
    expect(cards[0].open).toBe(false);
  });
});
