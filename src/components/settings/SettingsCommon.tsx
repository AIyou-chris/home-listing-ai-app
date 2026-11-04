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
            className={`flex min-h-[44px] items-center gap-2.5 rounded-full px-4 text-sm font-bold transition-colors duration-200 ${isActive
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

export const FeatureSection: React.FC<{ title: string; icon: string; children: React.ReactNode; iconClassName?: string; description?: string }> = ({ title, icon, children, iconClassName, description }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label={title}>
        <div className="mb-5 flex items-start gap-3">
            <span aria-hidden="true" className={`material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-2xl text-primary-700 ${iconClassName ? '' : ''}`}>{icon}</span>
            <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                {description && <p className="text-sm text-slate-600">{description}</p>}
            </div>
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);
