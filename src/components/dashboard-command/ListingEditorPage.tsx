import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDemoMode } from '../../demo/useDemoMode'
import {
  createListingBuilderSource,
  deleteListingBuilderSource,
  fetchListingBuilderPayload,
  type ListingBrainSourceStatus,
  type ListingBrainSourceType,
  type ListingBuilderSource,
  patchListingBuilder,
  updateListingBuilderSource
} from '../../services/listingBuilderService'
import { getLocalListingDraft, saveLocalListingDraft } from '../../services/listingDraftStorage'
import { uploadListingPhoto } from '../../services/listingMediaService'

type EditorSection = 'essentials' | 'photos' | 'brain'

type ListingDraftState = {
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  description: string
}

const SECTIONS: Array<{ key: EditorSection; label: string }> = [
  { key: 'essentials', label: 'Essentials' },
  { key: 'photos', label: 'Photos' },
  { key: 'brain', label: 'Listing Brain' }
]

const formatUpdatedTime = (iso: string | null) => {
  if (!iso) return 'Unknown'
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return 'Unknown'
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const createEmptyDraft = (): ListingDraftState => ({
  address: '',
  price: 0,
  beds: 0,
  baths: 0,
  sqft: 0,
  description: ''
})

const normalizeStatusLabel = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'draft' || normalized === 'pending') return 'Draft'
  return 'Published'
}

const sourceTypeLabel = (type: ListingBrainSourceType) => {
  if (type === 'doc') return 'Doc'
  if (type === 'url') return 'URL'
  return 'Text'
}

const ListingEditorPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const demoMode = useDemoMode()
  const { listingId = '' } = useParams<{ listingId: string }>()

  const [activeSection, setActiveSection] = useState<EditorSection>('essentials')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLocalOnly, setIsLocalOnly] = useState(false)
  const [listingStatus, setListingStatus] = useState('draft')
  const [draft, setDraft] = useState<ListingDraftState>(createEmptyDraft())
  const [photos, setPhotos] = useState<string[]>([])
  const [sources, setSources] = useState<ListingBuilderSource[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [sourceBusy, setSourceBusy] = useState(false)

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

  const buildListingPath = (pathSuffix: string) => `${dashboardRoot}${pathSuffix}${appendDemoQuery}`

  const listingLabel = draft.address.trim() || 'Draft Listing'
  const statusLabel = normalizeStatusLabel(listingStatus)

  const canPublish = useMemo(
    () =>
      draft.address.trim().length > 0 &&
      Number(draft.price) > 0 &&
      Number(draft.beds) > 0 &&
      Number(draft.baths) > 0 &&
      Number(draft.sqft) > 0,
    [draft.address, draft.baths, draft.beds, draft.price, draft.sqft]
  )

  const lastTrainedAt = useMemo(() => {
    const trainedValues = sources
      .map((source) => source.trained_at)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value))

    if (trainedValues.length === 0) return null
    return new Date(Math.max(...trainedValues)).toISOString()
  }, [sources])

  const saveLocalSnapshot = () => {
    saveLocalListingDraft({
      id: listingId,
      title: listingLabel,
      address: draft.address || 'Address coming soon',
      price: draft.price,
      bedrooms: draft.beds,
      bathrooms: draft.baths,
      squareFeet: draft.sqft,
      description: draft.description,
      amenities: [],
      photos,
      createdAt: new Date().toISOString()
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadFromLocal = (message: string | null) => {
      const localDraft = getLocalListingDraft(listingId)
      const fallback = localDraft || {
        id: listingId,
        title: 'Draft Listing',
        address: 'Address coming soon',
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: 0,
        description: '',
        amenities: [],
        photos: [],
        createdAt: new Date().toISOString()
      }

      if (cancelled) return
      setIsLocalOnly(true)
      setListingStatus('draft')
      setDraft({
        address: fallback.address,
        price: fallback.price,
        beds: fallback.bedrooms,
        baths: fallback.bathrooms,
        sqft: fallback.squareFeet,
        description: fallback.description
      })
      setPhotos((fallback.photos || []).slice(0, 6))
      setSources([])
      setError(null)
      setNotice(message)
      setLoading(false)
    }

    const load = async () => {
      if (!listingId) {
        setError('Missing listing id.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      if (demoMode) {
        loadFromLocal(null)
        return
      }

      try {
        const payload = await fetchListingBuilderPayload(listingId)
        if (cancelled) return

        setIsLocalOnly(false)
        setNotice(null)
        setListingStatus(payload.listing.status || 'draft')
        setDraft({
          address: payload.listing.address || '',
          price: Number(payload.listing.price) || 0,
          beds: Number(payload.listing.beds) || 0,
          baths: Number(payload.listing.baths) || 0,
          sqft: Number(payload.listing.sqft) || 0,
          description: payload.listing.description || ''
        })
        setPhotos((payload.listing.photos || []).slice(0, 6))
        setSources(payload.brain_sources || [])
      } catch (loadError) {
        const localDraft = getLocalListingDraft(listingId)
        if (localDraft) {
          loadFromLocal('Live listing was unavailable, so local draft mode is active.')
          return
        }

        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load listing editor.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [demoMode, listingId])

  const updateDraft = (key: keyof ListingDraftState, value: string | number) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const addPhotoUrl = () => {
    const next = photoUrlInput.trim()
    if (!next) return
    if (photos.length >= 6) {
      toast.error('You can add up to 6 photos.')
      return
    }
    setPhotos((prev) => [...prev, next].slice(0, 6))
    setPhotoUrlInput('')
  }

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    if (photos.length >= 6) {
      toast.error('You can add up to 6 photos.')
      return
    }

    setUploadingPhoto(true)
    try {
      const nextUrl = demoMode || isLocalOnly ? URL.createObjectURL(file) : await uploadListingPhoto(file)
      if (!nextUrl) throw new Error('Upload did not return a photo URL.')
      setPhotos((prev) => [...prev, nextUrl].slice(0, 6))
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const addLocalSource = (input: { type: ListingBrainSourceType; title: string; status?: ListingBrainSourceStatus; content?: string | null; url?: string | null }) => {
    const timestamp = new Date().toISOString()
    const status = input.status || 'needs_retrain'
    setSources((prev) => [
      {
        id: `local-source-${Date.now()}`,
        type: input.type,
        title: input.title,
        status,
        trained_at: status === 'trained' ? timestamp : null,
        updated_at: timestamp,
        content: input.content ?? null,
        url: input.url ?? null
      },
      ...prev
    ])
  }

  const createSource = async (input: { type: ListingBrainSourceType; title: string; content?: string | null; url?: string | null }) => {
    const title = input.title.trim()
    if (!title) return

    if (demoMode || isLocalOnly) {
      addLocalSource({ ...input, title, status: 'needs_retrain' })
      return
    }

    setSourceBusy(true)
    try {
      const source = await createListingBuilderSource(listingId, {
        ...input,
        title,
        status: 'needs_retrain'
      })
      setSources((prev) => [source, ...prev])
    } catch (sourceError) {
      toast.error(sourceError instanceof Error ? sourceError.message : 'Could not add source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (demoMode || isLocalOnly) {
      setSources((prev) => prev.filter((source) => source.id !== sourceId))
      return
    }

    setSourceBusy(true)
    try {
      await deleteListingBuilderSource(listingId, sourceId)
      setSources((prev) => prev.filter((source) => source.id !== sourceId))
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Could not delete source.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleRetrain = async () => {
    if (sources.length === 0) return
    const nowIso = new Date().toISOString()

    if (demoMode || isLocalOnly) {
      setSources((prev) => prev.map((source) => ({ ...source, status: 'trained', trained_at: nowIso, updated_at: nowIso })))
      toast.success('Listing Brain retrained (demo/local mode).')
      return
    }

    setSourceBusy(true)
    try {
      const needsRetrain = sources.filter((source) => source.status !== 'trained')
      await Promise.all(
        needsRetrain.map((source) =>
          updateListingBuilderSource(listingId, source.id, {
            status: 'trained',
            trained_at: nowIso
          })
        )
      )

      const refreshed = await fetchListingBuilderPayload(listingId)
      setSources(refreshed.brain_sources || [])
      toast.success('Listing Brain retrained.')
    } catch (retrainError) {
      toast.error(retrainError instanceof Error ? retrainError.message : 'Retrain failed.')
    } finally {
      setSourceBusy(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (demoMode || isLocalOnly) {
        saveLocalSnapshot()
        toast.success('Draft saved locally.')
        return
      }

      await patchListingBuilder(listingId, {
        address: draft.address,
        price: Number(draft.price) || 0,
        beds: Number(draft.beds) || 0,
        baths: Number(draft.baths) || 0,
        sqft: Number(draft.sqft) || 0,
        description: draft.description,
        photos
      })

      const refreshed = await fetchListingBuilderPayload(listingId)
      setListingStatus(refreshed.listing.status || 'draft')
      setSources(refreshed.brain_sources || [])
      setNotice(null)
      toast.success('Listing saved.')
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save listing.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading listing editor…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-8">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate(buildListingPath('/listings'))}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              Back to Listings
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{listingLabel}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  statusLabel === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {statusLabel}
              </span>
            </div>
            {notice ? <p className="text-sm text-amber-700">{notice}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!canPublish || saving}
              onClick={() => toast.success('Publish flow will connect in Share Kit.')}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="material-symbols-outlined text-base">menu</span>
              {SECTIONS.find((section) => section.key === activeSection)?.label || 'Section'}
            </span>
            <span className="material-symbols-outlined text-base text-slate-500">
              {mobileMenuOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {mobileMenuOpen && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-1">
              {SECTIONS.map((section, index) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.key)
                    setMobileMenuOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold ${
                    activeSection === section.key ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                  }`}
                >
                  <span>{section.label}</span>
                  <span className="text-xs text-slate-400">Step {index + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="hidden gap-2 md:flex" aria-label="Listing editor sections">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeSection === section.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {activeSection === 'essentials' && (
          <section className="mt-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Essentials</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700 md:col-span-2">
                Address
                <input
                  value={draft.address}
                  onChange={(event) => updateDraft('address', event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Price
                <input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(event) => updateDraft('price', Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Beds
                <input
                  type="number"
                  min={0}
                  value={draft.beds}
                  onChange={(event) => updateDraft('beds', Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Baths
                <input
                  type="number"
                  min={0}
                  value={draft.baths}
                  onChange={(event) => updateDraft('baths', Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Sqft
                <input
                  type="number"
                  min={0}
                  value={draft.sqft}
                  onChange={(event) => updateDraft('sqft', Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              About this home
              <textarea
                rows={6}
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>
        )}

        {activeSection === 'photos' && (
          <section className="mt-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
            <p className="text-sm text-slate-600">Add up to 6 photos. First photo is primary.</p>

            {photos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No photos yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={photo} alt={`Listing photo ${index + 1}`} className="h-36 w-full object-cover" />
                    <div className="flex items-center justify-between border-t border-slate-200 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...photos]
                          const selected = next.splice(index, 1)[0]
                          next.unshift(selected)
                          setPhotos(next.slice(0, 6))
                        }}
                        className="text-xs font-semibold text-slate-700"
                      >
                        Make Primary
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index))}
                        className="text-xs font-semibold text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={photoUrlInput}
                onChange={(event) => setPhotoUrlInput(event.target.value)}
                placeholder="Paste photo URL"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addPhotoUrl}
                disabled={photos.length >= 6}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add URL
              </button>
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                disabled={photos.length >= 6 || uploadingPhoto}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>

            <input
              ref={photoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadPhoto}
            />
          </section>
        )}

        {activeSection === 'brain' && (
          <section className="mt-4 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Listing Brain</h2>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const value = window.prompt('Paste source text')
                  if (!value) return
                  const normalized = value.trim()
                  if (!normalized) return
                  void createSource({
                    type: 'text',
                    title: normalized.slice(0, 80),
                    content: normalized
                  })
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => docFileRef.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Upload Docs
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = window.prompt('Website URL')
                  if (!value) return
                  const normalized = value.trim()
                  if (!normalized) return
                  void createSource({
                    type: 'url',
                    title: normalized,
                    url: normalized
                  })
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Scan Website
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = window.prompt('Source title')
                  if (!value) return
                  const normalized = value.trim()
                  if (!normalized) return
                  void createSource({
                    type: 'text',
                    title: normalized
                  })
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                + Add Source
              </button>
            </div>

            <input
              ref={docFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                void createSource({
                  type: 'doc',
                  title: file.name
                })
              }}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Sources: {sources.length} • Last trained: {lastTrainedAt ? formatUpdatedTime(lastTrainedAt) : 'Not trained yet'}
            </div>

            <div className="rounded-lg border border-slate-200">
              {sources.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No sources yet. Add your first source above.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {sources.map((source) => (
                    <li key={source.id} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{source.title}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{sourceTypeLabel(source.type)}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            source.status === 'trained' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {source.status === 'trained' ? 'Trained' : 'Needs retrain'}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">{formatUpdatedTime(source.updated_at)}</p>
                        <button
                          type="button"
                          disabled={sourceBusy}
                          onClick={() => void handleDeleteSource(source.id)}
                          className="mt-1 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              disabled={sourceBusy || sources.length === 0}
              onClick={() => void handleRetrain()}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retrain Listing AI
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

export default ListingEditorPage
