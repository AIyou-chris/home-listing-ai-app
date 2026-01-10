import React, { useState, useEffect } from 'react';
import { AgentProfile } from '../../types';
import { FeatureSection, FormInput } from './SettingsCommon';

interface ProfileSettingsProps {
    userProfile: AgentProfile;
    onSave: (profile: AgentProfile) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    userProfile,
    onSave,
    onBack,
    isLoading = false
}) => {
    const [formData, setFormData] = useState<AgentProfile>(userProfile);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFormData(userProfile);
        }
    }, [userProfile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialLinkChange = (platform: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [platform]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">👤 Profile Settings</h2>
                <p className="text-slate-500 mt-1">Manage your public profile and contact information.</p>
            </div>

            {/* Basic Info */}
            <FeatureSection title="Basic Information" icon="person">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Full Name"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="e.g. Sarah Smith"
                    />
                    <FormInput
                        label="License Number"
                        id="licenseNumber"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. CA-DRE #01234567"
                    />
                    <FormInput
                        label="Brokerage"
                        id="brokerage"
                        name="brokerage"
                        value={formData.brokerage}
                        onChange={handleInputChange}
                        placeholder="e.g. Luxury Living Realty"
                    />
                    <FormInput
                        label="Phone Number"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. (555) 123-4567"
                    />
                    <div className="md:col-span-2">
                        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">
                            Bio
                        </label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={4}
                            value={formData.bio}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Tell us a bit about yourself..."
                        />
                    </div>
                </div>
            </FeatureSection>

            {/* Branding */}
            <FeatureSection title="Branding" icon="palette">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Website URL"
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://www.yourwebsite.com"
                    />
                    <FormInput
                        label="Logo URL"
                        id="logo"
                        name="logo"
                        value={formData.logo}
                        onChange={handleInputChange}
                        placeholder="https://..."
                    />
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Social Media Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['instagram', 'linkedin', 'facebook', 'twitter', 'youtube'].map((platform) => (
                                <div key={platform} className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <img
                                            src={`https://cdn.simpleicons.org/${platform}`}
                                            alt=""
                                            className="h-4 w-4 opacity-50 grayscale"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.socialLinks?.[platform] || ''}
                                        onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                                        className="pl-9 w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </FeatureSection>

            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        ← Back to Dashboard
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSaving || isLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ml-auto"
                >
                    {isSaving ? 'Saving…' : 'Save Profile'}
                </button>
            </div>
        </form>
    );
};

export default ProfileSettings;
