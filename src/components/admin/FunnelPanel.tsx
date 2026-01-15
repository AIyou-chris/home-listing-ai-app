
import React from 'react';
import { EditableStep } from './AdminMarketingFunnelsPanel'; // We will need to export EditableStep type
import { EmailEditor } from '../EmailEditor'; // Assuming this path, need to verify
// If EmailEditor is not exported or path is different, we might need to adjust.
// Let's first just copy the logic and then fix imports.
// Actually, EmailEditor is likely in the same folder or one up.
// Let's assume standard import for now and fix if needed.

type FunnelPanelProps = {
    panelKey: string;
    isOpen: boolean;
    onTogglePanel: () => void;

    badgeIcon: string;
    badgeClassName: string;
    badgeLabel: string;
    title: string;
    description: string;
    iconColorClass: string;
    steps: EditableStep[];
    expandedIds: string[];
    onToggleStep: (id: string) => void;
    onUpdateStep: (id: string, field: keyof EditableStep, value: string) => void;
    onRemoveStep: (id: string) => void;
    onAddStep: () => void;
    onSave: () => void;
    saveLabel: string;
    onSendTest: (step: EditableStep) => void;
    mergeTokens: (text: string) => string;
    COMMON_TOKEN_HINTS: string[];
};

export const FunnelPanel: React.FC<FunnelPanelProps> = ({
    panelKey,
    isOpen,
    onTogglePanel,
    badgeIcon,
    badgeClassName,
    badgeLabel,
    title,
    description,
    iconColorClass,
    steps,
    expandedIds,
    onToggleStep,
    onUpdateStep,
    onRemoveStep,
    onAddStep,
    onSave,
    saveLabel,
    onSendTest,
    mergeTokens,
    COMMON_TOKEN_HINTS
}) => {
    return (
        <section className="bg-white border-y border-slate-200 md:border md:rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
                        <span className="material-symbols-outlined text-base">{badgeIcon}</span>
                        {badgeLabel}
                    </p>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <button
                        type="button"
                        onClick={onTogglePanel}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        {isOpen ? 'Collapse' : 'Expand'}
                    </button>
                </div>
            </div>
            {isOpen && (
                <>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-slate-500">
                        <span className="font-semibold text-slate-600">Tokens:</span>
                        {COMMON_TOKEN_HINTS.map((token) => (
                            <span
                                key={`${panelKey}-${token}`}
                                className="rounded-full bg-slate-100 px-2 py-1 text-slate-600"
                            >
                                {token}
                            </span>
                        ))}
                    </div>
                    <div className="space-y-0 relative">
                        {steps.map((step, index) => {
                            const stepIsOpen = expandedIds.includes(step.id);
                            const isLast = index === steps.length - 1;

                            return (
                                <div key={step.id} className="relative pl-8 pb-6">
                                    {!isLast && (
                                        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-indigo-100" />
                                    )}
                                    <div className={`absolute left-0 top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white ${stepIsOpen ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 text-slate-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${stepIsOpen ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                    </div>

                                    <article
                                        className={`transition-all duration-200 border rounded-2xl ${stepIsOpen
                                            ? 'bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50/50'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-pointer'
                                            }`}
                                    >
                                        <div
                                            role="button"
                                            onClick={() => onToggleStep(step.id)}
                                            className="flex items-center justify-between p-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl ${stepIsOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined">{step.icon}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className={`text-sm font-bold ${stepIsOpen ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {step.title}
                                                        </h3>
                                                        {!stepIsOpen && (
                                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                                {step.delay}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium max-w-[300px] truncate">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {stepIsOpen ? (
                                                    <span className="material-symbols-outlined text-indigo-400">expand_less</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                                            {step.type}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {stepIsOpen && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                                <div className="pt-4 border-t border-slate-100">
                                                    <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Timing</label>
                                                            <input
                                                                className="w-full bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                                                value={step.delay}
                                                                onChange={(e) => onUpdateStep(step.id, 'delay', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="w-px h-8 bg-slate-200" />
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Type</label>
                                                            <select
                                                                className="w-full bg-transparent text-sm font-bold text-indigo-600 focus:outline-none cursor-pointer"
                                                                value={step.type}
                                                                onChange={(e) => onUpdateStep(step.id, 'type', e.target.value)}
                                                            >
                                                                <option value="Email">Email</option>
                                                                <option value="Call">AI Call</option>
                                                                <option value="Task">Task</option>
                                                                <option value="SMS">SMS</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {step.type === 'Call' || step.type === 'AI Call' ? (
                                                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-6 flex items-start gap-4">
                                                            <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                                                                <span className="material-symbols-outlined text-2xl">support_agent</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-blue-900 font-bold text-lg mb-1">AI Call Configured</h4>
                                                                <p className="text-blue-700/80 text-sm leading-relaxed max-w-md">
                                                                    Your AI Agent will call them to remind about the appointment. Transcript will be here.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (step.type === 'Text' || step.type === 'sms' || step.type === 'SMS') ? (
                                                        import.meta.env.VITE_ENABLE_SMS === 'false' ? (
                                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
                                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                                    <span className="material-symbols-outlined text-3xl text-slate-400">sms</span>
                                                                </div>
                                                                <h3 className="text-lg font-bold text-slate-900 mb-2">SMS Marketing Coming Soon</h3>
                                                                <p className="text-slate-500 max-w-md mb-6">
                                                                    We are currently finalizing 10DLC registration with mobile carriers to ensure maximum deliverability.
                                                                    <br /><span className="text-xs text-slate-400 mt-2 block">(Estimated 2-3 weeks)</span>
                                                                </p>
                                                                <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 font-semibold rounded-lg cursor-not-allowed">
                                                                    Setup Pending
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                                <div className="space-y-4">
                                                                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="material-symbols-outlined text-slate-500">sms</span>
                                                                            <h4 className="text-sm font-bold text-slate-700">SMS Content</h4>
                                                                        </div>
                                                                        <textarea
                                                                            className="w-full h-32 rounded-lg border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                                                            placeholder="Type your text message here... (e.g. Hi {{lead.name}})"
                                                                            value={step.content}
                                                                            onChange={(e) => onUpdateStep(step.id, 'content', e.target.value)}
                                                                        />
                                                                        <div className="flex justify-between items-center mt-1">
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {step.content?.length || 0} characters
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-3">
                                                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                                                Attach Image URL (MMS)
                                                                            </label>
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    className="flex-1 rounded-lg border-slate-200 text-xs text-slate-700 bg-white"
                                                                                    placeholder="https://..."
                                                                                    value={step.mediaUrl || ''}
                                                                                    onChange={(e) => onUpdateStep(step.id, 'mediaUrl', e.target.value)}
                                                                                />
                                                                                {step.mediaUrl && <div className="w-8 h-8 rounded bg-slate-100 bg-cover bg-center border border-slate-200 shrink-0" style={{ backgroundImage: `url(${step.mediaUrl})` }}></div>}
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 mt-2">
                                                                            Tokens like <code className="bg-slate-200 px-1 rounded text-slate-600">{'{{lead.name}}'}</code> are supported.
                                                                        </p>
                                                                        <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-200">
                                                                            <button
                                                                                onClick={() => onSendTest(step)}
                                                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                                                                            >
                                                                                Send Test
                                                                            </button>
                                                                            <button
                                                                                onClick={onSave}
                                                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700"
                                                                            >
                                                                                Save Changes
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <div className="w-[280px] h-[580px] bg-slate-900 rounded-[3rem] p-4 shadow-2xl border-4 border-slate-800 relative ring-1 ring-white/20">
                                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-10" />
                                                                        <div className="w-full h-full bg-white rounded-[2.2rem] overflow-hidden flex flex-col">
                                                                            <div className="h-10 bg-slate-100 flex items-center justify-between px-6 pt-2">
                                                                                <div className="text-[10px] font-bold text-slate-900">9:41</div>
                                                                                <div className="flex gap-1">
                                                                                    <div className="w-3 h-3 bg-slate-900 rounded-full opacity-20" />
                                                                                    <div className="w-3 h-3 bg-slate-900 rounded-full opacity-20" />
                                                                                    <div className="w-3 h-3 bg-slate-900 rounded-full" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex-1 bg-slate-50 p-4 flex flex-col gap-3 overflow-y-auto">
                                                                                <div className="text-[10px] text-center text-slate-400 font-medium">Today 9:41 AM</div>
                                                                                <div className="self-end max-w-[85%]">
                                                                                    <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-xs leading-relaxed shadow-sm">
                                                                                        {step.mediaUrl && (
                                                                                            <div className="mb-2 rounded-lg overflow-hidden">
                                                                                                <img src={step.mediaUrl} alt="MMS" className="w-full h-auto object-cover" />
                                                                                            </div>
                                                                                        )}
                                                                                        {step.content || 'Your message...'}
                                                                                    </div>
                                                                                    <div className="text-[9px] text-slate-400 text-right mt-1 font-medium">Delivered</div>
                                                                                </div>
                                                                                <div className="self-start max-w-[85%] mt-2">
                                                                                    <div className="bg-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-2 text-xs leading-relaxed shadow-sm">
                                                                                        Sounds good!
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="h-16 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between">
                                                                                <div className="w-8 h-8 rounded-full bg-slate-200" />
                                                                                <div className="flex-1 mx-3 h-8 bg-white border border-slate-200 rounded-full" />
                                                                                <div className="w-8 h-8 rounded-full bg-blue-500" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    ) : step.type === 'Wait' ? (
                                                        <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-6 flex items-start gap-4">
                                                            <div className="p-3 bg-white rounded-full shadow-sm text-yellow-600">
                                                                <span className="material-symbols-outlined text-2xl">timer</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-yellow-900 font-bold text-lg mb-1">Wait Step Configured</h4>
                                                                <p className="text-yellow-700/80 text-sm leading-relaxed max-w-md">
                                                                    This step will pause the funnel for the specified duration before proceeding.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="rounded-xl bg-violet-50 border border-violet-100 p-5">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                                                        <span className="material-symbols-outlined">mail</span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-violet-900">Email Content</h4>
                                                                        <p className="text-xs text-violet-700/80">Design your automated email message.</p>
                                                                    </div>
                                                                </div>

                                                                <label className="block text-xs font-semibold text-violet-800/90 mb-1">
                                                                    Subject Line
                                                                </label>
                                                                <input
                                                                    className="w-full text-base font-bold text-slate-900 placeholder:text-slate-300 border border-violet-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white shadow-sm mb-4"
                                                                    placeholder="e.g. following up on our chat..."
                                                                    value={step.subject}
                                                                    onChange={(e) => onUpdateStep(step.id, 'subject', e.target.value)}
                                                                />

                                                                <div className="relative">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-xs font-semibold text-violet-800/90">Message Body</label>
                                                                        <button
                                                                            type="button"
                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                                            AI Magic
                                                                        </button>
                                                                    </div>
                                                                    <div className="border border-violet-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                                                        <EmailEditor
                                                                            value={step.content}
                                                                            onChange={(val) => onUpdateStep(step.id, 'content', val)}
                                                                            placeholder="Type your message..."
                                                                            className="min-h-[300px]"
                                                                        />
                                                                    </div>

                                                                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-violet-200/50">
                                                                        <button
                                                                            onClick={() => onSendTest(step)}
                                                                            className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 shadow-sm"
                                                                        >
                                                                            Send Test
                                                                        </button>
                                                                        <button
                                                                            onClick={onSave}
                                                                            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-violet-700"
                                                                        >
                                                                            Save Changes
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                </div>
                            );
                        })}

                        <button
                            onClick={onAddStep}
                            className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
                        >
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                            Add Step
                        </button>
                    </div>
                </>
            )}
        </section>
    );
};
