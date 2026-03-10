import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentProfile, BillingSettings as BillingSettingsType } from '../../types';
import { FeatureSection } from './SettingsCommon';

interface BillingSettingsProps {
  settings: BillingSettingsType;
  onSave: (settings: BillingSettingsType) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  isBlueprintMode?: boolean;
  agentProfile?: AgentProfile;
}

const BillingSettingsPage: React.FC<BillingSettingsProps> = ({ settings: _settings, onSave: _onSave, agentProfile: _agentProfile }) => {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="mt-1 text-slate-600">Manage plans and upgrades in one place.</p>
      </div>

      <FeatureSection title="Billing Location" icon="receipt_long">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-700">
            Billing is managed in your dashboard billing center with current plans:
            <span className="font-semibold"> Free, Starter $39, Pro $79</span>.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings/billing')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Go to Billing Center
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/today')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </FeatureSection>
    </div>
  );
};

export default BillingSettingsPage;
