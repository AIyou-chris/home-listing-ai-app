import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../../lib/api';

type FairHousingScannerModalProps = {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  contextLabel?: string;
};

type FlaggedPhrase = {
  phrase: string;
  reason: string;
  safer: string;
};

type ScanResult = {
  originalText: string;
  rewrite: string;
  risk: 'Low' | 'Moderate' | 'High';
  flagged: FlaggedPhrase[];
  summary: string;
};

const riskColors = {
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-rose-100 text-rose-700 border-rose-200',
};

const FairHousingScannerModal: React.FC<FairHousingScannerModalProps> = ({
  open,
  onClose,
  initialText = '',
  contextLabel = 'Scanner'
}) => {
  const [textValue, setTextValue] = useState(initialText);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTextValue(initialText || '');
    setResult(null);
    setError(null);
  }, [initialText, open]);

  if (!open) return null;

  const startScan = async () => {
    const text = textValue.trim();
    if (!text) { toast.error('Paste some text to scan first.'); return; }
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(buildApiUrl('/api/fair-housing-scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'scan_failed');
      setResult(json.scan as ScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const copyRewrite = async () => {
    const text = result?.rewrite || textValue;
    if (!text) { toast.error('Nothing to copy yet.'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Copy failed.');
    }
  };

  return createPortal((
    <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm">
      <div className="flex h-full w-full items-end justify-center p-0 sm:items-center sm:p-6">
        <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fair Housing Scan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Paste any listing description, caption, SMS, or email. We'll flag risky phrases and suggest safer rewrites.
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Close
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Text to scan</label>
              <textarea
                value={textValue}
                onChange={(e) => { setTextValue(e.target.value); setResult(null); }}
                rows={6}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                placeholder="Paste text to scan…"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Risk badge + summary */}
                <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${riskColors[result.risk]}`}>
                  <span className="text-base font-black">{result.risk} Risk</span>
                  <span className="text-sm">{result.summary}</span>
                </div>

                {/* Flagged phrases */}
                {result.flagged.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Flagged Phrases</p>
                    <div className="space-y-2">
                      {result.flagged.map((f) => (
                        <div key={f.phrase} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold text-amber-800 text-sm">"{f.phrase}"</span>
                            <span className="text-xs text-amber-600">→ try: "{f.safer}"</span>
                          </div>
                          <p className="mt-1 text-xs text-amber-700">{f.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clean rewrite */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Clean Version</p>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">
                    {result.rewrite}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            <span className="text-xs text-slate-400">{contextLabel}</span>
            <div className="flex flex-wrap gap-2">
              {result && (
                <button type="button" onClick={() => void copyRewrite()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Copy clean copy
                </button>
              )}
              <button type="button" onClick={() => void startScan()} disabled={scanning}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                {scanning ? 'Scanning…' : result ? 'Rescan' : 'Start scan'}
              </button>
              <button type="button" onClick={onClose}
                className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  ), document.body);
};

export default FairHousingScannerModal;
