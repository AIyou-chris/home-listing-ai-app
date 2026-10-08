import React, { useState } from 'react';
import MarketingCampaignMedia from './MarketingCampaignMedia';
import MarketingCampaignPosting from './MarketingCampaignPosting';
import { Copy } from 'lucide-react';
import { adminMarketingStudioService, type CampaignOutputs, type StudioCampaign } from '../../services/adminMarketingStudioService';

const FIELDS: { key: keyof CampaignOutputs; label: string; max: number }[] = [
  { key: 'title', label: 'Campaign title', max: 160 }, { key: 'blog', label: 'Blog article', max: 12000 },
  { key: 'emailSubject', label: 'Email subject', max: 180 }, { key: 'email', label: 'Sales email', max: 5000 },
  { key: 'linkedin', label: 'LinkedIn', max: 3000 }, { key: 'facebook', label: 'Facebook Page', max: 5000 },
  { key: 'instagram', label: 'Instagram caption', max: 2200 }, { key: 'bluesky', label: 'Bluesky', max: 300 },
  { key: 'videoScript', label: 'Video script — captions & narration', max: 4000 }, { key: 'imagePrompt', label: 'Picture direction — used for AI pictures', max: 1600 }
];
const button = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500';
export default function MarketingCampaignReview({ campaign, onChange }: { campaign: StudioCampaign; onChange: (campaign: StudioCampaign) => void }) {
  const [outputs, setOutputs] = useState(campaign.outputs as CampaignOutputs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(outputs) !== JSON.stringify(campaign.outputs);
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try { onChange(await adminMarketingStudioService.edit(campaign, outputs)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your edits.'); }
    finally { setBusy(false); }
  }
  async function approve() {
    setBusy(true); setError(''); setMessage('');
    try { onChange(await adminMarketingStudioService.approve(campaign)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not approve this draft.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-5 space-y-4">
    <p className="rounded-xl bg-primary-50 p-3 text-sm text-primary-800">{campaign.status === 'approved' ? 'Approved for future publishing. Nothing has been posted.' : 'Review the facts and edit the drafts below. Approval does not publish or send anything.'}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {!!campaign.quoteCards?.length && <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-900">Quote card lines</h3><p className="mt-1 text-sm text-slate-600">Three lines from your article, ready for a picture.</p>{campaign.quoteCards.slice(0, 3).map((quote, index) => <div key={index} className="mt-3 flex items-start justify-between gap-3"><p className="text-sm leading-6 text-slate-800">{quote}</p><button type="button" className={button} aria-label={`Copy quote ${index + 1}`} onClick={async () => { try { await navigator.clipboard.writeText(quote); setMessage('Quote copied.'); } catch { setError('Select the quote to copy it.'); } }}>Copy</button></div>)}</section>}
    <MarketingCampaignMedia campaign={campaign} dirty={dirty} onChange={onChange} />
    {campaign.status === 'approved' && !dirty && <MarketingCampaignPosting campaignId={campaign.id} plannedAt={campaign.plannedAt} hasBlogPost={Boolean(campaign.blogPostId)} />}
    {FIELDS.map(({ key, label, max }) => <div key={key}>
      <label htmlFor={`studio-output-${key}`} className="block text-sm font-semibold text-slate-800">{label}</label>
      <textarea id={`studio-output-${key}`} value={outputs[key] || ''} disabled={busy} rows={key === 'blog' ? 9 : key === 'title' || key === 'emailSubject' ? 2 : 4} onChange={event => setOutputs({ ...outputs, [key]: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      <div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className={[...(outputs[key] || '')].length > max ? 'text-red-700' : 'text-slate-500'}>{[...(outputs[key] || '')].length} / {max} characters</span><button type="button" aria-label={`Copy ${label}`} className={`${button} inline-flex items-center gap-1`} onClick={async () => { try { await navigator.clipboard.writeText(outputs[key] || ''); setMessage(`${label} copied.`); } catch { setError('Could not copy. Select the text and copy it instead.'); } }}><Copy size={14} />Copy</button></div>
    </div>)}
    <div className="sm:sticky sm:bottom-2 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <button type="button" disabled={busy || !dirty} onClick={save} className={button}>{busy ? 'Saving…' : 'Save edits'}</button>
      <button type="button" disabled={busy || dirty || campaign.status === 'approved'} onClick={approve} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500">{campaign.status === 'approved' ? 'Approved' : 'Approve campaign'}</button>
      {dirty && <p className="self-center text-xs text-slate-600">Save your edits before approving.</p>}
    </div>
  </div>;
}
