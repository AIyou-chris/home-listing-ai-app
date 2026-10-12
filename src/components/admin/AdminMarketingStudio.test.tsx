import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminMarketingStudio from './AdminMarketingStudio';
import { adminMarketingStudioService as api, type StudioCampaign } from '../../services/adminMarketingStudioService';
import { adminMarketingMediaService as mediaApi } from '../../services/adminMarketingMediaService';
import { loadStudioBriefs, saveStudioBriefs, type StudioBrief } from './marketingStudioDrafts';

jest.mock('../../services/adminMarketingMediaService', () => ({ adminMarketingMediaService: { imageCatalog: jest.fn().mockResolvedValue({ recipes: [], formats: { blog: {label: 'Blog hero',width:1536,height:1024} }, costs: { blog: {set:0.045,one:0.015,final:0.052} } }), imageResults: jest.fn().mockResolvedValue([]), imageLibrary: jest.fn().mockResolvedValue([]), imageOptions: jest.fn(), imageLayout: jest.fn(), chooseImage: jest.fn(), list: jest.fn().mockResolvedValue([]), capabilities: jest.fn().mockResolvedValue({ video: true, picture: true, aiPicture: true }), picture: jest.fn().mockResolvedValue([]), video: jest.fn().mockResolvedValue([]) } }));
jest.mock('../../admin-dashboard/Blog/BlogEditor', () => ({ __esModule: true, default: () => <p>Existing blog management</p> }));
jest.mock('./MarketingCampaignPosting', () => ({ __esModule: true, default: () => <p>Publishing history</p> }));
jest.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: jest.fn() } }));
jest.mock('../../services/adminMarketingStudioService', () => ({ adminMarketingStudioService: { list: jest.fn(), save: jest.fn(), generate: jest.fn(), remove: jest.fn(), edit: jest.fn(), approve: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;
const owner = '11111111-1111-4111-8111-111111111111';
const localBrief: StudioBrief = { id: '22222222-2222-4222-8222-222222222222', kind: 'campaign', idea: 'New market idea', goal: 'Warm leads', tone: 'Helpful', audience: 'Loan officers', pictureMode: 'auto', pictureDescription: '', photoName: '', videoFormat: 'vertical', videoDuration: '30', plannedAt: '', createdAt: '2026-10-04T00:00:00.000Z' };
const saved: StudioCampaign = { ...localBrief, status: 'brief', outputs: {}, version: '2026-10-04T00:00:00.000Z' };
const outputs = { title:'New market', blog:'Blog draft', emailSubject:'An idea for your next partnership', email:'Email draft', linkedin:'LinkedIn draft', facebook:'Facebook draft', instagram:'Instagram draft', bluesky:'Bluesky draft', videoScript:'Video script', imagePrompt:'Picture prompt' };

beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  URL.createObjectURL = jest.fn(() => 'blob:photo'); URL.revokeObjectURL = jest.fn();
  (mediaApi.picture as jest.Mock).mockResolvedValue([]);
  (mediaApi.list as jest.Mock).mockResolvedValue([]);
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => '33333333-3333-4333-8333-333333333333' });
  mocked.list.mockResolvedValue([]);
  mocked.save.mockImplementation(async brief => ({ ...brief, status: 'brief', outputs: {}, version: '2026-10-04T00:00:00.001Z' }));
  mocked.generate.mockResolvedValue({ ...saved, status:'draft', outputs });
});
async function ready() { await waitFor(() => expect(screen.getByRole('button', { name:'Create campaign', exact:true })).toBeEnabled()); }

