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
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Profile</h2>
                    <p className="text-slate-500 mt-1">Your public LO profile — shows on every listing you're co-branded on.</p>
                </div>
                <FeatureSection title="Loan Officer Profile" icon="badge">
                    <LOProfileSettings />
                </FeatureSection>
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => navigate('/ai-card')}
                        className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                    >
                        <span className="material-symbols-outlined text-base">contact_page</span>
                        Preview AI Card
                    </button>
                </div>
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
