import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

interface MyLink { slug: string; url: string; name: string; company: string | null; nmls: string | null }

const LOPromotePage: React.FC = () => {
  const [link, setLink] = useState<MyLink | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [qr, setQr] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/my-link'), { headers: await authHeaders(null) });
        if (!res.ok) throw new Error('bad');
        const d = await res.json() as MyLink;
        if (!live) return;
        setLink(d); setState('ready');
        QRCode.toDataURL(`${d.url}?utm_source=qr`, { width: 600, margin: 1 }).then((u) => live && setQr(u)).catch(() => undefined);
      } catch { if (live) setState('error'); }
    })();
    return () => { live = false; };
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast.success('Copied'), () => showToast.error('Could not copy'));
  };

  if (state === 'loading') return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">Loading…</div>;
  if (state === 'error' || !link) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-700">Could not load your link. Try again in a minute.</div>;

  const nmls = link.nmls ? ` NMLS #${link.nmls}` : '';
  const posts = [
    { title: 'Buying a home', door: 'buy', text: `Thinking about buying a home? Ask me anything, no pressure. I will tell you what to do first.${nmls}` },
    { title: 'Mortgage review', door: 'review', text: `Is your mortgage rate about to change? I will take a free look and tell you if it still fits your plans.${nmls}` },
    { title: 'Homebuyer class', door: 'class', text: `Want to learn the steps to buying a home and the programs that can help? Sign up for my homebuyer class.${nmls}` },
  ].map((p) => ({ ...p, full: `${p.text}\n${link.url}?door=${p.door}&utm_source=social` }));

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Promote yourself</h1>
        <p className="text-sm text-slate-500">One link, no agent needed. Every request lands in your Leads.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Your personal link</p>
        <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{link.url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => copy(link.url)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Copy link</button>
          <a href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Preview</a>
        </div>
        {qr && <img src={qr} alt="QR code for your link" className="mt-4 h-40 w-40" />}
        {qr && <a href={qr} download="my-link-qr.png" className="mt-2 inline-block text-sm font-semibold text-slate-700 underline">Download QR</a>}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Ready-to-post</p>
        {posts.map((p) => (
          <div key={p.door} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{p.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{p.full}</p>
            <button type="button" onClick={() => copy(p.full)} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Copy post</button>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Email signature line</p>
        <p className="mt-1 text-sm text-slate-700">Questions about buying or your mortgage? Ask me here: {link.url}?utm_source=email</p>
        <button type="button" onClick={() => copy(`Questions about buying or your mortgage? Ask me here: ${link.url}?utm_source=email`)} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Copy line</button>
      </section>
    </div>
  );
};

export default LOPromotePage;
