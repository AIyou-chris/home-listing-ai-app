import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDemoMode } from '../../demo/useDemoMode'
import { subscribeDemoVideoUpdates } from '../../demo/demoData'
import {
  fetchDashboardVideoStatus,
  fetchDashboardVideoSignedUrl,
  fetchListingVideos,
  generateListingVideo,
  updateDemoVideoScenario
} from '../../services/dashboardCommandService'
import {
  downloadVideoFromSignedUrl,
  getVideoSignedUrl,
  isNativeShareAvailable,
  shareVideo
} from '../../services/videoShareService'
import { supabase } from '../../services/supabase'
import { useDashboardRealtimeStore } from '../../state/useDashboardRealtimeStore'
import { showToast } from '../../utils/toastService'
import { copyToClipboard } from '../../services/listingShareAssetsService'

interface SocialVideoWidgetProps {
  listingId: string
  listingAddress: string
  listingLink: string
}

type WidgetStatus = 'default' | 'rendering' | 'finalizing' | 'ready' | 'failed'
type DemoScenario = 'normal' | 'limit_reached' | 'failed_render'

interface ListingVideoRow {
  id: string
  status: string
  template_style?: string | null
  error_message?: string | null
  title?: string | null
  caption?: string | null
  file_name?: string | null
  mime_type?: string | null
  video_url?: string | null
  storage_path?: string | null
  source_photos?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

const LOCAL_MOCK_VIDEO_KEY_PREFIX = 'hlai_local_mock_video_'
const LOCAL_SAMPLE_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
const DEFAULT_TEMPLATE_STYLE = 'luxury'
const POLL_TIMEOUT_MS = 120000
const RENDERING_KICK_DELAY_MS = 20000
const POLL_BACKOFF_STEPS_MS = [3000, 5000, 8000, 10000]

const normalizeStyle = (value: unknown): string => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return DEFAULT_TEMPLATE_STYLE
  return normalized
}

function isLocalVideoBypassEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.hostname !== 'localhost') return false
  const envValue = String(import.meta.env.VITE_LOCAL_VIDEO_BYPASS || 'true').trim().toLowerCase()
  return envValue !== 'false'
}

const normalizeErrorCode = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '')
  return message.trim().toLowerCase()
}

const formatVideoFailureHint = (value: string | null) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'render_timeout') return 'This render got stuck. Start a fresh one.'
  if (normalized === 'photos_required') return 'Add at least one photo, then try again.'
  if (normalized === 'ffmpeg_missing') return 'Video service is unavailable right now.'
  return 'Try again in a moment.'
}

