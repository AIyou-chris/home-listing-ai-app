import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminMarketingStudio from './AdminMarketingStudio';
import { adminMarketingStudioService as api, type StudioCampaign } from '../../services/adminMarketingStudioService';
import { loadStudioBriefs, saveStudioBriefs, type StudioBrief } from './marketingStudioDrafts';

jest.mock('../../services/adminMarketingMediaService', () => ({ adminMarketingMediaService: { imageCatalog: jest.fn().mockResolvedValue({ recipes: [], formats: { blog: {label: 'Blog hero',width:1536,height:1024} }, costs: { blog: {set:0.045,one:0.015,final:0.052} } }), imageResults: jest.fn().mockResolvedValue([]), imageLibrary: jest.fn().mockResolvedValue([]), imageOptions: jest.fn(), imageLayout: jest.fn(), chooseImage: jest.fn(), list: jest.fn().mockResolvedValue([]), capabilities: jest.fn().mockResolvedValue({ video: true, picture: true, aiPicture: true }), picture: jest.fn().mockResolvedValue([]), video: jest.fn().mockResolvedValue([]) } }));
jest.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: jest.fn() } }));
jest.mock('../../services/adminMarketingStudioService', () => ({ adminMarketingStudioService: { list: jest.fn(), save: jest.fn(), generate: jest.fn(), remove: jest.fn(), edit: jest.fn(), approve: jest.fn() } }));
const mocked = api as jest.Mocked<typeof api>;
const owner = '11111111-1111-4111-8111-111111111111';
const localBrief: StudioBrief = { id: '22222222-2222-4222-8222-222222222222', kind: 'campaign', idea: 'New market idea', goal: 'Warm leads', tone: 'Helpful', audience: 'Loan officers', pictureMode: 'auto', pictureDescription: '', photoName: '', videoFormat: 'vertical', videoDuration: '30', plannedAt: '', createdAt: '2026-10-04T00:00:00.000Z' };
const saved: StudioCampaign = { ...localBrief, status: 'brief', outputs: {}, version: '2026-10-04T00:00:00.000Z' };
const outputs = { title:'New market', blog:'Blog draft', emailSubject:'An idea for your next partnership', email:'Email draft', linkedin:'LinkedIn draft', facebook:'Facebook draft', instagram:'Instagram draft', bluesky:'Bluesky draft', videoScript:'Video script', imagePrompt:'Picture prompt' };

beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
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
  fireEvent.click(screen.getByRole('button',{name:/New market idea.*Campaign/}));
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
  fireEvent.click(screen.getByRole('button',{name:/New market idea.*Campaign/}));
  fireEvent.change(screen.getByLabelText('Facebook Page'),{target:{value:'Corrected text'}});
  expect(screen.getByRole('button',{name:'Approve campaign'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Save edits'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Approve campaign'})).toBeEnabled());
  expect(mocked.edit).toHaveBeenCalledWith(draft,expect.objectContaining({facebook:'Corrected text'}));
});
