import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeCardProps, makeStep } from './testKit';
import FunnelStepCard from './FunnelStepCard';

jest.mock('../../EmailEditor', () => ({ EmailEditor: () => <div>email-editor</div> }));

describe('FunnelStepCard', () => {
  it('closed: shows the title and delay, hides the editor, and opens when pressed', () => {
    const p = makeCardProps({ stepIsOpen: false });
    render(<FunnelStepCard {...p} />);
    expect(screen.getByText('Welcome email')).toBeTruthy();
    expect(screen.getByText('Immediately')).toBeTruthy();
    expect(screen.queryByText('email-editor')).toBeNull();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(p.onToggleStep).toHaveBeenCalledWith('s1');
  });

  it('open: shows the editor for its kind of step and can remove the step', () => {
    const p = makeCardProps();
    render(<FunnelStepCard {...p} />);
    expect(screen.getByText('email-editor')).toBeTruthy();
    fireEvent.click(screen.getByText('Remove Step'));
    expect(p.onRemoveStep).toHaveBeenCalledWith('s1');
  });

  it.each([
    ['Call', 'AI Call Configured'],
    ['Text', /characters/],
    ['Task', 'Agent Task'],
    ['Condition', 'Logic Condition'],
    ['Wait', 'Wait Step']
  ])('open %s step shows its own editor', (type, text) => {
    render(<FunnelStepCard {...makeCardProps({ step: makeStep({ type: type as string, content: 'x' }) })} />);
    expect(screen.getByText(text as string)).toBeTruthy();
  });
});
