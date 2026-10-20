import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeCardProps, makeStep } from './testKit';
import StepCallEditor from './StepCallEditor';
import StepTextEditor from './StepTextEditor';
import StepTaskEditor from './StepTaskEditor';
import StepConditionEditor from './StepConditionEditor';
import StepWaitEditor from './StepWaitEditor';
import StepEmailEditor from './StepEmailEditor';

jest.mock('../../EmailEditor', () => ({ EmailEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <textarea aria-label="email body" value={value} onChange={(e) => onChange(e.target.value)} /> }));

describe('step editors', () => {
  it('call: lists the call bots, changes the chosen one and can start a new bot', () => {
    const p = makeCardProps({ step: makeStep({ type: 'Call', content: 'a' }), getBotOptions: () => [{ key: 'a', name: 'Bot A', configId: 'cfg-a' }, { key: 'b', name: 'Bot B', configId: 'cfg-b' }] as never, resolveCallBotIdForStep: () => 'a' });
    render(<StepCallEditor {...p} />);
    expect(screen.getByText('AI Call Configured')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'content', 'b');
    fireEvent.click(screen.getByText('+ New Bot'));
    expect(p.handleCreateCallBot).toHaveBeenCalled();
  });

  it('text: edits the message and counts characters', () => {
    const p = makeCardProps({ step: makeStep({ type: 'Text', content: 'Hello Sam' }) });
    render(<StepTextEditor {...p} />);
    expect(screen.getByText('9 characters')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Type your text message here/), { target: { value: 'New words' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'content', 'New words');
  });

  it('task: edits the title and the instructions', () => {
    const p = makeCardProps({ step: makeStep({ type: 'Task', subject: '', content: '' }) });
    render(<StepTaskEditor {...p} />);
    expect(screen.getByText('Agent Task')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. Call Lead...'), { target: { value: 'Call Sam' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'subject', 'Call Sam');
    fireEvent.change(screen.getByPlaceholderText('Describe what needs to be done...'), { target: { value: 'Ask about timing' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'content', 'Ask about timing');
  });

  it('condition: edits the value it checks', () => {
    const p = makeCardProps({ step: makeStep({ type: 'Condition' }) });
    render(<StepConditionEditor {...p} />);
    expect(screen.getByText('Logic Condition')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('e.g. specific tag or link...'), { target: { value: 'clicked' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'conditionValue', 'clicked');
  });

  it('wait: explains the pause and can save', () => {
    const p = makeCardProps({ step: makeStep({ type: 'Wait' }) });
    render(<StepWaitEditor {...p} />);
    expect(screen.getByText('Wait Step')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    expect(p.onSave).toHaveBeenCalled();
  });

  it('email: edits the subject and the body, and sends a test', () => {
    const p = makeCardProps();
    render(<StepEmailEditor {...p} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. following up on our chat...'), { target: { value: 'New subject' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'subject', 'New subject');
    fireEvent.change(screen.getByLabelText('email body'), { target: { value: '<p>Hi</p>' } });
    expect(p.onUpdateStep).toHaveBeenCalledWith('s1', 'content', '<p>Hi</p>');
  });

  it('email: shows Saved! after a save', () => {
    render(<StepEmailEditor {...makeCardProps({ saveStatus: 'success' })} />);
    expect(screen.getAllByText('Saved!')).toHaveLength(2);
  });
});
