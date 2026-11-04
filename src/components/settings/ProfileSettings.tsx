import React from 'react';
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
    const accountType = localStorage.getItem('hla_account_type') || 'realtor';
    const isLO = accountType === 'lo';

    if (isLO) {
        return (
            <div className="space-y-5 p-4 animate-fadeIn sm:p-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Profile</h2>
                    <p className="mt-1 text-sm text-slate-600">Your public LO profile — shows on every listing you're co-branded on.</p>
                </div>
                <FeatureSection title="Loan Officer Profile" icon="badge">
                    <LOProfileSettings />
                </FeatureSection>
            </div>
        );
    }

    return (
        <div className="space-y-5 p-4 animate-fadeIn sm:p-6">
            <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900">Profile Settings</h2>
                <p className="mt-1 text-sm text-slate-600">Manage your public profile and digital presence.</p>
            </div>

            <FeatureSection title="AI Business Card" icon="badge">
                <AgentBusinessCardEditor userProfile={userProfile} onSaveProfile={onSave} />
            </FeatureSection>

        </div>
    );
};

export default ProfileSettings;
