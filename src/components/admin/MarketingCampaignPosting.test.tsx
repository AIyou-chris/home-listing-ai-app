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
