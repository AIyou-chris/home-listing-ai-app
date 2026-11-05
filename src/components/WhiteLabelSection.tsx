import { FormEvent, useRef, useState } from 'react';
import { buildApiUrl } from '../lib/api';

export default function WhiteLabelSection() {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const lastDay = new Date(Date.now() + 179 * 86400000);
  const maxDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const start = new Date(`${fields.date}T${fields.time}:00`);
    if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
      setError('Please choose a future date and time.');
      return;
    }
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    try {
      const response = await fetch(buildApiUrl('/api/public/white-label/inquiry'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, timezone, startIso: start.toISOString(), requestId: requestId.current }),
        signal: AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'We could not save your inquiry. Please try again.');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'We could not confirm your inquiry was saved. Please try again.');
    } finally { setBusy(false); }
  }

  return <>
    <section id="white-label" className="ll-section ll-tint ll-white-label">
      <div className="ll-wrap ll-white-label-grid">
        <div>
          <p className="ll-eyebrow">White label · for teams &amp; offices</p>
          <h2 className="ll-h2">Your brand. Your team.<br /><span>Your AI platform.</span></h2>
          <p className="ll-lead-copy">We build custom AI platforms for teams and offices, with your name, your colors, and tools built around the way you work.</p>
          <ul className="ll-white-label-benefits">
            {['Your brand, front and center', 'Built for your team’s workflow', 'Custom tools for your office'].map(text => <li key={text}><span aria-hidden="true" className="material-symbols-outlined">check</span>{text}</li>)}
          </ul>
          <div className="ll-white-label-action">
            <button type="button" className="ll-btn ll-btn-solid" onClick={() => dialog.current?.showModal()}>Inquire <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></button>
            <p>Tell us what you have in mind.</p>
          </div>
        </div>
        <figure className="ll-white-label-art"><img src="/images/white-label-workspace.webp" alt="Example custom platform with your office’s branding on a team workspace and listing app" loading="lazy" width="1024" height="1024" /><figcaption>Example of a custom branded platform.</figcaption></figure>
      </div>
    </section>
    <dialog ref={dialog} className="ll-inquiry-dialog" aria-labelledby="ll-inquiry-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <button type="button" className="ll-inquiry-close" aria-label="Close inquiry form" disabled={busy} onClick={() => dialog.current?.close()}><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
      <h2 id="ll-inquiry-title">{sent ? 'Thanks. Let’s talk.' : 'Let’s build your platform.'}</h2>
      {sent ? <div role="status"><p>Your inquiry and preferred meeting time have been sent. We’ll email you to confirm the time.</p><button type="button" className="ll-btn ll-btn-solid ll-full" onClick={() => dialog.current?.close()}>Done</button></div> : <form onSubmit={submit}>
        <p className="ll-inquiry-intro">Tell us about your team and pick a time to talk.</p>
        <div className="ll-inquiry-fields">
          <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>
          <label>Work email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label className="ll-inquiry-wide">Team / office<input name="office" autoComplete="organization" required maxLength={120} /></label>
          <label className="ll-inquiry-wide">What would you like to build?<textarea name="message" rows={3} required maxLength={1000} /></label>
          <label>Preferred date<input name="date" type="date" min={minDate} max={maxDate} required /></label>
          <label>Preferred time<input name="time" type="time" required /></label>
        </div>
        <p className="ll-inquiry-note">Your time zone: {timezone}. A 30-minute conversation. We’ll confirm the time by email.</p>
        {error && <p role="alert" className="ll-inquiry-error">{error}</p>}
        <button type="submit" className="ll-btn ll-btn-solid ll-full" disabled={busy}>{busy ? 'Sending…' : 'Send inquiry'}</button>
        <p className="ll-inquiry-privacy">We’ll only use these details to respond to your inquiry. <a href="/privacy">Privacy policy</a></p>
      </form>}
    </dialog>
  </>;
}
