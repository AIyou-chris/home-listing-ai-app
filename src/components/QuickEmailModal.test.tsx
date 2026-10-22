import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickEmailModal from './QuickEmailModal';

const authed = jest.fn();
jest.mock('../services/authedFetch', () => ({ authedFetch: (...args: unknown[]) => authed(...args) }));
jest.mock('../hooks/useAgentBranding', () => ({ useAgentBranding: () => ({ contact: { email: '' }, signature: '' }) }));
jest.mock('./EmailTemplateModal', () => ({ __esModule: true, default: () => null }));

const reply = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

describe('QuickEmailModal send', () => {
  beforeEach(() => { authed.mockReset(); });

  const fill = () => {
    fireEvent.change(screen.getByPlaceholderText('sarah@email.com'), { target: { value: 'ross@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Write your email...'), { target: { value: 'Hi Ross,\n\nHere is the link:\nhttps://homelistingai.com/partner-invite/demo' } });
    const subject = document.querySelector('input[type="text"]:not([placeholder])') as HTMLInputElement;
    fireEvent.change(subject, { target: { value: 'Here is the link you asked for' } });
  };

  it('sends through the signed-in fetch (the token goes with it), with paragraphs kept and a plain-text copy', async () => {
    authed.mockReturnValue(reply(200, { success: true }));
    render(<QuickEmailModal onClose={jest.fn()} />);
    fill();
    fireEvent.click(screen.getByText('Send Email'));
    await waitFor(() => expect(authed).toHaveBeenCalledTimes(1));
    const [url, init] = authed.mock.calls[0];
    expect(url).toBe('/api/admin/email/quick-send');
    const sent = JSON.parse(init.body);
    expect(sent.to).toBe('ross@example.com');
    expect(sent.html).toContain('<p>Hi Ross,</p>');
    expect(sent.html).toContain('<a href="https://homelistingai.com/partner-invite/demo">');
    expect(sent.text).toBe('Hi Ross,\n\nHere is the link:\nhttps://homelistingai.com/partner-invite/demo');
    await waitFor(() => expect(screen.getByText(/sent successfully/i)).toBeTruthy());
  });

  it('shows the reason when the server refuses', async () => {
    authed.mockReturnValue(reply(401, { error: 'Unauthorized: Missing token' }));
    render(<QuickEmailModal onClose={jest.fn()} />);
    fill();
    fireEvent.click(screen.getByText('Send Email'));
    await waitFor(() => expect(screen.getByText('Unauthorized: Missing token')).toBeTruthy());
  });

  it('demo mode never calls the server', async () => {
    render(<QuickEmailModal onClose={jest.fn()} isDemoMode />);
    fill();
    fireEvent.click(screen.getByText('Send Email'));
    await waitFor(() => expect(screen.getByText(/Demo mode/)).toBeTruthy(), { timeout: 3000 });
    expect(authed).not.toHaveBeenCalled();
  });
});
