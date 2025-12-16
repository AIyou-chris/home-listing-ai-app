
import React, { useEffect, useMemo, useState } from 'react';
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

const inputClasses = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition";


const CollapsibleSection: React.FC<{ title: string; icon: string; children: React.ReactNode; }> = ({ title, icon, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 mb-6">
            <button
                type="button"
                className="flex items-center justify-between w-full p-5 text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center">
                    <span className="material-symbols-outlined w-6 h-6 mr-3 text-primary-600">{icon}</span>
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                </div>
                {isOpen ? <span className="material-symbols-outlined w-6 h-6 text-slate-500">expand_less</span> : <span className="material-symbols-outlined w-6 h-6 text-slate-500">expand_more</span>}
            </button>
            {isOpen && <div className="px-5 pb-6">{children}</div>}
        </div>
    );
};


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

    // A simplified state for demonstration. In a real app, this would be more robust.
    const [formData, setFormData] = useState({
        propertyTitle: initialProperty?.title || '',
        price: initialProperty?.price != null ? String(initialProperty.price) : '',
        address: initialProperty?.address || '',
        beds: initialProperty?.bedrooms != null ? String(initialProperty.bedrooms) : '',
        baths: initialProperty?.bathrooms != null ? String(initialProperty.bathrooms) : '',
        sqft: initialProperty?.squareFeet != null ? String(initialProperty.squareFeet) : '',
        description: (typeof initialProperty?.description === 'string'
            ? (initialProperty?.description as string)
            : (initialProperty && 'description' in initialProperty && initialProperty.description && typeof initialProperty.description === 'object'
                ? [initialProperty.description.title, ...(initialProperty.description.paragraphs || [])].filter(Boolean).join('\n')
                : ''
            )),
        heroPhotos: (initialProperty?.heroPhotos as (File | string)[]) || [],
        galleryPhotos: (initialProperty?.galleryPhotos as (File | string)[]) || [],
        rawAmenities: Array.isArray(initialProperty?.features) ? initialProperty!.features.join(', ') : '',
        ctaListingUrl: initialProperty?.ctaListingUrl || '',
        ctaMediaUrl: initialProperty?.ctaMediaUrl || '',
        appFeatures: {
            gallery: true, schools: true, financing: true, virtualTour: true, amenities: true,
            schedule: true, map: true, history: true, neighborhood: true, reports: true,
            messaging: true
        },
        agent: mergedAgentProfile,
        media: {
            virtualTourUrl: '', propertyVideoUrl: '', droneFootageUrl: '',
            neighborhoodVideoUrl: '', agentInterviewUrl: '', additionalMediaUrl: ''
        }
    });
    const [photoUrlInput, setPhotoUrlInput] = useState('');
    const [photoUrlError, setPhotoUrlError] = useState<string | null>(null);
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            agent: {
                ...mergedAgentProfile,
                socials: mergedAgentProfile.socials.map((social) => ({ ...social }))
            }
        }));
    }, [mergedAgentProfile]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePreviewProperty = (): Property => {
        const heroPhotos = formData.heroPhotos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p));
        if (heroPhotos.length === 0) {
            heroPhotos.push('https://images.unsplash.com/photo-1599809275671-55822c1f6a12?q=80&w=800&auto-format&fit=crop');
        }

        return {
            id: 'preview-id',
            title: formData.propertyTitle,
            address: formData.address,
            price: Number(formData.price) || 0,
            bedrooms: Number(formData.beds) || 0,
            bathrooms: Number(formData.baths) || 0,
            squareFeet: Number(formData.sqft) || 0,
            description: {
                title: 'Property Description Preview',
                paragraphs: formData.description.split('\n').filter(p => p.trim() !== '')
            },
            heroPhotos: heroPhotos,
            galleryPhotos: formData.galleryPhotos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p)),
            appFeatures: formData.appFeatures,
            agent: {
                ...formData.agent,
                socials: Array.isArray(formData.agent.socials)
                    ? formData.agent.socials.map((social) => ({ ...social }))
                    : mergedAgentProfile.socials.map((social) => ({ ...social }))
            },
            propertyType: 'Single-Family Home',
            features: formData.rawAmenities.split(',').map(s => s.trim()).filter(f => f),
            imageUrl: heroPhotos[0],
            ctaListingUrl: formData.ctaListingUrl,
            ctaMediaUrl: formData.ctaMediaUrl,
        };
    };

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateDescription = async () => {
        if (!formData.address && !formData.propertyTitle) {
            alert('Please enter an Address or Title first.');
            return;
        }

        setIsGenerating(true);
        try {
            const result = await listingsService.generateDescription({
                address: formData.address,
                beds: formData.beds,
                baths: formData.baths,
                sqft: formData.sqft,
                features: formData.rawAmenities,
                title: formData.propertyTitle
            });

            if (result && Array.isArray(result.paragraphs)) {
                setFormData(prev => ({
                    ...prev,
                    description: result.paragraphs.join('\n\n')
                }));
            }
        } catch (error) {
            console.error('Failed to generate:', error);
            alert('AI generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const features = formData.rawAmenities
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            const description: AIDescription = {
                title: 'Property Description Preview',
                paragraphs: formData.description
                    .split('\n')
                    .map(p => p.trim())
                    .filter(Boolean)
            };

            const agentSnapshot: AgentProfile = {
                ...mergedAgentProfile,
                ...formData.agent,
                socials: Array.isArray(formData.agent.socials)
                    ? formData.agent.socials.map((social) => ({ ...social }))
                    : mergedAgentProfile.socials
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
                features,
                heroPhotos: formData.heroPhotos,
                galleryPhotos: formData.galleryPhotos,
                ctaListingUrl: formData.ctaListingUrl,
                ctaMediaUrl: formData.ctaMediaUrl,
                appFeatures: formData.appFeatures,
                agentSnapshot
            }

            const saved = initialProperty
                ? await listingsService.updateProperty(initialProperty.id, payload)
                : await listingsService.createProperty(payload)

            onSave(saved);
        } catch (error) {
            console.error('Error saving listing:', error);
            alert('Failed to save listing. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const attachNewPhotos = (urls: string[]) => {
        if (urls.length === 0) return;
        setFormData(prev => {
            const heroClone = [...prev.heroPhotos];
            if (heroClone.length < 3) {
                const space = 3 - heroClone.length;
                heroClone.push(...urls.slice(0, space));
            }
            return {
                ...prev,
                heroPhotos: heroClone,
                galleryPhotos: [...prev.galleryPhotos, ...urls]
            };
        });
    };

    const handleAddPhotoUrl = () => {
        const trimmed = photoUrlInput.trim();
        if (!trimmed) {
            setPhotoUrlError('Enter a URL to add an image.');
            return;
        }
        if (!/^https?:\/\//i.test(trimmed)) {
            setPhotoUrlError('Photo URLs must start with https://');
            return;
        }
        setPhotoUrlError(null);
        attachNewPhotos([trimmed]);
        setPhotoUrlInput('');
    };

    const handleGalleryUpload = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        setIsUploadingPhotos(true);
        setPhotoUploadError(null);
        const files = Array.from(fileList);
        try {
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const uploaded = await uploadListingPhoto(file);
                uploadedUrls.push(uploaded);
            }
            attachNewPhotos(uploadedUrls);
        } catch (error) {
            console.error('Listing photo upload failed:', error);
            setPhotoUploadError('Unable to upload photos. Please try again.');
        } finally {
            setIsUploadingPhotos(false);
        }
    };


    return (
        <>
            {isPreviewing && (
                <PublicPropertyApp
                    property={generatePreviewProperty()}
                    onExit={() => setIsPreviewing(false)}
                    onTalkToHome={() => alert('Voice assistant would open here!')}
                />
            )}
            <div className="bg-slate-50 min-h-full">
                <div className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <header className="flex items-center justify-between mb-6">
                        <button onClick={onCancel} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                            &larr; Back to Dashboard
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPreviewing(true)}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Preview App
                            </button>
                            <button
                                type="submit"
                                form="listing-form"
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </header>

                    <h1 className="text-3xl font-bold text-slate-900">Build AI Listing</h1>
                    <p className="text-slate-500 mt-1">Create your AI-powered property listing.</p>

                    <div className="my-6 p-5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-4">
                        <span className="material-symbols-outlined w-8 h-8 text-blue-600 flex-shrink-0">spa</span>
                        <div>
                            <h3 className="font-bold text-blue-800">Let AI guide you</h3>
                            <p className="text-sm text-blue-700">From writing compelling descriptions to optimizing your content, AI is here to make your property shine.</p>
                        </div>
                    </div>

                    <form id="listing-form" onSubmit={handleSubmit}>
                        <CollapsibleSection title="Basic Information" icon="home_work">
                            {/* Form fields here */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Property Title</label><input type="text" name="propertyTitle" value={formData.propertyTitle} onChange={handleSimpleChange} className={inputClasses} placeholder="Stunning Mid-Century Retreat" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Price</label><input type="text" name="price" value={formData.price} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. 750000" /></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><input type="text" name="address" value={formData.address} onChange={handleSimpleChange} className={inputClasses} placeholder="123 Main Street, Anytown, USA 12345" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label><input type="text" name="beds" value={formData.beds} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. 3" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label><input type="text" name="baths" value={formData.baths} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. 2.5" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Square Footage</label><input type="text" name="sqft" value={formData.sqft} onChange={handleSimpleChange} className={inputClasses} placeholder="e.g. 1850" /></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea name="description" value={formData.description} onChange={handleSimpleChange} rows={4} className={inputClasses} placeholder="Describe the property's features, amenities, and unique selling points."></textarea>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDescription}
                                        disabled={isGenerating}
                                        className="mt-2 text-sm font-semibold text-primary-600 flex items-center gap-1 hover:text-primary-700 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined w-4 h-4">{isGenerating ? 'hourglass_top' : 'auto_awesome'}</span>
                                        {isGenerating ? 'Generating...' : 'Generate Description'}
                                    </button></div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Photo Management" icon="photo_camera">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">Hero Photos (Select 3 for slider)</h4>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="aspect-video bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined w-8 h-8">photo_camera</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2 flex flex-wrap items-center gap-2">
                                    Import from URL
                                    <span className="material-symbols-outlined w-4 h-4 text-slate-400">info</span>
                                </h4>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="https://cdn.example.com/house.jpg"
                                        className={inputClasses}
                                        value={photoUrlInput}
                                        onChange={(event) => setPhotoUrlInput(event.target.value)}
                                        disabled={isUploadingPhotos}
                                    />
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleAddPhotoUrl}
                                        disabled={isUploadingPhotos}
                                    >
                                        Add
                                    </button>
                                </div>
                                {photoUrlError && <p className="text-xs text-rose-600 mt-1">{photoUrlError}</p>}
                            </div>
                            <div className="mt-6">
                                <h4 className="font-semibold text-slate-700 mb-2">Upload Photos</h4>
                                <label htmlFor="photo-upload" className="block w-full p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-100 hover:border-primary-400">
                                    <span className="material-symbols-outlined w-8 h-8 mx-auto text-slate-400 mb-2">upload</span>
                                    <span className="text-slate-600 font-semibold">Drag & drop files here</span>
                                    <p className="text-sm text-slate-500">or click to browse</p>
                                    <input id="photo-upload" type="file" multiple className="hidden" onChange={(e) => handleGalleryUpload(e.target.files)} />
                                </label>
                                {formData.galleryPhotos.length > 0 && <p className="text-sm mt-2 text-slate-600">{formData.galleryPhotos.length} photos staged for upload.</p>}
                                {isUploadingPhotos && <p className="text-sm mt-1 text-slate-500">Uploading photos…</p>}
                                {photoUploadError && <p className="text-sm mt-1 text-rose-600">{photoUploadError}</p>}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Buttons & Links" icon="smart_display">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                        <button type="button" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">open_in_new</span>
                                            <span>To Listing</span>
                                        </button>
                                        <label className="block text-xs text-slate-600 mt-3 mb-1">Listing URL</label>
                                        <input
                                            type="url"
                                            name="ctaListingUrl"
                                            value={formData.ctaListingUrl}
                                            onChange={handleSimpleChange}
                                            placeholder="https://your-listing-url.com"
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                        <button type="button" className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">play_circle</span>
                                            <span>Media</span>
                                        </button>
                                        <label className="block text-xs text-slate-600 mt-3 mb-1">Media URL</label>
                                        <input
                                            type="url"
                                            name="ctaMediaUrl"
                                            value={formData.ctaMediaUrl}
                                            onChange={handleSimpleChange}
                                            placeholder="https://your-media-url.com"
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <button type="button" className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">event_available</span>
                                            <span>See the house</span>
                                        </button>
                                        <p className="mt-2 text-xs text-emerald-800">Opens booking modal in the app.</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <button type="button" className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">map</span>
                                            <span>Map</span>
                                        </button>
                                        <label className="block text-xs text-slate-600 mt-3 mb-1">Generated from Address</label>
                                        <input type="text" readOnly value={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address || '')}`} className={`${inputClasses} bg-slate-100`} />
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Amenities Editor removed for simplified app build */}

                        {/* App Features & Buttons section removed per simplification */}

                        <CollapsibleSection title="Agent Information" icon="account_circle">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label><input type="text" className={inputClasses} value={formData.agent.name ?? ''} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="tel" className={inputClasses} value={formData.agent.phone ?? ''} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" className={inputClasses} value={formData.agent.email ?? ''} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Website</label><input type="url" className={inputClasses} value={formData.agent.website ?? ''} readOnly /></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Bio</label><textarea rows={3} className={inputClasses} value={formData.agent.bio ?? ''} readOnly></textarea></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Logo</label><input type="file" className={inputClasses} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Headshot</label><input type="file" className={inputClasses} /></div>
                                <div className="md:col-span-2"><h4 className="font-semibold text-slate-700 mb-2 mt-4">Social Media Links</h4>
                                    {formData.agent.socials.map((social, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <span className="font-medium text-slate-600 w-24">{social.platform}</span>
                                            <input type="url" className={inputClasses} placeholder={`https://...`} value={social.url} readOnly />
                                        </div>
                                    ))}
                                </div>
                                <div className="md:col-span-2"><h4 className="font-semibold text-slate-700 mb-2 mt-4">Media Links (Videos, Interviews)</h4>
                                    <input type="url" className={`${inputClasses} mb-2`} placeholder="Video 1" />
                                    <input type="url" className={inputClasses} placeholder="Video 2" />
                                </div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Listing Sidekick" icon="smart_toy">
                            <div className="space-y-4">
                                <div className="text-sm text-slate-600">Live preview:</div>
                                <ListingSidekickWidget property={generatePreviewProperty()} />
                            </div>
                        </CollapsibleSection>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddListingPage;
