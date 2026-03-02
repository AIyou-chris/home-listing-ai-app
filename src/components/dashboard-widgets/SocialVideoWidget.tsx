import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDemoMode } from '../../demo/useDemoMode'
import { subscribeDemoVideoUpdates } from '../../demo/demoData'
import {
  fetchDashboardVideoSignedUrl,
  fetchListingVideos,
  generateListingVideo,
  updateDemoVideoScenario
} from '../../services/dashboardCommandService'
import { supabase } from '../../services/supabase'
import { showToast } from '../../utils/toastService'

interface SocialVideoWidgetProps {
  listingId: string
  listingAddress: string
  listingLink: string
}

type WidgetStatus = 'default' | 'rendering' | 'ready' | 'limit_reached' | 'failed'
type DemoScenario = 'normal' | 'limit_reached' | 'failed_render'

interface ListingVideoRow {
  id: string
  status: string
  title?: string | null
  caption?: string | null
  file_name?: string | null
  mime_type?: string | null
  video_url?: string | null
  creatomate_url?: string | null
  created_at?: string | null
}

const creditsLabel = (remaining: number, total: number) => `${remaining}/${total}`

export default function SocialVideoWidget({ listingId, listingAddress, listingLink }: SocialVideoWidgetProps) {
  const demoMode = useDemoMode()
  const [status, setStatus] = useState<WidgetStatus>('default')
  const [creditsRemaining, setCreditsRemaining] = useState<number>(3)
  const [creditsTotal, setCreditsTotal] = useState<number>(3)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [templateStyle, setTemplateStyle] = useState<string>('luxury')
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [scenario, setScenario] = useState<DemoScenario>('normal')

  const captionTemplate = useMemo(
    () => `Just listed: ${listingAddress}. Get the 1-page report + showing options: ${listingLink}`,
    [listingAddress, listingLink]
  )

  const loadVideoData = useCallback(async () => {
    try {
      const data = await fetchListingVideos(listingId)
      const remaining = Number(data.credits_remaining ?? 0)
      const total = Number(data.credits_total ?? 3)
      const videos = Array.isArray(data.videos) ? (data.videos as ListingVideoRow[]) : []
      const latestVideo = videos[0] || null

      setCreditsRemaining(remaining)
      setCreditsTotal(total)

      if (demoMode && typeof data.scenario === 'string') {
        setScenario(data.scenario as DemoScenario)
      }

      if (!latestVideo) {
        setVideoId(null)
        setVideoUrl(null)
        setStatus(remaining <= 0 ? 'limit_reached' : 'default')
        return
      }

      setVideoId(latestVideo.id)

      const normalizedStatus = String(latestVideo.status || '').toLowerCase()
      if (normalizedStatus === 'processing' || normalizedStatus === 'pending' || normalizedStatus === 'queued' || normalizedStatus === 'rendering') {
        setVideoUrl(null)
        setStatus('rendering')
        return
      }

      if (normalizedStatus === 'failed') {
        setVideoUrl(null)
        setStatus('failed')
        return
      }

      if (normalizedStatus === 'completed' || normalizedStatus === 'ready' || normalizedStatus === 'succeeded') {
        let resolvedUrl = latestVideo.video_url || latestVideo.creatomate_url || null
        if (!resolvedUrl) {
          try {
            const signed = await fetchDashboardVideoSignedUrl(latestVideo.id)
            resolvedUrl = signed.signedUrl || null
          } catch {
            resolvedUrl = null
          }
        }
        setVideoUrl(resolvedUrl)
        setStatus('ready')
        return
      }

      setStatus(remaining <= 0 ? 'limit_reached' : 'default')
    } catch (error) {
      console.error('Failed to load listing video data:', error)
      setStatus('failed')
    }
  }, [demoMode, listingId])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true)
    }
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

  const handleGenerate = async () => {
    setStatus('rendering')
    try {
      await generateListingVideo(listingId, { template_style: templateStyle })
      void loadVideoData()
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      if (message.includes('credit') || message.includes('limit')) {
        setStatus('limit_reached')
        return
      }
      setStatus('failed')
    }
  }

  const handleDemoScenario = async (nextScenario: DemoScenario) => {
    setScenario(nextScenario)
    await updateDemoVideoScenario(listingId, nextScenario)
    await loadVideoData()
  }

  const handleShare = async () => {
    if (!videoUrl && !listingLink) return
    try {
      await navigator.share({
        title: 'Listing Video',
        text: captionTemplate,
        url: videoUrl || listingLink
      })
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionTemplate)
      setCopiedCaption(true)
      showToast.success('Copied')
      window.setTimeout(() => setCopiedCaption(false), 2000)
    } catch (error) {
      console.error('Failed to copy caption:', error)
    }
  }

  const handleDownload = async () => {
    if (!videoUrl) return
    try {
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `listing-${listingId}.mp4`
      link.click()
      showToast.success('Downloaded')
    } catch (error) {
      console.error('Failed to download video:', error)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-[#040814] p-6 text-sm font-sans">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">Social Video (15s)</h3>
        <p className="mt-1 text-sm text-slate-400">Turn listing photos into a post-ready Reel in seconds.</p>
        <div className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          Videos left for this listing: {creditsLabel(creditsRemaining, creditsTotal)}
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
          <select
            value={templateStyle}
            onChange={(event) => setTemplateStyle(event.target.value)}
            className="mb-4 h-12 w-full appearance-none rounded-lg border border-slate-700 bg-[#0B1121] px-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="luxury">Style: Luxury</option>
            <option value="country">Style: Country</option>
            <option value="fixer">Style: Fixer</option>
            <option value="story">Style: Story</option>
          </select>
          <button
            onClick={() => void handleGenerate()}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 font-bold text-white transition-colors hover:bg-blue-500"
          >
            Generate video
          </button>
          <span className="mt-3 block text-center text-xs text-slate-500">Silent video. Perfect for Reels/Shorts.</span>
        </div>
      )}

      {status === 'rendering' && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0B1121] py-8">
          <svg className="h-8 w-8 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
          </svg>
          <p className="mt-4 text-sm font-bold tracking-wide text-white">Rendering...</p>
          <p className="mt-1 text-xs text-slate-500">Usually ready in under a minute.</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[120px_1fr]">
          <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg">
            {videoUrl ? (
              <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="text-slate-600">No preview</div>
            )}
          </div>
          <div className="flex w-full flex-col gap-3">
            {canShare && (
              <button
                onClick={() => void handleShare()}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!videoUrl}
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
          </div>
        </div>
      )}

      {status === 'limit_reached' && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-500">Limit reached</p>
          <p className="mb-5 text-sm text-amber-200">You’ve used 3 videos for this listing.</p>
          <button className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400">
            Buy 3 more for $9
          </button>
          <button
            onClick={() => setStatus('default')}
            className="mt-4 block w-full text-center text-xs font-bold text-amber-500/80 transition-colors hover:text-amber-400"
          >
            Not now
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
          <p className="mb-1 text-sm font-bold tracking-wide text-rose-500">Video failed to render.</p>
          <p className="mb-5 text-xs text-rose-300/70">Try again in a moment.</p>
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

