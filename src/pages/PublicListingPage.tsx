import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { listingsService } from '../services/listingsService';
import PublicPropertyApp from '../components/PublicPropertyApp';
import PublicListingChatModule from '../components/public/PublicListingChatModule';
import LoadingSpinner from '../components/LoadingSpinner';
import { Property } from '../types';
import { buildApiUrl } from '../lib/api';

const VISITOR_STORAGE_KEY = 'hlai_public_listing_visitor_id';
const SESSION_STORAGE_PREFIX = 'hlai_public_listing_session_';
const ATTRIBUTION_STORAGE_PREFIX = 'hlai_public_listing_attribution_';

const toPropertyFromPublicPayload = (payload: Record<string, unknown>): Property => {
    const heroPhotos = Array.isArray(payload.heroPhotos) ? payload.heroPhotos.filter((item): item is string => typeof item === 'string') : [];
    const galleryPhotos = Array.isArray(payload.galleryPhotos) ? payload.galleryPhotos.filter((item): item is string => typeof item === 'string') : [];
    const imageUrl = (typeof payload.imageUrl === 'string' && payload.imageUrl) || heroPhotos[0] || galleryPhotos[0] || '';
    return {
        id: String(payload.id || ''),
        title: String(payload.title || 'Listing'),
        address: String(payload.address || ''),
        price: Number(payload.price || 0),
        bedrooms: Number(payload.bedrooms || 0),
        bathrooms: Number(payload.bathrooms || 0),
        squareFeet: Number(payload.squareFeet || 0),
        status: String(payload.status || 'Active') as Property['status'],
        listedDate: undefined,
        description: (payload.description as string) || '',
        heroPhotos,
        galleryPhotos,
        appFeatures: {
            gallery: true,
            schools: true,
            financing: true,
            virtualTour: true,
            amenities: true,
            schedule: true,
            map: true,
            history: true,
            neighborhood: true,
            reports: true,
            messaging: true
        },
        agent: {
            name: String((payload.agent as Record<string, unknown> | undefined)?.name || 'HomeListingAI Agent'),
            title: 'Listing Specialist',
            company: 'HomeListingAI',
            phone: String((payload.agent as Record<string, unknown> | undefined)?.phone || ''),
            email: String((payload.agent as Record<string, unknown> | undefined)?.email || ''),
            headshotUrl: String((payload.agent as Record<string, unknown> | undefined)?.headshotUrl || ''),
            socials: []
        },
        propertyType: 'Single Family',
        features: Array.isArray(payload.features) ? payload.features.filter((item): item is string => typeof item === 'string') : [],
        imageUrl,
        ctaListingUrl: typeof payload.ctaListingUrl === 'string' ? payload.ctaListingUrl : undefined,
        ctaContactMode: typeof payload.ctaContactMode === 'string' ? payload.ctaContactMode as Property['ctaContactMode'] : 'form',
        agentId: typeof (payload.agent as Record<string, unknown> | undefined)?.id === 'string'
            ? String((payload.agent as Record<string, unknown>).id)
            : undefined
    };
};

const PublicListingPage: React.FC = () => {
    const { id, publicSlug } = useParams<{ id?: string; publicSlug?: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id && !publicSlug) {
                setError('Invalid property URL');
                setLoading(false);
                return;
            }

            try {
                let loaded: Property | null = null;

                if (publicSlug) {
                    const response = await fetch(buildApiUrl(`/api/public/listings/slug/${encodeURIComponent(publicSlug)}`));
                    if (response.ok) {
                        const payload = await response.json() as { listing?: Record<string, unknown> };
                        if (payload.listing) loaded = toPropertyFromPublicPayload(payload.listing);
                    }
                } else if (id) {
                    const response = await fetch(buildApiUrl(`/api/public/listings/${encodeURIComponent(id)}`));
                    if (response.ok) {
                        const payload = await response.json() as { listing?: Record<string, unknown> };
                        if (payload.listing) loaded = toPropertyFromPublicPayload(payload.listing);
                    }
                }

                if (!loaded && id) {
                    loaded = await listingsService.getPropertyById(id);
                }

                if (!loaded) {
                    setError('Property not found');
                    return;
                }

                setProperty(loaded);
                document.title = `${loaded.address} | HomeListingAI`;

                const params = new URLSearchParams(location.search || '');
                const sourceKey = params.get('src') || undefined;
                const utmSource = params.get('utm_source') || undefined;
                const utmMedium = params.get('utm_medium') || undefined;
                const utmCampaign = params.get('utm_campaign') || undefined;
                const existingVisitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
                const visitorId = existingVisitorId && existingVisitorId.trim().length > 0
                    ? existingVisitorId
                    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                        ? crypto.randomUUID()
                        : `visitor_${Date.now()}`);
                localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);

                const sessionResponse = await fetch(buildApiUrl(`/api/public/listings/${encodeURIComponent(loaded.id)}/session`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visitor_id: visitorId,
                        source_key: sourceKey,
                        source_type: sourceKey ? undefined : 'link',
                        utm_source: utmSource,
                        utm_medium: utmMedium,
                        utm_campaign: utmCampaign,
                        referrer: document.referrer || undefined,
                        landing_path: window.location.pathname + window.location.search
                    })
                });

                if (sessionResponse.ok) {
                    const sessionPayload = await sessionResponse.json() as {
                        conversation_id?: string;
                        visitor_id?: string;
                        attribution?: Record<string, unknown>;
                    };
                    if (sessionPayload.visitor_id) {
                        localStorage.setItem(VISITOR_STORAGE_KEY, sessionPayload.visitor_id);
                    }
                    if (sessionPayload.conversation_id) {
                        localStorage.setItem(`${SESSION_STORAGE_PREFIX}${loaded.id}`, sessionPayload.conversation_id);
                    }
                    const attributionPayload = {
                        source_key: sourceKey || sessionPayload.attribution?.source_key || 'link',
                        source_type: sourceKey
                            ? (sourceKey.includes('open_house')
                                ? 'open_house'
                                : (sourceKey.includes('social') ? 'social' : 'qr'))
                            : 'link',
                        utm_source: utmSource || sessionPayload.attribution?.utm_source || null,
                        utm_medium: utmMedium || sessionPayload.attribution?.utm_medium || null,
                        utm_campaign: utmCampaign || sessionPayload.attribution?.utm_campaign || null,
                        referrer: document.referrer || null
                    };
                    localStorage.setItem(`${ATTRIBUTION_STORAGE_PREFIX}${loaded.id}`, JSON.stringify(attributionPayload));
                }
            } catch (err) {
                console.error('Failed to load public property:', err);
                setError('Unable to load property details');
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id, publicSlug, location.search]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#02050D]">
                <LoadingSpinner size="xl" text="Loading Property..." color="white" />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#02050D] text-slate-300 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <span className="material-symbols-outlined text-6xl mb-6 text-cyan-500/50">home_work</span>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Property Not Found</h1>
                    <p className="mt-2 text-slate-400 font-light">{error || "This listing may have been removed or is unavailable."}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-8 px-8 py-3 bg-white text-slate-950 font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <PublicPropertyApp
                property={property}
                onExit={() => navigate('/')}
                showBackButton={false} // Clean look for standalone page
            />
            <PublicListingChatModule property={property} listingSlug={publicSlug} />
        </>
    );
};

export default PublicListingPage;
