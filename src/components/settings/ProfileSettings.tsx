import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentProfile } from '../../types';
import { FeatureSection } from './SettingsCommon';
import AgentBusinessCardEditor from '../agent/AgentBusinessCardEditor';
import LOProfileSettings from './LOProfileSettings';

interface ProfileSettingsProps {
    userProfile: AgentProfile;
    onSave: (profile: AgentProfile) => Promise<void>;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    userProfile,
    onSave
}) => {
    const navigate = useNavigate();
    const accountType = localStorage.getItem('hla_account_type') || 'realtor';
    const isLO = accountType === 'lo';

    if (isLO) {
        return (
            <div className="p-8 space-y-8 animate-fadeIn">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
                        <p className="text-slate-500 mt-1">Your public LO profile — shows on every listing you're co-branded on.</p>
                    </div>
                    <button
                        onClick={() => navigate('/ai-card')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold shadow-sm"
                    >
                        <span className="material-symbols-outlined text-base">contact_page</span>
                        Preview AI Card
                    </button>
                </div>
                <FeatureSection title="Loan Officer Profile" icon="badge">
                    <LOProfileSettings />
                </FeatureSection>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Profile Settings</h2>
                <p className="text-slate-500 mt-1">Manage your public profile and digital presence.</p>
            </div>

            <FeatureSection title="AI Business Card" icon="badge">
                <AgentBusinessCardEditor userProfile={userProfile} onSaveProfile={onSave} />
            </FeatureSection>

        </div>
    );
};

export default ProfileSettings;
