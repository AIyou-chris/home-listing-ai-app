import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarketingCampaignMedia from './MarketingCampaignMedia';
import { adminMarketingMediaService as api } from '../services/adminMarketingMediaService';
import { adminMarketingStudioService as campaignApi, type StudioCampaign } from '../services/adminMarketingStudioService';
jest.mock('../services/adminMarketingMediaService', () => ({ adminMarketingMediaService: { imageCatalog: jest.fn().mockResolvedValue({ recipes: [], formats: { blog: {label: 'Blog hero',width:1536,height:1024} }, costs: { blog: {set:0.045,one:0.015,final:0.052} } }), imageResults: jest.fn().mockResolvedValue([]), imageLibrary: jest.fn().mockResolvedValue([]), imageOptions: jest.fn(), imageLayout: jest.fn(), chooseImage: jest.fn(), list: jest.fn(), capabilities: jest.fn(), remove: jest.fn(), picture: jest.fn(), video: jest.fn(), audio: jest.fn() } }));
jest.mock('../services/adminMarketingStudioService', () => ({ adminMarketingStudioService: { settings: jest.fn(), list: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;
const campaign: StudioCampaign = { id: '33333333-3333-4333-8333-333333333333', idea: 'New market', kind: 'video', goal: 'Warm leads', audience: 'Loan officers', tone: 'Helpful', pictureMode: 'auto', pictureDescription: '', photoName: '', videoFormat: 'vertical', videoDuration: '30', plannedAt: '', createdAt: '2026-10-04', status: 'draft', version: '2026-10-04', outputs: { title: 'New market', videoScript: 'Saved script' } };
beforeEach(() => { jest.clearAllMocks(); mocked.list.mockResolvedValue([]); mocked.capabilities.mockResolvedValue({ video: true, picture: true, aiPicture: true, aiVoice: true }); mocked.picture.mockResolvedValue([]); mocked.video.mockResolvedValue([]); });
test('unsaved content prevents media spending and rendering', async () => { render(<MarketingCampaignMedia campaign={campaign} dirty onChange={jest.fn()} />); await screen.findByText('Save your edits before making new media.'); await waitFor(() => expect(mocked.list).toHaveBeenCalled()); expect(screen.getByRole('button', { name: 'Make three choices' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled(); });
test('free and paid picture buttons are explicit, and provider errors are visible', async () => { mocked.imageOptions.mockRejectedValue(new Error('Picture unavailable')); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />); const button = screen.getByRole('button', { name: 'Make three choices' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); await screen.findByRole('alert'); expect(mocked.imageOptions).toHaveBeenCalledWith(campaign, expect.objectContaining({format:'blog',headline:''})); expect(screen.getByText('Picture unavailable')).toBeInTheDocument(); });
test('format tweaks save existing drafts without another AI generation', async () => { const changed = { ...campaign, videoFormat: 'landscape' as const }; const settings = campaignApi.settings as jest.Mock; settings.mockResolvedValue(changed); const onChange = jest.fn(); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={onChange} />); await waitFor(() => expect(screen.getByLabelText('Video preview format')).toBeEnabled()); fireEvent.change(screen.getByLabelText('Video preview format'), { target: { value: 'landscape' } }); expect(screen.getByRole('button', { name: 'Save & remake video', exact: true })).toBeEnabled(); fireEvent.click(screen.getByRole('button', { name: 'Save settings only' })); await waitFor(() => expect(onChange).toHaveBeenCalledWith(changed)); expect(settings).toHaveBeenCalledWith(campaign, 'landscape', '30', expect.objectContaining({ narration: 'none', music: 'none' })); });
test('stale picture blocks video rendering while existing downloads remain visible', async () => { mocked.list.mockResolvedValue([{ kind: 'image', status: 'ready', source: 'template', url: 'https://private.example/picture', stale: true, updatedAt: '2026-10-04' }]); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />); await screen.findByAltText('Your saved campaign picture'); expect(screen.getByRole('button', { name: 'Make video', exact: true })).toBeDisabled(); expect(screen.getByRole('link', { name: 'Open / download picture' })).toHaveAttribute('href', 'https://private.example/picture'); });

test('creating media refreshes a campaign when its previous approval is cleared', async () => { const updated = { ...campaign, version: 'new-version', status: 'draft' as const }; (campaignApi.list as jest.Mock).mockResolvedValue([updated]); const onChange = jest.fn(); render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={onChange} />); const button = screen.getByRole('button', { name: 'Make free branded picture' }); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button); await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated)); });

test('voice selection must be saved before spending and missing audio blocks rendering', async () => {
  render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()} />);
  await waitFor(() => expect(screen.getByLabelText('Narration')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Narration'), { target: { value: 'saved' } });
  expect(screen.getByRole('button', { name: 'Generate AI voice — uses API balance' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save & make video + AI voice — uses API balance' })).toBeEnabled();
  expect(mocked.audio).not.toHaveBeenCalled();
});
test('saved voice has an explicit paid action and stale recordings block export', async () => {
  mocked.audio.mockRejectedValue(new Error('Voice budget used'));
  mocked.list.mockResolvedValue([{kind:'voice',status:'ready',source:'ai',url:'https://private.example/voice.mp3',stale:true,updatedAt:'2026-10-04'}]);
  render(<MarketingCampaignMedia campaign={{...campaign,narration:'saved'}} dirty={false} onChange={jest.fn()} />);
  const button=screen.getByRole('button',{name:'Generate AI voice — uses API balance'});
  await waitFor(()=>expect(button).toBeEnabled());
  expect(screen.getByRole('button',{name:'Make video + AI voice — uses API balance',exact:true})).toBeEnabled();
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
  fireEvent.click(screen.getByRole('button',{name:'Save settings only'}));
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

test('saved media deletion requires confirmation and leaves other media available',async()=>{
 const picture={kind:'image' as const,status:'ready' as const,source:'upload' as const,url:'https://private.example/photo',stale:false,updatedAt:'2026-10-04'};
 mocked.list.mockResolvedValue([picture]);mocked.remove.mockResolvedValue([]);(campaignApi.list as jest.Mock).mockResolvedValue([campaign]);
 const confirm=jest.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
 render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()}/>);await screen.findByAltText('Your saved campaign picture');
 fireEvent.click(screen.getByRole('button',{name:'Delete saved image'}));expect(mocked.remove).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Delete saved image'}));await waitFor(()=>expect(mocked.remove).toHaveBeenCalledWith(campaign,'image'));await waitFor(()=>expect(screen.queryByAltText('Your saved campaign picture')).not.toBeInTheDocument());confirm.mockRestore();
});

test('one explicit video action saves choices, makes missing narration, then replaces the old preview', async () => {
  const old={kind:'video' as const,status:'ready' as const,source:'render' as const,url:'https://private.example/old.mp4',stale:true,updatedAt:'2026-10-04'};
  const saved={...campaign,narration:'saved' as const,music:'upbeat' as const,version:'v2'};
  const voice={kind:'voice' as const,status:'ready' as const,source:'ai' as const,url:'https://private.example/voice.mp3',stale:false,updatedAt:'2026-10-05'};
  mocked.list.mockResolvedValue([old]);
  (campaignApi.settings as jest.Mock).mockResolvedValue(saved);
  (campaignApi.list as jest.Mock).mockResolvedValue([saved]);
  mocked.audio.mockResolvedValue([old,voice]);
  mocked.video.mockResolvedValue([{...old,url:'https://private.example/new.mp4',stale:false},voice]);
  render(<MarketingCampaignMedia campaign={campaign} dirty={false} onChange={jest.fn()}/>);
  await waitFor(()=>expect(screen.getByLabelText('Narration')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Narration'),{target:{value:'saved'}});
  fireEvent.change(screen.getByLabelText('Background music'),{target:{value:'upbeat'}});
  fireEvent.click(screen.getByRole('button',{name:'Save & make video + AI voice — uses API balance'}));
  await waitFor(()=>expect(mocked.video).toHaveBeenCalledWith(saved));
  expect(mocked.audio).toHaveBeenCalledWith(saved,{kind:'voice',ai:true});
  expect(screen.getByLabelText('Finished campaign video')).toHaveAttribute('src','https://private.example/new.mp4');
});

test('voice processing is polled before rendering, and the same paid voice is not requested twice',async()=>{
 const voiced={...campaign,narration:'saved' as const};
 const voice={kind:'voice' as const,status:'ready' as const,source:'ai' as const,stale:false,updatedAt:new Date().toISOString()};
 mocked.list.mockResolvedValueOnce([]).mockResolvedValue([voice]);
 mocked.audio.mockResolvedValue([{...voice,status:'processing'}]);
 (campaignApi.list as jest.Mock).mockResolvedValue([voiced]);
 render(<MarketingCampaignMedia campaign={voiced} dirty={false} onChange={jest.fn()}/>);
 const button=screen.getByRole('button',{name:'Make video + AI voice — uses API balance'});
 await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);
 await waitFor(()=>expect(mocked.audio).toHaveBeenCalledTimes(1));expect(mocked.video).not.toHaveBeenCalled();
 await waitFor(()=>expect(mocked.video).toHaveBeenCalledWith(voiced),{timeout:4500});
 expect(mocked.audio).toHaveBeenCalledTimes(1);
});

test('a failed voice stops the combined action without making a silent replacement',async()=>{
 mocked.audio.mockResolvedValue([{kind:'voice',status:'failed',source:'ai',stale:false,error:'Voice creation failed',updatedAt:new Date().toISOString()}]);
 render(<MarketingCampaignMedia campaign={{...campaign,narration:'saved'}} dirty={false} onChange={jest.fn()}/>);
 const button=screen.getByRole('button',{name:'Make video + AI voice — uses API balance'});await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);
 await screen.findAllByText('Voice creation failed');expect(mocked.video).not.toHaveBeenCalled();await waitFor(()=>expect(button).toBeEnabled());
});