test('saves a brief before generating, then opens editable draft review', async () => {
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  fireEvent.change(screen.getByLabelText('Campaign idea'), { target:{value:'A new tool for this new market'} });
  fireEvent.click(screen.getByRole('button',{name:'Create campaign',exact:true}));
  await screen.findByLabelText('Blog article');
  expect(mocked.save).toHaveBeenCalledWith(expect.objectContaining({ idea:'A new tool for this new market' }), undefined);
  expect(mocked.generate).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
  expect(mocked.save.mock.invocationCallOrder[0]).toBeLessThan(mocked.generate.mock.invocationCallOrder[0]);
  expect(screen.getByLabelText('Bluesky')).toHaveValue('Bluesky draft');
  expect(screen.getByText(/Approval does not publish/)).toBeInTheDocument();
});
test('save failure leaves the idea visible and never makes a paid generation call',async()=>{
  mocked.save.mockRejectedValue(new Error('Storage offline'));
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  fireEvent.change(screen.getByLabelText('Campaign idea'),{target:{value:'Keep my idea'}});
  fireEvent.click(screen.getByRole('button',{name:'Create campaign',exact:true}));
  await screen.findByText('Storage offline');
  expect(screen.getByLabelText('Campaign idea')).toHaveValue('Keep my idea');
  expect(mocked.generate).not.toHaveBeenCalled();
});
test('generation failure retains the account-saved brief and provides a retry',async()=>{
  mocked.generate.mockRejectedValue(new Error('AI unavailable'));
  mocked.list.mockResolvedValueOnce([]).mockResolvedValue([saved]);
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  fireEvent.change(screen.getByLabelText('Campaign idea'),{target:{value:'New market idea'}});
  fireEvent.click(screen.getByRole('button',{name:'Create campaign',exact:true}));
  await screen.findByText('AI unavailable');
  fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
  expect(screen.getByRole('button',{name:'Create campaign draft'})).toBeEnabled();
});
test('copies old browser briefs only on request and keeps originals after copying',async()=>{
  saveStudioBriefs(owner,[localBrief]);
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  expect(mocked.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Copy browser briefs to my account'}));
  await screen.findByText(/Copied 1 browser briefs/);
  expect(loadStudioBriefs(owner)).toEqual([localBrief]);
  expect(mocked.save).toHaveBeenCalledWith(localBrief);
});
test('load errors can retry and do not pretend the account has no campaigns',async()=>{
  mocked.list.mockRejectedValueOnce(new Error('Could not load campaigns')).mockResolvedValue([]);
  render(<AdminMarketingStudio ownerId={owner} />);
  await screen.findByText('Could not load campaigns');
  expect(screen.getByRole('button',{name:'Create campaign',exact:true})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));await ready();
  expect(mocked.list).toHaveBeenCalledTimes(2);
});
test('keyboard tabs and planning calendar remain usable',async()=>{
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  fireEvent.keyDown(screen.getByRole('tab',{name:'Create'}),{key:'ArrowRight'});
  expect(screen.getByRole('tab',{name:'My campaigns'})).toHaveFocus();
  fireEvent.click(screen.getByRole('tab',{name:'Calendar'}));
  expect(screen.getByText(/Nothing on this calendar will publish automatically/)).toBeInTheDocument();
});
test('editing generated content prevents approval until edits save',async()=>{
  const draft={...saved,status:'draft' as const, outputs};mocked.list.mockResolvedValue([draft]);
  mocked.edit.mockResolvedValue({...draft,outputs:{...outputs,facebook:'Corrected text'},version:'2026-10-04T00:00:00.001Z'});
  render(<AdminMarketingStudio ownerId={owner} />);await ready();
  fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));
  fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
  fireEvent.change(screen.getByLabelText('Facebook Page'),{target:{value:'Corrected text'}});
  expect(screen.getByRole('button',{name:'Approve campaign'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Save edits'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Approve campaign'})).toBeEnabled());
  expect(mocked.edit).toHaveBeenCalledWith(draft,expect.objectContaining({facebook:'Corrected text'}));
});

