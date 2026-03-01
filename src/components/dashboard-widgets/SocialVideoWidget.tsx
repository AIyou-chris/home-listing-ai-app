import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

interface SocialVideoWidgetProps {
    listingId: string;
    listingAddress: string;
    listingLink: string;
}

export default function SocialVideoWidget({ listingId, listingAddress, listingLink }: SocialVideoWidgetProps) {
    const [status, setStatus] = useState<'default' | 'rendering' | 'ready' | 'limit_reached' | 'failed'>('default');
    const [creditsRemaining, setCreditsRemaining] = useState<number>(3);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [templateStyle, setTemplateStyle] = useState<string>('Luxury');
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [canShare, setCanShare] = useState(false);

    const captionTemplate = `Just listed: ${listingAddress}. Get the 1-page report + showing options: ${listingLink}`;

    const fetchVideoData = useCallback(async () => {
        try {
            const res = await fetch(`/api/dashboard/listings/${listingId}/videos`);
            if (!res.ok) return;
            const data = await res.json();

            // data.credits_remaining, data.videos
            const credits = data.credits_remaining ?? 3;
            setCreditsRemaining(credits);

            const latestVideo = data.videos?.[0];

            if (latestVideo) {
                if (latestVideo.status === 'processing' || latestVideo.status === 'pending') {
                    setStatus('rendering');
                } else if (latestVideo.status === 'completed' || latestVideo.status === 'ready') {
                    setVideoUrl(latestVideo.video_url || latestVideo.creatomate_url);
                    setStatus('ready');
                } else if (latestVideo.status === 'failed') {
                    setStatus('failed');
                }
            } else {
                if (credits <= 0) {
                    setStatus('limit_reached');
                } else {
                    setStatus('default');
                }
            }
        } catch (err) {
            console.error('Failed to fetch videos:', err);
        }
    }, [listingId]);

    // 1. Initial Load & Setup
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            setCanShare(true);
        }
        fetchVideoData();

        // 3. Realtime Subscription
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
                (payload) => {
                    console.log('Realtime listing_video update:', payload);
                    fetchVideoData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchVideoData, listingId]);

    // 2. Generate Logic
    const handleGenerate = async () => {
        setStatus('rendering');
        try {
            const res = await fetch(`/api/dashboard/listings/${listingId}/videos/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template_style: templateStyle })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 402 || errData.error === 'Insufficient credits') {
                    setStatus('limit_reached');
                } else {
                    setStatus('failed');
                }
                return;
            }
            // Successfully queued
        } catch (err) {
            console.error('Generate error:', err);
            setStatus('failed');
        }
    };

    // 4. Actions
    const handleShare = async () => {
        try {
            await navigator.share({
                title: 'Listing Video',
                text: captionTemplate,
                url: videoUrl || listingLink
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    };

    const handleCopyCaption = async () => {
        try {
            await navigator.clipboard.writeText(captionTemplate);
            setCopiedCaption(true);
            setTimeout(() => setCopiedCaption(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    return (
        <div className="bg-[#040814] border border-slate-800 rounded-2xl p-6 text-sm font-sans mb-8">
            {/* Header always visible to provide context if limit_reached or failed replaces content */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Social Video (15s)
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </h3>
                <p className="text-sm text-slate-400 mt-1">Turn listing photos into a post-ready Reel in seconds.</p>
                <div className="inline-flex text-xs font-bold tracking-wider uppercase bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg mt-4 border border-slate-700">
                    Videos left for this listing: {creditsRemaining}/3
                </div>
            </div>

            {/* STATE ROUTER */}
            {status === 'default' && (
                <div className="mt-6">
                    <select
                        value={templateStyle}
                        onChange={(e) => setTemplateStyle(e.target.value)}
                        className="w-full h-12 border border-slate-700 bg-[#0B1121] text-white text-sm font-bold rounded-lg px-4 mb-4 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                        <option value="Luxury">Style: Luxury</option>
                        <option value="Country">Style: Country</option>
                        <option value="Fixer">Style: Fixer</option>
                        <option value="Story">Style: Story</option>
                    </select>

                    <button
                        onClick={handleGenerate}
                        className="w-full bg-blue-600 text-white font-bold flex items-center justify-center h-12 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        Generate video
                    </button>
                    <span className="text-xs text-slate-500 text-center block mt-3">Silent video. Perfect for Reels/Shorts.</span>
                </div>
            )}

            {status === 'rendering' && (
                <div className="flex flex-col items-center justify-center py-8 bg-[#0B1121] border border-slate-800 rounded-xl mt-6">
                    <svg className="animate-spin text-blue-500 w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm font-bold text-white mt-4 tracking-wide">Rendering...</p>
                    <p className="text-xs text-slate-500 mt-1">Usually ready in under a minute.</p>
                </div>
            )}

            {status === 'ready' && (
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-6 mt-6">
                    <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800 shadow-lg">
                        {videoUrl ? (
                            <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-slate-600">
                                <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        {canShare && (
                            <button onClick={handleShare} className="bg-blue-600 text-white hover:bg-blue-500 py-3 px-4 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-600/20">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                Share
                            </button>
                        )}

                        <a
                            href={videoUrl || "#"}
                            download
                            onClick={(e) => {
                                if (!videoUrl) e.preventDefault();
                            }}
                            className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 py-3 px-4 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download MP4
                        </a>

                        <button
                            onClick={handleCopyCaption}
                            className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 py-3 px-4 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            {copiedCaption ? 'Copied!' : 'Copy caption'}
                        </button>
                    </div>
                </div>
            )}

            {status === 'limit_reached' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mt-6">
                    <p className="text-sm text-amber-500 font-bold mb-2 flex items-center gap-2 tracking-wide uppercase">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Limit Reached
                    </p>
                    <p className="text-sm text-amber-200 mb-5">You’ve used 3 videos for this listing.</p>
                    <button className="w-full bg-amber-500 text-black py-3 rounded-lg text-sm font-bold hover:bg-amber-400 transition-colors">
                        Buy 3 more for $9
                    </button>
                    <button onClick={() => setStatus('default')} className="text-xs text-amber-500/70 hover:text-amber-400 font-bold w-full text-center mt-4 block transition-colors">
                        Not now
                    </button>
                </div>
            )}

            {status === 'failed' && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 mt-6 text-center pb-6">
                    <p className="text-sm text-rose-500 font-bold mb-1 tracking-wide">Video failed to render.</p>
                    <p className="text-xs text-rose-300/70 mb-5">Try again in a moment.</p>
                    <button
                        onClick={handleGenerate}
                        className="bg-rose-600 text-white hover:bg-rose-500 w-full rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Try again
                    </button>
                </div>
            )}

        </div>
    );
}
