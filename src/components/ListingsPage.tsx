import React, { useState } from 'react';
import { Property } from '../types';
import PageTipBanner from './PageTipBanner';
import { PublicSidekickModal } from './PublicSidekickModal';

interface PropertyCardProps {
    property: Property;
    onSelect: () => void;
    onDelete: () => void;
    onOpenMarketing?: () => void;
    onOpenBuilder?: () => void;
    onEdit?: () => void;
}

interface ContactFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, string>) => void;
    propertyName: string;
}

const ContactFormModal: React.FC<ContactFormModalProps> = ({ isOpen, onClose, onSubmit, propertyName }) => {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, gather form data here
        onSubmit({});
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>

                <h3 className="text-xl font-bold text-white mb-1">Contact Agent</h3>
                <p className="text-sm text-slate-200 mb-6">Inquire about {propertyName}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input type="text" placeholder="Name" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition" />
                    </div>
                    <div>
                        <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition" />
                    </div>
                    <div>
                        <input type="tel" placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition" />
                    </div>
                    <div>
                        <textarea rows={3} placeholder="I'm interested in this property..." className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 focus:border-white/40 transition resize-none" />
                    </div>
                    <button type="submit" className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition shadow-lg mt-2">
                        Send to Agent
                    </button>
                </form>
            </div>
        </div>
    );
};

interface MarketingModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    onGoToMarketing: () => void;
}

