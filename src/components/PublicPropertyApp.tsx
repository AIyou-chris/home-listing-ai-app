import React, { useEffect, useMemo, useRef, useState } from 'react';
import ViewingModal from './ViewingModal';
import { Property, isAIDescription } from '../types';
import SEO from './SEO';
import AgentContactSheet, { type AgentContactInfo } from './public/AgentContactSheet';
import MortgageCalculator from './public/MortgageCalculator';
import { showToast } from '../utils/toastService';
import { buildPublicFlyerUrl, openInNewTab } from '../services/listingShareAssetsService';

export interface PublicListingLoBot {
    enabled: boolean;
    name?: string | null;
    photo?: string | null;
    company?: string | null;
}

interface PublicPropertyAppProps {
    property: Property;
    onExit: () => void;
    showBackButton?: boolean;
    onTalkToHome?: () => void;
    publicSlug?: string;
    isDemo?: boolean;
    loBot?: PublicListingLoBot | null;
    onAskFinancing?: () => void;
}

const FALLBACK_AGENT: AgentContactInfo = {
    name: 'HomeListingAI Agent',
    company: 'HomeListingAI',
    title: 'Listing Specialist'
};

const hexToRgb = (value: string) => {
    const normalized = value.replace('#', '').trim();
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16)
    };
};

const adjustColor = (value: string, amount: number) => {
    const rgb = hexToRgb(value);
    if (!rgb) return value;
    const clamp = (channel: number) => Math.max(0, Math.min(255, channel));
    const toHex = (channel: number) => clamp(channel).toString(16).padStart(2, '0');
    return `#${toHex(rgb.r + amount)}${toHex(rgb.g + amount)}${toHex(rgb.b + amount)}`;
};

const ActionPillButton: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="group inline-flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 shadow-sm transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
        <span className="material-symbols-outlined text-[20px] transition group-hover:scale-105">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
);

const toAgentContactInfo = (property: Property): AgentContactInfo => {
    const raw = property.agent || ({} as Property['agent']);
    return {
        name: raw.name?.trim() || FALLBACK_AGENT.name,
        company: raw.company?.trim() || FALLBACK_AGENT.company,
        title: raw.title?.trim() || FALLBACK_AGENT.title,
        phone: raw.phone?.trim() || undefined,
        email: raw.email?.trim() || undefined,
        website: raw.website?.trim() || undefined,
        headshotUrl: raw.headshotUrl?.trim() || undefined,
        brandColor: raw.brandColor?.trim() || '#28a7e8'
    };
};

const FINANCING_CHIPS = [
    '💬 What can I qualify for?',
    '📋 How do I get pre-approved?',
    '💰 Minimum down payment options'
];

