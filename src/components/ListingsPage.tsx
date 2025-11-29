
import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Property, isAIDescription } from '../types';
import { createShortLink, ShortLink } from '../services/linkShortenerService';

interface PropertyCardProps {
    property: Property;
    onOpenBuilder: (id: string) => void;
    onDelete: () => void;
    onSelect: (id: string) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onOpenBuilder, onDelete, onSelect }) => {
    const [shortLink, setShortLink] = useState<ShortLink | null>(null);
    const [isShortLinkLoading, setIsShortLinkLoading] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

    useEffect(() => {
        const destination =
            typeof window !== 'undefined'
                ? `${window.location.origin}/demo/listings/${encodeURIComponent(property.id)}`
                : `https://demo.homelisting.ai/listings/${property.id}`;

        const slug =
            property.title
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 24) || `listing-${property.id}`;

        let cancelled = false;
        setIsShortLinkLoading(true);
        createShortLink({
            destination,
            slashtag: `listing-${slug}`,
            title: `Listing | ${property.title}`,
            description: `Listing generated for ${property.address}`
        })
            .then(result => {
                if (!cancelled) setShortLink(result);
            })
            .catch(error => {
                console.warn('[ListingsPage] Unable to create short link', error);
            })
            .finally(() => {
                if (!cancelled) setIsShortLinkLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [property.id, property.title, property.address]);

    const descriptionText = isAIDescription(property.description)
        ? property.description.title
        : (property.description || 'View details to learn more.');

    const handleSelect = () => onSelect(property.id);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect();
        }
    };

    return (
        <div
            className="bg-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
        >
            <div className="relative">
                <img className="h-56 w-full object-cover" src={property.imageUrl} alt={property.address} />
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    Active
                </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-white">{property.title}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sky-300 text-sm">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        {property.address}
                    </p>
                    
                    <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-2xl font-bold text-white">
                            <span className="material-symbols-outlined text-sky-400">payments</span>
                            <span>${property.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-semibold text-sky-300">
                             <span className="material-symbols-outlined text-sky-400">fullscreen</span>
                            <span>{property.squareFeet.toLocaleString()} squareFeet</span>
                        </div>
                    </div>

                    <div className="mt-2 flex items-center divide-x divide-slate-600 text-sm text-slate-300">
                        <div className="flex items-center gap-2 pr-3">
                            <span className="material-symbols-outlined text-base text-slate-400">bed</span>
                            <span>{property.bedrooms} bds</span>
                        </div>
                        <div className="flex items-center gap-2 px-3">
                             <span className="material-symbols-outlined text-base text-slate-400">bathtub</span>
                            <span>{property.bathrooms} ba</span>
                        </div>
                        <div className="flex items-center gap-2 pl-3">
                           <span className="material-symbols-outlined text-base text-slate-400">straighten</span>
                            <span>{property.squareFeet.toLocaleString()} squareFeet</span>
                        </div>
                    </div>
                    
                    <p className="mt-4 text-sm text-slate-400 leading-relaxed">{descriptionText}</p>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="grid grid-cols-1 gap-3 mb-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenBuilder(property.id); }}
                            className="w-full flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-slate-600 rounded-lg shadow-sm hover:bg-slate-700 transition"
                        >
                            <span className="material-symbols-outlined w-4 h-4">edit</span>
                            <span>Edit</span>
                        </button>
                    </div>
                    <div className="mb-3">
                        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800">
                                <LinkIcon className="w-3.5 h-3.5 text-sky-300" />
                            </span>
                            {isShortLinkLoading ? (
                                <span className="text-slate-400">Generating short link…</span>
                            ) : shortLink ? (
                                <>
                                    <span className="truncate">{shortLink.shortUrl}</span>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(shortLink.shortUrl);
                                                setCopyState('copied');
                                                setTimeout(() => setCopyState('idle'), 2000);
                                            } catch (error) {
                                                console.error('Copy failed', error);
                                                setCopyState('error');
                                                setTimeout(() => setCopyState('idle'), 2000);
                                            }
                                        }}
                                        className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-sky-300 hover:text-sky-200 transition"
                                    >
                                        {copyState === 'copied' ? (
                                            <>
                                                <Check className="w-3 h-3" />
                                                Copied
                                            </>
                                        ) : copyState === 'error' ? (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Retry
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <span className="text-slate-400">Short link unavailable.</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="w-full flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-rose-900 rounded-lg shadow-sm hover:bg-rose-800 transition"
                    >
                        <span className="material-symbols-outlined w-4 h-4">delete</span>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


interface ListingsPageProps {
    properties: Property[];
    onSelectProperty: (id: string) => void;
    onAddNew: () => void;
    onDeleteProperty: (id: string) => void;
    onBackToDashboard: () => void;
    onOpenBuilder: (id: string) => void;
    onSeedSample?: () => Promise<void> | void;
}

const ListingsPage: React.FC<ListingsPageProps> = ({ properties, onSelectProperty, onAddNew, onDeleteProperty, onBackToDashboard, onOpenBuilder, onSeedSample }) => {
    const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);

    return (
        <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
             <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                <span>Back to Dashboard</span>
            </button>
            <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">AI Listings</h1>
                    <p className="text-slate-500 mt-1">Manage your listings and their Listing Sidekick brains.</p>
                </div>
                <div className="flex items-center gap-2">
                    {onSeedSample && (
                        <button
                            onClick={() => void onSeedSample()}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                        >
                            Seed sample
                        </button>
                    )}
                    <button
                        onClick={onAddNew}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <span className="material-symbols-outlined h-5 w-5">add</span>
                        <span>Add New Listing</span>
                    </button>
                </div>
            </header>

            <div className="mb-8">
                <button
                    type="button"
                    onClick={() => setIsHelpPanelOpen(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                    aria-expanded={isHelpPanelOpen}
                >
                    <span className="material-symbols-outlined text-xl">{isHelpPanelOpen ? 'psychiatry' : 'help'}</span>
                    {isHelpPanelOpen ? 'Hide AI Listings Tips' : 'Show AI Listings Tips'}
                    <span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {isHelpPanelOpen && (
                    <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
                        <div>
                            <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">home_work</span>
                                Listing Playbook
                            </h2>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Keep data synced:</strong> Update price, status, and hero photos here—your AI site and AI Card stay in lockstep.</li>
                                <li><strong>Listing Sidekick:</strong> Launch the Sidekick from each tile to train property-specific talking points and FAQs.</li>
                                <li><strong>Media assets:</strong> Use the edit view to upload flyers, 3D tours, and feature sheets for instant sharing.</li>
                            </ul>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">qr_code</span>
                                QR & Marketing Assets
                            </h2>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Generate QR codes:</strong> Each listing gets a unique QR link for yard signs, open houses, and print materials.</li>
                                <li><strong>Campaign tracking:</strong> Clone the listing and adjust tracking tags to compare performance by channel.</li>
                                <li><strong>Pro tip:</strong> Drop the listing QR into the AI Conversations hub so follow-ups automatically reference the right property.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60 mb-8">
                <div className="relative flex-grow">
                    <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">search</span>
                    <input type="text" placeholder="Search listings by title, address, or city..." className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                </div>
            </div>
            
            <main>
                {properties.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {properties.map(prop => (
                            <PropertyCard 
                                key={prop.id} 
                                property={prop} 
                                onOpenBuilder={onOpenBuilder} 
                                onDelete={() => onDeleteProperty(prop.id)}
                                onSelect={onSelectProperty}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg shadow-md border border-slate-200/60">
                        <h2 className="text-xl font-semibold text-slate-700">No listings yet</h2>
                        <p className="text-slate-500 mt-2">Click "Add New Listing" to get started.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ListingsPage;
