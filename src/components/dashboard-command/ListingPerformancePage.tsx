import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchListingPerformance,
  fetchListingShareKit,
  generateListingQrCode,
  publishListingShareKit,
  sendListingTestLeadCapture,
  type ListingPerformanceMetrics,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService';
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore';

type RangeValue = '7d' | '30d';
type TestCaptureContext = 'report_requested' | 'showing_requested';

const ListingPerformancePage: React.FC = () => {
  const { listingId = '' } = useParams<{ listingId: string }>();
  const listingRealtimeSignal = useDashboardRealtimeStore((state) =>
    listingId ? state.listingSignalsById[listingId] : undefined
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeValue>('30d');
  const [metrics, setMetrics] = useState<ListingPerformanceMetrics | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<Array<{ source_type: string; total: number }>>([]);
  const [sourceKeyBreakdown, setSourceKeyBreakdown] = useState<Array<{ source_key: string; total: number }>>([]);
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [workingQr, setWorkingQr] = useState<string | null>(null);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testName, setTestName] = useState('Test Lead');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testConsentSms, setTestConsentSms] = useState(false);
  const [testContext, setTestContext] = useState<TestCaptureContext>('report_requested');
  const [testSourceKey, setTestSourceKey] = useState('link');
  const [sendingTestLead, setSendingTestLead] = useState(false);

  const sourceOptions = useMemo(() => {
    if (!shareKit?.source_defaults) return ['link', 'open_house', 'sign'];
    const keys = Object.keys(shareKit.source_defaults);
    return keys.length > 0 ? keys : ['link', 'open_house', 'sign'];
  }, [shareKit]);

  const loadShareKit = useCallback(async () => {
    if (!listingId) return;
    const response = await fetchListingShareKit(listingId);
    setShareKit(response);
    if (response.source_defaults?.link?.source_key) {
      setTestSourceKey((prev) => prev || response.source_defaults.link.source_key);
    }
  }, [listingId]);

  const loadPerformance = useCallback(async () => {
    if (!listingId) return;
    const response = await fetchListingPerformance(listingId, { range });
    setMetrics(response.metrics || null);
    setSourceBreakdown(response.breakdown?.by_source_type || []);
    setSourceKeyBreakdown(response.breakdown?.by_source_key || []);
  }, [listingId, range]);

  const loadAll = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadShareKit(), loadPerformance()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing dashboard.');
    } finally {
      setLoading(false);
    }
  }, [listingId, loadPerformance, loadShareKit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!listingRealtimeSignal) return;
    void loadPerformance();
  }, [listingRealtimeSignal, loadPerformance]);

  const onPublish = async () => {
    if (!listingId) return;
    try {
      setPublishing(true);
      const published = await publishListingShareKit(listingId, true);
      setShareKit(published);
      toast.success('Listing published.');
      await loadPerformance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish listing.');
    } finally {
      setPublishing(false);
    }
  };

  const onCopyLink = async () => {
    const shareUrl = shareKit?.share_url;
    if (!shareUrl) {
      toast.error('Publish this listing first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied.');
    } catch (_error) {
      toast.error('Failed to copy link.');
    }
  };

  const onDownloadQr = () => {
    if (!shareKit?.qr_code_url) {
      toast.error('Generate a QR first.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = shareKit.qr_code_url;
    anchor.download = `${listingId}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const createQrForSource = async (payload: { source_type: string; source_key: string; utm_medium?: string }) => {
    if (!listingId) return;
    try {
      setWorkingQr(payload.source_key);
      const response = await generateListingQrCode(listingId, payload);
      setShareKit((prev) =>
        prev
          ? {
            ...prev,
            qr_code_url: response.qr_code_url,
            qr_code_svg: response.qr_code_svg
          }
          : prev
      );
      toast.success(`QR ready (${response.source_key}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate QR.');
    } finally {
      setWorkingQr(null);
    }
  };

  const onSendTestLead = async () => {
    if (!listingId) return;
    if (!testEmail.trim() && !testPhone.trim()) {
      toast.error('Add an email or phone for the test lead.');
      return;
    }
    if (testPhone.trim() && !testConsentSms) {
      toast.error('SMS consent is required when phone is present.');
      return;
    }

    try {
      setSendingTestLead(true);
      const response = await sendListingTestLeadCapture(listingId, {
        full_name: testName,
        email: testEmail || undefined,
        phone: testPhone || undefined,
        consent_sms: testPhone.trim() ? true : undefined,
        context: testContext,
        source_key: testSourceKey
      });
      toast.success(response.message || 'Test lead created — open in Leads.');
      setTestModalOpen(false);
      setTestEmail('');
      setTestPhone('');
      setTestConsentSms(false);
      await loadPerformance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create test lead.');
    } finally {
      setSendingTestLead(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading listing performance…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Share Kit</h1>
        <p className="mt-1 text-sm text-slate-600">One link. One QR. Every placement routes back to this listing.</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Share link</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-900">{shareKit?.share_url || 'Publish listing to generate link'}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCopyLink}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={onDownloadQr}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Download QR
              </button>
              <button
                type="button"
                onClick={() => createQrForSource({ source_type: 'open_house', source_key: 'open_house' })}
                disabled={workingQr !== null}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {workingQr === 'open_house' ? 'Creating…' : 'Create Open House QR'}
              </button>
              <button
                type="button"
                onClick={() => createQrForSource({ source_type: 'social', source_key: 'social_001', utm_medium: 'social' })}
                disabled={workingQr !== null}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {workingQr === 'social_001' ? 'Creating…' : 'Create Social Link'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPublish}
                disabled={publishing}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {publishing ? 'Publishing…' : (shareKit?.is_published ? 'Republish listing' : 'Publish listing')}
              </button>
              <button
                type="button"
                onClick={() => setTestModalOpen(true)}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              >
                Send a test lead
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">QR preview</p>
            <div className="mt-3 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3">
              {shareKit?.qr_code_url ? (
                <img src={shareKit.qr_code_url} alt="Listing QR code" className="h-44 w-44 object-contain" />
              ) : (
                <p className="text-sm text-slate-500">Generate a QR code to preview.</p>
              )}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              <p>Slug: {shareKit?.public_slug || 'not set'}</p>
              <p>Published: {shareKit?.is_published ? 'yes' : 'no'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Listing Performance</h2>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${range === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              7 days
            </button>
            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${range === '30d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              30 days
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Leads captured</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics?.leads_count || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Appointments set</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics?.appointments_count || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Appointments confirmed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{metrics?.appointments_confirmed || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last lead captured</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {metrics?.last_lead_captured_at ? new Date(metrics.last_lead_captured_at).toLocaleString() : 'No captures yet'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Leads by source</h3>
            <div className="mt-3 space-y-2">
              {sourceBreakdown.length === 0 && <p className="text-sm text-slate-500">No source data yet.</p>}
              {sourceBreakdown.map((row) => (
                <div key={row.source_type} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{row.source_type}</span>
                  <span className="font-bold text-slate-900">{row.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Top source keys</h3>
            <div className="mt-3 space-y-2">
              {sourceKeyBreakdown.length === 0 && <p className="text-sm text-slate-500">No source keys captured yet.</p>}
              {sourceKeyBreakdown.slice(0, 8).map((row) => (
                <div key={row.source_key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{row.source_key}</span>
                  <span className="font-bold text-slate-900">{row.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Send a test lead</h3>
            <p className="mt-1 text-sm text-slate-600">Create a test capture and verify it appears in Leads.</p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Name</span>
                <input
                  value={testName}
                  onChange={(event) => setTestName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="lead@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone</span>
                <input
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  placeholder="+12065550111"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Context</span>
                <select
                  value={testContext}
                  onChange={(event) => setTestContext(event.target.value as TestCaptureContext)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="report_requested">report_requested</option>
                  <option value="showing_requested">showing_requested</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Source key</span>
                <select
                  value={testSourceKey}
                  onChange={(event) => setTestSourceKey(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {sourceOptions.map((sourceKey) => (
                    <option key={sourceKey} value={sourceKey}>
                      {sourceKey}
                    </option>
                  ))}
                </select>
              </label>
              {testPhone.trim() && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={testConsentSms}
                    onChange={(event) => setTestConsentSms(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Yes, you can text me about this home.
                </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSendTestLead}
                disabled={sendingTestLead}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {sendingTestLead ? 'Sending…' : 'Send a test lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingPerformancePage;
