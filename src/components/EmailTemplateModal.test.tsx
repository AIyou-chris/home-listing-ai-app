import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmailTemplateModal from './EmailTemplateModal';
import type { EmailTemplate } from '../constants/emailTemplates';

jest.mock('./TemplateVariableForm', () => ({ __esModule: true, default: ({ template }: { template: { name: string } }) => <div data-testid="fill-in-form">Fill in: {template.name}</div> }));

const withVariables: EmailTemplate = { id: 'a', name: 'Needs details', category: 'recruitment', subject: 'Hi {{lead.firstName}}', content: 'Hello {{lead.firstName}}', description: 'Has variables', tags: ['x'], useCase: 'Use case text' };
const plain: EmailTemplate = { id: 'b', name: 'Plain one', category: 'recruitment', subject: 'Hello', content: 'No variables here', description: 'No variables', tags: ['y'], useCase: 'Other use case' };

describe('EmailTemplateModal', () => {
  it('shows only the list until a template is chosen: no side preview opens', () => {
    render(<EmailTemplateModal onClose={jest.fn()} onSelectTemplate={jest.fn()} templates={[withVariables, plain]} />);
    expect(screen.getByText('Needs details')).toBeTruthy();
    expect(screen.queryByText('Best Used For')).toBeNull();
    expect(screen.queryByText('Subject Line')).toBeNull();
  });

  it('choosing a template without blanks sends it straight to the email and closes the list', () => {
    const onSelect = jest.fn(); const onClose = jest.fn();
    render(<EmailTemplateModal onClose={onClose} onSelectTemplate={onSelect} templates={[withVariables, plain]} />);
    fireEvent.click(screen.getByText('Plain one'));
    expect(onSelect).toHaveBeenCalledWith(plain);
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('Best Used For')).toBeNull();
  });

  it('choosing a template with blanks opens the fill-in form (only then), not a side preview', () => {
    const onSelect = jest.fn();
    render(<EmailTemplateModal onClose={jest.fn()} onSelectTemplate={onSelect} templates={[withVariables, plain]} />);
    fireEvent.click(screen.getByText('Needs details'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByText('Best Used For')).toBeNull();
    expect(screen.getByTestId('fill-in-form').textContent).toBe('Fill in: Needs details');
  });
});
