import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListingExplainerCard from './ListingExplainerCard';

jest.mock('../../lib/api', () => ({ buildApiUrl: (p: string) => p }));
jest.mock('../../services/dashboard/utils', () => ({ authHeaders: async () => ({ Authorization: 'Bearer t' }) }));
jest.mock('../../utils/toastService', () => ({ showToast: { error: jest.fn() } }));

const reply = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

describe('ListingExplainerCard', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('makes the video, shows it with a download, and asks for a different question next', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => { calls.push({ url: String(url), body: String(init?.body) }); return reply(200, { url: 'https://cdn/x.mp4' }); }) as unknown as typeof fetch;
    render(<ListingExplainerCard listingId="L1" />);
    fireEvent.click(screen.getByText('Make my video'));
    await waitFor(() => expect(screen.getByLabelText('Your Ask the AI video')).toBeTruthy());
    expect(calls[0].url).toBe('/api/lo/listings/L1/explainer');
    expect(JSON.parse(calls[0].body)).toEqual({ variant: 0 });
    expect(screen.getByText('Download').getAttribute('href')).toBe('https://cdn/x.mp4');
    fireEvent.click(screen.getByText('Try a different question'));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(JSON.parse(calls[1].body)).toEqual({ variant: 1 });
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
