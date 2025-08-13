import React, { useState } from 'react';
import { Property, isAIDescription } from '../types';

// Locally defined Brand Icons for stability
const TwitterIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"></path></svg>);
const PinterestIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M13,16.2C12.2,16.2 11.5,15.9 11,15.3C10.5,14.7 10.2,14 10.2,13.2C10.2,12.5 10.5,11.8 11,11.2C11.5,10.6 12.2,10.3 13,10.3C13.8,10.3 14.5,10.6 15,11.2C15.5,11.8 15.8,12.5 15.8,13.2C15.8,14 15.5,14.7 15,15.3C14.5,15.9 13.8,16.2 13,16.2M12,2C6.5,2 2,6.5 2,12C2,16.2 4.6,19.8 8.5,21.2C8.5,20.5 8.6,19.5 8.8,18.4L9.5,15.2C9.5,15.2 9.2,14.6 9.2,13.8C9.2,12.4 10.1,11.3 11.1,11.3C12,11.3 12.4,12 12.4,12.7C12.4,13.5 11.9,14.8 11.6,15.9C11.4,16.9 12.2,17.7 13.2,17.7C15,17.7 16.4,15.7 16.4,13.2C16.4,10.9 14.8,9.2 12.5,9.2C9.8,9.2 8.1,11.1 8.1,13.6C8.1,14.3 8.4,15 8.7,15.5C8.8,15.6 8.8,15.7 8.8,15.8L8.6,16.6C8.5,16.9 8.4,17.1 8.1,16.9C7.1,16.4 6.4,14.9 6.4,13.5C6.4,10.4 8.7,7.5 13.2,7.5C17,7.5 19.6,10 19.6,13.1C19.6,16.5 17.4,19.2 14.2,19.2C13.1,19.2 12,18.6 11.7,17.9L11.2,19.2C10.6,20.8 10,22.2 9.8,22.9C10.5,23.2 11.2,23.3 12,23.3C17.5,23.3 22,18.8 22,13.3C22,7.7 17.5,3.3 12,3.3"></path></svg>);
const LinkedInIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19M18.5,18.5V13.2A3.26,3.26 0 0,0 15.24,9.94C14.39,9.94 13.4,10.43 12.9,11.24V10.13H10.13V18.5H12.9V13.57C12.9,12.8 13.5,12.17 14.31,12.17A1.4,1.4 0 0,1 15.71,13.57V18.5H18.5M6.88,8.56A1.68,1.68 0 0,0 8.56,6.88C8.56,6 8,5.43 7.21,5.43A1.68,1.68 0 0,0 5.53,6.88C5.53,7.74 6,8.31 6.88,8.31V8.56H6.88M8.27,18.5V10.13H5.53V18.5H8.27Z"></path></svg>);
const YouTubeIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L15,19C12.81,19 11.2,18.84 10.17,18.56C9.27,18.31 8.69,17.73 8.44,16.83C8.31,16.36 8.22,15.73 8.16,14.93C8.09,14.13 8.06,13.44 8.06,12.84L8,12C8,9.81 8.16,8.2 8.44,7.17C8.69,6.27 9.27,5.69 10.17,5.44C10.64,5.31 11.27,5.22 12.07,5.16C12.87,5.09 13.56,5.06 14.16,5.06L15,5C17.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"></path></svg>);

