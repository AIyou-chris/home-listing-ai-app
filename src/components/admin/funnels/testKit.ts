import type { EditableStep } from '../../../types';
import type { FunnelStepCardProps } from './FunnelStepCard';

// Shared pieces for the funnel tests: one starter step and a full set of props with spies.
export const makeStep = (over: Partial<EditableStep> = {}): EditableStep => ({
  id: 's1', title: 'Welcome email', description: 'First touch', icon: 'mail', delay: 'Immediately', type: 'Email', subject: 'Hello', content: 'Hi there', ...over
});

export const makeCardProps = (over: Partial<FunnelStepCardProps> = {}): FunnelStepCardProps => ({
  step: makeStep(), isLast: false, stepIsOpen: true,
  onToggleStep: jest.fn(), onUpdateStep: jest.fn(), onRemoveStep: jest.fn(), onSendTest: jest.fn(), onSave: jest.fn(),
  saveStatus: 'idle', sendSuccessIds: [], sendingTestId: null, testPhone: '', isSavingBot: false,
  getBotOptions: () => [], resolveCallBotIdForStep: () => 'admin_follow_up',
  handleCreateCallBot: jest.fn(), handleEditCallBot: jest.fn(), handleDeleteCallBot: jest.fn(),
  mergeTokens: (t: string) => t, sampleMergeData: { agent: { name: 'Jordan' }, lead: { name: 'Jamie' } },
  ...over
});
