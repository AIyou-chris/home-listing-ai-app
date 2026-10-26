import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StudioExplainer from './StudioExplainer';
import type { StudioCampaign } from '../services/adminMarketingStudioService';

const scenes = [{ name: 'plan', label: 'Plan and price' }, { name: 'buyer-chat', label: 'Buyer chat on a listing' }];
const campaign = (over: Partial<StudioCampaign> = {}) => ({ id: 'c1', status: 'draft', outputs: {}, version: 'v1', ...over }) as unknown as StudioCampaign;
const ready = { kind: 'video', status: 'ready', source: 'render', url: 'https://x/v.mp4', stale: false, updatedAt: '2026-10-25T00:00:00Z' } as const;

it('lists the scenes from the server, and sends the chosen scene and the note', () => {
  const onMake = jest.fn();
  render(<StudioExplainer campaign={campaign()} scenes={scenes} making={false} disabled={false} onMake={onMake} onRate={jest.fn()} />);
  expect(screen.getByRole('option', { name: 'Scene: pick for me' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Scene'), { target: { value: 'plan' } });
  fireEvent.change(screen.getByLabelText('What should it show'), { target: { value: 'busy Fridays' } });
  fireEvent.click(screen.getByRole('button', { name: 'Make the explainer video' }));
  expect(onMake).toHaveBeenCalledWith('plan', 'busy Fridays');
});

it('shows the match line and thumbs once a video is made, and the thumbs-down asks why', () => {
  const onRate = jest.fn();
  render(<StudioExplainer campaign={campaign({ explainerScene: { scene: 'plan' }, explainerReview: { score: 4, matches: true } })} video={ready} scenes={scenes} making={false} disabled={false} onMake={jest.fn()} onRate={onRate} />);
  expect(screen.getByText('Matches the post (4/5).')).toBeInTheDocument();
  expect(screen.getByText(/Made:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thumbs up' }));
  expect(onRate).toHaveBeenCalledWith('up', '');
  fireEvent.click(screen.getByRole('button', { name: 'Thumbs down' }));
  fireEvent.change(screen.getByLabelText('What was wrong'), { target: { value: 'too fast' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onRate).toHaveBeenCalledWith('down', 'too fast');
});

it('shows progress while it is being made, a mismatch warning, and the last error', () => {
  const { rerender } = render(<StudioExplainer campaign={campaign()} scenes={scenes} making disabled={false} onMake={jest.fn()} onRate={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Writing and making the video…' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent(/about two minutes/);
  rerender(<StudioExplainer campaign={campaign({ explainerError: 'drawing failed', explainerScene: { scene: 'plan' }, explainerReview: { score: 2, matches: false, problems: ['Wrong offer.'] } })} video={ready} scenes={scenes} making={false} disabled={false} onMake={jest.fn()} onRate={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('drawing failed');
  expect(screen.getByText(/Does not match the post well \(2\/5\): Wrong offer\./)).toBeInTheDocument();
});
