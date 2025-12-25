import React, { useState } from 'react';
import { Property } from '../types';

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
    onSubmit: (data: any) => void;
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

const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onSelect,
    onDelete: _onDelete, // Unused
    onOpenMarketing,
    onOpenBuilder: _onOpenBuilder, // Unused
    onEdit
}) => {
    const [showContactForm, setShowContactForm] = useState(false);

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
            className="group relative w-full h-[80vh] md:h-[85vh] max-h-[900px] rounded-[2rem] overflow-hidden shadow-2xl shrink-0 snap-center cursor-pointer transition-transform duration-500 hover:scale-[1.01]"
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
                        // always opens sidekick regardless of bottom contact mode
                        if (onOpenMarketing) onOpenMarketing();
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

                {/* Pagination Dots (Visual Only) */}
                <div className="flex gap-2 mt-8">
                    <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
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
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
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
