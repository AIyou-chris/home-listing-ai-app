
import React, { useState } from 'react';
import { Property, AgentProfile } from '../types';
import { SAMPLE_AGENT } from '../constants';
import AddTextKnowledgeModal from './AddTextKnowledgeModal';
import ListingSidekickWidget from './ListingSidekickWidget'
import { continueConversation } from '../services/openaiService'
import PublicPropertyApp from './PublicPropertyApp';

interface AddListingPageProps {
    onCancel: () => void;
    onSave: (newProperty: Omit<Property, 'id' | 'description' | 'imageUrl'>) => void;
    onPreview?: () => void;
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


const AddListingPage: React.FC<AddListingPageProps> = ({ onCancel, onSave }) => {
    // A simplified state for demonstration. In a real app, this would be more robust.
    const [formData, setFormData] = useState({
        propertyTitle: 'Beautiful 3-Bedroom Home',
        price: '500000',
        address: '123 Main Street, Anytown, USA 12345',
        beds: '3',
        baths: '2',
        sqft: '1500',
        description: 'Describe the property\'s features, amenities, and unique selling points.',
        heroPhotos: [] as (File | string)[],
        galleryPhotos: [] as (File | string)[],
        rawAmenities: 'Hardwood floors, Granite countertops, Stainless steel appliances, Fenced backyard, Fireplace',
        ctaListingUrl: '',
        ctaMediaUrl: '',
        appFeatures: {
            gallery: true, schools: true, financing: true, virtualTour: true, amenities: true,
            schedule: true, map: true, history: true, neighborhood: true, reports: true,
            messaging: true
        },
        agent: {
            name: 'John Smith',
            title: 'Real Estate Agent',
            company: 'Prime Properties',
            phone: '+1 (555) 123-4567',
            email: 'john@example.com',
            website: 'https://example.com',
            bio: 'Tell visitors about your experience and expertise...',
            headshotUrl: 'https://example.com/headshot.png',
            socials: [
                { platform: 'Facebook', url: 'https://facebook.com/username' },
                { platform: 'Instagram', url: 'https://instagram.com/username' },
                { platform: 'Twitter', url: '' },
                { platform: 'LinkedIn', url: '' },
                { platform: 'YouTube', url: '' },
            ] as AgentProfile['socials'],
            mediaLinks: ['', '']
        },
        media: {
             virtualTourUrl: '', propertyVideoUrl: '', droneFootageUrl: '', 
             neighborhoodVideoUrl: '', agentInterviewUrl: '', additionalMediaUrl: ''
        }
    });
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [sidekickDescription, setSidekickDescription] = useState('You are the Listing Sidekick. Detail-oriented and helpful. Present property highlights and answer questions clearly.');
    const [sidekickVoice, setSidekickVoice] = useState('Neutral Voice 1');
    const [sidekickTestInput, setSidekickTestInput] = useState('');
    const [sidekickTestReply, setSidekickTestReply] = useState('');
    const [sidekickTesting, setSidekickTesting] = useState(false);

    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    
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
            agent: { ...SAMPLE_AGENT, ...formData.agent },
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            // Prepare listing data for backend
            const listingData = {
                title: formData.propertyTitle,
                address: formData.address,
                price: Number(formData.price),
                bedrooms: Number(formData.beds),
                bathrooms: Number(formData.baths),
                squareFeet: Number(formData.sqft),
                propertyType: 'Single-Family Home',
                description: formData.description,
                features: formData.rawAmenities.split(',').map(s => s.trim()),
                heroPhotos: formData.heroPhotos.map(p => typeof p === 'string' ? p : p.name),
                galleryPhotos: formData.galleryPhotos.map(p => typeof p === 'string' ? p : p.name),
                agentId: 'default' // Use centralized profile
            };
            
            // Save to backend
            const response = await fetch('/api/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(listingData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to save listing');
            }
            
            const savedListing = await response.json();
            console.log('✅ Listing saved successfully:', savedListing);
            
            // Convert backend format to frontend format for onSave callback
            const saveData: Omit<Property, 'id' | 'description' | 'imageUrl'> = {
                title: savedListing.title,
                address: savedListing.address,
                price: savedListing.price,
                bedrooms: savedListing.bedrooms,
                bathrooms: savedListing.bathrooms,
                squareFeet: savedListing.squareFeet,
                propertyType: savedListing.propertyType,
                features: savedListing.features,
                heroPhotos: savedListing.heroPhotos,
                galleryPhotos: savedListing.galleryPhotos,
                appFeatures: formData.appFeatures,
                agent: savedListing.agent,
                ctaListingUrl: formData.ctaListingUrl,
                ctaMediaUrl: formData.ctaMediaUrl
            };
            
