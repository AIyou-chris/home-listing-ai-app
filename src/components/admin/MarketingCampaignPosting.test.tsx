import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarketingCampaignPosting from './MarketingCampaignPosting';
import { authedFetch } from '../../services/authedFetch';
jest.mock('../../services/authedFetch', () => ({ authedFetch: jest.fn() }));
const api = authedFetch as jest.Mock;
const published = {id:'posted',channel:'linkedin',status:'published',scheduled_for:'2026-10-12',posted_at:'2026-10-12',url:'https://example.com/published',error:null};
const scheduled = {...published,id:'scheduled',channel:'facebook',status:'scheduled',url:null};
beforeEach(() => { jest.clearAllMocks(); api.mockImplementation(async (url, options) => ({ok:true,json:async()=>String(url).endsWith('/connections')?{connections:[]}:{posts:options?.method==='DELETE'?[published]:[published,scheduled]}})); });
test('unapproved edited campaigns retain published history and cancellation, with publication disabled',async()=>{
 render(<MarketingCampaignPosting campaignId="campaign" hasBlogPost canPublish={false}/>);
 expect(await screen.findByRole('link',{name:'See it'})).toHaveAttribute('href',published.url);
 expect(screen.getByRole('button',{name:'Post now'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Choose these'})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Manage blog posts'})).toHaveAttribute('href','/admin/blog');
});
test('cancelling a scheduled post asks first and keeps published history',async()=>{
 const confirm=jest.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
 render(<MarketingCampaignPosting campaignId="campaign" hasBlogPost canPublish={false}/>);await screen.findByRole('link',{name:'See it'});
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));expect(api).not.toHaveBeenCalledWith(expect.anything(),expect.objectContaining({method:'DELETE'}));
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Remove'})).not.toBeInTheDocument());expect(screen.getByRole('link',{name:'See it'})).toBeInTheDocument();confirm.mockRestore();
});

test('a scheduled post can be moved to a new time, and a waiting post warns when auto-posting is off',async()=>{
 api.mockImplementation(async (url) => ({ok:true,json:async()=>{
  const u=String(url);
  if(u.endsWith('/connections'))return {connections:[]};
  if(u.endsWith('/auto-post'))return {enabled:false};
  return {posts:[scheduled]};
 }}));
 render(<MarketingCampaignPosting campaignId="campaign" hasBlogPost canPublish/>);
 expect(await screen.findByText(/Auto-posting is OFF/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Turn auto-posting on'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Change time'}));
 const input=await screen.findByLabelText('New time for Facebook Page');
 fireEvent.change(input,{target:{value:'2099-01-02T09:30'}});
 fireEvent.click(screen.getByRole('button',{name:'Save time'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith(expect.stringContaining('/posts'),expect.objectContaining({method:'PUT'})));
});
