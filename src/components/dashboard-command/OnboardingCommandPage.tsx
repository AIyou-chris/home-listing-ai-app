import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildDashboardPath, useDemoMode } from '../../demo/useDemoMode';
import { getAICardProfile } from '../../services/aiCardService';
import {
  createLeadAppointment,
  fetchListingShareKit,
  generateListingQrCode,
  publishListingShareKit,
  sendListingTestLeadCapture,
  type ListingShareKitResponse
} from '../../services/dashboardCommandService';
import { listingsService } from '../../services/listingsService';
import { createListingBuilderSource } from '../../services/listingBuilderService';
import {
  fetchOnboardingState,
  patchOnboardingState,
  type OnboardingState
} from '../../services/onboardingService';
import { showToast } from '../../utils/toastService';

const STEP_COUNT = 6;

const clampStep = (value: number) => Math.max(1, Math.min(STEP_COUNT, Number.isFinite(value) ? value : 1));

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';

const OnboardingCommandPage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [shareKit, setShareKit] = useState<ListingShareKitResponse | null>(null);
  const [openHouseQr, setOpenHouseQr] = useState<string | null>(null);
  const [testLeadId, setTestLeadId] = useState<string | null>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [appointmentLocation, setAppointmentLocation] = useState('');

  const [brandForm, setBrandForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    brokerage: '',
    headshot_url: '',
    professional_title: ''
  });

  const profileComplete = Boolean(brandForm.full_name && (brandForm.phone || brandForm.email));

  const [listingForm, setListingForm] = useState({
    address: '',
    price: '1250000',
    beds: '4',
    baths: '3',
    sqft: '2800'
  });
  const [listingPrimaryPhoto, setListingPrimaryPhoto] = useState('');

  const [brainNotes, setBrainNotes] = useState('');

  const [testLeadForm, setTestLeadForm] = useState({
    full_name: 'Test Lead',
    email: '',
    phone: '',
    context: 'report_requested' as 'report_requested' | 'showing_requested'
  });

  const listingId = useMemo(
    () => state?.first_listing_id || state?.onboarding_checklist?.first_listing_id || null,
    [state]
  );

  const requiredDone = Boolean(
    state?.onboarding_checklist?.first_listing_created &&
    state?.onboarding_checklist?.first_listing_published &&
    state?.onboarding_checklist?.share_kit_copied &&
    state?.onboarding_checklist?.test_lead_sent
  );

  const syncStepFromSource = (nextState: OnboardingState) => {
    const fromQuery = Number(searchParams.get('step'));
    const nextStep = Number.isFinite(fromQuery) && fromQuery > 0
      ? clampStep(fromQuery)
      : clampStep(Number(nextState.onboarding_step || 1));
    setCurrentStep(nextStep);
  };

  const load = async () => {
    setLoading(true);
    try {
      const onboarding = await fetchOnboardingState();
      const aiCardProfile = await getAICardProfile().catch(() => null);
      setState(onboarding);
      setBrandForm({
        full_name: onboarding.brand_profile.full_name || '',
        phone: onboarding.brand_profile.phone || '',
        email: onboarding.brand_profile.email || '',
        brokerage: onboarding.brand_profile.brokerage || '',
        headshot_url: onboarding.brand_profile.headshot_url || '',
        professional_title: aiCardProfile?.professionalTitle || ''
      });
      setTestLeadForm((prev) => ({
        ...prev,
        email: onboarding.brand_profile.email || prev.email,
        phone: onboarding.brand_profile.phone || prev.phone
      }));
      syncStepFromSource(onboarding);

      if (onboarding.first_listing_id) {
        const kit = await fetchListingShareKit(onboarding.first_listing_id).catch(() => null);
        if (kit) setShareKit(kit);
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to load onboarding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchState = async (payload: Parameters<typeof patchOnboardingState>[0]) => {
    const updated = await patchOnboardingState(payload);
    setState(updated);
    return updated;
  };

  const gotoStep = async (step: number) => {
    const next = clampStep(step);
    setCurrentStep(next);
    setSearchParams({ step: String(next) }, { replace: true });
    await patchState({ onboarding_step: next });
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await gotoStep(currentStep + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateListing = async () => {
    setSaving(true);
    try {
      const parsedPrice = Math.max(0, Number(listingForm.price) || 0);
      const created = await listingsService.createProperty({
        title: `${listingForm.address.split(',')[0] || 'My First Listing'} — AI Listing`,
        address: listingForm.address,
        price: parsedPrice,
        bedrooms: Number(listingForm.beds) || 0,
        bathrooms: Number(listingForm.baths) || 0,
        squareFeet: Number(listingForm.sqft) || 0,
        status: 'active',
        heroPhotos: listingPrimaryPhoto ? [listingPrimaryPhoto] : undefined,
        agentSnapshot: {
          name: brandForm.full_name || '',
          title: brandForm.professional_title || 'Real Estate Agent',
          company: brandForm.brokerage || '',
          phone: brandForm.phone || '',
          email: brandForm.email || '',
          headshotUrl: brandForm.headshot_url || '',
          socials: []
        }
      });

      await patchState({
        onboarding_step: 3,
        onboarding_checklist: {
          first_listing_created: true,
          first_listing_id: created.id
        }
      });

      setCurrentStep(3);
      setSearchParams({ step: '3' }, { replace: true });
      showToast.success('First listing created.');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to create listing.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishListing = async () => {
    if (!listingId) {
      showToast.error('Create a listing first.');
      return;
    }
    setSaving(true);
    try {
      const published = await publishListingShareKit(listingId, true);
      setShareKit(published);
      if (published.public_slug) {
        const flyerUrl = `${window.location.origin.includes('localhost') ? 'http://localhost:3002' : window.location.origin}/api/public/listings/${encodeURIComponent(published.public_slug)}/open-house-flyer.pdf`;
        setOpenHouseQr(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(flyerUrl)}`);
      } else {
        const openHouse = await generateListingQrCode(listingId, {
          source_type: 'open_house',
          source_key: 'open_house'
        }).catch(() => null);
        if (openHouse?.qr_code_url) setOpenHouseQr(openHouse.qr_code_url);
      }

      await patchState({
        onboarding_checklist: {
          first_listing_published: true
        }
      });
      showToast.success('Listing published.');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to publish listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareKit?.share_url) return;
    try {
      await navigator.clipboard.writeText(shareKit.share_url);
      await patchState({
        onboarding_checklist: {
          share_kit_copied: true
        }
      });
      showToast.success('Share link copied.');
    } catch {
      showToast.error('Could not copy link.');
    }
  };

  const downloadDataUrl = (filename: string, dataUrl?: string | null) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const handleSaveBrain = async () => {
    if (!listingId) { await gotoStep(5); return; }
    setSaving(true);
    try {
      const trimmed = brainNotes.trim();
      if (trimmed) {
        await createListingBuilderSource(listingId, {
          type: 'text',
          title: 'Agent notes — key facts about this home',
          content: trimmed
        });
      }
      await patchState({ onboarding_checklist: { brain_seeded: true } });
      await gotoStep(4);
    } catch {
      showToast.error('Could not save notes — skip for now and add them later.');
      await gotoStep(4);
    } finally {
      setSaving(false);
    }
  };

  const handleStepThreeContinue = async () => {
    setSaving(true);
    try {
      await gotoStep(5);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestLead = async () => {
    if (!listingId) {
      showToast.error('Create and publish a listing first.');
      return;
    }
    setSaving(true);
    try {
      const response = await sendListingTestLeadCapture(listingId, {
        full_name: testLeadForm.full_name,
        email: testLeadForm.email || undefined,
        phone: testLeadForm.phone || undefined,
        consent_sms: Boolean(testLeadForm.phone),
        context: testLeadForm.context,
        source_meta: { test: true, onboarding: true },
        source_key: 'onboarding_test',
        source_type: 'link'
      });
      setTestLeadId(response.lead_id || null);
      await patchState({
        onboarding_step: 6,
        onboarding_checklist: {
          test_lead_sent: true,
          last_test_lead_id: response.lead_id || null
        }
      });
      setCurrentStep(6);
      setSearchParams({ step: '6' }, { replace: true });
      showToast.success('Test lead created — it just appeared in your inbox.');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to create test lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!listingId) {
      showToast.error('Missing listing for appointment.');
      return;
    }
    if (!appointmentDateTime) {
      showToast.error('Choose date and time first.');
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(appointmentDateTime).toISOString();
      await createLeadAppointment({
        lead_id: testLeadId || state?.last_test_lead_id || undefined,
        listing_id: listingId,
        starts_at: startsAt,
        location: appointmentLocation || undefined
      });
      await patchState({
        onboarding_checklist: { first_appointment_created: true }
      });
      showToast.success('Reminders scheduled: 24h + 2h');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to create appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updated = await patchState({
        onboarding_completed: true,
        onboarding_step: 6
      });
      setState(updated);
      showToast.success('Nice — you’re live.');
      navigate(buildDashboardPath('/today', demoMode));
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className={cardClass}>Loading checklist...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className={cardClass}>Could not load onboarding.</div>
      </div>
    );
  }

  if (state.onboarding_completed) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 md:px-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">You’re live.</h1>
          <p className="mt-1 text-sm text-slate-600">Your first listing is published and ready to capture leads.</p>
        </header>
        <div className={cardClass}>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate(buildDashboardPath('/today', demoMode))} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
              Go to Dashboard
            </button>
            <button type="button" onClick={() => listingId ? navigate(buildDashboardPath(`/listings/${listingId}`, demoMode)) : navigate(buildDashboardPath('/today', demoMode))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Open Share Kit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentStep / STEP_COUNT) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Launch your first AI Listing</h1>
        <p className="mt-1 text-sm text-slate-600">5 minutes to go live. No extra apps.</p>
      </header>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {currentStep} of {STEP_COUNT}</p>
          <p className="text-xs text-slate-500">{progressPercent}% complete</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      {currentStep === 1 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Set up your agent profile</h2>
          <p className="mt-1 text-sm text-slate-600">Your profile is used everywhere — listings, share pages, AI card, lead capture, and marketing. Fill it out once in Settings and it carries through the whole app.</p>

          {/* Profile preview */}
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {brandForm.headshot_url ? (
              <img src={brandForm.headshot_url} alt="Headshot" className="h-16 w-16 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-400 text-2xl font-bold flex-shrink-0">
                {brandForm.full_name ? brandForm.full_name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="min-w-0">
              {brandForm.full_name ? (
                <p className="font-semibold text-slate-900 truncate">{brandForm.full_name}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No name set</p>
              )}
              {brandForm.brokerage && <p className="text-sm text-slate-500 truncate">{brandForm.brokerage}</p>}
              {brandForm.professional_title && <p className="text-xs text-slate-400 truncate">{brandForm.professional_title}</p>}
              <div className="mt-1 flex flex-wrap gap-2">
                {brandForm.phone && <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">✓ {brandForm.phone}</span>}
                {brandForm.email && <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">✓ {brandForm.email}</span>}
              </div>
            </div>
          </div>

          {!profileComplete && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Add your name and at least one contact method (phone or email) so buyers can reach you.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(buildDashboardPath('/settings', demoMode) + '?from=onboarding')}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Open Settings →
            </button>
            <button
              type="button"
              onClick={() => void gotoStep(2)}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {profileComplete ? 'Looks good, continue →' : 'Skip for now'}
            </button>
          </div>
        </section>
      )}

      {currentStep === 2 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Create your first AI Listing</h2>
          <p className="mt-1 text-sm text-slate-600">One listing link powers your sign, open house, and social.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Why this matters: this listing becomes your first lead capture machine.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={listingForm.address} onChange={(e) => setListingForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Address" className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={listingForm.price} onChange={(e) => setListingForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Price" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input value={listingForm.beds} onChange={(e) => setListingForm((prev) => ({ ...prev, beds: e.target.value }))} placeholder="Beds" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={listingForm.baths} onChange={(e) => setListingForm((prev) => ({ ...prev, baths: e.target.value }))} placeholder="Baths" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={listingForm.sqft} onChange={(e) => setListingForm((prev) => ({ ...prev, sqft: e.target.value }))} placeholder="Sq Ft" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <label className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">
              Primary photo upload (optional)
              <input
                type="file"
                accept="image/*"
                className="mt-2 block text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void readFileAsDataUrl(file).then(setListingPrimaryPhoto).catch(() => showToast.error('Failed to attach photo.'));
                }}
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleCreateListing()} disabled={saving || !listingForm.address.trim()} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Create Listing
            </button>
            <button type="button" onClick={() => void handleSkip()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Skip for now
            </button>
          </div>
        </section>
      )}

      {currentStep === 3 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Teach your AI about this home</h2>
          <p className="mt-1 text-sm text-slate-600">Tell the AI what makes this property special. Buyers will ask — the AI will answer using what you write here.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Why this matters: the better the AI knows the home, the better it converts browsers into real leads.</p>
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
            <p className="font-semibold">Ideas to include:</p>
            <ul className="mt-1.5 space-y-0.5 list-disc list-inside text-violet-800 text-xs">
              <li>What makes this home stand out (views, finishes, lot size, layout)</li>
              <li>Recent upgrades or renovations</li>
              <li>Neighborhood highlights, school district, walkability</li>
              <li>Seller motivation or timeline</li>
              <li>Anything a buyer would ask at an open house</li>
            </ul>
          </div>
          <textarea
            value={brainNotes}
            onChange={(e) => setBrainNotes(e.target.value)}
            placeholder="e.g. Newly remodeled kitchen with quartz counters, primary suite with mountain views, 3-car garage, top-rated Westview school district, quiet cul-de-sac, seller flexible on close date..."
            rows={6}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
          />
          <p className="mt-1.5 text-xs font-medium text-primary-600">You can always add more later from the listing editor.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleSaveBrain()} disabled={saving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {brainNotes.trim() ? 'Save & Continue' : 'Skip for now'}
            </button>
          </div>
        </section>
      )}

      {currentStep === 4 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Publish + get your Share Kit</h2>
          <p className="mt-1 text-sm text-slate-600">This generates your live link and QR codes.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Why this matters: one link can now be used on signs, flyers, open houses, and social.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handlePublishListing()} disabled={saving || !listingId} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Publish listing
            </button>
            <button type="button" onClick={() => void handleCopyShareLink()} disabled={saving || !shareKit?.share_url} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Copy link
            </button>
            <button type="button" onClick={() => downloadDataUrl('listing-sign-qr.png', shareKit?.qr_code_url)} disabled={!shareKit?.qr_code_url} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Download QR
            </button>
          </div>

          {shareKit?.share_url && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Share Link</p>
              <p className="mt-1 break-all">{shareKit.share_url}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {shareKit.qr_code_url && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sign QR</p>
                    <img src={shareKit.qr_code_url} alt="Sign QR" className="h-36 w-36 rounded-md border border-slate-200 bg-white p-1" />
                  </div>
                )}
                {(openHouseQr || shareKit.qr_code_url) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Open House QR</p>
                    <img src={openHouseQr || shareKit.qr_code_url || ''} alt="Open House QR" className="h-36 w-36 rounded-md border border-slate-200 bg-white p-1" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleStepThreeContinue()} disabled={saving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Continue
            </button>
            <button type="button" onClick={() => void handleSkip()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Skip for now
            </button>
          </div>
        </section>
      )}

      {currentStep === 5 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Test it (watch a lead appear live)</h2>
          <p className="mt-1 text-sm text-slate-600">We’ll create a test lead so you know it’s working.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Why this matters: you confirm the full loop before sending real traffic.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={testLeadForm.full_name} onChange={(e) => setTestLeadForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="Name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={testLeadForm.context} onChange={(e) => setTestLeadForm((prev) => ({ ...prev, context: e.target.value as 'report_requested' | 'showing_requested' }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="report_requested">Report requested</option>
              <option value="showing_requested">Showing requested</option>
            </select>
            <input value={testLeadForm.email} onChange={(e) => setTestLeadForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email (or use phone)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={testLeadForm.phone} onChange={(e) => setTestLeadForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone (or use email)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleSendTestLead()} disabled={saving || (!testLeadForm.email && !testLeadForm.phone)} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Send test lead
            </button>
            <button type="button" onClick={() => navigate(buildDashboardPath('/leads', demoMode))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              View Lead in Inbox
            </button>
            <button type="button" onClick={() => void handleSkip()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Skip for now
            </button>
          </div>
        </section>
      )}

      {currentStep === 6 && (
        <section className={cardClass}>
          <h2 className="text-xl font-semibold text-slate-900">Set a showing + see reminders</h2>
          <p className="mt-1 text-sm text-slate-600">Paid plans include appointment reminder texts that reduce no-shows.</p>
          <p className="mt-2 text-xs font-medium text-slate-500">Why this matters: confirmations and reminder outcomes cut wasted showing time.</p>

          {!state.is_pro ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Upgrade to a paid plan to enable reminder texts.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="datetime-local" value={appointmentDateTime} onChange={(e) => setAppointmentDateTime(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={appointmentLocation} onChange={(e) => setAppointmentLocation(e.target.value)} placeholder="Location (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {!state.is_pro ? (
              <button type="button" onClick={() => navigate(buildDashboardPath('/settings/billing', demoMode))} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                Upgrade to Pro
              </button>
            ) : (
              <button type="button" onClick={() => void handleCreateAppointment()} disabled={saving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Save Appointment
              </button>
            )}
            <button type="button" onClick={() => void handleFinish()} disabled={saving || !requiredDone} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Finish Setup
            </button>
            <button type="button" onClick={() => void handleSkip()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Skip for now
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default OnboardingCommandPage;
