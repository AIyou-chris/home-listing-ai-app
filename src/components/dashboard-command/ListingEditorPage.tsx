import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDemoMode } from '../../demo/useDemoMode'
import {
  createListingBuilderSource,
  deleteListingBuilderSource,
  fetchListingBuilderPayload,
  generateListingDescription,
  type ListingBrainSourceStatus,
  type ListingBrainSourceType,
  type ListingBuilderSource,
  patchListingBuilder,
  retrainListingBrain,
  uploadListingBuilderSourceFile
} from '../../services/listingBuilderService'
import { publishListingShareKit } from '../../services/dashboardCommandService'
import { getLocalListingDraft, saveLocalListingDraft } from '../../services/listingDraftStorage'
import { uploadListingPhoto } from '../../services/listingMediaService'
import FairHousingScannerModal from '../modals/FairHousingScannerModal'

type EditorSection = 'essentials' | 'photos' | 'brain'

type ListingDraftState = {
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  description: string
}

type FairHousingResult = {
  risk: 'Low' | 'Moderate' | 'High'
  flagged: string[]
  rewrite: string
}

const SECTIONS: Array<{ key: EditorSection; label: string }> = [
  { key: 'essentials', label: 'Essentials' },
  { key: 'photos', label: 'Photos' },
  { key: 'brain', label: 'Listing Brain' }
]

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatUpdatedTime = (iso: string | null) => {
  if (!iso) return 'Unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const createEmptyDraft = (): ListingDraftState => ({
  address: '', price: 0, beds: 0, baths: 0, sqft: 0, description: ''
})

const normalizeStatusLabel = (status: string) => {
  const n = String(status || '').toLowerCase()
  return n === 'draft' || n === 'pending' ? 'Draft' : 'Published'
}

const sourceTypeLabel = (type: ListingBrainSourceType) => {
  if (type === 'doc') return 'Doc'
  if (type === 'url') return 'URL'
  return 'Text'
}

const sourceTypeIcon = (type: ListingBrainSourceType) => {
  if (type === 'doc') return '📄'
  if (type === 'url') return '🌐'
  return '📝'
}

// Format digits-only string with commas (e.g. "450000" → "450,000")
const formatWithCommas = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

// Allow digits only
const digitsOnly = (raw: string) => raw.replace(/\D/g, '')

// Allow digits + single decimal point, max 1 decimal digit (e.g. "2.5")
const sanitizeDecimal = (raw: string): string => {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return cleaned.slice(0, dot + 2)
}

const FAIR_HOUSING_FLAG_PHRASES = [
  'perfect for families',
  'safe neighborhood',
  'walk to church',
  'ideal for young couples',
  'exclusive community',
  'quiet retirees',
  'christian',
  'jewish',
  'muslim',
  'white neighborhood'
]
const DEFAULT_LISTING_ADDRESS = '123 Main St'

const runLocalFairHousingScan = (value: string): FairHousingResult => {
  const normalized = value.toLowerCase()
  const flagged = FAIR_HOUSING_FLAG_PHRASES.filter((term) => normalized.includes(term))
  const risk: FairHousingResult['risk'] = flagged.length >= 3 ? 'High' : flagged.length >= 1 ? 'Moderate' : 'Low'
  let rewrite = value.trim()
  if (!rewrite) {
    rewrite = 'Highlight the property features, upgrades, layout, and location convenience without describing people who should live there.'
  }
  rewrite = rewrite
    .replace(/perfect for families/gi, 'great layout for everyday living')
    .replace(/safe neighborhood/gi, 'well-located neighborhood')
    .replace(/ideal for young couples/gi, 'ideal for buyers seeking convenience')
    .replace(/quiet retirees/gi, 'quiet setting')
    .replace(/walk to church/gi, 'close to local amenities')
  return { risk, flagged, rewrite }
}

// ── Shared style tokens ────────────────────────────────────────────────────────

const card = 'rounded-xl border border-slate-200 bg-white shadow-sm'
const fieldCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100'
const sectionLabel = 'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400'
const outlineBtn =
  'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

// Convert a File to a base64 data URL (survives page refresh, safe for localStorage)
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// ── Component ──────────────────────────────────────────────────────────────────

const ListingEditorPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const demoMode = useDemoMode()
  const { listingId = '' } = useParams<{ listingId: string }>()

  const [activeSection, setActiveSection] = useState<EditorSection>('essentials')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLocalOnly, setIsLocalOnly] = useState(false)
  const [listingStatus, setListingStatus] = useState('draft')
  const [draft, setDraft] = useState<ListingDraftState>(createEmptyDraft())
  const [photos, setPhotos] = useState<string[]>([])
  const [sources, setSources] = useState<ListingBuilderSource[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [sourceBusy, setSourceBusy] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [fairHousingOpen, setFairHousingOpen] = useState(false)
  const [fairHousingText, setFairHousingText] = useState('')
  const [fairHousingResult, setFairHousingResult] = useState<FairHousingResult | null>(null)
  const [runningFairHousing, setRunningFairHousing] = useState(false)

  // Brain modal — replaces window.prompt()
  const [brainModal, setBrainModal] = useState<{ type: 'text' | 'url'; value: string } | null>(null)

  // Free-form display strings — formatted while typing, stripped on Save
  const [priceDisplay, setPriceDisplay] = useState('')
  const [bedsDisplay, setBedsDisplay] = useState('')
  const [bathsDisplay, setBathsDisplay] = useState('')
  const [sqftDisplay, setSqftDisplay] = useState('')

  const photoFileRef = useRef<HTMLInputElement | null>(null)
  const docFileRef = useRef<HTMLInputElement | null>(null)

  const dashboardRoot = useMemo(
    () => (location.pathname.startsWith('/dashboard') ? '/dashboard' : '/demo-dashboard'),
    [location.pathname]
  )
  const appendDemoQuery = useMemo(
    () => (demoMode && dashboardRoot === '/dashboard' ? '?demo=1' : ''),
    [dashboardRoot, demoMode]
  )
  const buildListingPath = (suffix: string) => `${dashboardRoot}${suffix}${appendDemoQuery}`

  const listingLabel = draft.address.trim() || 'Untitled Listing'
  const statusLabel = normalizeStatusLabel(listingStatus)

  const canPublish = useMemo(
    () =>
      draft.address.trim().length > 0 &&
      Number(priceDisplay.replace(/,/g, '')) > 0 &&
      Number(bedsDisplay) > 0 &&
      Number(bathsDisplay) > 0 &&
      Number(sqftDisplay) > 0,
    [draft.address, priceDisplay, bedsDisplay, bathsDisplay, sqftDisplay]
  )

  const lastTrainedAt = useMemo(() => {
    const times = sources
      .map((s) => s.trained_at)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((v) => new Date(v).getTime())
      .filter((v) => Number.isFinite(v))
    return times.length === 0 ? null : new Date(Math.max(...times)).toISOString()
  }, [sources])

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const applyDisplayValues = (price: number, beds: number, baths: number, sqft: number) => {
      setPriceDisplay(price > 0 ? price.toLocaleString('en-US') : '')
      setBedsDisplay(beds > 0 ? String(beds) : '')
      setBathsDisplay(baths > 0 ? String(baths) : '')
      setSqftDisplay(sqft > 0 ? String(sqft) : '')
    }

    const loadFromLocal = (message: string | null) => {
      const local = getLocalListingDraft(listingId)
      const fb = local || {
        id: listingId, title: 'Draft Listing', address: DEFAULT_LISTING_ADDRESS,
        price: 0, bedrooms: 0, bathrooms: 0, squareFeet: 0,
        description: '', amenities: [], photos: [], createdAt: new Date().toISOString()
      }
      if (cancelled) return
      setIsLocalOnly(true)
      setListingStatus('draft')
      setDraft({ address: fb.address, price: fb.price, beds: fb.bedrooms, baths: fb.bathrooms, sqft: fb.squareFeet, description: fb.description })
      applyDisplayValues(fb.price, fb.bedrooms, fb.bathrooms, fb.squareFeet)
      setPhotos((fb.photos || []).slice(0, 6))
      setSources([])
      setError(null)
      setNotice(message)
      setLoading(false)
    }

    const load = async () => {
      if (!listingId) { setError('Missing listing id.'); setLoading(false); return }
      setLoading(true)
      setError(null)

      if (demoMode) { loadFromLocal(null); return }

      try {
        const payload = await fetchListingBuilderPayload(listingId)
        if (cancelled) return
        const price = Number(payload.listing.price) || 0
        const beds = Number(payload.listing.beds) || 0
        const baths = Number(payload.listing.baths) || 0
        const sqft = Number(payload.listing.sqft) || 0
        setIsLocalOnly(false)
        setNotice(null)
        setListingStatus(payload.listing.status || 'draft')
        setDraft({ address: payload.listing.address || '', price, beds, baths, sqft, description: payload.listing.description || '' })
        applyDisplayValues(price, beds, baths, sqft)
        setPhotos((payload.listing.photos || []).slice(0, 6))
        setSources(payload.brain_sources || [])
      } catch (err) {
        const local = getLocalListingDraft(listingId)
        if (local) { loadFromLocal('Live listing unavailable — showing local draft.'); return }
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load listing editor.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [demoMode, listingId])

  const openFairHousing = () => {
    setFairHousingText(draft.description || '')
    setFairHousingResult(null)
    setFairHousingOpen(true)
  }

  const handleRunFairHousing = async () => {
    setRunningFairHousing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 380))
    setFairHousingResult(runLocalFairHousingScan(fairHousingText))
    setRunningFairHousing(false)
  }

  const updateDraft = (key: keyof ListingDraftState, value: string | number) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  // ── Photo actions ─────────────────────────────────────────────────────────

  const doUploadFile = async (file: File) => {
    if (photos.length >= 6) { toast.error('Maximum 6 photos allowed.'); return }
    setUploadingPhoto(true)
    try {
      // Use base64 data URL for local/demo so photos survive page refresh
      const url = demoMode || isLocalOnly ? await readAsDataUrl(file) : await uploadListingPhoto(file)
      if (!url) throw new Error('Upload did not return a URL.')
      setPhotos((prev) => [...prev, url].slice(0, 6))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleUploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void doUploadFile(file)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) void doUploadFile(file)
  }

  const addPhotoUrl = () => {
    const url = photoUrlInput.trim()
    if (!url) return
    if (photos.length >= 6) { toast.error('Maximum 6 photos allowed.'); return }
    setPhotos((prev) => [...prev, url].slice(0, 6))
    setPhotoUrlInput('')
  }

  const makePhotoPrimary = (index: number) => {
    const next = [...photos]
    const [picked] = next.splice(index, 1)
    setPhotos([picked, ...next].slice(0, 6))
  }

  // ── Source actions ────────────────────────────────────────────────────────

  const addLocalSource = (input: { type: ListingBrainSourceType; title: string; status?: ListingBrainSourceStatus; content?: string | null; url?: string | null }) => {
    const ts = new Date().toISOString()
    const status = input.status || 'needs_retrain'
    setSources((prev) => [{
      id: `local-${Date.now()}`,
      type: input.type, title: input.title, status,
      trained_at: status === 'trained' ? ts : null,
      updated_at: ts, content: input.content ?? null, url: input.url ?? null
    }, ...prev])
  }

  const createSource = async (input: { type: ListingBrainSourceType; title: string; content?: string | null; url?: string | null }) => {
    const title = input.title.trim()
    if (!title) return
    if (demoMode || isLocalOnly) { addLocalSource({ ...input, title, status: 'needs_retrain' }); return }
    setSourceBusy(true)
    try {
      const source = await createListingBuilderSource(listingId, { ...input, title, status: 'needs_retrain' })
      setSources((prev) => [source, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (demoMode || isLocalOnly) { setSources((prev) => prev.filter((s) => s.id !== sourceId)); return }
    setSourceBusy(true)
    try {
      await deleteListingBuilderSource(listingId, sourceId)
      setSources((prev) => prev.filter((s) => s.id !== sourceId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleRetrain = async () => {
    if (sources.length === 0) return
    const nowIso = new Date().toISOString()
    if (demoMode || isLocalOnly) {
      setSources((prev) => prev.map((s) => ({ ...s, status: 'trained' as ListingBrainSourceStatus, trained_at: nowIso, updated_at: nowIso })))
      toast.success('Listing Brain retrained.')
      return
    }
    setSourceBusy(true)
    try {
      const result = await retrainListingBrain(listingId)
      setSources(result.sources)
      if (result.ai_summary) {
        updateDraft('description', result.ai_summary)
        setActiveSection('essentials')
        toast.success('AI wrote a listing description from your sources. Review it in Essentials.')
      } else {
        toast.success('Listing Brain retrained.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrain failed.')
    } finally {
      setSourceBusy(false)
    }
  }

  // ── AI description generator ───────────────────────────────────────────────

  const handleGenerateDescription = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    if (demoMode || isLocalOnly) {
      // Demo: generate a placeholder so the feature is still demonstrable
      setGeneratingDesc(true)
      await new Promise((r) => setTimeout(r, 900))
      updateDraft('description', `Welcome to ${draft.address || 'this stunning home'} — a beautifully presented property offered at ${numPrice > 0 ? `$${numPrice.toLocaleString('en-US')}` : 'a competitive price'}. With ${numBeds} spacious bedrooms and ${numBaths} well-appointed bathrooms across ${numSqft > 0 ? `${numSqft.toLocaleString('en-US')} sq ft` : 'generous living space'}, this home is perfect for families and entertainers alike.\n\nThe thoughtful floor plan flows effortlessly from formal living areas into an open-concept kitchen and dining space, all bathed in natural light. Quality finishes and recent upgrades throughout make this a true move-in-ready opportunity.\n\nLocated in a sought-after neighbourhood close to top schools, parks, and everyday conveniences — this is the one you've been waiting for. Schedule your private showing today.`)
      setGeneratingDesc(false)
      return
    }

    setGeneratingDesc(true)
    try {
      const description = await generateListingDescription(listingId, {
        address: draft.address,
        price: numPrice,
        beds: numBeds,
        baths: numBaths,
        sqft: numSqft
      })
      updateDraft('description', description)
      toast.success('AI description ready — review and edit as needed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate description.')
    } finally {
      setGeneratingDesc(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    setSaving(true)
    try {
      if (demoMode || isLocalOnly) {
        saveLocalListingDraft({
          id: listingId,
          title: draft.address.trim() || 'Draft Listing',
          address: draft.address || DEFAULT_LISTING_ADDRESS,
          price: numPrice, bedrooms: numBeds, bathrooms: numBaths, squareFeet: numSqft,
          description: draft.description, amenities: [], photos,
          createdAt: new Date().toISOString()
        })
        toast.success('Draft saved locally.')
        return
      }
      await patchListingBuilder(listingId, {
        address: draft.address, price: numPrice, beds: numBeds,
        baths: numBaths, sqft: numSqft, description: draft.description, photos
      })
      const refreshed = await fetchListingBuilderPayload(listingId)
      setListingStatus(refreshed.listing.status || 'draft')
      setSources(refreshed.brain_sources || [])
      setNotice(null)
      toast.success('Listing saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save listing.')
    } finally {
      setSaving(false)
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const numPrice = Number(priceDisplay.replace(/,/g, '')) || 0
    const numBeds = Number(bedsDisplay) || 0
    const numBaths = Number(bathsDisplay) || 0
    const numSqft = Number(sqftDisplay) || 0

    // Already published — just navigate to Share Kit
    if (statusLabel === 'Published') {
      navigate(buildListingPath(`/listings/${listingId}`))
      return
    }

    // Demo / local — just mark as published locally
    if (demoMode || isLocalOnly) {
      setListingStatus('published')
      toast.success('Listing published! Opening Share Kit…')
      navigate(buildListingPath(`/listings/${listingId}`))
      return
    }

    setPublishing(true)
    try {
      // Save current form state first so published data is fresh
      await patchListingBuilder(listingId, {
        address: draft.address, price: numPrice, beds: numBeds,
        baths: numBaths, sqft: numSqft, description: draft.description, photos
      })

      // Then publish
      const result = await publishListingShareKit(listingId, true)
      setListingStatus(result.is_published ? 'published' : 'draft')
      toast.success('Listing published! Opening Share Kit…')
      navigate(buildListingPath(`/listings/${listingId}`))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish listing.')
    } finally {
      setPublishing(false)
    }
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className={`${card} p-6 text-sm text-slate-400`}>Loading listing…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      </div>
    )
  }

  // Preview line for Essentials strip
  const previewParts: string[] = []
  if (draft.address.trim()) previewParts.push(draft.address.trim())
  if (priceDisplay) previewParts.push(`$${priceDisplay}`)
  if (bedsDisplay) previewParts.push(`${bedsDisplay} bd`)
  if (bathsDisplay) previewParts.push(`${bathsDisplay} ba`)
  if (sqftDisplay) previewParts.push(`${sqftDisplay} sf`)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6">

      {/* ── Page header ── */}
      <header className={`${card} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => navigate(buildListingPath('/listings'))}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Listings
            </button>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900">{listingLabel}</h1>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                statusLabel === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {statusLabel}
              </span>
            </div>
            {notice && <p className="text-xs text-amber-600">{notice}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!canPublish || saving || publishing}
              onClick={() => void handlePublish()}
              className={outlineBtn}
            >
              {publishing ? 'Publishing…' : statusLabel === 'Published' ? 'View Share Kit' : 'Publish'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Editor card ── */}
      <div className={card}>

        {/* Mobile: section switcher (always visible so sections never feel hidden) */}
        <div className="border-b border-slate-100 px-4 py-3 md:hidden">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Section</p>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-1.5">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition ${
                  activeSection === s.key ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: underline tab bar */}
        <nav className="hidden border-b border-slate-100 px-6 md:flex" aria-label="Editor sections">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`relative mr-6 pb-3 pt-4 text-sm font-semibold transition-colors duration-150 ${
                activeSection === s.key
                  ? 'text-primary-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary-600 after:content-[\'\']'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── Section content ── */}
        <div className="p-4 md:p-6">

          {/* ════ ESSENTIALS ════ */}
          {activeSection === 'essentials' && (
            <div className="space-y-4">

              {/* Basics card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Basics</p>

                {/* Address */}
                <div className="mb-4">
                  <label className={sectionLabel}>Property Address</label>
                  <input
                    value={draft.address}
                    onChange={(e) => updateDraft('address', e.target.value)}
                    placeholder="123 Main St, City, State 00000"
                    className={fieldCls}
                  />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div>
                    <label className={sectionLabel}>Price</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceDisplay}
                        onChange={(e) => setPriceDisplay(formatWithCommas(e.target.value))}
                        placeholder="0"
                        className={`${fieldCls} pl-6`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={sectionLabel}>Beds</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bedsDisplay}
                      onChange={(e) => setBedsDisplay(digitsOnly(e.target.value))}
                      placeholder="0"
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={sectionLabel}>Baths</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bathsDisplay}
                      onChange={(e) => setBathsDisplay(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className={fieldCls}
                    />
                  </div>

                  <div>
                    <label className={sectionLabel}>Sq Ft</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={sqftDisplay}
                      onChange={(e) => setSqftDisplay(digitsOnly(e.target.value))}
                      placeholder="0"
                      className={fieldCls}
                    />
                  </div>

                </div>
              </div>

              {/* About card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label className={sectionLabel}>About This Home</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFairHousingOpen(true)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Fair Housing Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGenerateDescription()}
                      disabled={generatingDesc || saving}
                      className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingDesc ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Writing…
                        </>
                      ) : (
                        <>✨ Write with AI</>
                      )}
                    </button>
                  </div>
                </div>
                <p className="mb-2 text-xs text-slate-500">Describe what makes this home special…</p>
                <textarea
                  rows={8}
                  value={draft.description}
                  onChange={(e) => updateDraft('description', e.target.value)}
                  placeholder="Describe what makes this home special — neighbourhood, upgrades, lifestyle…"
                  className={`${fieldCls} min-h-[200px] resize-none rounded-2xl border-slate-200 bg-white p-4 leading-relaxed`}
                />
              </div>

              {/* Preview strip */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Preview</span>
                <span className="truncate text-sm text-slate-600">
                  {previewParts.length > 0
                    ? previewParts.join(' · ')
                    : <span className="text-slate-400">Fill in the basics above to see a preview.</span>}
                </span>
              </div>

            </div>
          )}

          {/* ════ PHOTOS ════ */}
          {activeSection === 'photos' && (
            <div className="space-y-4">

              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => photos.length < 6 && photoFileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                } ${photos.length >= 6 ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  {uploadingPhoto ? (
                    <svg className="h-5 w-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {uploadingPhoto ? 'Uploading…' : 'Drop photos here or click to upload'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {photos.length}/6 photos added · First photo is your primary
                  </p>
                </div>
              </div>

              {/* URL input */}
              <div className="flex gap-2">
                <input
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPhotoUrl()}
                  placeholder="Paste a photo URL to add it instantly…"
                  className={`${fieldCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addPhotoUrl}
                  disabled={photos.length >= 6 || !photoUrlInput.trim()}
                  className={outlineBtn}
                >
                  Add
                </button>
              </div>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, idx) => (
                    <div key={`${photo}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="relative">
                        <img src={photo} alt={`${listingLabel}${idx === 0 ? ' — Primary Photo' : ` — Photo ${idx + 1}`}`} className="h-40 w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => makePhotoPrimary(idx)}
                          disabled={idx === 0}
                          className="text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:cursor-default disabled:opacity-40"
                        >
                          {idx === 0 ? 'Primary' : 'Set as Primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs font-semibold text-rose-500 transition hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input ref={photoFileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />

            </div>
          )}

          {/* ════ LISTING BRAIN ════ */}
          {activeSection === 'brain' && (
            <div className="space-y-4">

              {/* Header + actions */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Listing Brain</p>
                <p className="mb-4 text-sm text-slate-500">
                  Feed the AI everything you know about this property. This trains the home&apos;s AI voice for descriptions, scripts, and follow-up copy.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => setBrainModal({ type: 'text', value: '' })}
                    className={outlineBtn}
                  >
                    📝 Paste Text
                  </button>
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => docFileRef.current?.click()}
                    className={outlineBtn}
                  >
                    📄 Upload Doc
                  </button>
                  <button
                    type="button"
                    disabled={sourceBusy}
                    onClick={() => setBrainModal({ type: 'url', value: '' })}
                    className={outlineBtn}
                  >
                    🌐 Scan Website
                  </button>
                </div>
              </div>

              {/* Sources list */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      {sources.length} {sources.length === 1 ? 'Source' : 'Sources'}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      Last trained: {lastTrainedAt ? formatUpdatedTime(lastTrainedAt) : 'Never'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={sourceBusy || sources.length === 0}
                    onClick={() => void handleRetrain()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Retrain AI
                  </button>
                </div>

                {sources.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-500">No sources yet</p>
                    <p className="mt-1 text-xs text-slate-400">Add your first source above to train this home&apos;s AI before publishing.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {sources.map((source) => (
                      <li key={source.id} className="flex items-center gap-4 px-4 py-3">
                        <span className="text-lg leading-none">{sourceTypeIcon(source.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{source.title}</p>
                          <p className="text-xs text-slate-400">{sourceTypeLabel(source.type)} · {formatUpdatedTime(source.updated_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            source.status === 'trained'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {source.status === 'trained' ? '✓ Trained' : 'Needs retrain'}
                          </span>
                          <button
                            type="button"
                            disabled={sourceBusy}
                            onClick={() => void handleDeleteSource(source.id)}
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-700 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                ref={docFileRef}
                type="file"
                accept=".pdf,.txt,.md,.csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  if (demoMode || isLocalOnly) {
                    // Client-side extraction for local/demo
                    const ext = file.name.split('.').pop()?.toLowerCase() || ''
                    if (['txt', 'md', 'csv'].includes(ext)) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        const text = (reader.result as string).slice(0, 50000)
                        void addLocalSource({ type: 'doc', title: file.name, content: text, status: 'needs_retrain' })
                      }
                      reader.readAsText(file)
                    } else {
                      addLocalSource({ type: 'doc', title: file.name, content: `[${file.name}]`, status: 'needs_retrain' })
                    }
                    return
                  }
                  setSourceBusy(true)
                  try {
                    const source = await uploadListingBuilderSourceFile(listingId, file)
                    setSources((prev) => [source, ...prev])
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not upload file.')
                  } finally {
                    setSourceBusy(false)
                  }
                }}
              />

            </div>
          )}

        </div>
      </div>
    </div>

    {/* ── Fair housing scan modal ── */}
    {fairHousingOpen && (
      <div className="fixed inset-0 z-[10000] flex items-end justify-center p-0 md:items-center md:p-4">
        <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={() => setFairHousingOpen(false)} />
        <div className="relative flex h-[90vh] w-full flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[92vh] md:max-w-3xl md:rounded-2xl">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Fair Housing Scan</h2>
                <p className="text-sm text-slate-500">Flag risky wording and get safer rewrites for your listing copy.</p>
              </div>
              <button
                type="button"
                onClick={() => setFairHousingOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close fair housing scan"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Scan Text</p>
              <textarea
                rows={12}
                value={fairHousingText}
                onChange={(event) => setFairHousingText(event.target.value)}
                placeholder="Paste listing remarks, captions, SMS copy, or email text..."
                className={`${fieldCls} min-h-[240px] resize-y bg-white`}
              />
              <p className="text-xs text-slate-500">TODO: Wire this modal to the full ChatKit fair housing workflow when production workflow ID is enabled on this branch.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Scan Result</p>
              {!fairHousingResult ? (
                <p className="mt-3 text-sm text-slate-500">Run a scan to see risk level, flagged language, and a safer rewrite.</p>
              ) : (
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Risk</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      fairHousingResult.risk === 'High'
                        ? 'bg-rose-100 text-rose-700'
                        : fairHousingResult.risk === 'Moderate'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {fairHousingResult.risk}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-slate-800">Flagged phrases</p>
                    {fairHousingResult.flagged.length === 0 ? (
                      <p className="text-xs text-emerald-700">No common risky phrases detected in this draft.</p>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                        {fairHousingResult.flagged.map((phrase) => (
                          <li key={phrase}>{phrase}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-slate-800">Suggested rewrite</p>
                    <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">{fairHousingResult.rewrite}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button type="button" onClick={() => setFairHousingOpen(false)} className={outlineBtn}>
              Close
            </button>
            <button
              type="button"
              onClick={() => void handleRunFairHousing()}
              disabled={runningFairHousing || !fairHousingText.trim()}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningFairHousing ? 'Scanning…' : 'Run scan'}
            </button>
          </footer>
        </div>
      </div>
    )}

    {/* ── Brain source modal ── */}
    {brainModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setBrainModal(null)}
        />

        {/* Card */}
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

          {/* Close */}
          <button
            type="button"
            onClick={() => setBrainModal(null)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {brainModal.type === 'text' ? (
            <>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add Source</p>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Paste Text</h2>
              <p className="mb-4 text-sm text-slate-500">Paste any property info — MLS notes, feature lists, agent remarks, anything relevant.</p>
              <textarea
                autoFocus
                rows={7}
                value={brainModal.value}
                onChange={(e) => setBrainModal({ ...brainModal, value: e.target.value })}
                placeholder="Paste your source text here…"
                className={`${fieldCls} resize-none`}
              />
            </>
          ) : (
            <>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add Source</p>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Scan Website</h2>
              <p className="mb-4 text-sm text-slate-500">Enter a URL and the AI will scan it for property details — Zillow, Realtor.com, your own site, anywhere.</p>
              <input
                autoFocus
                type="url"
                value={brainModal.value}
                onChange={(e) => setBrainModal({ ...brainModal, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = brainModal.value.trim()
                    if (url) { void createSource({ type: 'url', title: url, url }); setBrainModal(null) }
                  }
                }}
                placeholder="https://zillow.com/homedetails/…"
                className={fieldCls}
              />
            </>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setBrainModal(null)} className={outlineBtn}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!brainModal.value.trim() || sourceBusy}
              onClick={() => {
                const val = brainModal.value.trim()
                if (!val) return
                if (brainModal.type === 'text') {
                  void createSource({ type: 'text', title: val.slice(0, 80), content: val })
                } else {
                  void createSource({ type: 'url', title: val, url: val })
                }
                setBrainModal(null)
              }}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Source
            </button>
          </div>
        </div>
      </div>
    )}
    <FairHousingScannerModal
      open={fairHousingOpen}
      onClose={() => setFairHousingOpen(false)}
      initialText={draft.description || ''}
      contextLabel="Listing Editor"
    />
    </>
  )
}

export default ListingEditorPage