export default function SocialVideoWidget({ listingId, listingAddress, listingLink }: SocialVideoWidgetProps) {
  const demoMode = useDemoMode()
  const [status, setStatus] = useState<WidgetStatus>('default')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [_templateStyle, setTemplateStyle] = useState<string>(DEFAULT_TEMPLATE_STYLE)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [scenario, setScenario] = useState<DemoScenario>('normal')
  const [actionError, setActionError] = useState<string | null>(null)
  const [latestErrorMessage, setLatestErrorMessage] = useState<string | null>(null)
  const [stageLabel, setStageLabel] = useState<string>('Rendering...')
  const [statusRefreshWarning, setStatusRefreshWarning] = useState<string | null>(null)
  const listingRealtimeSignal = useDashboardRealtimeStore((state) => state.listingSignalsById[listingId] || null)
  const canShare = useMemo(() => isNativeShareAvailable(), [])
  const localVideoBypass = isLocalVideoBypassEnabled()
  const kickRef = useRef<Record<string, number>>({})
  const generateLockRef = useRef(false)
  const debugMode = useMemo(
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('debug') === '1' : false),
    []
  )

  const captionTemplate = useMemo(
    () => `Just listed: ${listingAddress}. Get the 1-page report + showing options: ${listingLink}`,
    [listingAddress, listingLink]
  )

  const loadVideoData = useCallback(async () => {
    if (localVideoBypass) {
      const cached = window.localStorage.getItem(`${LOCAL_MOCK_VIDEO_KEY_PREFIX}${listingId}`)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { id?: string; url?: string }
          if (parsed?.id && parsed?.url) {
            setVideoId(parsed.id)
            setVideoUrl(parsed.url)
            setStatus('ready')
            return
          }
        } catch {
          // ignore local cache parsing errors
        }
      }

      setVideoId(null)
      setVideoUrl(null)
      setStatus('default')
      return
    }

    try {
      const data = await fetchListingVideos(listingId)
      const videos = Array.isArray(data.videos) ? (data.videos as ListingVideoRow[]) : []
      const latestVideo = videos[0] || null

      if (demoMode && typeof data.scenario === 'string') {
        setScenario(data.scenario as DemoScenario)
      }

      if (!latestVideo) {
        setTemplateStyle(DEFAULT_TEMPLATE_STYLE)
        setVideoId(null)
        setVideoUrl(null)
        setLatestErrorMessage(null)
        setStatusRefreshWarning(null)
        setStatus('default')
        return
      }

      setVideoId(latestVideo.id)
      setTemplateStyle(normalizeStyle(latestVideo.template_style))
      setLatestErrorMessage(latestVideo.error_message || null)

      const normalizedStatus = String(latestVideo.status || '').toLowerCase()
      if (normalizedStatus === 'processing' || normalizedStatus === 'pending' || normalizedStatus === 'queued' || normalizedStatus === 'rendering') {
        setVideoUrl(null)
        setStageLabel('Rendering...')
        setStatusRefreshWarning(null)
        setStatus('rendering')

        const createdAt = Date.parse(String(latestVideo.created_at || latestVideo.updated_at || new Date().toISOString()))
        const elapsed = Number.isFinite(createdAt) ? Date.now() - createdAt : 0
        const lastKickAt = kickRef.current[latestVideo.id] || 0
        if (elapsed > RENDERING_KICK_DELAY_MS && Date.now() - lastKickAt > RENDERING_KICK_DELAY_MS) {
          kickRef.current[latestVideo.id] = Date.now()
          void fetchDashboardVideoStatus(latestVideo.id).then((statusPayload) => {
            if (statusPayload.stage === 'finalizing') {
              setStageLabel('Finishing...')
              setStatus('finalizing')
            }
            if (String(statusPayload.status || '').toLowerCase() === 'failed') {
              setLatestErrorMessage(statusPayload.error_message || null)
              setStatus('failed')
            }
          }).catch(() => undefined)
        }
        return
      }

      if (normalizedStatus === 'failed') {
        setVideoUrl(null)
        setStatusRefreshWarning(null)
        setStatus('failed')
        return
      }

      if (normalizedStatus === 'completed' || normalizedStatus === 'ready' || normalizedStatus === 'succeeded') {
        let resolvedUrl = latestVideo.video_url || null
        if (!resolvedUrl) {
          try {
            const signed = await fetchDashboardVideoSignedUrl(latestVideo.id)
            resolvedUrl = signed.signedUrl || null
          } catch {
            resolvedUrl = null
          }
        }
        setVideoUrl(resolvedUrl)
        setStatusRefreshWarning(null)
        setStatus('ready')
        return
      }

      setStatusRefreshWarning(null)
      setStatus('default')
    } catch (error) {
      console.error('Failed to load listing video data:', error)
      if (localVideoBypass) {
        const cached = window.localStorage.getItem(`${LOCAL_MOCK_VIDEO_KEY_PREFIX}${listingId}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { id?: string; url?: string }
            if (parsed?.id && parsed?.url) {
              setVideoId(parsed.id)
              setVideoUrl(parsed.url)
              setStatus('ready')
              return
            }
          } catch {
            // ignore local cache parsing errors
          }
        }
        setStatus('default')
        return
      }
      setStatus('failed')
    }
  }, [demoMode, listingId, localVideoBypass])

  useEffect(() => {
    void loadVideoData()
  }, [loadVideoData])

  useEffect(() => {
    if (demoMode) {
      const unsubscribe = subscribeDemoVideoUpdates((updatedListingId) => {
        if (updatedListingId !== listingId) return
        void loadVideoData()
      })
      return () => {
        unsubscribe()
      }
    }

    const channel = supabase
      .channel(`videos-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_videos',
          filter: `listing_id=eq.${listingId}`
        },
        () => {
          void loadVideoData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [demoMode, listingId, loadVideoData])

  useEffect(() => {
    if (demoMode) return
    if (!listingRealtimeSignal) return
    void loadVideoData()
  }, [demoMode, listingRealtimeSignal, loadVideoData])

  const handleGenerate = async () => {
    if (generateLockRef.current) return
    generateLockRef.current = true
    setActionError(null)
    setLatestErrorMessage(null)
    setStatusRefreshWarning(null)
    try {
      if (localVideoBypass) {
        setStatus('rendering')
        setStageLabel('Rendering...')
        window.setTimeout(() => {
          const nextVideoId = `local-${Date.now()}`
          setVideoId(nextVideoId)
          setVideoUrl(LOCAL_SAMPLE_VIDEO_URL)
          window.localStorage.setItem(
            `${LOCAL_MOCK_VIDEO_KEY_PREFIX}${listingId}`,
            JSON.stringify({ id: nextVideoId, url: LOCAL_SAMPLE_VIDEO_URL })
          )
          setStatus('ready')
        }, 1000)
        return
      }

      setStatus('rendering')
      setStageLabel('Rendering...')
      const resolvedTemplateStyle = DEFAULT_TEMPLATE_STYLE
      setTemplateStyle(resolvedTemplateStyle)
      const generated = await generateListingVideo(listingId, { template_style: resolvedTemplateStyle })
      const generatedVideoId =
        generated && typeof generated === 'object' && 'video_id' in generated
          ? String((generated as { video_id?: string }).video_id || '').trim()
          : ''
      if (generatedVideoId) {
        setVideoId(generatedVideoId)
      }

      const startTime = Date.now()
      const pollVideoId = generatedVideoId || videoId
      if (!pollVideoId) {
        void loadVideoData()
        return
      }
      let pollBackoffIndex = 0

      while (Date.now() - startTime < POLL_TIMEOUT_MS) {
        let statusPayload: Awaited<ReturnType<typeof fetchDashboardVideoStatus>>
        try {
          statusPayload = await fetchDashboardVideoStatus(pollVideoId)
          setStatusRefreshWarning(null)
          pollBackoffIndex = 0
        } catch (pollError) {
          const nextDelay = POLL_BACKOFF_STEPS_MS[Math.min(pollBackoffIndex, POLL_BACKOFF_STEPS_MS.length - 1)]
          pollBackoffIndex = Math.min(pollBackoffIndex + 1, POLL_BACKOFF_STEPS_MS.length - 1)
          setStatus('rendering')
          setStageLabel('Rendering...')
          setStatusRefreshWarning('Having trouble refreshing status... retrying')
          await new Promise((resolve) => window.setTimeout(resolve, nextDelay))
          continue
        }
        const normalizedStage = String(statusPayload.stage || '').toLowerCase()
        const normalizedStatus = String(statusPayload.status || '').toLowerCase()

        if (normalizedStage === 'finalizing') {
          setStageLabel('Finishing...')
          setStatus('finalizing')
        } else if (normalizedStage === 'ffmpeg_rendering') {
          setStageLabel('Rendering...')
          setStatus('rendering')
        } else if (normalizedStatus === 'rendering' || normalizedStatus === 'queued') {
          setStageLabel('Rendering...')
          setStatus('rendering')
        }

        if (normalizedStatus === 'failed') {
          setLatestErrorMessage(statusPayload.error_message || null)
          setStatus('failed')
          return
        }

        if (normalizedStatus === 'succeeded') {
          await loadVideoData()
          return
        }

        const nextDelay = POLL_BACKOFF_STEPS_MS[Math.min(pollBackoffIndex, POLL_BACKOFF_STEPS_MS.length - 1)]
        await new Promise((resolve) => window.setTimeout(resolve, nextDelay))
      }

      setStatusRefreshWarning('Having trouble refreshing status... retrying')
      void loadVideoData()
    } catch (error) {
      const code = normalizeErrorCode(error)
      if (code === 'no_credits' || code === 'no_credits_remaining') {
        setStatus('default')
        setActionError('Video credits are disabled for now — try generating again.')
        showToast.error('Video credits are disabled for now — try generating again.')
        return
      }
      if (code === 'payment_required') {
        setStatus('default')
        setActionError('Payment required — update billing to continue.')
        showToast.error('Payment required — update billing to continue.')
        return
      }
      if (code === 'no_photos') {
        setStatus('default')
        setActionError('Add at least one photo before generating a video.')
        showToast.error('Add at least one photo before generating a video.')
        return
      }
      if (code === 'not_published') {
        setStatus('default')
        setActionError('Publish this listing before generating a video.')
        showToast.error('Publish this listing before generating a video.')
        return
      }
      if (code === 'render_failed') {
        setStatus('failed')
        setActionError('Render failed — please try again.')
        showToast.error('Render failed — please try again.')
        return
      }
      setStatus('failed')
      setActionError('Could not generate video.')
      showToast.error('Could not generate video.')
    } finally {
      generateLockRef.current = false
    }
  }

  const handleDemoScenario = async (nextScenario: DemoScenario) => {
    setScenario(nextScenario)
    await updateDemoVideoScenario(listingId, nextScenario)
    await loadVideoData()
  }

  const handleShare = async () => {
    if (!videoId) return
    try {
      await shareVideo({
        videoId,
        captionText: captionTemplate,
        listingLink,
        title: 'Listing video',
        fileName: `listing-${listingId}.mp4`
      })
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const handleCopyCaption = async () => {
    try {
      await copyToClipboard(captionTemplate)
      setCopiedCaption(true)
      showToast.success('Copied')
      window.setTimeout(() => setCopiedCaption(false), 2000)
    } catch (error) {
      console.error('Failed to copy caption:', error)
    }
  }

  const handleDownload = async () => {
    if (!videoId) return
    try {
      // Local bypass: videoId is a mock ID that doesn't exist in the DB — use the URL directly
      if (localVideoBypass && videoId.startsWith('local-') && videoUrl) {
        await downloadVideoFromSignedUrl(videoUrl, `listing-${listingId}.mp4`)
        showToast.success('Downloaded')
        return
      }
      const signed = await getVideoSignedUrl(videoId, 1800)
      await downloadVideoFromSignedUrl(signed.signedUrl, signed.fileName || `listing-${listingId}.mp4`)
      showToast.success('Downloaded')
    } catch (error) {
      console.error('Failed to download video:', error)
      showToast.error('Download failed — try again.')
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-[#040814] p-6 text-sm font-sans">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">Social Video (15s)</h3>
        <p className="mt-1 text-sm text-slate-400">Turn listing photos into a post-ready Reel in seconds.</p>
        {actionError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
            {actionError}
          </div>
        )}
        <div className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          Unlimited video generation (beta)
        </div>
      </div>

      {demoMode && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-[#0B1121] p-3">
          <button
            type="button"
            onClick={() => void handleDemoScenario('normal')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scenario === 'normal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => void handleDemoScenario('limit_reached')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scenario === 'limit_reached' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-200'}`}
          >
            Limit reached
          </button>
          <button
            type="button"
            onClick={() => void handleDemoScenario('failed_render')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scenario === 'failed_render' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            Failed render
          </button>
        </div>
      )}

      {status === 'default' && (
        <div className="mt-4">
          <button
            onClick={() => void handleGenerate()}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 font-bold text-white transition-colors hover:bg-blue-500"
          >
            Generate Reel
          </button>
          <span className="mt-3 block text-center text-xs text-slate-500">Usually ready in under a minute.</span>
        </div>
      )}

      {(status === 'rendering' || status === 'finalizing') && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0B1121] py-8">
          <svg className="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
          </svg>
          <p className="mt-4 text-sm font-bold tracking-wide text-white">{stageLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Usually ready in under a minute.</p>
          {statusRefreshWarning && <p className="mt-2 text-xs text-amber-300">{statusRefreshWarning}</p>}
        </div>
      )}

      {status === 'ready' && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[120px_1fr]">
          {localVideoBypass && videoId?.startsWith('local-') && (
            <div className="col-span-full rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
              Local dev mode — showing placeholder video. Deploy to production to generate real videos with listing photos.
            </div>
          )}
          <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg">
            {videoUrl ? (
              <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="text-slate-600">No preview</div>
            )}
          </div>
          <div className="flex w-full flex-col gap-3">
            {canShare ? (
              <button
                onClick={() => void handleShare()}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                Share
              </button>
            ) : (
              <button
                onClick={() => {
                  void copyToClipboard(listingLink).then(() => showToast.success('Listing link copied!')).catch(() => showToast.error('Could not copy link.'))
                }}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                Copy listing link
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!videoId}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-3 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              Download MP4
            </button>
            <button
              onClick={() => void handleCopyCaption()}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-3 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-700"
            >
              {copiedCaption ? 'Copied!' : 'Copy caption'}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-700 bg-[#0B1121] py-3 px-4 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-950"
            >
              Regenerate video (latest photos)
            </button>
            <p className="text-[11px] text-slate-500">Tip: save photo changes in the listing editor first, then regenerate.</p>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
          <p className="mb-1 text-sm font-bold tracking-wide text-rose-500">Video failed to render.</p>
          <p className="mb-5 text-xs text-rose-300/70">{formatVideoFailureHint(latestErrorMessage)}</p>
          {debugMode && latestErrorMessage && (
            <p className="mb-3 text-[11px] text-slate-400">{latestErrorMessage}</p>
          )}
          <button
            onClick={() => void handleGenerate()}
            className="w-full rounded-lg bg-rose-600 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500"
          >
            Try again
          </button>
        </div>
      )}

      {videoId && <p className="mt-3 text-[11px] text-slate-500">Video ID: {videoId}</p>}
    </div>
  )
}
