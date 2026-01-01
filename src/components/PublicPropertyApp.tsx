import React, { useState } from 'react';
import ViewingModal from './ViewingModal'
import PropertyInfoModal from './PropertyInfoModal'
import { PublicSidekickModal } from './PublicSidekickModal'
import { Property, isAIDescription } from '../types';
import SEO from './SEO';

interface PublicPropertyAppProps {
    property: Property;
    onExit: () => void;
    showBackButton?: boolean;
}

const FeatureButton: React.FC<{ icon: string, label: string, onClick: () => void }> = ({ icon, label, onClick }) => {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center space-y-1.5 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center text-slate-800 transition-colors backdrop-blur-md border border-white/50 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide drop-shadow-sm">{label}</span>
        </button>
    );
};

const PublicPropertyApp: React.FC<PublicPropertyAppProps> = ({ property, onExit, showBackButton = true }) => {
    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join(' ')
        : (typeof property.description === 'string' ? property.description : '');

    const [modalSubState, setModalSubState] = useState<{
        viewing: boolean;
        info: boolean;
        talk: boolean;
    }>({ viewing: false, info: false, talk: false });

    // Schema for AIO (kept from original)
    const listingSchema = {
        "@context": "https://schema.org",
        "@type": ["SingleFamilyResidence", "RealEstateListing"],
        "name": property.title,
        "description": descriptionText.substring(0, 300),
        "address": property.address,
        "numberOfRooms": property.bedrooms,
        "numberOfBathroomsTotal": property.bathrooms,
        "floorSize": { "@type": "QuantitativeValue", "value": property.squareFeet, "unitCode": "FTK" },
        "price": property.price,
        "image": property.imageUrl,
        "offers": {
            "@type": "Offer",
            "price": property.price,
            "priceCurrency": "USD",
            "availability": property.status === 'Sold' ? "https://schema.org/Sold" : "https://schema.org/InStock"
        }
    };

    const handleListingClick = () => {
        if (property.ctaListingUrl) {
            window.open(property.ctaListingUrl, '_blank');
        } else {
            alert('Full listing link not configured.');
        }
    };

    const handleContactClick = () => {
        // user setting: ctaContactMode === 'sidekick' -> open AI Card (mocked as talk modal for now or external link if we knew it)
        // For this demo, let's treat "AI Card" as the Talk Modal (Voice Mode) or just reusing ViewingModal as contact form
        // The user prompt said: "contact information we have it either open the AI card or if the agent just wants a basic form"
        if (property.ctaContactMode === 'sidekick') {
            // In a real app, navigate to /card/:slug
            // For now, let's open the Talk Modal in Chat mode (as a proxy for 'contact AI')
            // Or Alert.
            alert('In production, this opens the Agent AI Business Card.');
        } else {
            // Basic form -> Reuse ViewingModal logic or similar
            // For now, toggle viewing modal but maybe we need a dedicated contact modal?
            // "we've already provided that" -> refers to ViewingModal? 
            setModalSubState(prev => ({ ...prev, viewing: true }));
        }
    };

    const backgroundImage = property.heroPhotos?.[0] && typeof property.heroPhotos[0] === 'string'
        ? property.heroPhotos[0]
        : property.imageUrl;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200 font-sans">
            <SEO
                title={property.title}
                description={descriptionText}
                image={property.imageUrl}
                schema={listingSchema}
            />

            {/* Mobile-first Container */}
            <div className="relative w-full max-w-md h-[850px] max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Hero Background */}
                <div className="absolute inset-0 z-0">
                    <img src={backgroundImage} alt={property.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60"></div>
                </div>

                {/* Top Controls */}
                <div className="absolute top-6 left-6 z-20">
                    {showBackButton && (
                        <button onClick={onExit} className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition shadow-lg">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                        </button>
                    )}
                </div>

                {/* Talk to Home Floating Button */}
                <div className="absolute top-24 z-20 animate-fade-in-up">
                    <button
                        onClick={() => setModalSubState(prev => ({ ...prev, talk: true }))}
                        className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/40 rounded-full shadow-2xl shadow-violet-900/30 group hover:scale-105 transition-all"
                    >
                        <span className="material-symbols-outlined text-white group-hover:animate-pulse">mic</span>
                        <span className="font-bold text-white tracking-wide">Talk to the Home</span>
                    </button>
                </div>

                {/* Glass Info Card Overlay */}
                <div className="absolute bottom-32 left-4 right-4 z-20">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-center text-white shadow-2xl">
                        <h2 className="text-3xl font-bold tracking-tight mb-1 text-shadow-sm">
                            ${property.price.toLocaleString('en-US')}
                        </h2>
                        <div className="flex items-center justify-center gap-1 text-white/90 text-sm font-medium mb-4">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            {property.address}
                        </div>

                        <div className="flex items-center justify-center gap-6 border-t border-white/20 pt-4">
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.bedrooms}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Beds</span>
                            </div>
                            <div className="w-px h-8 bg-white/20"></div>
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.bathrooms}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Baths</span>
                            </div>
                            <div className="w-px h-8 bg-white/20"></div>
                            <div className="text-center">
                                <span className="block text-xl font-bold">{property.squareFeet.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80">Sq Ft</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-white/30 backdrop-blur-xl border-t border-white/40 z-30 rounded-t-[32px] shadow-[0_-8px_32px_rgba(0,0,0,0.1)] flex items-center justify-around px-2 pb-4">
                    <FeatureButton icon="calendar_today" label="Showings" onClick={() => setModalSubState(prev => ({ ...prev, viewing: true }))} />
                    <FeatureButton icon="info" label="Info" onClick={() => setModalSubState(prev => ({ ...prev, info: true }))} />
                    <FeatureButton icon="public" label="Listing" onClick={handleListingClick} />
                    <FeatureButton icon="chat_bubble_outline" label="Contact" onClick={handleContactClick} />
                </div>

                {/* Modals */}
                {modalSubState.viewing && (
                    <ViewingModal
                        onClose={() => setModalSubState(prev => ({ ...prev, viewing: false }))}
                        propertyAddress={property.address}
                        agentEmail={property.agent.email}
                    />
                )}
                {modalSubState.info && (
                    <PropertyInfoModal
                        property={property}
                        onClose={() => setModalSubState(prev => ({ ...prev, info: false }))}
                    />
                )}
                {modalSubState.talk && (
                    <PublicSidekickModal
                        property={property}
                        onClose={() => setModalSubState(prev => ({ ...prev, talk: false }))}
                        initialMode="voice"
                    />
                )}

            </div>
        </div>
    );
};

export default PublicPropertyApp;