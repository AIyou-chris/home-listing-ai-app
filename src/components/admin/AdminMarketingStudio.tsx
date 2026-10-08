import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Film, Image as ImageIcon, Info, Megaphone, Plus, QrCode, Sparkles, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { briefAsText, loadStudioBriefs, type StudioBrief, type PictureMode } from './marketingStudioDrafts';

import { adminMarketingStudioService, type StudioCampaign } from '../../services/adminMarketingStudioService';
import MarketingCampaignReview from './MarketingCampaignReview';
import MarketingImageLibrary from './MarketingImageLibrary';
import ConnectedAccountsPanel from './ConnectedAccountsPanel';
import FbGroupsPanel from './FbGroupsPanel';

type Tab = 'create' | 'campaigns' | 'video' | 'calendar' | 'qr' | 'accounts' | 'images' | 'groups';
const TABS: { id: Tab; label: string }[] = [
  { id: 'create', label: 'Create' }, { id: 'campaigns', label: 'My campaigns' },
  { id: 'video', label: 'Make a Video' }, { id: 'calendar', label: 'Calendar' },
  { id: 'qr', label: 'QR Codes' }, { id: 'images', label: 'Picture library' }, { id: 'groups', label: 'Facebook Groups' }, { id: 'accounts', label: 'Connected accounts' },
];
const OUTPUTS = ['Blog article', 'Campaign picture', 'Sales email', 'LinkedIn', 'Facebook Page', 'Instagram Reel', 'Bluesky'];
const GOALS = ['Build agent partnerships', 'Get warm leads', 'Get more calls', 'Drive website visits', 'Promote an offer'];
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const cardClass = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AdminMarketingStudio({ ownerId }: { ownerId: string }) {
  const [tab, setTab] = useState<Tab>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('social') ? 'accounts' : 'create'));
  const [briefs, setBriefs] = useState<StudioCampaign[]>([]);
  const [localBriefs, setLocalBriefs] = useState<StudioBrief[]>([]);
  const [busy, setBusy] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [loadedOwner, setLoadedOwner] = useState('');
  const [storageError, setStorageError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [idea, setIdea] = useState('');
  const [goal, setGoal] = useState(GOALS[0]);
  const [tone, setTone] = useState('Helpful and confident');
  const [audience, setAudience] = useState('Loan officers and real estate agents');
  const [pictureMode, setPictureMode] = useState<PictureMode>('auto');
  const [pictureDescription, setPictureDescription] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [videoFormat, setVideoFormat] = useState<StudioBrief['videoFormat']>('vertical');
  const [videoDuration, setVideoDuration] = useState<StudioBrief['videoDuration']>('30');
  const [plannedAt, setPlannedAt] = useState('');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [qrUrl, setQrUrl] = useState('https://homelistingai.com/for-loan-officers');
  const [qrImage, setQrImage] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});
  const qrRequest = useRef(0);

  useEffect(() => {
    let active = true;
    setBriefs([]); setLoadedOwner(''); setSelectedId(''); setStorageError('');
    if (!ownerId) return;
    try { setLocalBriefs(loadStudioBriefs(ownerId)); } catch { /* Keep legacy browser data untouched. */ }
    adminMarketingStudioService.list().then(rows => {
      if (active) { setBriefs(rows); setLoadedOwner(ownerId); }
    }).catch(cause => { if (active) setStorageError(cause instanceof Error ? cause.message : 'Could not load your campaigns.'); });
    return () => { active = false; };
  }, [ownerId, reloadCount]);

  useEffect(() => {
    if (!briefs.some(brief => brief.status === 'generating')) return;
    let active = true;
    const timer = window.setInterval(() => {
      adminMarketingStudioService.list().then(rows => { if (active) setBriefs(rows); }).catch(() => { /* Keep last saved rows visible; reload remains available. */ });
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [briefs]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const selected = briefs.find(brief => brief.id === selectedId);
  const stuckGenerating = selected?.status === 'generating' && Date.now() - Date.parse(selected.version) >= 120000;
  const canSave = Boolean(ownerId && loadedOwner === ownerId && !storageError && !busy);

  function changeTab(next: Tab) {
    setTab(next);
    setMessage('');
    setError('');
  }

  function replaceCampaign(campaign: StudioCampaign) {
    setBriefs(rows => [campaign, ...rows.filter(row => row.id !== campaign.id)]);
  }

  async function saveBrief(event: React.FormEvent, kind: StudioBrief['kind'], generate = false) {
    event.preventDefault(); setError(''); setMessage('');
    if (!canSave) { setError('Wait for your account to load before saving.'); return; }
    if (!idea.trim()) { setError('Describe what you want to promote first.'); return; }
    if (pictureMode === 'describe' && !pictureDescription.trim()) { setError('Describe the picture, or let the AI decide.'); return; }
    if (pictureMode === 'own' && !photoName) { setError('Choose a photo, or let the AI decide.'); return; }
    const previous = briefs.find(brief => brief.id === editingId && brief.kind === kind);
    const brief: StudioBrief = {
      id: previous?.id || crypto.randomUUID(), kind, idea: idea.trim(), goal, tone: tone.trim(), audience: audience.trim(),
      pictureMode, pictureDescription: pictureMode === 'describe' ? pictureDescription.trim() : '', photoName: pictureMode === 'own' ? photoName : '',
      videoFormat, videoDuration, plannedAt, createdAt: previous?.createdAt || new Date().toISOString()
    };
    setBusy(true);
    try {
      const saved = await adminMarketingStudioService.save(brief, previous?.version);
      replaceCampaign(saved); setSelectedId(saved.id); setEditingId(saved.id); setTab('campaigns');
      setMessage('Brief saved to your account. Nothing has been published.');
      if (generate) await generateCampaign(saved);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this brief.'); }
    finally { setBusy(false); }
  }

  async function generateCampaign(campaign: StudioCampaign) {
    setBusy(true); setError(''); setMessage('Creating your campaign from Business Brain…');
    try {
      const generated = await adminMarketingStudioService.generate(campaign.id);
      replaceCampaign(generated); setSelectedId(generated.id); setTab('campaigns');
      setMessage('Your campaign draft is saved. Review and edit it below. Nothing has been published.');
    } catch (cause) {
      setMessage(''); setError(cause instanceof Error ? cause.message : 'Could not create this campaign.');
      try { setBriefs(await adminMarketingStudioService.list()); } catch { /* Preserve known saved brief. */ }
    } finally { setBusy(false); }
  }

  async function importLocalBriefs() {
    setBusy(true); setError('');
    try {
      // Copy only: browser originals are never removed, including on a partial failure.
      let copied = 0;
      for (const brief of localBriefs) {
        if (briefs.some(row => row.id === brief.id)) continue;
        const saved = await adminMarketingStudioService.save(brief);
        replaceCampaign(saved); copied++;
      }
      setLocalBriefs([]); setMessage(`Copied ${copied} browser briefs to your account. Originals remain in this browser.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy all briefs.');
      try { setBriefs(await adminMarketingStudioService.list()); } catch { /* Keep copied rows. */ }
    } finally { setBusy(false); }
  }

  async function removeCampaign(campaign: StudioCampaign) {
    if (!window.confirm('Remove this campaign from your account?')) return;
    setBusy(true); setError('');
    try {
      await adminMarketingStudioService.remove(campaign);
      setBriefs(rows => rows.filter(row => row.id !== campaign.id)); setSelectedId('');
      if (editingId === campaign.id) setEditingId(''); setMessage('Campaign removed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove this campaign.'); }
    finally { setBusy(false); }
  }

  function editBrief(brief: StudioBrief) {
    setIdea(brief.idea); setGoal(brief.goal); setTone(brief.tone); setAudience(brief.audience);
    setPictureMode(brief.pictureMode); setPictureDescription(brief.pictureDescription); setPhotoName(brief.photoName);
    setPhotoPreview(''); setVideoFormat(brief.videoFormat); setVideoDuration(brief.videoDuration); setPlannedAt(brief.plannedAt);
    setEditingId(brief.id); changeTab(brief.kind === 'video' ? 'video' : 'create');
  }

  function newBrief() {
    setEditingId(''); setIdea(''); setPlannedAt(''); setPhotoName(''); setPhotoPreview('');
    setPictureMode('auto'); setPictureDescription(''); changeTab('create');
  }

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP photo smaller than 8 MB.'); return;
    }
    setError(''); setPhotoName(file.name); setPhotoPreview(URL.createObjectURL(file));
  }

  async function createQr(event: React.FormEvent) {
    event.preventDefault();
    const request = ++qrRequest.current;
    setError(''); setQrImage('');
    try {
      const url = new URL(qrUrl.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use a website link starting with https://.');
      setQrBusy(true);
      const image = await QRCode.toDataURL(url.href, { width: 600, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
      if (request === qrRequest.current) setQrImage(image);
    } catch {
      if (request === qrRequest.current) setError('Could not make a QR code. Use a complete website link, such as https://homelistingai.com.');
    } finally {
      if (request === qrRequest.current) setQrBusy(false);
    }
  }

  function changeQrUrl(value: string) {
    qrRequest.current += 1; setQrUrl(value); setQrImage(''); setQrBusy(false);
  }

  const form = (kind: StudioBrief['kind']) => (
    <form onSubmit={event => saveBrief(event, kind, true)} className={cardClass}>
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white">1</span>{kind === 'video' ? 'Describe your video' : 'Describe it'}</p>
      <h3 className="text-lg font-bold text-slate-900">{kind === 'video' ? 'What should your video show?' : 'What do you want to promote?'}</h3>
      <p className="mt-1 text-sm text-slate-500">{kind === 'video' ? 'Start with a topic, listing photos, or an app walkthrough.' : 'An offer, service, event, helpful tip, or new listing.'}</p>
      <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="studio-idea">{kind === 'video' ? 'Video idea' : 'Campaign idea'}</label>
      <textarea id="studio-idea" value={idea} onChange={event => setIdea(event.target.value)} required maxLength={4000} rows={4} className={`${inputClass} mt-2 resize-y`} placeholder="Example: Show loan officers how a WOW Link helps them build agent partnerships." />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-800">Goal<select value={goal} onChange={event => setGoal(event.target.value)} className={`${inputClass} mt-2`}>{GOALS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-800">Tone<select value={tone} onChange={event => setTone(event.target.value)} className={`${inputClass} mt-2`}>{['Helpful and confident', 'Friendly and simple', 'Professional and direct'].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-800">Who should this reach?<input value={audience} onChange={event => setAudience(event.target.value)} required maxLength={200} className={`${inputClass} mt-2`} /></label>
      {kind === 'video' && <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">Format<select value={videoFormat} onChange={event => setVideoFormat(event.target.value as StudioBrief['videoFormat'])} className={`${inputClass} mt-2`}><option value="vertical">Vertical — Reels and Shorts</option><option value="landscape">Landscape — website and YouTube</option></select></label>
        <label className="text-sm font-semibold text-slate-800">Length<select value={videoDuration} onChange={event => setVideoDuration(event.target.value as StudioBrief['videoDuration'])} className={`${inputClass} mt-2`}>{['15', '30', '60'].map(value => <option key={value} value={value}>{value} seconds</option>)}</select></label>
      </div>}
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-slate-800">Picture</legend>
        <p className="mt-1 text-xs text-slate-500">Choose the picture direction for your campaign.</p>
        <div className="mt-2 flex flex-wrap gap-2">{([{ id: 'auto', label: 'Let the AI decide' }, { id: 'describe', label: 'Describe the picture' }, { id: 'own', label: 'Use my own photo' }] as const).map(option => <button key={option.id} type="button" aria-pressed={pictureMode === option.id} onClick={() => setPictureMode(option.id)} className={`${buttonClass} rounded-full text-xs ${pictureMode === option.id ? 'border-primary-500 bg-primary-50 text-primary-700' : ''}`}>{option.label}</button>)}</div>
        {pictureMode === 'auto' && <p className="mt-2 text-xs text-slate-500">The AI writes a picture direction. Create or upload the picture in your saved campaign.</p>}
        {pictureMode === 'describe' && <label className="mt-3 block text-sm text-slate-700">Describe your picture<textarea value={pictureDescription} onChange={event => setPictureDescription(event.target.value)} maxLength={1500} required rows={2} className={`${inputClass} mt-2`} placeholder="A loan officer showing an agent a listing on a phone…" /></label>}
        {pictureMode === 'own' && <div className="mt-3"><label className="block text-sm text-slate-700">Choose a photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { choosePhoto(event.target.files?.[0]); event.target.value = ''; }} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-primary-700" /></label>{photoPreview && <img src={photoPreview} alt="Your selected campaign photo" className="mt-3 max-h-40 rounded-xl object-contain" />}{photoName && <p className="mt-2 break-all text-xs text-slate-600">{photoName}</p>}<p className="mt-2 text-xs text-slate-500">This is a preview for your brief. Upload this photo in your saved campaign to keep it in your account and use it in videos.</p></div>}
      </fieldset>
      <button type="submit" disabled={!canSave} className={`${primaryClass} mt-5 w-full`}><Sparkles size={16} />{busy ? 'Creating…' : kind === 'video' ? 'Create video script' : 'Create campaign'}</button>
      <button type="button" disabled={!canSave} className={`${buttonClass} mt-2 w-full`} onClick={event => saveBrief(event, kind)}>Save brief only</button>
      {editingId && <p className="mt-2 text-xs text-slate-600">Saving a changed brief replaces its generated drafts and clears approval.</p>}
      <p className="mt-2 text-center text-xs text-slate-500">Create drafts, then preview pictures and finished videos in My campaigns. Social accounts come last.</p>
    </form>
  );

  return <section aria-labelledby="marketing-studio-title" className={`${cardClass} marketing-studio`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="marketing-studio-title" className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Sparkles size={23} className="text-primary-600" />Marketing Studio</h2><p className="mt-1 text-sm text-slate-500">Create campaigns, preview pictures and videos, and plan your content.</p></div>
      <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700">Stage 4 · Voice, music & video</span>
    </div>
    <div role="tablist" aria-label="Marketing Studio" className="mt-5 flex max-w-full gap-5 overflow-x-auto border-b border-slate-200 sm:gap-7">
      {TABS.map(({ id, label }, index) => <button key={id} ref={node => { tabRefs.current[id] = node; }} type="button" role="tab" id={`studio-tab-${id}`} aria-selected={tab === id} aria-controls={`studio-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => changeTab(id)} onKeyDown={event => {
        let target: number;
        if (event.key === 'ArrowRight') target = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') target = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = TABS.length - 1;
        else return;
        event.preventDefault(); changeTab(TABS[target].id); tabRefs.current[TABS[target].id]?.focus();
      }} className={`min-h-11 shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${tab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{label}</button>)}
    </div>
    {ownerId && loadedOwner !== ownerId && !storageError && <p role="status" className="mt-4 text-sm text-slate-600">Loading your saved campaigns…</p>}
    {storageError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{storageError}<button type="button" className={`${buttonClass} ml-3`} onClick={() => setReloadCount(value => value + 1)}>Try again</button></p>}
    {localBriefs.some(brief => !briefs.some(row => row.id === brief.id)) && <div className="mt-4 rounded-xl bg-primary-50 p-3 text-sm text-primary-800">You have briefs from stage one saved in this browser.<button type="button" disabled={!canSave} onClick={importLocalBriefs} className={`${buttonClass} ml-3`}>Copy browser briefs to my account</button></div>}
    {busy && <p role="status" className="mt-3 text-sm text-primary-700">Working… Keep this page open until the saved result appears.</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div role="tabpanel" id={`studio-panel-${tab}`} aria-labelledby={`studio-tab-${tab}`} className="mt-4 focus:outline-none" tabIndex={0}>
      {tab === 'images' && <MarketingImageLibrary />}
      {(tab === 'create' || tab === 'video') && <div className="grid items-start gap-4 xl:grid-cols-2">
        {form(tab === 'video' ? 'video' : 'campaign')}
        <div className={cardClass}>
          <h3 className="text-lg font-bold text-slate-900">{tab === 'video' ? 'Your idea becomes a video' : 'One idea becomes a complete campaign'}</h3>
          <p className="mt-1 text-sm text-slate-500">{tab === 'video' ? 'Create a script here. Video rendering comes next.' : 'Written from your saved Business Brain. Review every draft.'}</p>
          <div className="mt-5 divide-y divide-slate-200">{(tab === 'video' ? ['Script and captions', 'Your photos or app screenshots', 'Vertical or landscape video', 'Ready to review before posting'] : OUTPUTS).map(label => <div key={label} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-900">{label.includes('picture') || label.includes('photos') ? <ImageIcon size={17} className="shrink-0 text-primary-600" /> : tab === 'video' ? <Film size={17} className="shrink-0 text-primary-600" /> : <Megaphone size={17} className="shrink-0 text-primary-600" />}{label}</span><span className="shrink-0 text-xs text-slate-500">{label === 'Campaign picture' ? 'Preview & download' : tab === 'video' && !label.includes('Script') ? 'Preview & download' : 'Text draft'}</span></div>)}</div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-sm text-primary-800"><Info size={17} className="mt-0.5 shrink-0" />Review your campaign before publishing.</p>
          <fieldset className="mt-4 border-t border-slate-200 pt-4"><legend className="sr-only">Posting mode</legend><div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"><span className="font-semibold text-slate-900">Posting mode</span><label className="flex items-center gap-2"><input type="radio" name="studio-posting-mode" checked readOnly className="h-4 w-4 accent-blue-600" />Manual</label><label className="flex items-center gap-2 text-slate-400"><input type="radio" name="studio-posting-mode" disabled className="h-4 w-4" />Daily automatic</label></div><p className="mt-2 text-xs text-slate-500">Daily posting unlocks when account connections and scheduling are ready.</p></fieldset>
        </div>
      </div>}
      {tab === 'campaigns' && <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">My campaigns</h3><p className="mt-1 text-sm text-slate-500">Campaigns saved to your account. Review before approving.</p></div><button type="button" onClick={newBrief} className={buttonClass}><Plus size={16} />New campaign</button></div>
        {!briefs.length ? <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center"><Megaphone size={28} className="mx-auto text-primary-600" /><h4 className="mt-3 font-bold text-slate-900">Your first campaign starts with an idea</h4><p className="mt-1 text-sm text-slate-500">Create a campaign or save a brief, then return here to review or edit it.</p><button type="button" onClick={newBrief} className={`${primaryClass} mt-4`}>Create a brief</button></div> : <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="max-h-[520px] space-y-2 overflow-y-auto">{briefs.map(brief => <button type="button" key={brief.id} onClick={() => setSelectedId(brief.id)} aria-pressed={selected?.id === brief.id} className={`w-full rounded-xl border p-4 text-left ${selected?.id === brief.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="line-clamp-2 break-words text-sm font-semibold text-slate-900">{brief.idea}</span><span className="mt-2 block text-xs text-slate-500">{brief.kind === 'video' ? 'Video' : 'Campaign'} · {brief.status} · {new Date(brief.createdAt).toLocaleDateString()}</span></button>)}</div>
          <div className={cardClass}>{selected ? <><h4 className="break-words text-lg font-bold text-slate-900">{selected.idea}</h4><p className="mt-1 text-sm text-slate-500">{selected.status === 'brief' ? 'Brief only — not generated or scheduled.' : selected.status === 'generating' ? 'Creating your draft…' : selected.status === 'failed' ? selected.generationError : 'Saved to your account. Nothing has been published.'}</p><pre className="mt-5 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">{briefAsText(selected)}</pre><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={busy || (selected.status === 'generating' && !stuckGenerating)} onClick={() => editBrief(selected)} className={buttonClass}>Edit brief</button><button type="button" className={buttonClass} onClick={async () => { try { await navigator.clipboard.writeText(briefAsText(selected)); setMessage('Brief copied.'); } catch { setError('Could not copy. Select the brief text and copy it instead.'); } }}><Copy size={16} />Copy</button><button type="button" className={buttonClass} disabled={busy || (selected.status === 'generating' && !stuckGenerating)} onClick={() => removeCampaign(selected)}><Trash2 size={16} />Remove</button></div>{(['brief', 'failed'].includes(selected.status) || stuckGenerating) && <button type="button" disabled={busy} className={`${primaryClass} mt-4`} onClick={() => generateCampaign(selected)}>{busy ? 'Creating…' : stuckGenerating ? 'Retry interrupted creation' : 'Create campaign draft'}</button>}{['draft', 'approved'].includes(selected.status) && <MarketingCampaignReview key={`${selected.id}:${selected.version}`} campaign={selected} onChange={replaceCampaign} />}</> : <p className="text-sm text-slate-500">Choose a brief to review it.</p>}</div>
        </div>}
      </>}
      {tab === 'calendar' && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Content calendar</h3><p className="mt-1 text-sm text-slate-500">Planning dates only. Nothing on this calendar will publish automatically.</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Previous month" className={buttonClass} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><span className="min-w-36 text-center text-sm font-semibold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span><button type="button" aria-label="Next month" className={buttonClass} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div></div>
        <div className="mt-5 hidden overflow-hidden rounded-xl border border-slate-200 sm:block"><div className="grid grid-cols-7 bg-slate-50">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="p-3 text-center text-xs font-semibold text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7 }, (_, index) => { const day = index - month.getDay() + 1; const valid = day > 0 && day <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); const date = dateKey(new Date(month.getFullYear(), month.getMonth(), day)); return <div key={index} className={`min-h-24 min-w-0 border-b border-r border-slate-100 p-2 ${valid ? 'bg-white' : 'bg-slate-50'}`}>{valid && <><span className={`flex h-6 w-6 items-center justify-center text-xs ${date === dateKey(new Date()) ? 'rounded-full bg-primary-600 font-bold text-white' : 'text-slate-500'}`}>{day}</span>{briefs.filter(brief => brief.plannedAt.startsWith(date)).map(brief => <button key={brief.id} type="button" onClick={() => { setSelectedId(brief.id); changeTab('campaigns'); }} className="mt-1 w-full truncate rounded bg-primary-50 p-1 text-left text-xs text-primary-800" title={brief.idea}>{brief.idea}</button>)}</>}</div>; })}</div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="block text-sm font-semibold text-slate-800">Plan a date for your current brief<input type="datetime-local" value={plannedAt} onChange={event => setPlannedAt(event.target.value)} className={`${inputClass} mt-2`} /><span className="mt-2 block text-xs font-normal text-slate-500">Uses your browser’s local time. Save the brief to keep this date.</span></label><div><p className="text-sm text-slate-600">{idea.trim() ? idea : 'Start a campaign or open a saved brief to assign a planning date.'}</p><button type="button" className={`${buttonClass} mt-3`} onClick={() => changeTab(briefs.find(brief => brief.id === editingId)?.kind === 'video' ? 'video' : 'create')}>Return to brief</button></div></div>
        <div className="mt-5 sm:hidden"><h4 className="font-semibold text-slate-900">Planned this month</h4>{briefs.filter(brief => brief.plannedAt.startsWith(dateKey(month).slice(0, 7))).map(brief => <button type="button" key={brief.id} className={`${buttonClass} mt-2 w-full justify-start text-left`} onClick={() => { setSelectedId(brief.id); changeTab('campaigns'); }}><CalendarDays size={16} /><span className="min-w-0"><span className="block text-xs">{brief.plannedAt.replace('T', ' ')}</span><span className="block break-words">{brief.idea}</span></span></button>)}</div>
      </>}
      {tab === 'qr' && <div className="grid gap-5 lg:grid-cols-2"><form onSubmit={createQr} className={cardClass}><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><QrCode size={20} className="text-primary-600" />Turn a link into a QR code</h3><p className="mt-2 text-sm text-slate-500">Use it on flyers, social images, or an open-house sign.</p><label className="mt-5 block text-sm font-semibold text-slate-800">Destination link<input type="url" value={qrUrl} onChange={event => changeQrUrl(event.target.value)} required maxLength={2000} className={`${inputClass} mt-2`} /></label><button type="submit" className={`${primaryClass} mt-4`} disabled={qrBusy}>{qrBusy ? 'Making QR code…' : 'Create QR code'}</button></form><div className={`${cardClass} flex min-h-64 flex-col items-center justify-center`}>{qrImage ? <><img src={qrImage} alt={`QR code linking to ${qrUrl}`} className="h-52 w-52" /><a className={`${buttonClass} mt-3`} href={qrImage} download="homelistingai-qr.png"><Download size={16} />Download PNG</a><p className="mt-3 max-w-full break-all text-center text-xs text-slate-500">{qrUrl}</p></> : <p className="text-sm text-slate-500">Your QR code will appear here.</p>}</div></div>}
      {tab === 'accounts' && <ConnectedAccountsPanel />}
      {tab === 'groups' && <FbGroupsPanel />}
    </div>
  </section>;
}
