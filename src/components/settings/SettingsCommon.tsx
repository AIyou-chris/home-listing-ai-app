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

export const FormInput: React.FC<{ label: string; id: string; } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
        </label>
        <input
            id={id}
            {...props}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
        />
    </div>
);

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

export const IntegrationCard: React.FC<{
    icon: string;
    title: string;
    description: string;
    tags: { label: string; color: string }[];
    isSelected: boolean;
    onClick: () => void;
}> = ({ icon, title, description, tags, isSelected, onClick }) => {
    const tagColors: Record<string, string> = {
        green: 'bg-green-100 text-green-700',
        blue: 'bg-blue-100 text-blue-700',
        yellow: 'bg-yellow-100 text-yellow-700',
        red: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-4 sm:p-5 text-left rounded-xl border-2 transition-all w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${isSelected
                ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:bg-slate-50 active:bg-slate-100'
                }`}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-slate-100'
                    }`}>
                    <span className={`material-symbols-outlined w-5 h-5 sm:w-6 sm:h-6 ${isSelected ? 'text-white' : 'text-slate-600'
                        }`}>{icon}</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-800">{title}</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 flex-grow leading-relaxed">{description}</p>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 flex-wrap">
                {tags.map(tag => (
                    <span key={tag.label} className={`px-2 py-1 text-xs font-semibold rounded-full ${tagColors[tag.color] || 'bg-slate-100 text-slate-700'}`}>
                        {tag.label}
                    </span>
                ))}
            </div>
        </button>
    );
};

export const FeatureToggleRow: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ label, description, enabled, onToggle, disabled }) => (
    <div className="flex justify-between items-center p-4 bg-slate-50/70 rounded-lg border border-slate-200">
        <div>
            <h4 className="font-semibold text-slate-800">{label}</h4>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onToggle} disabled={disabled} />
    </div>
);

export const FeatureSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="mt-8 pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined w-6 h-6 text-slate-500">{icon}</span>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);
