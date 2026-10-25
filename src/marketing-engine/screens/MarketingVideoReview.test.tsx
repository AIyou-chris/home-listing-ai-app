import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MarketingVideoReview from './MarketingVideoReview';
import { adminMarketingMediaService } from '../services/adminMarketingMediaService';
import type { StudioCampaign } from '../services/adminMarketingStudioService';

jest.mock('../services/adminMarketingMediaService', () => ({ adminMarketingMediaService: { videoReview: jest.fn() } }));
const campaign = { id: 'c1', version: 'v1' } as unknown as StudioCampaign;
const review = jest.mocked(adminMarketingMediaService.videoReview);

describe('MarketingVideoReview', () => {
  beforeEach(() => review.mockReset());

  it('shows nothing unless an animated explainer is chosen', () => {
    const { container } = render(<MarketingVideoReview campaign={campaign} explainerChosen={false} unsavedChoices={false} disabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('needs the settings saved first', () => {
    render(<MarketingVideoReview campaign={campaign} explainerChosen unsavedChoices disabled={false} />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Save your video settings first.')).toBeTruthy();
  });

  it('says plainly when the video matches, in what the post says and what the video says', async () => {
    review.mockResolvedValue({ matches: true, reviewed: true, score: 4, postMessage: 'Invite agents.', videoMessage: 'Invite agents to a free page.', problems: ['leaves out one detail'], fix: '', words: {} });
    render(<MarketingVideoReview campaign={campaign} explainerChosen unsavedChoices={false} disabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Matches the post (4 out of 5).')).toBeTruthy());
    expect(screen.getByText('Invite agents.')).toBeTruthy();
    expect(screen.getByText('leaves out one detail')).toBeTruthy();
  });

  it('says plainly when it does not match, with the problems and the suggested fix', async () => {
    review.mockResolvedValue({ matches: false, reviewed: true, score: 2, postMessage: 'a', videoMessage: 'b', problems: ['changes the offer'], fix: 'name the offer', words: {} });
    render(<MarketingVideoReview campaign={campaign} explainerChosen unsavedChoices={false} disabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Does not match the post yet (2 out of 5).')).toBeTruthy());
    expect(screen.getByText('changes the offer')).toBeTruthy();
    expect(screen.getByText('name the offer')).toBeTruthy();
  });

  it('says so when the reviewer was not available and when the check fails', async () => {
    review.mockResolvedValueOnce({ matches: false, reviewed: false, score: null, postMessage: '', videoMessage: '', problems: [], fix: '', words: {} });
    const { rerender } = render(<MarketingVideoReview campaign={campaign} explainerChosen unsavedChoices={false} disabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText(/was not checked/)).toBeTruthy());
    review.mockRejectedValueOnce(new Error('The video reviewer is not available right now.'));
    rerender(<MarketingVideoReview campaign={campaign} explainerChosen unsavedChoices={false} disabled={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('The video reviewer is not available right now.')).toBeTruthy());
  });
});
