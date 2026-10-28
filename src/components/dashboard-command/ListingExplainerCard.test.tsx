import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ListingExplainerCard from './ListingExplainerCard';

jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }));
jest.mock('../../services/dashboard/utils', () => ({ authHeaders: async () => ({ Authorization: 'Bearer t' }) }));
jest.mock('../../utils/toastService', () => ({ showToast: { error: jest.fn() } }));

const reply = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

describe('ListingExplainerCard', () => {
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('starts the video, waits for it while it is made, shows it with a download, and asks for a different question next', async () => {
    jest.useFakeTimers();
    const calls: Array<{ url: string; body: string }> = [];
    let polls = 0;
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body) });
      if (init?.method === 'POST') return reply(202, { success: true, jobId: 'J1' });
      polls += 1;
      return reply(200, polls < 2 ? { status: 'making' } : { status: 'ready', url: 'https://cdn/x.mp4' });
    }) as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" />);
    fireEvent.click(screen.getByText('Make my video'));
    for (let i = 0; i < 3; i += 1) await act(async () => { jest.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByLabelText('Your Ask the AI video')).toBeTruthy());
    expect(calls[0].url).toBe('/api/lo/listings/L1/explainer');
    expect(JSON.parse(calls[0].body)).toEqual({ variant: 0 });
    expect(calls[1].url).toBe('/api/lo/listings/L1/explainer/J1');
    expect(screen.getByText('Download').getAttribute('href')).toBe('https://cdn/x.mp4');
    fireEvent.click(screen.getByText('Try a different question'));
    await waitFor(() => expect(calls.filter((c) => c.body !== 'undefined')).toHaveLength(2));
    expect(JSON.parse(calls.filter((c) => c.body !== 'undefined')[1].body)).toEqual({ variant: 1 });
    jest.useRealTimers();
  });

  it('keeps checking after a temporary server failure', async () => {
    jest.useFakeTimers();
    let polls = 0;
    global.fetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return reply(202, { jobId: 'retry' });
      return ++polls === 1 ? reply(503, {}) : reply(200, { status: 'ready', url: 'https://cdn/recovered.mp4' });
    }) as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" />);
    fireEvent.click(screen.getByText('Make my video'));
    for (let i = 0; i < 4; i += 1) await act(async () => { jest.advanceTimersByTime(3000); });
    expect(screen.getByLabelText('Your Ask the AI video').getAttribute('src')).toBe('https://cdn/recovered.mp4');
  });

  it('says so when the video could not be made', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => (init?.method === 'POST' ? reply(202, { jobId: 'J2' }) : reply(200, { status: 'failed', error: 'video_failed' }))) as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" />);
    fireEvent.click(screen.getByText('Make my video'));
    for (let i = 0; i < 3; i += 1) await act(async () => { jest.advanceTimersByTime(3000); });
    await waitFor(() => expect(screen.getByText(/Could not make your video/)).toBeTruthy());
  });

  it('says plainly what is missing (NMLS) instead of failing silently', async () => {
    global.fetch = jest.fn(() => reply(409, { error: 'NEED_NMLS' })) as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" />);
    fireEvent.click(screen.getByText('Make my video'));
    await waitFor(() => expect(screen.getByText(/Add your NMLS number/)).toBeTruthy());
    expect(screen.queryByLabelText('Your Ask the AI video')).toBeNull();
  });

  it('does not call the server in demo mode', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" demo />);
    fireEvent.click(screen.getByText('Make my video'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
