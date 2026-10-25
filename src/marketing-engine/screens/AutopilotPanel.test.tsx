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

it('a post with a ready video shows the player, the match line and the make button', async () => {
  mocked.mockImplementation(async () => reply(status({ scenes: [{ name: 'plan', label: 'Plan and price' }], slots: [{ campaignId: 'c2', slot: '2026-10-25@08:00', topic: 't', title: 'T', failed: false, reason: '', videoUrl: 'https://example.com/v.mp4', script: 'Send one link.', video: { scene: 'plan', sceneLabel: 'Plan and price', review: { score: 4, matches: true } }, posts: [] }] })));
  render(<AutopilotPanel />);
  expect(await screen.findByText('Matches the post (4/5).')).toBeInTheDocument();
  expect(screen.getByText(/Send one link\./)).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Plan and price' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Make the explainer video' })).toBeEnabled();
});

it('Make the explainer video sends the chosen scene and the owner\'s note', async () => {
  mocked.mockImplementation(async (url: string) => (String(url).endsWith('/explainer') ? reply({ queued: true }) : reply(status({ scenes: [{ name: 'plan', label: 'Plan and price' }], slots: [{ campaignId: 'c2', slot: '2026-10-25@08:00', topic: 't', title: 'T', failed: false, reason: '', posts: [] }] }))));
  render(<AutopilotPanel />);
  fireEvent.change(await screen.findByLabelText('Scene'), { target: { value: 'plan' } });
  fireEvent.change(screen.getByLabelText('What should it show'), { target: { value: 'busy Fridays' } });
  fireEvent.click(screen.getByRole('button', { name: 'Make the explainer video' }));
  await waitFor(() => {
    const call = mocked.mock.calls.find(([u]) => String(u) === '/api/admin/autopilot/posts/c2/explainer');
    expect(call).toBeTruthy();
    expect(JSON.parse(call[1].body)).toEqual({ scene: 'plan', note: 'busy Fridays' });
  });
});

it('thumbs down asks what was wrong and sends the rating; a post that is out has no make button', async () => {
  mocked.mockImplementation(async (url: string) => (String(url).endsWith('/video-rating') ? reply({ ok: true }) : reply(status({ slots: [
    { campaignId: 'c3', slot: '2026-10-25@08:00', topic: 't', title: 'Waiting', failed: false, reason: '', videoUrl: 'https://example.com/v.mp4', video: { scene: 'buyer-chat' }, posts: [] },
    { campaignId: 'c4', slot: '2026-10-24@08:00', topic: 't', title: 'Out', failed: false, reason: '', videoUrl: 'https://example.com/o.mp4', posts: [{ channel: 'linkedin', status: 'published', scheduled_for: '', posted_at: '', url: null, error: null }] }
  ] }))));
  render(<AutopilotPanel />);
  expect(await screen.findAllByRole('button', { name: 'Make the explainer video' })).toHaveLength(1);
  fireEvent.click(await screen.findByRole('button', { name: 'Thumbs down' }));
  fireEvent.change(screen.getByLabelText('What was wrong'), { target: { value: 'too fast' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => {
    const call = mocked.mock.calls.find(([u]) => String(u) === '/api/admin/autopilot/posts/c3/video-rating');
    expect(JSON.parse(call[1].body)).toEqual({ rating: 'down', reason: 'too fast' });
  });
});

it('a scheduled post says it is approved, with no Approve button', async () => {
  mocked.mockImplementation(async () => reply(status({ slots: [{ campaignId: 'c5', slot: '2026-10-25@17:00', topic: 't', title: 'Sched', failed: false, reason: '', posts: [{ channel: 'linkedin', status: 'scheduled', scheduled_for: '', posted_at: null, url: null, error: null }] }] })));
  render(<AutopilotPanel />);
  expect(await screen.findByText('Approved · goes out at its time')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
});