const PublicPropertyApp: React.FC<PublicPropertyAppProps> = ({
    property,
    onExit,
    showBackButton = true,
    onTalkToHome,
    publicSlug,
    isDemo = false,
    loBot = null,
    onAskFinancing
}) => {
    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join(' ')
        : (typeof property.description === 'string' ? property.description : '');

    const [modalSubState, setModalSubState] = useState<{ viewing: boolean; gallery: boolean }>({
        viewing: false,
        gallery: false
    });
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [contactOpen, setContactOpen] = useState(false);
    const handledDeepLinkAction = useRef(false);

    // ── Collapsible description: clamp to ~250px until expanded ──
    const DESC_COLLAPSED_PX = 250;
    const [descExpanded, setDescExpanded] = useState(false);
    const [descOverflows, setDescOverflows] = useState(false);
    const descRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = descRef.current;
        if (!el) return;
        setDescOverflows(el.scrollHeight > DESC_COLLAPSED_PX + 8);
    }, [descriptionText]);

    const heroPhotosArray = useMemo(
        () => (property.heroPhotos?.filter((photo): photo is string => typeof photo === 'string') || []),
        [property.heroPhotos]
    );
    const galleryPhotosArray = useMemo(
        () => (property.galleryPhotos?.filter((photo): photo is string => typeof photo === 'string') || []),
        [property.galleryPhotos]
    );
    const allPhotos = useMemo(() => {
        const merged = [...heroPhotosArray, ...galleryPhotosArray].filter(Boolean);
        return merged.length > 0 ? merged : [property.imageUrl].filter(Boolean);
    }, [galleryPhotosArray, heroPhotosArray, property.imageUrl]);

    const hasMultiplePhotos = allPhotos.length > 1;
    const agent = useMemo(() => toAgentContactInfo(property), [property]);
    const brandColor = agent.brandColor || '#28a7e8';
    const agentCardStart = useMemo(() => adjustColor(brandColor, -60), [brandColor]);
    const agentInitial = (agent.name || 'A')[0]?.toUpperCase() || 'A';
    const websiteLabel = (agent.website || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const financingEnabled = Boolean(loBot?.enabled && onAskFinancing);

    useEffect(() => {
        if (!hasMultiplePhotos || modalSubState.gallery) return;

        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [allPhotos.length, hasMultiplePhotos, modalSubState.gallery]);

    useEffect(() => {
        if (handledDeepLinkAction.current || typeof window === 'undefined') return;
        handledDeepLinkAction.current = true;
        const action = new URLSearchParams(window.location.search).get('action');
        if (action === 'contact') {
            setContactOpen(true);
            return;
        }
        if (action === 'chat') {
            onTalkToHome?.();
        }
    }, [onTalkToHome]);

    const heroPhoto = allPhotos[currentPhotoIndex] || property.imageUrl;

    const handleFlyer = () => {
        const mediaUrl =
            (typeof property.ctaMediaUrl === 'string' ? property.ctaMediaUrl.trim() : '') ||
            buildPublicFlyerUrl({
                publicSlug: publicSlug || '',
                listingId: property.id,
                demo: isDemo
            });
        if (mediaUrl) {
            const opened = openInNewTab(mediaUrl);
            if (opened) {
                showToast.success('Opening flyer');
            } else {
                showToast.error('Could not open flyer.');
            }
            return;
        }
        showToast.error('Flyer is not ready for this listing.');
    };

    const openGallery = () => {
        setGalleryIndex(currentPhotoIndex);
        setModalSubState((prev) => ({ ...prev, gallery: true }));
    };

    const handleCallAgent = () => {
        if (agent.phone) {
            window.location.href = `tel:${agent.phone}`;
            return;
        }
        setContactOpen(true);
    };

    const listingSchema = {
        '@context': 'https://schema.org',
        '@type': ['SingleFamilyResidence', 'RealEstateListing'],
        name: property.title,
        description: descriptionText.substring(0, 300),
        address: property.address,
        numberOfRooms: property.bedrooms,
        numberOfBathroomsTotal: property.bathrooms,
        floorSize: { '@type': 'QuantitativeValue', value: property.squareFeet, unitCode: 'FTK' },
        price: property.price,
        image: property.imageUrl,
        offers: {
            '@type': 'Offer',
            price: property.price,
            priceCurrency: 'USD',
            availability: property.status === 'Sold' ? 'https://schema.org/Sold' : 'https://schema.org/InStock'
        }
    };

    return (
        <div className="public-listing-root relative flex h-[100dvh] min-h-[100dvh] w-screen items-stretch justify-center overflow-hidden bg-slate-950 font-sans">
            <SEO
                title={property.title}
                description={descriptionText}
                image={property.imageUrl}
                schema={listingSchema}
            />

            <div className="relative flex h-[100dvh] min-h-[100dvh] w-[100vw] flex-col overflow-hidden bg-[#f1f5f9] shadow-2xl dark:bg-[#050507] md:my-4 md:h-[calc(100svh-2rem)] md:min-h-0 md:max-h-[920px] md:max-w-md md:rounded-[40px]">

                {/* ── Scrollable WOW-style body ── */}
                <div
                    className="flex-1 overflow-y-auto"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8rem)', WebkitTapHighlightColor: 'transparent' }}
                >
                    {/* ── Listing card ── */}
                    <div className="px-3.5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' }}>
                        <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)] dark:bg-[#0f172a]">

                            {/* Photo with swipe dots */}
                            <div className="relative h-64 bg-slate-200 bg-cover bg-center dark:bg-slate-800" style={{ backgroundImage: `url('${heroPhoto}')` }}>
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />

                                {showBackButton && (
                                    <button
                                        onClick={onExit}
                                        className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/45"
                                        aria-label="Back"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                    </button>
                                )}

                                <span
                                    className={`absolute top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${showBackButton ? 'left-14' : 'left-3'}`}
                                    style={{ color: brandColor }}
                                >
                                    {property.status === 'Sold' ? 'Sold' : 'For Sale'}
                                </span>

                                {hasMultiplePhotos && (
                                    <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center gap-1.5">
                                        {allPhotos.slice(0, 8).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPhotoIndex(i)}
                                                aria-label={`Photo ${i + 1}`}
                                                className={`h-1.5 rounded-full transition-all ${i === currentPhotoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <button onClick={openGallery} className="absolute bottom-3.5 left-4 z-10 text-left text-white">
                                    <p className="text-[28px] font-black leading-none">${property.price.toLocaleString('en-US')}</p>
                                    <p className="mt-1 flex items-center gap-1 text-[12px] opacity-85">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        {property.address}
                                    </p>
                                </button>
                            </div>

                            {/* Talk to the Home CTA */}
                            {onTalkToHome && (
                                <>
                                    <button
                                        onClick={onTalkToHome}
                                        className="m-3.5 flex w-[calc(100%-1.75rem)] items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-extrabold text-white shadow-[0_8px_22px_rgba(40,167,232,0.35)] transition-transform active:scale-[0.99]"
                                        style={{ background: brandColor }}
                                    >
                                        💬 Talk to the Home
                                    </button>
                                    <p className="-mt-1.5 mb-3 px-3.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                        Ask this listing anything — like you would a person
                                    </p>
                                </>
                            )}

                            {/* Stats */}
                            <div className="flex justify-around border-t border-slate-100 py-4 dark:border-slate-800">
                                {[
                                    [property.bedrooms, 'BEDS'],
                                    [property.bathrooms, 'BATHS'],
                                    [property.squareFeet.toLocaleString(), 'SQFT']
                                ].map(([value, label]) => (
                                    <div key={String(label)} className="text-center">
                                        <b className="block text-[20px] font-extrabold text-slate-900 dark:text-slate-100">{value}</b>
                                        <span className="text-[10px] tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Agent card ── */}
                    <div
                        className="m-3.5 overflow-hidden rounded-[20px] p-[18px] text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)]"
                        style={{ background: `linear-gradient(135deg, ${agentCardStart}, ${brandColor})` }}
                    >
                        <div className="flex items-center gap-3.5">
                            {agent.headshotUrl ? (
                                <img
                                    src={agent.headshotUrl}
                                    alt={agent.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-[58px] w-[58px] flex-shrink-0 rounded-full border-2 border-white/40 object-cover"
                                />
                            ) : (
                                <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-black">
                                    {agentInitial}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xl font-black leading-none">{agent.name}</p>
                                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                                        Listing Agent
                                    </span>
                                </div>
                                <p className="mt-1 text-xs opacity-80">
                                    {agent.company}
                                </p>
                                {agent.nmlsNumber && <p className="mt-0.5 text-[11px] opacity-70">{agent.nmlsNumber}</p>}
                                {websiteLabel && <p className="mt-0.5 text-[11px] opacity-60">{websiteLabel}</p>}
                                {agent.title && <p className="mt-0.5 text-[11px] opacity-60">{agent.title}</p>}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={handleCallAgent}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-[13px] font-extrabold transition-all active:scale-95"
                                style={{ color: agentCardStart }}
                            >
                                📞 Call
                            </button>
                            <button
                                onClick={() => setContactOpen(true)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white transition-all active:scale-95"
                            >
                                ✉️ Message
                            </button>
                            <button
                                onClick={() => setModalSubState((prev) => ({ ...prev, viewing: true }))}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 py-2.5 text-[13px] font-extrabold text-white transition-all active:scale-95"
                            >
                                📅 Tour
                            </button>
                        </div>
                    </div>

                    {/* ── Description (collapsible — clamps to ~250px) ── */}
                    {descriptionText && (
                        <div className="m-3.5 rounded-[18px] bg-white p-[18px] text-sm leading-relaxed text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:bg-[#0f172a] dark:text-slate-400">
                            <div
                                ref={descRef}
                                className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
                                style={{ maxHeight: descExpanded || !descOverflows ? '9999px' : `${DESC_COLLAPSED_PX}px` }}
                            >
                                {descriptionText}
                                {descOverflows && !descExpanded && (
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#0f172a]" />
                                )}
                            </div>
                            {descOverflows && (
                                <button
                                    type="button"
                                    onClick={() => setDescExpanded(v => !v)}
                                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                                    aria-expanded={descExpanded}
                                >
                                    {descExpanded ? 'Show less' : 'Read more'}
                                    <span className={`material-symbols-outlined text-base transition-transform duration-300 ${descExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Mortgage Calculator ── */}
                    {property.price > 0 && (
                        <MortgageCalculator
                            price={property.price}
                            brandColor={brandColor}
                            showCta={financingEnabled}
                            ctaLabel="Ask About Financing"
                            autoDark
                            onGetPreApproved={() => onAskFinancing?.()}
                        />
                    )}

                    {/* ── Financing nudge — only when the listing has an LO bot ── */}
                    {financingEnabled && (
                        <div className="m-3.5 overflow-hidden rounded-[20px] shadow-[0_4px_20px_rgba(5,150,105,0.15)]">
                            <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-5 py-5 text-white">
                                <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">Financing</p>
                                <h3 className="mt-1 text-[18px] font-black leading-snug">Ready to know your number?</h3>
                                <p className="mt-2 text-[13px] leading-relaxed text-emerald-100">
                                    Chat with the AI financing assistant — ask about rates, programs, or what you qualify for. No forms. No hard credit pull.
                                </p>
                            </div>
                            <div className="space-y-2.5 bg-white px-5 pb-5 pt-4 dark:bg-[#0f172a]">
                                {FINANCING_CHIPS.map((chip) => (
                                    <button
                                        key={chip}
                                        onClick={() => onAskFinancing?.()}
                                        className="flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-[13px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-900/25 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                                    >
                                        {chip}
                                    </button>
                                ))}
                                <button
                                    onClick={() => onAskFinancing?.()}
                                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-extrabold text-white transition-all active:scale-[0.99]"
                                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
                                >
                                    Ask About Financing →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Financing by ── */}
                    {financingEnabled && loBot?.name && (
                        <div className="m-3.5 flex items-center gap-2.5 rounded-[13px] bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:bg-[#0f172a]">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Financing by</span>
                            {loBot.photo ? (
                                <img src={loBot.photo} alt={loBot.name} loading="lazy" decoding="async" className="h-[30px] w-[30px] flex-shrink-0 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">
                                    {loBot.name[0]}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold text-slate-600 dark:text-slate-300">{loBot.name}</p>
                                {loBot.company && <p className="truncate text-[11px] text-slate-400">{loBot.company}</p>}
                            </div>
                            <span className="flex-shrink-0 text-[11px] text-slate-400">Powers the AI →</span>
                        </div>
                    )}

                    <p className="mb-2 mt-4 text-center text-[10px] text-slate-400 dark:text-slate-600">Powered by HomeListingAI</p>
                </div>

                {/* ── Bottom action menu — unchanged ── */}
                <div
                    className="absolute bottom-0 left-0 right-0 z-30 flex h-28 items-center justify-around rounded-t-[32px] border-t border-slate-200 bg-white/90 px-2 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#0a0c12]/90"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
                >
                    <ActionPillButton icon="photo_library" label="Gallery" onClick={openGallery} />
                    <ActionPillButton icon="description" label="Flyer" onClick={handleFlyer} />
                    <ActionPillButton icon="contact_phone" label="Contact" onClick={() => setContactOpen(true)} />
                    <ActionPillButton icon="calendar_month" label="Showing" onClick={() => setModalSubState((prev) => ({ ...prev, viewing: true }))} />
                </div>

                {modalSubState.viewing && (
                    <ViewingModal
                        onClose={() => setModalSubState((prev) => ({ ...prev, viewing: false }))}
                        propertyAddress={property.address}
                        agentEmail={property.agent.email}
                        agentId={property.agentId}
                        listingId={property.id}
                    />
                )}

                {modalSubState.gallery && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setModalSubState((prev) => ({ ...prev, gallery: false }))}>
                        <div className="relative w-full max-w-3xl rounded-2xl bg-slate-950/95 p-4" onClick={(event) => event.stopPropagation()}>
                            <button
                                onClick={() => setModalSubState((prev) => ({ ...prev, gallery: false }))}
                                className="absolute right-3 top-3 rounded-full bg-white/20 p-1 text-white transition hover:bg-white/30"
                                aria-label="Close gallery"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>

                            <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-black">
                                <img src={allPhotos[galleryIndex]} alt={`Listing photo ${galleryIndex + 1}`} fetchPriority="high" decoding="async" className="h-[56vh] w-full object-cover" />
                            </div>

                            {allPhotos.length > 1 && (
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => setGalleryIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)}
                                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                                    >
                                        Prev
                                    </button>
                                    <p className="text-xs text-slate-300">{galleryIndex + 1} / {allPhotos.length}</p>
                                    <button
                                        onClick={() => setGalleryIndex((prev) => (prev + 1) % allPhotos.length)}
                                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                                {allPhotos.map((photo, index) => (
                                    <button
                                        key={`${photo}-${index}`}
                                        onClick={() => setGalleryIndex(index)}
                                        className={`overflow-hidden rounded-lg border ${galleryIndex === index ? 'border-cyan-300' : 'border-white/20'} transition`}
                                    >
                                        <img src={photo} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" className="h-14 w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <AgentContactSheet
                    open={contactOpen}
                    onClose={() => setContactOpen(false)}
                    agent={agent}
                    onOpenChat={() => {
                        setContactOpen(false);
                        onTalkToHome?.();
                    }}
                    onOpenFlyer={handleFlyer}
                />
            </div>
        </div>
    );
};

export default PublicPropertyApp;