            onSave(saveData);
        } catch (error) {
            console.error('Error saving listing:', error);
            alert('Failed to save listing. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Knowledge Base Handlers ---
    const handleSaveText = (data: { title: string, content: string }) => {
        console.log("Saving text knowledge:", data);
        setIsTextModalOpen(false);
    };
    
    const handleGalleryUpload = (fileList: FileList | null) => {
        if (!fileList) return;
        const files = Array.from(fileList);
        setFormData(prev => ({
            ...prev,
            galleryPhotos: [...prev.galleryPhotos, ...files]
        }));
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
                               <div><label className="block text-sm font-medium text-slate-700 mb-1">Property Title</label><input type="text" name="propertyTitle" value={formData.propertyTitle} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div><label className="block text-sm font-medium text-slate-700 mb-1">Price</label><input type="text" name="price" value={formData.price} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><input type="text" name="address" value={formData.address} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div><label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label><input type="text" name="beds" value={formData.beds} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div><label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label><input type="text" name="baths" value={formData.baths} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div><label className="block text-sm font-medium text-slate-700 mb-1">Square Footage</label><input type="text" name="sqft" value={formData.sqft} onChange={handleSimpleChange} className={inputClasses} /></div>
                               <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea name="description" value={formData.description} onChange={handleSimpleChange} rows={4} className={inputClasses}></textarea>
                               <button type="button" className="mt-2 text-sm font-semibold text-primary-600 flex items-center gap-1"><span className="material-symbols-outlined w-4 h-4">auto_awesome</span> Generate Description</button></div>
                           </div>
                        </CollapsibleSection>

                         <CollapsibleSection title="Photo Management" icon="photo_camera">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">Hero Photos (Select 3 for slider)</h4>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[0,1,2].map(i => (
                                        <div key={i} className="aspect-video bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined w-8 h-8">photo_camera</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">Import from URL <span className="material-symbols-outlined w-4 h-4 text-slate-400">info</span></h4>
                                 <div className="flex gap-2">
                                    <input type="url" placeholder="Paste photo URLs from Zillow, Realtor.com, or other sites" className={inputClasses} />
                                    <button type="button" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition flex-shrink-0">Add</button>
                                 </div>
                            </div>
                             <div className="mt-6">
                                <h4 className="font-semibold text-slate-700 mb-2">Upload Photos</h4>
                                 <label htmlFor="photo-upload" className="block w-full p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-100 hover:border-primary-400">
                                    <span className="material-symbols-outlined w-8 h-8 mx-auto text-slate-400 mb-2">upload</span>
                                    <span className="text-slate-600 font-semibold">Drag & drop files here</span>
                                    <p className="text-sm text-slate-500">or click to browse</p>
                                    <input id="photo-upload" type="file" multiple className="hidden" onChange={(e) => handleGalleryUpload(e.target.files)}/>
                                 </label>
                                 {formData.galleryPhotos.length > 0 && <p className="text-sm mt-2 text-slate-600">{formData.galleryPhotos.length} photos staged for upload.</p>}
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
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label><input type="text" className={inputClasses} value={formData.agent.name} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="tel" className={inputClasses} value={formData.agent.phone} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" className={inputClasses} value={formData.agent.email} readOnly /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Website</label><input type="url" className={inputClasses} value={formData.agent.website} readOnly /></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Bio</label><textarea rows={3} className={inputClasses} value={formData.agent.bio} readOnly></textarea></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Logo</label><input type="file" className={inputClasses} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Headshot</label><input type="file" className={inputClasses} /></div>
                                <div className="md:col-span-2"><h4 className="font-semibold text-slate-700 mb-2 mt-4">Social Media Links</h4>
                                  {formData.agent.socials.map((social, i) =>(
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                      <span className="font-medium text-slate-600 w-24">{social.platform}</span>
                                      <input type="url" className={inputClasses} placeholder={`https://...`} value={social.url} readOnly/>
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
                          <div className="grid grid-cols-1 gap-6">
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
                              <div className="px-4 py-3 border-b border-rose-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-600">home</span>
                                <div className="font-semibold text-slate-900">Listing Sidekick</div>
                              </div>
                              <div className="p-4 space-y-4">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800 mb-1">Who I am</div>
                                  <textarea
                                    rows={3}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    value={sidekickDescription}
                                    onChange={(e) => setSidekickDescription(e.target.value)}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <button type="button" className="px-3 py-2 rounded-xl text-sm bg-rose-600 hover:bg-rose-700 text-white">AI Personality</button>
                                  <button type="button" onClick={() => setIsTextModalOpen(true)} className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-rose-700 hover:bg-rose-100">Add Knowledge</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-slate-600 mb-1">Voice</label>
                                    <select value={sidekickVoice} onChange={(e) => setSidekickVoice(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
                                      <option>Female Voice 1</option>
                                      <option>Female Voice 2</option>
                                      <option>Male Voice 1</option>
                                      <option>Male Voice 2</option>
                                      <option>Neutral Voice 1</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-rose-200 p-3 bg-white">
                                  <div className="text-sm font-semibold text-slate-900 mb-2">Test Personality</div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      value={sidekickTestInput}
                                      onChange={(e) => setSidekickTestInput(e.target.value)}
                                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                      placeholder="Enter a question or statement to test..."
                                    />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const q = sidekickTestInput.trim(); if (!q || sidekickTesting) return;
                                        setSidekickTesting(true); setSidekickTestReply('');
                                        try {
                                          const text = await continueConversation([
                                            { sender: 'system', text: sidekickDescription },
                                            { sender: 'user', text: q }
                                          ]);
                                          setSidekickTestReply(text);
                                        } catch {
                                          setSidekickTestReply('Failed to get response');
                                        } finally {
                                          setSidekickTesting(false);
                                        }
                                      }}
                                      className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm"
                                    >
                                      {sidekickTesting ? 'Testing...' : 'Test Responses'}
                                    </button>
                                  </div>
                                  {sidekickTestReply && (
                                    <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 bg-slate-50 whitespace-pre-wrap">{sidekickTestReply}</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="mb-2 text-sm text-slate-600">Live preview:</div>
                              <ListingSidekickWidget property={generatePreviewProperty()} />
                            </div>
                          </div>
                        </CollapsibleSection>
                    </form>
                </div>
                {isTextModalOpen && <AddTextKnowledgeModal onClose={() => setIsTextModalOpen(false)} onSave={handleSaveText} />}
            </div>
        </>
    );
};

export default AddListingPage;
