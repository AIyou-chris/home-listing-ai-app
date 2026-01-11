import React from 'react';
import { AgentProfile } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface ProfileSettingsProps {
    userProfile: AgentProfile;
    onSave: (profile: AgentProfile) => Promise<void>;
    onBack?: () => void;
    isLoading?: boolean;
    onNavigateToAICard?: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    onBack: _onBack,
    onNavigateToAICard
}) => {
    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">👤 Profile Settings</h2>
                <p className="text-slate-500 mt-1">Manage your public profile and digital presence.</p>
            </div>

            <FeatureSection title="AI Business Card" icon="badge">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transform rotate-3">
                            <span className="material-symbols-outlined text-white text-4xl">contact_page</span>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Your AI Business Card is Your Profile</h3>
                            <p className="text-slate-600 mb-6 max-w-xl">
                                We've unified your profile management into your <strong>AI Business Card</strong>.
                                This card serves as your digital identity across the entire HomeListingAI platform,
                                effectively acting as your "master profile" for all AI interactions, marketing materials, and client communications.
                            </p>
                            <button
                                type="button"
                                onClick={onNavigateToAICard}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <span className="material-symbols-outlined">edit_square</span>
                                Edit My AI Business Card
                            </button>
                        </div>
                    </div>
                </div>
            </FeatureSection>

        </div>
    );
};

export default ProfileSettings;
