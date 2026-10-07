import React, { useState } from 'react';
import { buildApiUrl } from '../../lib/api';
import { authHeaders } from '../../services/dashboard/utils';
import { showToast } from '../../utils/toastService';

// Condo check: upload an HOA document (reserve study, budget, questionnaire), check the facts the AI
// found against the PDF, then teach this home's AI. Nothing is saved until the LO ticks "I checked".

type Fact = { status: 'verified' | 'needs_review' | 'not_found'; value: string | null; page: number | null; quote: string | null };
type Flag = { level: 'red' | 'yellow' | 'green' | 'gray'; text: string; source: string };
interface ReadResult { fileName: string; pageCount: number; facts: Record<string, Fact>; flags: Flag[]; derived: { reservePercentOfBudget: number | null } }

const LABELS: Record<string, string> = {
  association_name: 'Association', fiscal_year: 'Budget year', study_date: 'Document date', total_units: 'Total units',
  annual_assessment_income: 'Yearly dues income (whole association)', annual_reserve_contribution: 'Yearly reserve contribution',
  monthly_reserve_contribution: 'Monthly reserve contribution', reserve_balance: 'Reserve balance', percent_funded: 'Percent funded',
  reserve_study_method: 'Reserve study method', master_insurance_deductible: 'Master insurance deductible', special_assessment: 'Special assessment',
  delinquent_units_60plus: 'Owners 60+ days late', litigation: 'Lawsuits', critical_repairs: 'Repairs / deferred maintenance'
};

const ERRORS: Record<string, string> = {
  SCANNED_PDF: 'This PDF is a scan, so I cannot read the words yet. Use a PDF you can select text in.',
  PDF_ONLY: 'Please use a PDF file.',
  FILE_TOO_BIG: 'That file is too big. Keep it under 15 MB.',
  hoa_rate_limited: 'You can read 10 documents an hour. Try again soon.',
  reader_unavailable: 'The reader is not available right now.'
};

const DOT: Record<Flag['level'], string> = { red: 'bg-red-500', yellow: 'bg-amber-400', green: 'bg-emerald-500', gray: 'bg-slate-300' };

const HoaDocsCard: React.FC<{ listingId: string; address: string; demo?: boolean }> = ({ listingId, address, demo }) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const upload = async (file: File) => {
    if (demo) { showToast.error('This works on your own listings.'); return; }
    setBusy(true); setError(''); setResult(null); setSaved(false); setChecked(false);
    try {
      const form = new FormData();
      form.append('file', file);
      const headers = { ...(await authHeaders(null)) } as Record<string, string>;
      delete headers['Content-Type'];
      const res = await fetch(buildApiUrl(`/api/lo/listings/${listingId}/hoa-read`), { method: 'POST', headers, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(ERRORS[data.error] || 'Could not read that file. Try again.'); return; }
      setResult(data);
      setValues(Object.fromEntries(Object.entries(data.facts as Record<string, Fact>).map(([k, f]) => [k, f.value || ''])));
    } catch { setError('Could not read that file. Try again.'); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!result) return;
    const lines = Object.keys(LABELS).filter((k) => (values[k] || '').trim()).map((k) => {
      const p = result.facts[k]?.page;
      return `- ${LABELS[k]}: ${values[k].trim()}${p ? ` (page ${p})` : ''}`;
    });
    const asks = result.flags.filter((f) => f.level === 'red' || f.level === 'yellow').map((f) => `- ${f.text}`);
    const content = [
      `CONDO / HOA FACTS from the association's documents (${result.fileName}), checked by the loan officer.`,
      'Use these facts only. Never say a loan is or is not approved or eligible. For lending questions, say the loan officer will confirm with the lender.',
      ...lines,
      ...(asks.length ? ['', 'Items to ask the lender about:', ...asks] : [])
    ].join('\n');
    try {
      const res = await fetch(buildApiUrl('/api/lo/chatbot/listing-docs'), { method: 'POST', headers: await authHeaders(null), body: JSON.stringify({ address, label: 'Condo / HOA facts (checked)', content }) });
      if (!res.ok) throw new Error('save');
      setSaved(true);
      showToast.success("Saved. This home's AI now knows these facts.");
    } catch { showToast.error('Could not save. Try again.'); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">🏢 Condo check</h2>
        <p className="text-sm text-slate-500">Upload the HOA reserve study, budget or questionnaire. I pull out the facts. You check them against the PDF, then teach this home's AI.</p>
      </div>

      {!result && (
        <label className={`inline-block cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          {busy ? 'Reading… about 30 seconds' : 'Upload a PDF'}
          <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
        </label>
      )}
      {error && <p className="mt-2 text-sm text-amber-700">{error}</p>}

      {result && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{result.fileName} · {result.pageCount} pages</p>

          <div className="space-y-2">
            {result.flags.map((f, i) => (
              <div key={i} className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[f.level]}`} aria-hidden="true" />
                <div><p>{f.text}</p><p className="text-xs text-slate-400">{f.source}</p></div>
              </div>
            ))}
            <p className="text-xs text-slate-400">These are questions to ask the lender. They are not a loan decision.</p>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {Object.keys(LABELS).map((k) => {
              const f = result.facts[k];
              return (
                <div key={k} className="p-3">
                  <label className="text-xs font-bold text-slate-600" htmlFor={`hoa-${k}`}>{LABELS[k]}</label>
                  <input id={`hoa-${k}`} value={values[k] || ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} placeholder="Not found in the document"
                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-900" />
                  {f?.quote && (
                    <p className="mt-1 text-xs text-slate-500">
                      {f.status === 'verified' ? '✓ Found' : '⚠ Check this one'}{f.page ? ` on page ${f.page}` : ''}: <span className="italic">“{f.quote.replace(/\s+/g, ' ').slice(0, 140)}”</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-4 w-4" />
            I checked these against the document.
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={!checked || saved} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40">{saved ? 'Saved to my AI' : "Teach this home's AI"}</button>
            <button type="button" onClick={() => { setResult(null); setSaved(false); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Read another file</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HoaDocsCard;
