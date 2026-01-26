import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, Globe, Share2, Facebook, Instagram, Twitter, Linkedin, Youtube, MessageSquare, Send } from 'lucide-react';
import { getAICardProfile, AICardProfile } from '../services/aiCardService';

const PublicAICard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<AICardProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const [showContact, setShowContact] = useState(false);
    const [showConnectForm, setShowConnectForm] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id || id === 'default') {
                setError('Invalid Card ID');
                setLoading(false);
                return;
            }

            try {
                // Call API with userId=id (Assuming id is userId or slug)
                // Note: aiCardService.getAICardProfile takes userId as argument
                const data = await getAICardProfile(id);
                setProfile(data);
            } catch (err) {
                console.error("Failed to load public card", err);
                setError('Card not found');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: profile?.fullName || 'Business Card',
                    text: `Connect with ${profile?.fullName}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.warn('Share failed:', err);
            }
        } else {
            // Fallback copy
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            } catch (e) {
                alert('Could not copy link.');
            }
        }
    };

    // --- Lead Capture Logic ---
    const [connectForm, setConnectForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'https://home-listing-ai-backend.onrender.com';
            const response = await fetch(`${API_BASE}/api/ai-card/lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: id, // from routing params
                    ...connectForm
                })
            });

            if (!response.ok) throw new Error('Failed to submit');

            setSubmitStatus('success');
            setConnectForm({ name: '', email: '', phone: '', message: '' });
            setTimeout(() => setSubmitStatus('idle'), 5000);

        } catch (err) {
            console.error('Lead capture failed', err);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error || !profile) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center p-8 bg-white rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Card Not Found</h1>
                <p className="text-gray-600">The business card you are looking for does not exist or has been removed.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-2 sm:px-6 lg:px-8 flex justify-center">
            <div
                className="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    minHeight: '800px',
                    background: `linear-gradient(135deg, ${profile.brandColor}10 0%, white 50%, ${profile.brandColor}05 100%)`
                }}
            >
                {/* Header with brand color accent */}
                <div
                    className="h-3 w-full"
                    style={{ backgroundColor: profile.brandColor }}
                />

                {/* Main Content */}
                <div className="p-8 h-full flex flex-col">
                    {/* Logo Section */}
                    {profile.logo && (
                        <div className="flex justify-center mb-6">
                            <img
                                src={profile.logo}
                                alt="Company Logo"
                                className="h-12 w-auto object-contain"
                            />
                        </div>
                    )}

                    {/* Agent Photo & Info */}
                    <div className="flex flex-col items-center text-center mb-8">
                        {/* Headshot */}
                        <div className="relative mb-4">
                            {profile.headshot ? (
                                <img
                                    src={profile.headshot}
                                    alt={profile.fullName}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                    style={{ borderColor: profile.brandColor }}
                                />
                            ) : (
                                <div
                                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                                    style={{ backgroundColor: profile.brandColor }}
                                >
                                    {profile.fullName.split(' ').map(n => n[0]).join('')}
                                </div>
                            )}
                        </div>

                        {/* Name & Title */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.fullName}</h2>
                        <p className="text-lg text-gray-600 mb-1">{profile.professionalTitle}</p>
                        <p className="text-base font-medium" style={{ color: profile.brandColor }}>
                            {profile.company}
                        </p>
                    </div>

                    {/* Contact Info Toggle */}
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={() => setShowContact(!showContact)}
                            className="flex items-center space-x-2 px-5 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">contact_page</span>
                            <span>{showContact ? 'Hide Contact Info' : 'Contact Info'}</span>
                        </button>
                    </div>

                    {/* Collapsible Contact Details */}
                    {showContact && (
                        <div className="space-y-3 mb-8 animate-fade-in-down bg-white/50 p-4 rounded-xl border border-white/60">
                            {profile.phone && (
                                <a href={`tel:${profile.phone}`} className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                                    <Phone className="w-4 h-4" style={{ color: profile.brandColor }} />
                                    <span className="text-sm font-medium">{profile.phone}</span>
                                </a>
                            )}
                            {profile.email && (
                                <a href={`mailto:${profile.email}`} className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                                    <Mail className="w-4 h-4" style={{ color: profile.brandColor }} />
                                    <span className="text-sm font-medium">{profile.email}</span>
                                </a>
                            )}
                            {profile.website && (
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                                    <Globe className="w-4 h-4" style={{ color: profile.brandColor }} />
                                    <span className="text-sm font-medium">{profile.website.replace(/^https?:\/\//, '')}</span>
                                </a>
                            )}
                        </div>
                    )}

                    {/* Bio */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-600 leading-relaxed text-center">
                            {profile.bio}
                        </p>
                    </div>

                    {/* Primary CTA: Chat with Me */}
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={() => setShowConnectForm(!showConnectForm)}
                            className="flex items-center space-x-2 px-8 py-3 rounded-full font-bold shadow-lg text-white transition-transform hover:scale-105"
                            style={{ backgroundColor: profile.brandColor || '#4f46e5' }}
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span>Chat with Me</span>
                        </button>
                    </div>

                    {/* --- Connect Form (Collapsible) --- */}
                    {showConnectForm && (
                        <div ref={formRef} className="mb-8 p-5 bg-white rounded-xl shadow-lg border border-slate-100 animate-fade-in-down">
                            <h3 className="text-sm font-bold text-slate-800 mb-3 text-center flex items-center justify-center gap-2">
                                <Send className="w-4 h-4 text-indigo-500" />
                                Send a Message
                            </h3>

                            {submitStatus === 'success' ? (
                                <div className="text-center py-4 bg-green-50 rounded-lg text-green-700 text-sm animate-fade-in">
                                    <span className="material-symbols-outlined block text-2xl mb-1">check_circle</span>
                                    Message Sent! I'll be in touch.
                                </div>
                            ) : (
                                <form onSubmit={handleConnectSubmit} className="space-y-3">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Your Name"
                                        className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                        value={connectForm.name}
                                        onChange={e => setConnectForm({ ...connectForm, name: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            required
                                            type="email"
                                            placeholder="Email"
                                            className="w-full text-sm rounded-lg border-slate-200"
                                            value={connectForm.email}
                                            onChange={e => setConnectForm({ ...connectForm, email: e.target.value })}
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone"
                                            className="w-full text-sm rounded-lg border-slate-200"
                                            value={connectForm.phone}
                                            onChange={e => setConnectForm({ ...connectForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <textarea
                                        placeholder="How can I help?"
                                        rows={2}
                                        className="w-full text-sm rounded-lg border-slate-200"
                                        value={connectForm.message}
                                        onChange={e => setConnectForm({ ...connectForm, message: e.target.value })}
                                    ></textarea>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-2 rounded-lg text-white text-sm font-semibold shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                                        style={{ backgroundColor: profile.brandColor || '#4f46e5' }}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Social Media Icons */}
                    <div className="flex justify-center space-x-4 mb-6">
                        {profile.socialMedia.facebook && (
                            <a href={profile.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                                <Facebook className="w-5 h-5 text-blue-600 hover:scale-110 transition-transform cursor-pointer" />
                            </a>
                        )}
                        {profile.socialMedia.instagram && (
                            <a href={profile.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                                <Instagram className="w-5 h-5 text-pink-500 hover:scale-110 transition-transform cursor-pointer" />
                            </a>
                        )}
                        {profile.socialMedia.twitter && (
                            <a href={profile.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                                <Twitter className="w-5 h-5 text-blue-400 hover:scale-110 transition-transform cursor-pointer" />
                            </a>
                        )}
                        {profile.socialMedia.linkedin && (
                            <a href={profile.socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="w-5 h-5 text-blue-700 hover:scale-110 transition-transform cursor-pointer" />
                            </a>
                        )}
                        {profile.socialMedia.youtube && (
                            <a href={profile.socialMedia.youtube} target="_blank" rel="noopener noreferrer">
                                <Youtube className="w-5 h-5 text-red-600 hover:scale-110 transition-transform cursor-pointer" />
                            </a>
                        )}
                    </div>

                    {/* Footer Share Button (Renamed) */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleShare}
                            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:bg-gray-200 text-gray-600"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share Profile Link</span>
                        </button>
                    </div>

                    <div className="mt-4 text-center">
                        <a href="/" className="text-xs text-gray-400 hover:text-gray-600">Powered by HomeListingAI</a>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PublicAICard;
