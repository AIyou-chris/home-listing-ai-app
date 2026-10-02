import React from 'react';

export const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}> = ({ isActive, onClick, icon, children }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                ? 'bg-primary-50 text-primary-600'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
        >
            <span className="material-symbols-outlined w-5 h-5">{icon}</span>
            <span>{children}</span>
        </button>
    );
};

export const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={enabled}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
                if (!disabled) {
                    onChange(!enabled);
                }
            }}
            className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${disabled
                ? 'bg-slate-200 cursor-not-allowed opacity-60'
                : enabled
                    ? 'bg-primary-600'
                    : 'bg-slate-300'
                }`}
        >
            <span
                aria-hidden='true'
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-lg ring-0 transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    )
}

export const FeatureSection: React.FC<{ title: string; icon: string; children: React.ReactNode; iconClassName?: string }> = ({ title, icon, children, iconClassName }) => (
    <div className="mt-8 pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-6">
            <span className={`material-symbols-outlined w-6 h-6 ${iconClassName || 'text-slate-500'}`}>{icon}</span>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);
