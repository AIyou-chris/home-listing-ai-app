import React, { useEffect, useMemo, useState } from 'react';
import ViewingModal from './ViewingModal';
import { Property, isAIDescription } from '../types';
import SEO from './SEO';

interface PublicPropertyAppProps {
    property: Property;
    onExit: () => void;
    showBackButton?: boolean;
    onTalkToHome?: () => void;
}

type PublicAgentCardModel = {
    name: string;
    company: string;
    title: string;
    phone?: string;
    email?: string;
    website?: string;
    headshotUrl?: string;
};

const FALLBACK_AGENT: PublicAgentCardModel = {
    name: 'Listing Agent',
    company: 'HomeListingAI',
    title: 'Licensed Realtor®'
};

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'LA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const ActionPillButton: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="group inline-flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/60 bg-white/55 px-3 py-2 text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white/80 active:scale-95"
    >
        <span className="material-symbols-outlined text-[20px] transition group-hover:scale-105">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
);

const PublicPropertyApp: React.FC<PublicPropertyAppProps> = ({ property, onExit, showBackButton = true, onTalkToHome }) => {
    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join(' ')
        : (typeof property.description === 'string' ? property.description : '');

    const [modalSubState, setModalSubState] = useState<{
        viewing: boolean;
        gallery: boolean;
    }>({ viewing: false, gallery: false });

    const [galleryIndex, setGalleryIndex] = useState(0);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [contactOpen, setContactOpen] = useState(false);

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
    const agent = useMemo<PublicAgentCardModel>(() => {
        const raw = property.agent || ({} as Property['agent']);
        return {
            name: raw.name?.trim() || FALLBACK_AGENT.name,
            company: raw.company?.trim() || FALLBACK_AGENT.company,
            title: raw.title?.trim() || FALLBACK_AGENT.title,
            phone: raw.phone?.trim() || undefined,
            email: raw.email?.trim() || undefined,
            website: raw.website?.trim() || undefined,
            headshotUrl: raw.headshotUrl?.trim() || undefined
        };
    }, [property.agent]);
    const agentInitials = useMemo(() => getInitials(agent.name), [agent.name]);

    useEffect(() => {
        if (!hasMultiplePhotos || modalSubState.gallery) return;

        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [allPhotos.length, hasMultiplePhotos, modalSubState.gallery]);

    const backgroundImage = allPhotos[currentPhotoIndex] || property.imageUrl;

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: property.title,
                    text: `Check out this home: ${property.address}`,
                    url: window.location.href
                });
            } catch (_err) {
                // User canceled share sheet.
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        } catch (_error) {
            alert('Copy failed. Please copy the URL from your browser bar.');
        }
    };

    const handleFlyer = () => {
        const mediaUrl = (typeof property.ctaMediaUrl === 'string' ? property.ctaMediaUrl.trim() : '') || '';
        if (mediaUrl) {
            window.open(mediaUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        alert('Flyer download coming soon for this listing.');
    };

    const openGallery = () => {
        setGalleryIndex(currentPhotoIndex);
        setModalSubState((prev) => ({ ...prev, gallery: true }));
    };

    const handleShareContact = async () => {
        const contactText = [
            agent.name,
            agent.title,
            agent.company,
            agent.phone ? `Phone: ${agent.phone}` : '',
            agent.email ? `Email: ${agent.email}` : '',
            agent.website ? `Website: ${agent.website}` : '',
            `Listing: ${window.location.href}`
        ].filter(Boolean).join('\n');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${agent.name} — Listing Agent`,
                    text: contactText,
                    url: window.location.href
                });
                return;
            } catch (_error) {
                // User canceled share sheet.
            }
        }

        try {
            await navigator.clipboard.writeText(contactText);
            alert('Contact copied to clipboard.');
        } catch (_error) {
            alert('Unable to share contact right now.');
        }
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
        <div className="relative flex h-[100svh] min-h-[100svh] w-screen items-stretch justify-center overflow-hidden bg-slate-950 font-sans">
            <SEO
                title={property.title}
                description={descriptionText}
                image={property.imageUrl}
                schema={listingSchema}
            />

            <div className="relative flex h-[100svh] min-h-[100svh] w-[100vw] flex-col items-center overflow-hidden bg-white shadow-2xl md:my-4 md:h-[calc(100svh-2rem)] md:min-h-0 md:max-h-[920px] md:max-w-md md:rounded-[40px]">
                <div className="absolute inset-0 z-0">
                    <img src={backgroundImage} alt={property.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60"></div>
                </div>

                <div
                    className="absolute left-4 right-4 z-20 flex items-center justify-between md:left-6 md:right-6 md:top-6"
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
                >
                    {showBackButton && (
                        <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-lg backdrop-blur-md transition hover:bg-white/30">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-lg backdrop-blur-md transition hover:bg-white/30"
                    >
                        <span className="material-symbols-outlined text-lg">ios_share</span>
                    </button>
                </div>

                {onTalkToHome && (
                    <div
                        className="absolute left-4 right-4 z-20"
                        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' }}
                    >
                        <button
                            onClick={onTalkToHome}
                            className="w-full rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-slate-900/80 via-cyan-900/70 to-blue-900/70 px-4 py-3 text-center text-sm font-bold text-white shadow-xl backdrop-blur-xl transition hover:from-slate-900/90 hover:to-blue-800/80"
                        >
                            Talk to the Home
                        </button>
                    </div>
                )}

                <div className="absolute bottom-[13.75rem] left-4 right-4 z-20 md:bottom-36">
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-center text-white shadow-2xl backdrop-blur-xl">
                        <h2 className="mb-1 text-3xl font-bold tracking-tight text-shadow-sm">
                            ${property.price.toLocaleString('en-US')}
                        </h2>
                        <div className="mb-4 flex items-center justify-center gap-1 text-sm font-medium text-white/90">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            {property.address}
                        </div>

                        <div className="flex items-center justify-center gap-6 border-t border-white/20 pt-4">
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.bedrooms}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Beds</span>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.bathrooms}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Baths</span>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.squareFeet.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Sq Ft</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="absolute left-4 right-4 z-30 rounded-2xl border border-white/20 bg-slate-900/55 p-3 text-white shadow-2xl backdrop-blur-xl md:left-5 md:right-5"
                    style={{ bottom: 'calc(6.75rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="flex items-center gap-3">
                        {agent.headshotUrl ? (
                            <img
                                src={agent.headshotUrl}
                                alt={agent.name}
                                className="h-12 w-12 rounded-full border border-white/40 object-cover"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-white/10 text-sm font-bold">
                                {agentInitials}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{agent.name}</p>
                            <p className="truncate text-xs text-white/80">{agent.company}</p>
                            <p className="truncate text-[11px] text-white/70">{agent.title}</p>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => onTalkToHome?.()}
                            className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                        >
                            Chat
                        </button>
                        <button
                            type="button"
                            onClick={() => setContactOpen(true)}
                            className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                            Contact
                        </button>
                    </div>
                </div>

                <div
                    className="absolute bottom-0 left-0 right-0 z-30 flex h-28 items-center justify-around rounded-t-[32px] border-t border-white/40 bg-white/30 px-2 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
                >
                    <ActionPillButton icon="photo_library" label="Gallery" onClick={openGallery} />
                    <ActionPillButton icon="description" label="Flyer" onClick={handleFlyer} />
                    <ActionPillButton icon="share" label="Share" onClick={handleShare} />
                    <ActionPillButton icon="calendar_month" label="Showing" onClick={() => setModalSubState((prev) => ({ ...prev, viewing: true }))} />
                </div>

                {modalSubState.viewing && (
                    <ViewingModal
                        onClose={() => setModalSubState((prev) => ({ ...prev, viewing: false }))}
                        propertyAddress={property.address}
                        agentEmail={property.agent.email}
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
                                <img src={allPhotos[galleryIndex]} alt={`Listing photo ${galleryIndex + 1}`} className="h-[56vh] w-full object-cover" />
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
                                        <img src={photo} alt={`Thumbnail ${index + 1}`} className="h-14 w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {contactOpen && (
                    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 md:items-center" onClick={() => setContactOpen(false)}>
                        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-base font-bold">{agent.name}</p>
                                    <p className="text-sm text-white/75">{agent.title} • {agent.company}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setContactOpen(false)}
                                    className="rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
                                    aria-label="Close contact panel"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {agent.phone && (
                                    <a href={`tel:${agent.phone}`} className="block rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                                        Call {agent.phone}
                                    </a>
                                )}
                                {agent.email && (
                                    <a href={`mailto:${agent.email}`} className="block rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                                        Email {agent.email}
                                    </a>
                                )}
                                {agent.website && (
                                    <a href={agent.website} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                                        Visit website
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void handleShareContact()}
                                    className="w-full rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                                >
                                    Share contact
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicPropertyApp;