const MarketingModal: React.FC<MarketingModalProps> = ({ isOpen, onClose, property, onGoToMarketing }) => {
    const [shortUrl, setShortUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const generateShortLink = React.useCallback(async () => {
        setIsLoading(true);
        const baseUrl = window.location.origin;
        const longUrl = `${baseUrl}/listings/${property.id}`;
        try {
            // 1. Get short Link
            const res = await fetch(`${baseUrl}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: longUrl })
            });
            const data = await res.json();
            const link = (data.success && data.shortUrl) ? data.shortUrl : longUrl;
            setShortUrl(link);

            // 2. Generate QR Code for Short Link
            // Use simple API fallback for listing since we don't have a specific backend endpoint for listing QRs yet
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
            setQrCodeUrl(qrApiUrl);

        } catch (err) {
            console.error('Marketing tool error', err);
            setShortUrl(longUrl);
        } finally {
            setIsLoading(false);
        }
    }, [property.id]);

    React.useEffect(() => {
        if (isOpen && !shortUrl) {
            generateShortLink();
        }
    }, [isOpen, shortUrl, generateShortLink]);



    const handleCopyLink = () => {
        if (shortUrl) {
            navigator.clipboard.writeText(shortUrl);
            alert('Link copied!');
        }
    };

    const handleDownloadQr = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `listing-qr-${property.address.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-white">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>

                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
                        <span className="material-symbols-outlined text-2xl text-white">campaign</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">Marketing Tools</h3>
                    <p className="text-sm text-slate-400">Promote your listing anywhere</p>
                </div>

                {isLoading ? (
                    <div className="h-40 flex items-center justify-center">
                        <span className="material-symbols-outlined animate-spin text-3xl text-indigo-500">sync</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* URL Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Short Link</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 truncate font-mono">
                                    {shortUrl}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                </button>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Smart QR Code</label>
                            <div className="bg-white p-4 rounded-2xl flex flex-col items-center gap-4">
                                {qrCodeUrl && (
                                    <img src={qrCodeUrl} alt="Listing QR Code" className="w-40 h-40 mix-blend-multiply" />
                                )}
                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={handleDownloadQr}
                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg text-sm transition flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Download PNG
                                    </button>
                                    <button
                                        onClick={onGoToMarketing}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                                        Full Marketing Suite
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onSelect,
    onDelete,
    onOpenMarketing: _onOpenMarketing,
    onOpenBuilder: _onOpenBuilder, // Unused
    onEdit
}) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete ${property.address}?`)) {
            onDelete();
        }
    };
    const [showContactForm, setShowContactForm] = useState(false);
    const [showMarketing, setShowMarketing] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Fallback image if property.imageUrl is missing or broken
    const displayImage = property.imageUrl || property.heroPhotos?.[0] || 'https://images.unsplash.com/photo-1600596542815-27b88e31e976?q=80&w=2000&auto-format&fit=crop';
    const imageSrc = typeof displayImage === 'string' ? displayImage : (displayImage instanceof File ? URL.createObjectURL(displayImage) : '');

    const handleActionClick = (e: React.MouseEvent, action: string) => {
        e.stopPropagation();
        if (action === 'Showings') {
            alert('Opening appointment scheduler...');
        } else if (action === 'Info') {
            onSelect();
        } else if (action === 'Listing') {
            if (property.ctaListingUrl) {
                window.open(property.ctaListingUrl, '_blank');
            } else {
                alert('No full listing URL configured.');
            }
        } else if (action === 'Contact') {
            if (property.ctaContactMode === 'form') {
                setShowContactForm(true);
            } else {
                // Default to Sidekick
                onSelect();
            }
        }
    };

    const handleFormSubmit = () => {
        setShowContactForm(false);
        alert('Message sent to agent!');
    };



    return (
        <div
            className="group relative w-full h-[80vh] md:h-[85vh] max-h-[900px] rounded-none sm:rounded-[2rem] overflow-hidden shadow-2xl shrink-0 snap-center cursor-pointer transition-transform duration-500 hover:scale-[1.01]"
            onClick={onSelect}
        >
            {/* Full Screen Image */}
            <div className="absolute inset-0 bg-slate-200">
                {imageSrc && (
                    <img
                        src={imageSrc}
                        alt={property.address}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                            // Fallback on error
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
            </div>

            <ContactFormModal
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
                onSubmit={handleFormSubmit}
                propertyName={property.address}
            />

            <MarketingModal
                isOpen={showMarketing}
                onClose={() => setShowMarketing(false)}
                property={property}
                onGoToMarketing={() => onSelect()}
            />

            {showChat && (
                <PublicSidekickModal
                    property={property}
                    onClose={() => setShowChat(false)}
                    initialMode="chat"
                />
            )}

            {/* Status Badge & Edit Button */}
            <div className="absolute top-6 right-6 flex gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition"
                >
                    <span className="material-symbols-outlined text-xs">edit</span>
                </button>
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider shadow-lg border border-white/20 flex items-center">
                    Active
                </span>
            </div>

            {/* Main Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col items-center justify-end h-full pb-12">

                {/* 'Talk to the Home' Magic Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowChat(true);
                    }}
                    className="relative group/btn mb-8 px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20 flex items-center gap-3 transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
                >
                    <span className="material-symbols-outlined text-yellow-200 animate-pulse">auto_awesome</span>
                    <span className="text-white font-bold text-lg tracking-wide">Talk to the Home</span>
                </button>

                {/* Glass Info Card */}
                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-white mb-6">
                    <div className="text-center mb-4">
                        <h2 className="text-3xl font-bold tracking-tight text-white shadow-black/10 drop-shadow-md">
                            ${property.price.toLocaleString()}
                        </h2>
                        <p className="text-slate-200 text-sm mt-1 font-medium tracking-wide flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-base">location_on</span>
                            {property.address}
                        </p>
                    </div>

                    <div className="flex justify-center items-center gap-8 text-sm font-semibold text-slate-100">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{property.bedrooms}</span>
                            <span className="text-xs uppercase text-slate-400">Beds</span>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{property.bathrooms}</span>
                            <span className="text-xs uppercase text-slate-400">Baths</span>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{property.squareFeet.toLocaleString()}</span>
                            <span className="text-xs uppercase text-slate-400">Sq Ft</span>
                        </div>
                    </div>
                </div>

                {/* Circular Glass Actions - Now 4 Buttons */}
                <div className="flex items-center gap-5 md:gap-8">
                    <button
                        onClick={(e) => handleActionClick(e, 'Showings')}
                        className="flex flex-col items-center gap-2 group/action"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover/action:bg-white/20 group-active/action:scale-90">
                            <span className="material-symbols-outlined text-white text-xl md:text-2xl">calendar_month</span>
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">Showings</span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(); // 'Info' opens detail view (Sidekick for now)
                        }}
                        className="flex flex-col items-center gap-2 group/action"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover/action:bg-white/20 group-active/action:scale-90">
                            <span className="material-symbols-outlined text-white text-xl md:text-2xl">info</span>
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">Info</span>
                    </button>

                    <button
                        onClick={(e) => handleActionClick(e, 'Listing')}
                        className="flex flex-col items-center gap-2 group/action"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover/action:bg-white/20 group-active/action:scale-90">
                            <span className="material-symbols-outlined text-white text-xl md:text-2xl">language</span>
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">Listing</span>
                    </button>

                    <button
                        onClick={(e) => handleActionClick(e, 'Contact')}
                        className="flex flex-col items-center gap-2 group/action"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover/action:bg-white/20 group-active/action:scale-90">
                            <span className="material-symbols-outlined text-white text-xl md:text-2xl">chat_bubble</span>
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">Contact</span>
                    </button>
                </div>

                {/* Admin Actions Row */}
                <div className="w-full mt-6 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onEdit) onEdit();
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-400/50 text-indigo-300 font-semibold text-sm hover:bg-indigo-500/10 transition flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        Edit Listing
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMarketing(true);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-indigo-400/50 text-indigo-300 font-semibold text-sm hover:bg-indigo-500/10 transition flex items-center justify-center gap-2"
                        title="Get Short Link & QR"
                    >
                        <span className="material-symbols-outlined text-lg">qr_code_2</span>
                    </button>

                    <button
                        onClick={handleDelete}
                        className="px-4 py-2.5 rounded-xl text-red-300/80 font-medium text-sm hover:bg-red-500/10 hover:text-red-300 transition flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ListingsPageProps {
    properties: Property[];
    onSelectProperty: (id: string, action?: 'edit' | 'view') => void;
    onAddNew: () => void;
    onDeleteProperty: (id: string) => void;
    onBackToDashboard: () => void;
    onOpenMarketing?: (id: string) => void;
    onOpenBuilder?: (id: string) => void;
}

const ListingsPage: React.FC<ListingsPageProps> = ({
    properties,
    onSelectProperty,
    onAddNew,
    onDeleteProperty,
    onBackToDashboard: _onBackToDashboard, // Unused
    onOpenMarketing,
    onOpenBuilder
}) => {
    return (
        <div className="max-w-2xl mx-auto py-8 px-0 sm:px-6">
            <div className="mb-8 px-4 sm:px-0">
                <PageTipBanner
                    pageKey="ai-listings"
                    expandedContent={
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-3">🏡 Master Your AI Listings: The Ultimate Guide</h4>
                                <ul className="space-y-4 text-slate-700">
                                    <li className="flex items-start gap-3">
                                        <span className="text-xl">🛡️</span>
                                        <div>
                                            <strong className="block text-slate-900">Zero Lead Leakage</strong>
                                            <span>Every listing gets a dedicated AI agent that knows every detail (from HOA fees to floor types) and answers buyers instantly, 24/7. Never miss another inquiry.</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-xl">💬</span>
                                        <div>
                                            <strong className="block text-slate-900">Test It Yourself</strong>
                                            <span>Click the <span className="font-bold text-indigo-600">"Talk to the Home"</span> button on any card to see your AI in action. Ask it tough questions—it's ready to impress!</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-xl">🚀</span>
                                        <div>
                                            <strong className="block text-slate-900">Instant Marketing</strong>
                                            <span>Click the <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-100 rounded text-slate-600"><span className="material-symbols-outlined text-[14px]">qr_code_2</span></span> icon to generate a smart link and QR code. Share this on social media, flyers, and yard signs to drive potential buyers directly to your AI agent.</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-5 rounded-xl border border-indigo-100 flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <h4 className="font-bold text-indigo-900 mb-1">Work Smarter, Not Harder</h4>
                                    <p className="text-indigo-800 text-sm leading-relaxed">
                                        Buyers expect instant answers. By empowering each listing with its own "Agent", you provide a premium concierge experience that sellers love, while freeing yourself up to focus on closing deals.
                                    </p>
                                </div>
                            </div>
                        </div>
                    }
                />
            </div>
            {/* Minimal Header */}
            <header className="flex items-center justify-center mb-10">
                <button
                    onClick={onAddNew}
                    className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-300 transition-all active:scale-95 hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-2xl">add</span>
                    <span>Add Listing</span>
                </button>
            </header>

            <main className="space-y-12 pb-24">
                {properties.map(prop => (
                    <PropertyCard
                        key={prop.id}
                        property={prop}
                        onSelect={() => onSelectProperty(prop.id, 'view')}
                        onEdit={() => onSelectProperty(prop.id, 'edit')}
                        onDelete={() => onDeleteProperty(prop.id)}
                        onOpenMarketing={() => onOpenMarketing?.(prop.id)}
                        onOpenBuilder={() => onOpenBuilder?.(prop.id)}
                    />
                ))}
                {properties.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">real_estate_agent</span>
                        <h3 className="text-lg font-bold text-slate-900">No listings yet</h3>
                        <p className="text-slate-500 mb-6">Create your first AI-enabled listing to get started.</p>
                        <button
                            onClick={onAddNew}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                        >
                            Create Listing
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ListingsPage;
