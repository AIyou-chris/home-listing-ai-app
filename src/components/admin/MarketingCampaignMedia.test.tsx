import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarketingCampaignMedia from './MarketingCampaignMedia';
import { adminMarketingMediaService as api } from '../../services/adminMarketingMediaService';
import { adminMarketingStudioService as campaignApi, type StudioCampaign } from '../../services/adminMarketingStudioService';
jest.mock('../../services/adminMarketingMediaService', () => ({ adminMarketingMediaService: { list: jest.fn(), capabilities: jest.fn(), picture: jest.fn(), video: jest.fn(), audio: jest.fn() } }));
jest.mock('../../services/adminMarketingStudioService', () => ({ adminMarketingStudioService: { settings: jest.fn(), list: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;
const campaign: StudioCampaign = { id: '33333333-3333-4333-8333-333333333333', idea: 'New market', kind: 'video', goal: 'Warm leads', audience: 'Loan officers', tone: 'Helpful', pictureMode: 'auto', pictureDescription: '', photoName: '', videoFormat: 'vertical', videoDuration: '30', plannedAt: '', createdAt: '2026-10-04', status: 'draft', version: '2026-10-04', outputs: { title: 'New market', videoScript: 'Saved script' } };
beforeEach(() => { jest.clearAllMocks(); mocked.list.mockResolvedValue([]); mocked.capabilities.mockResolvedValue({ video: true, picture: true, aiPicture: true, aiVoice: true }); mocked.picture.mockResolvedValue([]); mocked.video.mockResolvedValue([]); });
test('unsaved content prevents media spending and rendering', async () => { render(<MarketingCampaignMedia campaign={campaign} dirty onChange={jest.fn()} />); await screen.findByText('Save your edits before making new media.'); await waitFor(() => expect(mocked.list).toHaveBeenCalled()); expect(screen.getByRole('button', { name: 'Generate AI picture' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled(); });
test('free and paid picture buttons are explicit, and provider errors are visible', async () => { mocked.picture.mockRejectedValue(new Error('Picture unavailable')); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />); const button = screen.getByRole('button', { name: 'Generate AI picture' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); await screen.findByRole('alert'); expect(mocked.picture).toHaveBeenCalledWith(campaign, { ai: true }); expect(screen.getByText('Picture unavailable')).toBeInTheDocument(); });
test('format tweaks save existing drafts without another AI generation', async () => { const changed = { ...campaign, videoFormat: 'landscape' as const }; const settings = campaignApi.settings as jest.Mock; settings.mockResolvedValue(changed); const onChange = jest.fn(); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={onChange} />); await waitFor(() => expect(screen.getByLabelText('Video preview format')).toBeEnabled()); fireEvent.change(screen.getByLabelText('Video preview format'), { target: { value: 'landscape' } }); expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled(); fireEvent.click(screen.getByRole('button', { name: 'Save video settings' })); await waitFor(() => expect(onChange).toHaveBeenCalledWith(changed)); expect(settings).toHaveBeenCalledWith(campaign, 'landscape', '30', expect.objectContaining({ narration: 'none', music: 'none' })); });
test('stale picture blocks video rendering while existing downloads remain visible', async () => { mocked.list.mockResolvedValue([{ kind: 'image', status: 'ready', source: 'template', url: 'https://private.example/picture', stale: true, updatedAt: '2026-10-04' }]); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />); await screen.findByAltText('Your saved campaign picture'); expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled(); expect(screen.getByRole('link', { name: 'Open / download picture' })).toHaveAttribute('href', 'https://private.example/picture'); });

test('creating media refreshes a campaign when its previous approval is cleared', async () => { const updated = { ...campaign, version: 'new-version', status: 'draft' as const }; (campaignApi.list as jest.Mock).mockResolvedValue([updated]); const onChange = jest.fn(); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={onChange} />); const button = screen.getByRole('button', { name: 'Make free branded picture' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated)); });

test('voice selection must be saved before spending and missing audio blocks rendering', async () => {
  render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />);
  await waitFor(() => expect(screen.getByLabelText('Narration')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Narration'), { target: { value: 'saved' } });
  expect(screen.getByRole('button', { name: 'Generate AI voice — uses API balance' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled();
  expect(mocked.audio).not.toHaveBeenCalled();
});
test('saved voice has an explicit paid action and stale recordings block export', async () => {
  mocked.audio.mockRejectedValue(new Error('Voice budget used'));
  mocked.list.mockResolvedValue([{kind:'voice',status:'ready',source:'ai',url:'https://private.example/voice.mp3',stale:true,updatedAt:'2026-10-04'}]);
  render(<MarketingCampaignMedia campaign={{...campaign,narration:'saved'}} dirty={false} onChange={jest.fn()} />);
  const button=screen.getByRole('button',{name:'Generate AI voice — uses API balance'});
  await waitFor(()=>expect(button).toBeEnabled());
  expect(screen.getByRole('button',{name:'Make video',exact:true})).toBeDisabled();
  fireEvent.click(button);await screen.findByText('Voice budget used');
  expect(mocked.audio).toHaveBeenCalledWith(expect.objectContaining({narration:'saved'}),{kind:'voice',ai:true});
});

test('movement and ending controls save without purchasing new media', async () => {
  const onChange=jest.fn();(campaignApi.settings as jest.Mock).mockResolvedValue({...campaign,motion:'still',transition:'cut',endCard:'none'});
  render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={onChange} />);
  await waitFor(()=>expect(screen.getByLabelText('Picture movement')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Picture movement'),{target:{value:'still'}});
  fireEvent.change(screen.getByLabelText('Caption transitions'),{target:{value:'cut'}});
  fireEvent.change(screen.getByLabelText('Video ending'),{target:{value:'none'}});
  fireEvent.click(screen.getByRole('button',{name:'Save video settings'}));
  await waitFor(()=>expect(campaignApi.settings).toHaveBeenCalledWith(campaign,'vertical','30',expect.objectContaining({motion:'still',transition:'cut',endCard:'none'})));
  expect(mocked.audio).not.toHaveBeenCalled();expect(mocked.picture).not.toHaveBeenCalled();
});

 test('video preview has a picture and a separate playback link', async () => {
  mocked.list.mockResolvedValue([
    {kind:'image',status:'ready',source:'template',url:'https://private.example/picture.jpg',stale:false,updatedAt:'2026-10-04'},
    {kind:'video',status:'ready',source:'render',url:'https://private.example/video.mp4',stale:false,updatedAt:'2026-10-04'}
  ]);
  render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />);
  const player=await screen.findByLabelText('Finished campaign video');
  expect(player).toHaveAttribute('poster','https://private.example/picture.jpg');
  expect(player).toHaveAttribute('preload','auto');
  expect(screen.getByRole('link',{name:'Watch video'})).toHaveAttribute('href','https://private.example/video.mp4');
  expect(screen.getByRole('link',{name:'Watch video'})).not.toHaveAttribute('download');
});
