import React, { useEffect, useState } from 'react';
import { Download, Film, Image as Picture, RefreshCw } from 'lucide-react';
import { adminMarketingMediaService, type StudioMedia } from '../../services/adminMarketingMediaService';
import { adminMarketingStudioService, type StudioCampaign } from '../../services/adminMarketingStudioService';
import MarketingVideoControls from './MarketingVideoControls';
import MarketingImageLibrary from './MarketingImageLibrary';
import { videoOptions } from '../../services/studioVideoOptions';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500';
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500';
export default function MarketingCampaignMedia({ campaign, dirty, onChange }: { campaign: StudioCampaign; dirty: boolean; onChange: (campaign: StudioCampaign) => void }) {
  const [format, setFormat] = useState(campaign.videoFormat);
  const [duration, setDuration] = useState(campaign.videoDuration);
  const [options, setOptions] = useState(() => videoOptions(campaign));
  const optionsChanged = format !== campaign.videoFormat || duration !== campaign.videoDuration || JSON.stringify(options) !== JSON.stringify(videoOptions(campaign));
  const [media, setMedia] = useState<StudioMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [capabilities, setCapabilities] = useState({ video: false, aiPicture: false, aiVoice: false });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([adminMarketingMediaService.list(campaign.id), adminMarketingMediaService.capabilities()]).then(([rows, caps]) => { if (active) { setMedia(rows); setCapabilities({ ...caps, aiVoice: Boolean(caps.aiVoice) }); setLoaded(true); setError(''); } }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your media.'); });
    return () => { active = false; };
  }, [campaign.id, campaign.version, reload]);
  const processing = media.some(item => item.status === 'processing' && Date.now() - Date.parse(item.updatedAt) < 240000);
  useEffect(() => {
    if (!processing) return;
    let active = true;
    const timer = window.setInterval(() => { adminMarketingMediaService.list(campaign.id).then(rows => { if (active) setMedia(rows); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not refresh your video.'); }); }, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [processing, campaign.id]);
  async function make(kind: 'template' | 'ai' | 'video', data?: string) {
    setBusy(true); setError('');
    try { setMedia(kind === 'video' ? await adminMarketingMediaService.video(campaign) : await adminMarketingMediaService.picture(campaign, { ...(data ? { data } : {}), ...(kind === 'ai' ? { ai: true } : {}) }));
      const latest = (await adminMarketingStudioService.list()).find(row => row.id === campaign.id);
      if (latest && latest.version !== campaign.version) onChange(latest);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Creation failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function makeAudio(kind: 'voice' | 'music', data?: string) {
    setBusy(true); setError('');
    try {
      setMedia(await adminMarketingMediaService.audio(campaign, { kind, ...(data ? { data } : { ai: true }) }));
      const latest = (await adminMarketingStudioService.list()).find(row => row.id === campaign.id);
      if (latest && latest.version !== campaign.version) onChange(latest);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save audio.'); } finally { setBusy(false); }
  }
  async function uploadAudio(kind: 'voice' | 'music', file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Choose an audio file smaller than 8 MB.'); return; }
    setBusy(true); setError('');
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this audio.')); reader.readAsDataURL(file); });
      const extensions: Record<string, string> = { mp3: 'mpeg', wav: 'wav', m4a: 'mp4', webm: 'webm', ogg: 'ogg', flac: 'flac' };
      const mime = extensions[file.name.split('.').at(-1)?.toLowerCase() || ''];
      if (!mime) throw new Error('Choose an MP3, WAV, M4A, WebM or Ogg file.');
      await makeAudio(kind, data.replace(/^data:[^;]*;/, `data:audio/${mime};`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read audio.'); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP smaller than 8 MB.'); return; }
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read this photo.')); reader.readAsDataURL(file); });
      await make('template', data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read this photo.'); }
  }
  const disabled = dirty || busy || processing || !loaded;
  const picture = media.find(item => item.kind === 'image'); const video = media.find(item => item.kind === 'video');
  const voice = media.find(item => item.kind === 'voice'); const music = media.find(item => item.kind === 'music');
  const audioMissing = options.narration === 'saved' && (voice?.status !== 'ready' || voice.stale) || options.music === 'upload' && music?.status !== 'ready';
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-label="Pictures and video">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-bold text-slate-900">Pictures & finished video</h4><button type="button" className={button} disabled={busy} onClick={() => setReload(value => value + 1)} aria-label="Refresh media"><RefreshCw size={15} />Refresh</button></div>
    <p className="mt-2 text-sm text-slate-600">Tweak the script and picture direction below, save your edits, then create a preview. Your media stays private until you decide to share it.</p>
    {dirty && <p className="mt-3 text-sm font-semibold text-primary-700">Save your edits before making new media.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <div><h5 className="flex items-center gap-2 font-semibold text-slate-900"><Picture size={18} />Campaign picture</h5>
        <div className="mt-3 flex min-h-48 items-center justify-center border border-slate-200 bg-black">{picture?.url ? <img src={picture.url} alt="Your saved campaign picture" className="max-h-80 w-full object-contain" /> : <p className="p-5 text-center text-sm text-slate-500">Your picture preview will appear here.</p>}</div>
        {picture?.stale && <p className="mt-2 text-sm text-amber-800">Your draft changed. Make a new picture to match it.</p>}
        {picture?.error && <p className="mt-2 text-sm text-red-700">{picture.error}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={disabled} onClick={() => make('template')}>Make free branded picture</button></div>
        <label className="mt-3 block text-sm font-semibold text-slate-700">Or upload your own photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => { upload(event.target.files?.[0]); event.target.value = ''; }} className="mt-2 block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-primary-700" /></label>
        <p className="mt-2 text-xs text-slate-500">Branded pictures and uploads use no AI credits.</p>
        <MarketingImageLibrary campaign={campaign} onChange={row => { onChange(row); setReload(value => value + 1); }} disabled={disabled} photoUploaded={picture?.source === 'upload'} />
        {picture?.url && <a href={picture.url} target="_blank" rel="noreferrer" download="campaign-picture" className={`${button} mt-3`}><Download size={15} />Open / download picture</a>}
      </div>
      <div><h5 className="flex items-center gap-2 font-semibold text-slate-900"><Film size={18} />Video preview</h5>
        <div className="mt-3 flex min-h-48 items-center justify-center border border-slate-200 bg-black">{video?.url ? <video key={video.url} src={video.url} controls playsInline poster={picture?.url || undefined} preload="auto" className="max-h-96 w-full object-contain" aria-label="Finished campaign video" /> : <p className="p-5 text-center text-sm text-slate-500">{processing ? 'Making your media… Keep this page open to watch the result.' : 'Create a video to watch it here.'}</p>}</div>
        {video?.stale && <p className="mt-2 text-sm text-amber-800">Your content or picture changed. Remake the video to include your edits.</p>}
        {video?.error && <p className="mt-2 text-sm text-red-700">{video.error}</p>}
        <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-slate-700">Video format<select aria-label="Video preview format" value={format} disabled={disabled} onChange={event => setFormat(event.target.value as StudioCampaign['videoFormat'])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="vertical">Vertical</option><option value="landscape">Landscape</option></select></label><label className="text-sm font-semibold text-slate-700">Video length<select aria-label="Video preview length" value={duration} disabled={disabled} onChange={event => setDuration(event.target.value as StudioCampaign['videoDuration'])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label></div>
        <MarketingVideoControls options={options} setOptions={setOptions} disabled={disabled} aiVoice={Boolean(capabilities.aiVoice) && !optionsChanged} voice={voice} music={music} makeVoice={() => makeAudio('voice')} upload={(kind, file) => { if (optionsChanged) { setError('Save video settings before uploading audio.'); return; } uploadAudio(kind, file); }} />
        {optionsChanged && <button type="button" className={`${button} mt-2`} disabled={disabled} onClick={async () => { setBusy(true); setError(''); try { onChange(await adminMarketingStudioService.settings(campaign, format, duration, options)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save video settings.'); } finally { setBusy(false); } }}>Save video settings</button>}
        <p className="mt-3 text-sm text-slate-600">Your saved script and picture, with the voice and music you choose.</p>
        <p className="mt-2 text-xs text-slate-500">Video length is a minimum. Longer narration extends it up to 90 seconds, so your words are not cut off. No AI video subscription.</p>
        <button type="button" className={`${primary} mt-3`} disabled={disabled || optionsChanged || audioMissing || !capabilities.video || Boolean(picture?.stale)} onClick={() => make('video')}>{busy || processing ? 'Creating…' : video ? 'Remake video' : 'Make video'}</button>
        {audioMissing && <p className="mt-2 text-sm text-amber-800">Make or upload the selected audio before rendering your video.</p>}
        {loaded && !capabilities.video && <p className="mt-2 text-sm text-amber-800">Video rendering needs to be enabled on this server. Your script is saved.</p>}
        {video?.url && <a href={video.url} target="_blank" rel="noreferrer" className={`${button} mt-3`}>Watch video</a>}
        {video?.url && <a href={video.url} target="_blank" rel="noreferrer" download="campaign-video.mp4" className={`${button} ml-2 mt-3`}><Download size={15} />Open / download MP4</a>}
      </div>
    </div>
  </section>;
}