test('Create resets every brief field while Resume Draft restores saved data without a write',async()=>{
 const custom={...saved,goal:'Get more calls',tone:'Friendly and simple',audience:'Agents only',pictureMode:'describe' as const,pictureDescription:'Old picture',videoFormat:'landscape' as const,videoDuration:'60' as const};
 mocked.list.mockResolvedValue([custom]);render(<AdminMarketingStudio ownerId={owner}/>);await ready();
 fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
 fireEvent.click(screen.getByRole('button',{name:'Resume Draft'}));expect(screen.getByLabelText('Campaign idea')).toHaveValue(custom.idea);
 fireEvent.click(screen.getByRole('tab',{name:'Create',exact:true}));
 expect(screen.getByLabelText('Campaign idea')).toHaveValue('');expect(screen.getByLabelText('Goal')).toHaveValue('Build agent partnerships');
 expect(screen.getByLabelText('Tone')).toHaveValue('Helpful and confident');expect(screen.getByLabelText('Who should this reach?')).toHaveValue('Loan officers and real estate agents');
 expect(screen.queryByLabelText('Describe your picture')).not.toBeInTheDocument();expect(mocked.save).not.toHaveBeenCalled();expect(mocked.remove).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:'Resume Draft'}));
 expect(screen.getByLabelText('Campaign idea')).toHaveValue(custom.idea);
});
test('confirmed campaign deletion removes the row; cancelled deletion and failed deletion keep it',async()=>{
 mocked.list.mockResolvedValue([saved]);mocked.remove.mockRejectedValueOnce(new Error('Delete unavailable')).mockResolvedValueOnce(undefined);
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
 (window.confirm as jest.Mock).mockReturnValueOnce(false);fireEvent.click(screen.getByRole('button',{name:'Delete saved campaign'}));expect(mocked.remove).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Delete saved campaign'}));await screen.findByText('Delete unavailable');expect(screen.getByRole('button',{name:'Resume Draft'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Delete saved campaign'}));await screen.findByText('Saved campaign and draft assets deleted.');expect(screen.queryByRole('button',{name:'Resume Draft'})).not.toBeInTheDocument();
});
test('campaign header uses a short title and puts the complete original prompt in a closed disclosure',async()=>{
 const long={...saved,idea:'Old raw prompt '.repeat(100),status:'draft' as const,outputs};mocked.list.mockResolvedValue([long]);
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
 expect(screen.getByRole('heading',{name:'New market',level:4})).toBeInTheDocument();expect(screen.getByText('View brief').closest('details')).not.toHaveAttribute('open');
 expect(screen.getByText(/Idea: Old raw prompt/)).toHaveTextContent(long.idea.trim());
});
test('Content Library opens blog management and existing campaign assets',async()=>{
 mocked.list.mockResolvedValue([{...saved,status:'draft',outputs}]);render(<AdminMarketingStudio ownerId={owner}/>);await ready();
 fireEvent.click(screen.getByRole('tab',{name:'Content Library'}));await screen.findByText('Existing blog management');
 fireEvent.click(screen.getByRole('button',{name:'Campaign content'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));expect(screen.getByLabelText('Blog article')).toHaveValue(outputs.blog);
});
test('selected photo is uploaded after brief save and before generation',async()=>{
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.change(screen.getByLabelText('Campaign idea'),{target:{value:'Campaign with my photo'}});
 fireEvent.click(screen.getByRole('button',{name:'Use my own photo'}));fireEvent.change(screen.getByLabelText('Choose a photo'),{target:{files:[new File(['photo'],'home.png',{type:'image/png'})]}});
 fireEvent.click(screen.getByRole('button',{name:'Create campaign',exact:true}));await waitFor(()=>expect(mocked.generate).toHaveBeenCalled());
 expect(mediaApi.picture).toHaveBeenCalledWith(expect.objectContaining({photoName:'home.png'}),{data:'data:image/png;base64,cGhvdG8='});
 expect(mocked.save.mock.invocationCallOrder[0]).toBeLessThan((mediaApi.picture as jest.Mock).mock.invocationCallOrder[0]);
 expect((mediaApi.picture as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(mocked.generate.mock.invocationCallOrder[0]);
});
test('failed photo upload preserves the selected brief and photo for retry, with no generation charge',async()=>{
 (mediaApi.picture as jest.Mock).mockRejectedValueOnce(new Error('Photo storage offline')).mockResolvedValue([]);
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.change(screen.getByLabelText('Campaign idea'),{target:{value:'Keep my photo'}});
 fireEvent.click(screen.getByRole('button',{name:'Use my own photo'}));fireEvent.change(screen.getByLabelText('Choose a photo'),{target:{files:[new File(['photo'],'home.png',{type:'image/png'})]}});
 fireEvent.click(screen.getByRole('button',{name:'Create campaign',exact:true}));await screen.findByText('Photo storage offline');
 expect(screen.getByLabelText('Campaign idea')).toHaveValue('Keep my photo');expect(mocked.generate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Save brief only'}));await screen.findByText('Brief saved to your account. Nothing has been published.');
 expect(mocked.save.mock.calls[1][0].id).toBe(mocked.save.mock.calls[0][0].id);expect(mocked.generate).not.toHaveBeenCalled();
});
test('individual content draft deletion requires confirmation and preserves other fields',async()=>{
 const draft={...saved,status:'draft' as const,outputs};mocked.list.mockResolvedValue([draft]);mocked.edit.mockResolvedValue({...draft,outputs:{...outputs,facebook:''},version:'new'});
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
 (window.confirm as jest.Mock).mockReturnValueOnce(false);fireEvent.click(screen.getByRole('button',{name:'Delete Facebook Page draft'}));expect(mocked.edit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Delete Facebook Page draft'}));await waitFor(()=>expect(screen.getByLabelText('Facebook Page')).toHaveValue(''));
 expect(screen.getByLabelText('Blog article')).toHaveValue(outputs.blog);
});

test('Resume Draft restores an account-saved photo and Create clears it without deleting saved media',async()=>{
 const photoDraft={...saved,pictureMode:'own' as const,photoName:'saved-home.png'};mocked.list.mockResolvedValue([photoDraft]);
 (mediaApi.list as jest.Mock).mockResolvedValue([{kind:'image',status:'ready',source:'upload',url:'https://private.example/home.png'}]);
 render(<AdminMarketingStudio ownerId={owner}/>);await ready();fireEvent.click(screen.getByRole('tab',{name:'My campaigns'}));fireEvent.click(screen.getByRole('button',{name:/New market.*Campaign/}));
 fireEvent.click(screen.getByRole('button',{name:'Resume Draft'}));expect(await screen.findByAltText('Your selected campaign photo')).toHaveAttribute('src','https://private.example/home.png');
 fireEvent.click(screen.getByRole('tab',{name:'Create',exact:true}));expect(screen.queryByAltText('Your selected campaign photo')).not.toBeInTheDocument();expect(screen.queryByText('saved-home.png')).not.toBeInTheDocument();expect(mocked.remove).not.toHaveBeenCalled();
});
