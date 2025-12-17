import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, Globe, Share2, Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { getAICardProfile, AICardProfile } from '../services/aiCardService';

const PublicAICard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<AICardProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: profile?.fullName || 'Business Card',
                    text: `Check out ${profile?.fullName}'s AI Business Card!`,
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
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
            <div
                className="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    // Ensure height adapts to content in mobile standalone view, but keeps minimum
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

                    {/* Contact Info */}
                    <div className="space-y-3 mb-8">
                        {profile.phone && (
                            <a href={`tel:${profile.phone}`} className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900">
                                <Phone className="w-4 h-4" style={{ color: profile.brandColor }} />
                                <span className="text-sm">{profile.phone}</span>
                            </a>
                        )}
                        {profile.email && (
                            <a href={`mailto:${profile.email}`} className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900">
                                <Mail className="w-4 h-4" style={{ color: profile.brandColor }} />
                                <span className="text-sm">{profile.email}</span>
                            </a>
                        )}
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2 text-gray-700 hover:text-gray-900">
                                <Globe className="w-4 h-4" style={{ color: profile.brandColor }} />
                                <span className="text-sm">{profile.website.replace(/^https?:\/\//, '')}</span>
                            </a>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="mb-6 flex-1">
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {profile.bio}
                        </p>
                    </div>

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

                    {/* Share Button (Self Share) */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleShare}
                            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg text-white"
                            style={{
                                backgroundColor: profile.brandColor,
                                marginBottom: '20px'
                            }}
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share Card</span>
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
