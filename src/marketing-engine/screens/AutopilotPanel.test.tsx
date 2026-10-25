import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutopilotPanel from './AutopilotPanel';

jest.mock('../host/authedFetch', () => ({ authedFetch: jest.fn() }));
jest.mock('../host/api', () => ({ buildApiUrl: (p: string) => p }));
import { authedFetch } from '../host/authedFetch';

const mocked = authedFetch as jest.Mock;
const reply = (body: unknown, ok = true) => ({ ok, json: async () => body });
const status = (over = {}) => ({
  on: true, autoPost: true, autoPublish: false, times: ['8:00 AM Pacific'], direction: '', blogDrafts: [],
  slots: [{ campaignId: 'c1', slot: '2026-10-25@08:00', topic: 't', title: 'Send one WOW Link', failed: false, reason: '', awaitingApproval: true, posts: [] }],
  ...over
});

beforeEach(() => { mocked.mockReset(); });

it('a waiting post shows Approve, and pressing it sends the OK for that post only', async () => {
  mocked.mockImplementation(async (url: string) => (String(url).endsWith('/approve') ? reply({ approved: true }) : reply(status())));
  render(<AutopilotPanel />);
  fireEvent.click(await screen.findByText(/Coming up and recent posts/));
  expect(await screen.findByText('Waiting for your OK')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(mocked.mock.calls.some(([u]) => String(u) === '/api/admin/autopilot/posts/c1/approve')).toBe(true));
});

it('"Post by itself" is off by default and says every post waits for the owner', async () => {
  mocked.mockImplementation(async () => reply(status()));
  render(<AutopilotPanel />);
  const box = await screen.findByRole('checkbox', { name: /Post by itself/ });
  expect(box).not.toBeChecked();
  expect(screen.getByText(/Each one waits for your OK/)).toBeInTheDocument();
});

it('turning "Post by itself" on asks first and does nothing if the owner says no', async () => {
  mocked.mockImplementation(async () => reply(status()));
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<AutopilotPanel />);
  fireEvent.click(await screen.findByRole('checkbox', { name: /Post by itself/ }));
  expect(confirm).toHaveBeenCalled();
  expect(mocked.mock.calls.some(([u]) => String(u).includes('auto-publish'))).toBe(false);
  confirm.mockRestore();
});
