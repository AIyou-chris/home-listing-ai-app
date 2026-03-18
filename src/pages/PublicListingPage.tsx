import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PublicPropertyApp from '../components/PublicPropertyApp';
import PublicListingChatModule from '../components/public/PublicListingChatModule';
import LoadingSpinner from '../components/LoadingSpinner';
import { Property } from '../types';
import { buildApiUrl } from '../lib/api';

const VISITOR_STORAGE_KEY = 'hlai_public_listing_visitor_id';
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
            title: String((payload.agent as Record<string, unknown> | undefined)?.title || 'Listing Specialist'),
            company: String((payload.agent as Record<string, unknown> | undefined)?.company || 'HomeListingAI'),
            phone: String((payload.agent as Record<string, unknown> | undefined)?.phone || ''),
            email: String((payload.agent as Record<string, unknown> | undefined)?.email || ''),
            headshotUrl: String((payload.agent as Record<string, unknown> | undefined)?.headshotUrl || ''),
            brandColor: String((payload.agent as Record<string, unknown> | undefined)?.brandColor || '#28a7e8'),
            socials: []
        },
        propertyType: 'Single Family',
        features: Array.isArray(payload.features) ? payload.features.filter((item): item is string => typeof item === 'string') : [],
        imageUrl,
        ctaListingUrl: typeof payload.ctaListingUrl === 'string' ? payload.ctaListingUrl : undefined,
        ctaMediaUrl: typeof payload.ctaMediaUrl === 'string' ? payload.ctaMediaUrl : undefined,
        ctaContactMode: typeof payload.ctaContactMode === 'string' ? payload.ctaContactMode as Property['ctaContactMode'] : 'form',
        agentId: typeof (payload.agent as Record<string, unknown> | undefined)?.id === 'string'
            ? String((payload.agent as Record<string, unknown>).id)
            : undefined
    };
};

const toPropertyFromBootstrapPayload = (
    listing: Record<string, unknown>,
    agent: Record<string, unknown> | null | undefined
): Property => {
    const photos = Array.isArray(listing.photos)
        ? listing.photos.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    const imageUrl = typeof listing.primary_photo === 'string' && listing.primary_photo
        ? listing.primary_photo
        : (photos[0] || '');
    const beds = Number(listing.beds ?? 0);
    const baths = Number(listing.baths ?? 0);
    const sqft = Number(listing.sqft ?? 0);
    const price = Number(listing.price ?? 0);

    return {
        id: String(listing.id || ''),
        title: String(listing.address || 'Listing'),
        address: String(listing.address || ''),
        price: Number.isFinite(price) ? price : 0,
        bedrooms: Number.isFinite(beds) ? beds : 0,
        bathrooms: Number.isFinite(baths) ? baths : 0,
        squareFeet: Number.isFinite(sqft) ? sqft : 0,
        status: 'Active',
        listedDate: undefined,
        description: '',
        heroPhotos: photos,
        galleryPhotos: photos,
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
            name: String(agent?.full_name || 'HomeListingAI Agent'),
            title: String(agent?.title || 'Listing Specialist'),
            company: String(agent?.company || 'HomeListingAI'),
            phone: String(agent?.phone || ''),
            email: String(agent?.email || ''),
            headshotUrl: String(agent?.headshot_url || ''),
            brandColor: String(agent?.brand_color || '#28a7e8'),
            socials: []
        },
        propertyType: 'Single Family',
        features: [],
        imageUrl,
        ctaListingUrl: typeof listing.share_url === 'string' ? listing.share_url : undefined,
        ctaMediaUrl: undefined,
        ctaContactMode: 'form',
        agentId: typeof agent?.id === 'string' ? String(agent.id) : undefined
    };
};

const normalizeRouteSlug = (value: string | undefined): string =>
    String(value || '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');

