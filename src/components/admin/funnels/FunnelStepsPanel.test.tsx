import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeCardProps, makeStep } from './testKit';
import FunnelStepsPanel, { FunnelStepsPanelProps, FunnelStepsContext } from './FunnelStepsPanel';

jest.mock('../../EmailEditor', () => ({ EmailEditor: () => <div>email-editor</div> }));

const props = (over: Partial<FunnelStepsPanelProps & FunnelStepsContext> = {}): FunnelStepsPanelProps & FunnelStepsContext => {
  const c = makeCardProps();
  return {
    badgeIcon: 'bolt', badgeClassName: '', badgeLabel: 'Primary Nurture', title: 'Marketing Funnel', description: 'The main journey',
    steps: [makeStep(), makeStep({ id: 's2', title: 'Follow-up text', type: 'Text', content: 'Hi' })], expandedIds: ['s1'],
    onToggleStep: jest.fn(), onUpdateStep: jest.fn(), onRemoveStep: jest.fn(), onAddStep: jest.fn(), onSave: jest.fn(), saveLabel: 'Save Funnel', onSendTest: jest.fn(),
    isLoading: false, panelExpanded: true, togglePanel: jest.fn(), saveStatus: 'idle', sendSuccessIds: [], sendingTestId: null, testPhone: '', isSavingBot: false,
    getBotOptions: c.getBotOptions, resolveCallBotIdForStep: c.resolveCallBotIdForStep, handleCreateCallBot: jest.fn(), handleEditCallBot: jest.fn(), handleDeleteCallBot: jest.fn(),
    mergeTokens: c.mergeTokens, sampleMergeData: c.sampleMergeData, ...over
  };
};

describe('FunnelStepsPanel', () => {
  it('lists every step, opens only the chosen one, and adds and saves', () => {
    const p = props();
    render(<FunnelStepsPanel {...p} />);
    expect(screen.getByText('Marketing Funnel')).toBeTruthy();
    expect(screen.getByText('Welcome email')).toBeTruthy();
    expect(screen.getByText('Follow-up text')).toBeTruthy();
    expect(screen.getAllByText('email-editor')).toHaveLength(1);
    fireEvent.click(screen.getByText('Add Step'));
    expect(p.onAddStep).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save Funnel'));
    expect(p.onSave).toHaveBeenCalled();
  });

  it('shows the common merge tokens', () => {
    render(<FunnelStepsPanel {...props()} />);
    expect(screen.getByText('{{lead.name}}')).toBeTruthy();
  });

  it('collapses and says so while loading', () => {
    const p = props({ panelExpanded: false });
    const { rerender } = render(<FunnelStepsPanel {...p} />);
    expect(screen.queryByText('Add Step')).toBeNull();
    fireEvent.click(screen.getByText('Expand'));
    expect(p.togglePanel).toHaveBeenCalled();
    rerender(<FunnelStepsPanel {...props({ isLoading: true })} />);
    expect(screen.getByText('Loading funnel steps...')).toBeTruthy();
  });
});
