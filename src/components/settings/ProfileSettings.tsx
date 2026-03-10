import React from 'react';
import { AgentProfile } from '../../types';
import { FeatureSection } from './SettingsCommon';
import AgentBusinessCardEditor from '../agent/AgentBusinessCardEditor';

interface ProfileSettingsProps {
    userProfile: AgentProfile;
    onSave: (profile: AgentProfile) => Promise<void>;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    userProfile,
    onSave
}) => {
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