const PublicListingPage: React.FC = () => {
    const { id, publicSlug } = useParams<{ id?: string; publicSlug?: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notPublished, setNotPublished] = useState(false);
    const [talkToHomeOpen, setTalkToHomeOpen] = useState(false);
    const safePublicSlug = useMemo(() => normalizeRouteSlug(publicSlug), [publicSlug]);
    useEffect(() => {
        document.body.classList.add('public-listing-fullscreen');
        return () => {
            document.body.classList.remove('public-listing-fullscreen');
        };
    }, []);

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id && !safePublicSlug) {
                setError('Invalid property URL');
                setLoading(false);
                return;
            }

            try {
                setNotPublished(false);
                setError(null);
                let loaded: Property | null = null;

                if (safePublicSlug) {
                    const bootstrapUrl = buildApiUrl(`/api/public/listings/${encodeURIComponent(safePublicSlug)}/bootstrap`);
                    const response = await fetch(bootstrapUrl);
                    if (response.ok) {
                        const payload = await response.json() as {
                            listing?: Record<string, unknown>;
                            agent?: Record<string, unknown>;
                        };
                        if (payload.listing) loaded = toPropertyFromBootstrapPayload(payload.listing, payload.agent);
                    } else if (response.status === 404) {
                        // Fallback for older local/prod servers still on legacy public payload route.
                        const legacyUrl = buildApiUrl(`/api/public/listings/${encodeURIComponent(safePublicSlug)}`);
                        const legacyResponse = await fetch(legacyUrl);
                        if (legacyResponse.ok) {
                            const legacyPayload = await legacyResponse.json() as { listing?: Record<string, unknown> };
                            if (legacyPayload.listing) loaded = toPropertyFromPublicPayload(legacyPayload.listing);
                        } else if (legacyResponse.status === 404) {
                            setNotPublished(true);
                            return;
                        } else {
                            throw new Error(`public_listing_legacy_fetch_failed_${legacyResponse.status}`);
                        }
                    } else {
                        throw new Error(`public_listing_fetch_failed_${response.status}`);
                    }
                } else if (id) {
                    const response = await fetch(buildApiUrl(`/api/public/listings/id/${encodeURIComponent(id)}`));
                    if (response.status === 404) {
                        setNotPublished(true);
                        return;
                    }
                    if (response.ok) {
                        const payload = await response.json() as { listing?: Record<string, unknown> };
                        if (payload.listing) loaded = toPropertyFromPublicPayload(payload.listing);
                    } else {
                        throw new Error(`public_listing_fetch_failed_${response.status}`);
                    }
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
                const attributionPayload = {
                    source_key: sourceKey || 'link',
                    source_type: sourceKey
                        ? (sourceKey.includes('open_house')
                            ? 'open_house'
                            : (sourceKey.includes('social') ? 'social' : 'qr'))
                        : 'link',
                    utm_source: utmSource || null,
                    utm_medium: utmMedium || null,
                    utm_campaign: utmCampaign || null,
                    referrer: document.referrer || null
                };
                localStorage.setItem(`${ATTRIBUTION_STORAGE_PREFIX}${loaded.id}`, JSON.stringify(attributionPayload));
            } catch (err) {
                console.error('Failed to load public property:', err);
                setError('Unable to load property details');
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id, safePublicSlug, location.search]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#02050D]">
                <LoadingSpinner size="xl" text="Loading Property..." color="white" />
            </div>
        );
    }

    if (notPublished) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#02050D] text-slate-300 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10 flex max-w-xl flex-col items-center px-6 text-center">
                    <span className="material-symbols-outlined text-6xl mb-6 text-cyan-500/50">visibility_off</span>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Not published yet</h1>
                    <p className="mt-2 text-slate-400 font-light">This listing is still in draft mode. Publish it from your dashboard, then this link will work.</p>
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
                onTalkToHome={() => setTalkToHomeOpen(true)}
                publicSlug={safePublicSlug || undefined}
            />
            <PublicListingChatModule
                property={property}
                listingSlug={safePublicSlug || undefined}
                open={talkToHomeOpen}
                hideLauncher
                onOpenChange={setTalkToHomeOpen}
            />
        </>
    );
};

export default PublicListingPage;