interface PublicPropertyAppProps {
    property: Property;
    onExit: () => void;
    onTalkToHome: () => void;
}

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-b-3xl">
            {images.map((img, index) => (
                <img
                    key={index}
                    src={img}
                    alt={`Property image ${index + 1}`}
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                />
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const InfoPill: React.FC<{ icon: string, value: string | number, label: string }> = ({ icon, value, label }) => (
    <div className="flex flex-col items-center justify-center space-y-1">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined w-6 h-6">{icon}</span>
        </div>
        <p className="font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
    </div>
);

const FeatureButton: React.FC<{ icon: string, label: string, enabled?: boolean }> = ({ icon, label, enabled = true }) => {
    if (!enabled) return null;
    return (
        <div className="flex flex-col items-center justify-center space-y-2 p-2 bg-white rounded-2xl shadow-sm border border-slate-200/60">
            <div className="text-blue-600"><span className="material-symbols-outlined" style={{fontSize: '28px'}}>{icon}</span></div>
            <p className="text-sm font-semibold text-slate-700">{label}</p>
        </div>
    );
};


const PublicPropertyApp: React.FC<PublicPropertyAppProps> = ({ property, onExit, onTalkToHome }) => {
    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join(' ')
        : (typeof property.description === 'string' ? property.description : '');

    const agent = property.agent;

    const allAppFeatures = {
        gallery: { icon: 'photo_camera', label: "Gallery" },
        videoTour: { icon: 'videocam', label: "Video Tour" },
        droneFootage: { icon: 'flight', label: "Drone Footage" },
        amenities: { icon: 'home_work', label: "Amenities" },
        neighborhood: { icon: 'location_on', label: "Neighborhood" },
        schedule: { icon: 'calendar_month', label: "Schedule" },
        financing: { icon: 'payments', label: "Financing" },
        history: { icon: 'schedule', label: "History" },
        schools: { icon: 'school', label: "Schools" },
        virtualTour: { icon: '3d_rotation', label: "Virtual Tour" },
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm mb-4">
                <button 
                    onClick={onExit}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg shadow-md hover:bg-slate-100 transition-all"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Editor
                </button>
            </div>

            <div className="relative w-full max-w-sm h-[85vh] max-h-[700px] bg-slate-100 rounded-[40px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <main className="flex-1 overflow-y-auto pb-24">
                    <ImageCarousel images={property.heroPhotos?.filter((img): img is string => typeof img === 'string') || [property.imageUrl]} />

                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                        <p className="flex items-center gap-2 text-slate-500 mt-2">
                            <span className="material-symbols-outlined w-5 h-5">location_on</span>
                            <span>{property.address}</span>
                        </p>
                        <p className="text-4xl font-extrabold text-green-600 mt-4">${property.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                        <div className="mt-6 p-4 bg-white rounded-2xl shadow-md border border-slate-200/60 flex justify-around">
                            <InfoPill icon="bed" value={property.bedrooms} label="Bedrooms" />
                            <InfoPill icon="bathtub" value={property.bathrooms} label="Bathrooms" />
                            <InfoPill icon="fullscreen" value={property.squareFeet.toLocaleString()} label="Sq Ft" />
                        </div>
                        
                        <button onClick={onTalkToHome} className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                            <span className="material-symbols-outlined w-6 h-6">mic</span>
                            <span>Talk to the Home Now</span>
                        </button>
                    </div>
                    
                    <div className="px-6 py-4">
                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                             <h2 className="text-xl font-bold text-slate-800 mb-2">{isAIDescription(property.description) ? property.description.title : 'About This Property'}</h2>
                             <p className="text-slate-600 leading-relaxed">{descriptionText.replace("Read More", "")} <a href="#" className="text-blue-600 font-semibold">Read More</a></p>
                        </div>
                    </div>
                    
                     <div className="px-6 py-4 grid grid-cols-2 gap-4">
                        {Object.entries(allAppFeatures).map(([key, feature]) => (
                            <FeatureButton 
                                key={key}
                                icon={feature.icon}
                                label={feature.label}
                                enabled={property.appFeatures?.[key]}
                            />
                        ))}
                    </div>

                    {agent && (
                        <div className="px-6 py-4">
                             <h2 className="text-xl font-bold text-slate-800 mb-4">Contact Agent</h2>
                             <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                                <div className="flex items-center gap-4">
                                    <img src={agent.headshotUrl} alt={agent.name} className="w-16 h-16 rounded-full object-cover" />
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{agent.name}</h3>
                                        <p className="text-sm text-slate-600">{agent.company}</p>
                                        <p className="text-xs text-slate-500 mt-1">Response time: Usually responds within 2 hours</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <button className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition">Call Me</button>
                                    <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Email Me</button>
                                </div>
                                 <div className="mt-4 flex justify-center items-center gap-3">
                                    {agent.socials.find(s => s.platform === 'Twitter') && <a href="#" className="w-10 h-10 flex items-center justify-center bg-sky-500 text-white rounded-full"><TwitterIcon className="w-5 h-5" /></a>}
                                    {agent.socials.find(s => s.platform === 'Pinterest') && <a href="#" className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full"><PinterestIcon className="w-5 h-5" /></a>}
                                    {agent.socials.find(s => s.platform === 'LinkedIn') && <a href="#" className="w-10 h-10 flex items-center justify-center bg-blue-700 text-white rounded-full"><LinkedInIcon className="w-5 h-5" /></a>}
                                    {agent.socials.find(s => s.platform === 'YouTube') && <a href="#" className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-full"><YouTubeIcon className="w-5 h-5" /></a>}
                                </div>
                             </div>
                        </div>
                    )}

                </main>
                
                <footer className="absolute bottom-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-t border-slate-200/80 rounded-b-[38px]">
                    <div className="flex justify-around items-center h-20">
                        <FeatureButton icon="calendar_month" label="Showings" />
                        <FeatureButton icon="bookmark" label="Save" />
                        <FeatureButton icon="chat_bubble" label="Contact" />
                        <FeatureButton icon="share" label="Share" />
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PublicPropertyApp;