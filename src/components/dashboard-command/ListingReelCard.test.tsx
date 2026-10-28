import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ListingReelCard from './ListingReelCard';
jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }));
jest.mock('../../services/dashboard/utils', () => ({ authHeaders: async () => ({ Authorization: 'Bearer test' }) }));
jest.mock('../../utils/toastService', () => ({ showToast: { error: jest.fn() } }));
const reply = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it('recovers a reel after repeated temporary server failures without starting a second paid render', async () => {
  jest.useFakeTimers();
  let checks = 0;
  global.fetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') return reply(202, { jobId: 'reel1' });
    return ++checks <= 7 ? reply(503, {}) : reply(200, { status: 'done', url: 'https://cdn/home.mp4' });
  }) as unknown as typeof fetch;
  render(<ListingReelCard listingId="L1" photoCount={3} />);
  fireEvent.click(screen.getByText('Make my reel'));
  for (let i = 0; i < 10; i++) await act(async () => { jest.advanceTimersByTime(2500); });
  expect(screen.getByLabelText('Your listing reel').getAttribute('src')).toBe('https://cdn/home.mp4');
  expect((global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});
it('stops checking when the server has lost the job', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST' ? reply(202, { jobId: 'lost' }) : reply(404, {})) as unknown as typeof fetch;
  render(<ListingReelCard listingId="L1" photoCount={3} />);
  fireEvent.click(screen.getByText('Make my reel'));
  for (let i = 0; i < 3; i++) await act(async () => { jest.advanceTimersByTime(2500); });
  expect(screen.getByText(/That video was lost/)).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
