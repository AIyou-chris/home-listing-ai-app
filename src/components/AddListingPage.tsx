import React, { useEffect, useMemo, useState } from 'react';
import PageTipBanner from './PageTipBanner';
import { Property, AgentProfile, AIDescription } from '../types';
import { SAMPLE_AGENT } from '../constants';
import ListingSidekickWidget from './ListingSidekickWidget'
import PublicPropertyApp from './PublicPropertyApp';
import { listingsService, type CreatePropertyInput } from '../services/listingsService';
import { uploadListingPhoto } from '../services/listingMediaService';
import { useAgentBranding } from '../hooks/useAgentBranding';

interface AddListingPageProps {
    onCancel: () => void;
    onSave: (property: Property) => void;
    onPreview?: () => void;
    initialProperty?: Property | null;
    agentProfile?: AgentProfile | null;
}

const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition mb-1";
const labelClasses = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 ml-1";

const AddListingPage: React.FC<AddListingPageProps> = ({ onCancel, onSave, initialProperty, agentProfile }) => {
    const { uiProfile } = useAgentBranding();
    const mergedAgentProfile = useMemo<AgentProfile>(() => {
        const baseProfile = agentProfile ?? uiProfile ?? SAMPLE_AGENT;
        const combined = { ...SAMPLE_AGENT, ...baseProfile } as AgentProfile;
        return {
            ...combined,
            socials: Array.isArray(combined.socials)
                ? combined.socials.map((social) => ({ ...social }))
                : SAMPLE_AGENT.socials.map((social) => ({ ...social }))
        };
    }, [agentProfile, uiProfile]);

    const [formData, setFormData] = useState({
        propertyTitle: initialProperty?.title || '',
        price: initialProperty?.price != null ? String(initialProperty.price) : '',
        address: initialProperty?.address || '',
        beds: initialProperty?.bedrooms != null ? String(initialProperty.bedrooms) : '',
        baths: initialProperty?.bathrooms != null ? String(initialProperty.bathrooms) : '',
        sqft: initialProperty?.squareFeet != null ? String(initialProperty.squareFeet) : '',
        features: initialProperty?.features ? initialProperty.features.join(', ') : '',
        description: (typeof initialProperty?.description === 'string'
            ? (initialProperty?.description as string)
            : (initialProperty && 'description' in initialProperty && initialProperty.description && typeof initialProperty.description === 'object'
                ? [initialProperty.description.title, ...(initialProperty.description.paragraphs || [])].filter(Boolean).join('\n')
                : ''
            )),
        heroPhotos: (initialProperty?.heroPhotos as (File | string)[]) || [],
        galleryPhotos: (initialProperty?.galleryPhotos as (File | string)[]) || [], // Keeping for compatibility but strictly using heroPhotos for the carousel
        ctaListingUrl: initialProperty?.ctaListingUrl || '',
        ctaContactMode: 'sidekick' as 'sidekick' | 'form', // New state for toggle
        agent: mergedAgentProfile,
    });

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Sync contact mode if URL is present vs empty
    useEffect(() => {
        // Initialize contact mode from appFeatures if available
        if (initialProperty?.appFeatures) {
            // If sidekickContact is explicitly false, it matches 'form' (legacy might follow URL presence)
            const useSidekick = initialProperty.appFeatures.sidekickContact !== false; // Default to true/sidekick
            setFormData(prev => ({ ...prev, ctaContactMode: useSidekick ? 'sidekick' : 'form' }));
        }
    }, [initialProperty]);

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const result = await listingsService.generateDescription({
                address: formData.address,
                beds: formData.beds,
                baths: formData.baths,
                sqft: formData.sqft,
                title: formData.propertyTitle,
                features: formData.features
            });

            // Format the result into a string
            const text = [result.title, ...(result.paragraphs || [])].join('\n\n');
            setFormData(prev => ({ ...prev, description: text }));
        } catch (error) {
            console.error(error);
            alert('Failed to generate description. Please ensure you have entered an address and basic details.');
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePreviewProperty = (): Property => {
        const heroPhotos = formData.heroPhotos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p));
        if (heroPhotos.length === 0) {
            heroPhotos.push('https://images.unsplash.com/photo-1600596542815-27b88e31e976?q=80&w=2000&auto-format&fit=crop');
        }

        return {
            id: initialProperty?.id || 'preview-id',
            title: formData.propertyTitle,
            address: formData.address,
            price: Number(formData.price) || 0,
            bedrooms: Number(formData.beds) || 0,
            bathrooms: Number(formData.baths) || 0,
            squareFeet: Number(formData.sqft) || 0,
            description: {
                title: 'Property Description',
                paragraphs: formData.description.split('\n').filter(p => p.trim() !== '')
            },
            heroPhotos: heroPhotos,
            galleryPhotos: heroPhotos, // Sync for preview
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
                messaging: true,
                sidekickContact: formData.ctaContactMode === 'sidekick'
            },
            agent: formData.agent,
            propertyType: 'Single-Family Home',
            features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
            imageUrl: heroPhotos[0],
            ctaListingUrl: formData.ctaListingUrl,
            ctaMediaUrl: '',
        };
    };

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploading(true);
        setUploadError(null);
        const files = Array.from(fileList);
        try {
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const uploaded = await uploadListingPhoto(file);
                uploadedUrls.push(uploaded);
            }
            // Append to heroPhotos, max 6
            setFormData(prev => {
                const current = [...prev.heroPhotos];
                const available = 6 - current.length;
                if (available <= 0) return prev;
                const newPhotos = [...current, ...uploadedUrls.slice(0, available)];
                return { ...prev, heroPhotos: newPhotos };
            });
        } catch (error) {
            console.error('Photo upload failed:', error);
            setUploadError('Failed to upload photos.');
        } finally {
            setIsUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            heroPhotos: prev.heroPhotos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const description: AIDescription = {
                title: 'Property Description',
                paragraphs: formData.description.split('\n').map(p => p.trim()).filter(Boolean)
            };

            const payload: CreatePropertyInput = {
                title: formData.propertyTitle,
                address: formData.address,
                price: Number(formData.price) || 0,
                bedrooms: Number(formData.beds) || 0,
                bathrooms: Number(formData.baths) || 0,
                squareFeet: Number(formData.sqft) || 0,
                propertyType: 'Single-Family Home',
                status: 'Active',
                description,
                features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
                heroPhotos: formData.heroPhotos,
                galleryPhotos: formData.heroPhotos, // Keeping them in sync for this streamlined version
                ctaListingUrl: formData.ctaListingUrl,
                ctaMediaUrl: '',
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
                    messaging: true,
                    sidekickContact: formData.ctaContactMode === 'sidekick'
                },
                agentSnapshot: formData.agent
            }

            const saved = initialProperty
                ? await listingsService.updateProperty(initialProperty.id, payload)
                : await listingsService.createProperty(payload)

            onSave(saved);
        } catch (error) {
            console.error('Error saving listing:', error);
            alert('Failed to save listing.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {isPreviewing && (
                <PublicPropertyApp
                    property={generatePreviewProperty()}
                    onExit={() => setIsPreviewing(false)}
                />
            )}
            <div className="bg-slate-50 min-h-screen pb-24">
                <div className="max-w-3xl mx-auto py-8 px-0 sm:px-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 px-4 sm:px-0">
                        <button onClick={onCancel} className="flex items-center text-slate-500 hover:text-slate-900 transition mb-1">
                            <span className="material-symbols-outlined mr-1">arrow_back</span>
                            Back
                        </button>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsPreviewing(true)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition shadow-sm"
                            >
                                Preview App
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-md disabled:bg-slate-400"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div className="mb-8 px-4 sm:px-0">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Build AI Listing</h1>
                        <p className="text-slate-500">Streamlined editor for your immersive property feed.</p>
                    </div>

                    <div className="mb-10 px-4 sm:px-0">
                        <PageTipBanner
                            pageKey="add-listing"
                            expandedContent={
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-900 mb-2">🏡 Creating an Intelligent Listing:</h4>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start">
                                                <span className="mr-2">📝</span>
                                                <span><strong>The Essentials:</strong> Accurate details (beds, baths, sqft) trigger the AI's ability to answer specific buyer questions instantly.</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="mr-2">📸</span>
                                                <span><strong>Visuals Matter:</strong> Upload high-res photos. The AI scans them to generate rich descriptions and engaging emails.</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="mr-2">🤖</span>
                                                <span><strong>Instant Sidekick:</strong> As soon as you save, a dedicated AI agent is created specifically for this property.</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-100">
                                        <h4 className="font-semibold text-emerald-900 mb-2">💡 Pro Tip:</h4>
                                        <p className="text-emerald-800">
                                            Use "Generate with AI" for the description. It weaves facts and features into a compelling narrative in seconds.
                                        </p>
                                    </div>
                                </div>
                            }
                        />
                    </div>

                    <div className="space-y-12">
                        {/* Section 1: The Essentials */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 px-4 sm:px-0">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </span>
                                The Essentials
                            </h2>
                            <div className="bg-white p-6 rounded-none md:rounded-3xl shadow-sm border-y md:border border-slate-200/60">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Property Title</label>
                                        <input type="text" name="propertyTitle" value={formData.propertyTitle} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. Stunning Modern Retreat" />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Price</label>
                                        <input type="text" name="price" value={formData.price} onChange={handleSimpleChange} className={inputClasses} placeholder="$0" />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Address</label>
                                        <input type="text" name="address" value={formData.address} onChange={handleSimpleChange} className={inputClasses} placeholder="123 Main St..." />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className={labelClasses}>Beds</label>
                                            <input type="text" name="beds" value={formData.beds} onChange={handleSimpleChange} className={inputClasses} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Baths</label>
                                            <input type="text" name="baths" value={formData.baths} onChange={handleSimpleChange} className={inputClasses} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Sq Ft</label>
                                            <input type="text" name="sqft" value={formData.sqft} onChange={handleSimpleChange} className={inputClasses} placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Features / Amenities</label>
                                        <input type="text" name="features" value={formData.features} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. Pool, Spa, Solar Panels, Gated Community, Renovated Kitchen" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex justify-between items-center mb-1 ml-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
                                            <button
                                                onClick={handleGenerateDescription}
                                                type="button"
                                                disabled={isGenerating || !formData.address}
                                                className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                {isGenerating ? 'Detailed AI Magic...' : 'Generate with AI'}
                                            </button>
                                        </div>
                                        <textarea name="description" value={formData.description} onChange={handleSimpleChange} rows={6} className={inputClasses} placeholder="Tell us about the home..." />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Immersive Visuals */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 px-4 sm:px-0">
                                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">image</span>
                                </span>
                                Immersive Visuals
                            </h2>
                            <div className="bg-white p-6 rounded-none md:rounded-3xl shadow-sm border-y md:border border-slate-200/60">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-semibold text-slate-700">Background Carousel (Max 6)</span>
                                    <span className="text-xs text-slate-400">{formData.heroPhotos.length}/6 photos</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {/* Existing Photos */}
                                    {formData.heroPhotos.map((photo, i) => {
                                        const src = typeof photo === 'string' ? photo : URL.createObjectURL(photo);
                                        return (
                                            <div key={i} className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                                <img src={src} className="w-full h-full object-cover" alt="" />
                                                <button
                                                    onClick={() => removePhoto(i)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white font-medium backdrop-blur-sm">
                                                    Slot {i + 1}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Upload Button */}
                                    {formData.heroPhotos.length < 6 && (
                                        <label className="relative aspect-[4/5] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600">
                                            <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                                            <span className="text-xs font-semibold">Add Photo</span>
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files)} />
                                        </label>
                                    )}
                                </div>
                                {isUploading && <p className="text-sm text-blue-600 mt-2 animate-pulse">Uploading photos...</p>}
                                {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
                            </div>
                        </section>

                        {/* Section 3: Connections */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 px-4 sm:px-0">
                                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">link</span>
                                </span>
                                Connect Your Listing
                            </h2>
                            <div className="bg-white p-6 rounded-none md:rounded-3xl shadow-sm border-y md:border border-slate-200/60 space-y-8">

                                {/* Contact Button Mode */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Contact Button Action</h3>
                                    <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, ctaContactMode: 'sidekick' }))}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${formData.ctaContactMode === 'sidekick' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                                            Launch AI Card
                                        </button>
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, ctaContactMode: 'form' }))}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${formData.ctaContactMode === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">mail</span>
                                            Launch Contact Form
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 px-1">
                                        {formData.ctaContactMode === 'sidekick'
                                            ? "The 'Contact' button will open the AI Listing Agent to capture leads."
                                            : "The 'Contact' button will open a simple email form for users to message you."}
                                    </p>
                                </div>

                                {/* Link to Full Listing */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3">Full Listing Link (MLS/Zillow)</h3>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">link</span>
                                        <input
                                            type="url"
                                            name="ctaListingUrl"
                                            value={formData.ctaListingUrl}
                                            onChange={handleSimpleChange}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 px-1">
                                        Appears in the "Info" menu as "View Full Listing".
                                    </p>
                                </div>

                            </div>
                        </section>

                        {/* Section 4: AI Sidekick */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                                </span>
                                Listing Sidekick
                            </h2>
                            <div className="max-w-3xl">
                                <ListingSidekickWidget property={generatePreviewProperty()} />
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </>
    );
};

export default AddListingPage;
