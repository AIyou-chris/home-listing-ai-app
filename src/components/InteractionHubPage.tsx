import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Interaction, Property, InteractionSourceType } from '../types';
import AddLeadModal, { type NewLeadPayload } from './AddLeadModal';
import { REPLY_TEMPLATES, countOldIdle, filterInteractions, loadReadIds, replyLinkFor, saveReadIds, type InboxTab } from '../admin-dashboard/inboxHelpers';

export interface InteractionThreadMessage {
    id: string;
    sender: 'lead' | 'agent' | 'ai';
    channel: 'chat' | 'voice' | 'email' | 'sms';
    timestamp: string;
    text: string;
}

interface InteractionHubPageProps {
    properties?: Property[];
    onBackToDashboard: () => void;
    onAddNewLead: (leadData: NewLeadPayload) => void;
    interactions: Interaction[];
    setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>;
    isLoading?: boolean;
    errorMessage?: string | null;
    onRetry?: () => void;
    onArchiveInteraction?: (interactionId: string) => Promise<void>;
    onLoadInteractionMessages?: (interactionId: string) => Promise<InteractionThreadMessage[]>;
}

const sourceIcons: Record<InteractionSourceType, React.ReactElement> = {
    'listing-inquiry': <span className="material-symbols-outlined w-5 h-5">home_work</span>,
    'marketing-reply': <span className="material-symbols-outlined w-5 h-5">campaign</span>,
    'chat-bot-session': <span className="material-symbols-outlined w-5 h-5">memory</span>,
};

const sourceColors: Record<InteractionSourceType, { bg: string, text: string }> = {
    'listing-inquiry': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'marketing-reply': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'chat-bot-session': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

const senderLabel = (sender: InteractionThreadMessage['sender']) => (sender === 'lead' ? 'Buyer' : sender === 'agent' ? 'Agent' : 'AI');

const InteractionListItem: React.FC<{
    interaction: Interaction;
    isSelected: boolean;
    isRead: boolean;
    onSelect: () => void;
}> = ({ interaction, isSelected, isRead, onSelect }) => {
    const icon = sourceIcons[interaction.sourceType];
    const colors = sourceColors[interaction.sourceType];

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-4 border-l-4 ${isSelected ? 'border-primary-500 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
        >
            <div className="flex justify-between items-start">
                <div className={`flex items-center gap-2 text-xs font-bold ${colors.text}`}>
                    <div className={`p-1 rounded-full ${colors.bg}`}>{icon}</div>
                    <span>{interaction.sourceName}</span>
                </div>
                <span className="text-xs text-slate-400">{interaction.timestamp}</span>
            </div>
            <h3 className="font-bold text-slate-800 mt-2">{interaction.contact.name}</h3>
            <p className="text-sm text-slate-500 truncate pr-4">
                {interaction.message}
            </p>
            {!isRead && (
                <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary-500 rounded-full" aria-label="Unread"></div>
            )}
        </button>
    );
};

const InteractionDetail: React.FC<{
    interaction: Interaction;
    property: Property | undefined;
    thread: { loading: boolean; error: boolean; messages: InteractionThreadMessage[] };
    isArchiving: boolean;
    archiveError: string | null;
    onArchive: (id: string) => void;
    onCreateLead: () => void;
    onBack: () => void;
}> = ({ interaction, property, thread, isArchiving, archiveError, onArchive, onCreateLead, onBack }) => {
    const colors = sourceColors[interaction.sourceType];
    const [templateId, setTemplateId] = useState('');
    const reply = replyLinkFor(interaction, templateId || undefined);
    const alreadyLead = Boolean(interaction.metadata?.leadId);
    const address = (interaction.metadata?.propertyAddress as string | undefined) || undefined;
    const btn = 'min-h-[40px] px-4 py-2 text-sm font-semibold rounded-lg';

    return (
        <div className="flex flex-col h-full">
            <header className="p-5 border-b border-slate-200">
                <button onClick={onBack} className="md:hidden mb-3 min-h-[40px] text-sm font-semibold text-slate-600">← Back to inbox</button>
                <div className={`flex items-center gap-3 text-sm font-bold mb-3 ${colors.text}`}>
                    <div className={`p-2 rounded-full ${colors.bg}`}>{sourceIcons[interaction.sourceType]}</div>
                    <span>{interaction.sourceName}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{interaction.contact.name}</h2>
                <p className="text-sm text-slate-500">
                    Received {interaction.timestamp}
                    {interaction.contact.email ? ` · ${interaction.contact.email}` : ''}
                    {interaction.contact.phone ? ` · ${interaction.contact.phone}` : ''}
                </p>
            </header>
            <main className="flex-grow p-6 overflow-y-auto bg-slate-50/50">
                {thread.loading ? (
                    <p className="text-sm text-slate-500">Loading the conversation…</p>
                ) : thread.messages.length > 0 ? (
                    <ul className="space-y-3">
                        {thread.messages.map((m) => (
                            <li key={m.id} className={`rounded-xl p-3 text-sm ${m.sender === 'lead' ? 'bg-white border border-slate-200' : 'bg-primary-50 border border-primary-100'}`}>
                                <p className="text-xs font-bold text-slate-500">{senderLabel(m.sender)} · {m.timestamp}</p>
                                <p className="mt-1 whitespace-pre-line text-slate-800">{m.text}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="prose prose-slate max-w-none">
                        <p>{interaction.message}</p>
                        {thread.error && <p className="text-xs text-slate-400">The full conversation could not be loaded.</p>}
                    </div>
                )}
                {(property || address) && (
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h4 className="font-semibold text-slate-800 mb-2">Related Property</h4>
                        {property ? (
                            <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                                <img src={property.imageUrl} alt={property.address} className="w-16 h-16 rounded-md object-cover" />
                                <div>
                                    <h5 className="font-bold text-slate-800">{property.address}</h5>
                                    <p className="text-sm text-primary-600 font-semibold">${property.price.toLocaleString()}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-700">{address}</p>
                        )}
                    </div>
                )}
            </main>
            <footer className="p-4 bg-white border-t border-slate-200">
                {archiveError && <p role="alert" className="mb-2 text-sm text-red-600">{archiveError}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {reply ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                aria-label="Quick reply"
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700"
                            >
                                <option value="">Write my own</option>
                                {REPLY_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                            <a href={reply.href} className={`${btn} inline-flex items-center gap-2 text-white bg-primary-600`}>
                                <span className="material-symbols-outlined w-4 h-4">send</span>
                                <span>{reply.label}</span>
                            </a>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500">No email or phone yet. They have not left contact details.</span>
                    )}
                    <div className="flex items-center gap-2">
                        <button onClick={() => onArchive(interaction.id)} disabled={isArchiving} className={`${btn} text-slate-700 bg-slate-100 border border-slate-200 disabled:opacity-50`}>
                            {isArchiving ? 'Archiving…' : 'Archive'}
                        </button>
                        {alreadyLead ? (
                            <span className={`${btn} inline-flex items-center text-green-700 bg-green-50`}>✓ Already a lead</span>
                        ) : (
                            <button onClick={onCreateLead} className={`${btn} inline-flex items-center gap-2 text-white bg-green-600`}>
                                <span className="material-symbols-outlined w-4 h-4">add</span>
                                <span>Create Lead</span>
                            </button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
};

const InteractionHubPage: React.FC<InteractionHubPageProps> = ({
    properties = [],
    onBackToDashboard,
    onAddNewLead,
    interactions,
    setInteractions,
    isLoading = false,
    errorMessage = null,
    onRetry,
    onArchiveInteraction,
    onLoadInteractionMessages
}) => {
    const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [leadInitialData, setLeadInitialData] = useState<{ name: string; message: string } | undefined>(undefined);
    const [tab, setTab] = useState<InboxTab>('attention');
    const [showOld, setShowOld] = useState(false);
    const [search, setSearch] = useState('');
    const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
    const [threads, setThreads] = useState<Record<string, { loading: boolean; error: boolean; messages: InteractionThreadMessage[] }>>({});
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [archiveError, setArchiveError] = useState<string | null>(null);

    const visible = useMemo(() => filterInteractions(interactions, { tab, search, showOld }), [interactions, tab, search, showOld]);
    const oldIdleCount = useMemo(() => countOldIdle(interactions), [interactions]);

    useEffect(() => {
        // Keep a valid selection: first visible item, unless the current one is still in the list.
        if (!selectedInteractionId || !visible.some((i) => i.id === selectedInteractionId)) {
            setSelectedInteractionId(visible[0]?.id || null);
        }
    }, [visible, selectedInteractionId]);

    const markRead = useCallback((id: string) => {
        setReadIds((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev).add(id);
            saveReadIds(next);
            return next;
        });
    }, []);

    // Load the full back-and-forth for whatever is selected (once per conversation).
    useEffect(() => {
        if (!selectedInteractionId || !onLoadInteractionMessages || threads[selectedInteractionId]) return;
        const id = selectedInteractionId;
        setThreads((prev) => ({ ...prev, [id]: { loading: true, error: false, messages: [] } }));
        onLoadInteractionMessages(id)
            .then((messages) => setThreads((prev) => ({ ...prev, [id]: { loading: false, error: false, messages } })))
            .catch(() => setThreads((prev) => ({ ...prev, [id]: { loading: false, error: true, messages: [] } })));
    }, [selectedInteractionId, onLoadInteractionMessages, threads]);

    const handleSelectInteraction = (id: string) => {
        setSelectedInteractionId(id);
        setMobileDetailOpen(true);
        setArchiveError(null);
        markRead(id);
    };

    const handleArchive = async (interactionId: string) => {
        setArchiveError(null);
        setArchivingId(interactionId);
        try {
            // The server hides it for good (it used to vanish from the screen and come back on refresh).
            if (onArchiveInteraction) await onArchiveInteraction(interactionId);
            else setInteractions((prev) => prev.filter((i) => i.id !== interactionId));
            setMobileDetailOpen(false);
        } catch {
            setArchiveError('Could not archive this conversation. Try again.');
        } finally {
            setArchivingId(null);
        }
    };

    const handleCreateLead = () => {
        const interaction = interactions.find((i) => i.id === selectedInteractionId);
        if (!interaction) return;
        setLeadInitialData({
            name: interaction.contact.name,
            message: `Original inquiry about "${interaction.sourceName}":\n${interaction.message}`
        });
        setIsAddLeadModalOpen(true);
    };

    const selectedInteraction = interactions.find((i) => i.id === selectedInteractionId);
    const relatedProperty = selectedInteraction?.relatedPropertyId
        ? properties.find((p) => p.id === selectedInteraction.relatedPropertyId)
        : undefined;
    const selectedThread = (selectedInteractionId && threads[selectedInteractionId]) || { loading: false, error: false, messages: [] };
    const hiddenByTab = tab === 'attention' ? interactions.length - visible.length : 0;

    return (
        <>
            <div className="flex h-full bg-white">
                <aside className={`${mobileDetailOpen ? 'hidden md:flex' : 'flex'} w-full md:w-2/5 lg:w-1/3 max-w-md h-full flex-col border-r border-slate-200`}>
                    <div className="p-4 border-b border-slate-200">
                        <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-2 min-h-[40px]">
                            <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                            <span>Back to Dashboard</span>
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900">AI Inbox</h1>
                        <div className="relative mt-2">
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search inbox"
                                placeholder="Search inbox..."
                                className="w-full bg-slate-100 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                        <div className="mt-3 flex gap-1.5" role="tablist" aria-label="Inbox filter">
                            {([['attention', 'Needs you'], ['all', 'All']] as Array<[InboxTab, string]>).map(([key, label]) => (
                                <button
                                    key={key}
                                    role="tab"
                                    aria-selected={tab === key}
                                    onClick={() => setTab(key)}
                                    className={`min-h-[40px] rounded-full border px-4 text-sm font-bold ${tab === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-16 text-slate-500 text-sm">Loading your inbox…</div>
                        ) : errorMessage ? (
                            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <p className="font-semibold">The inbox could not load.</p>
                                <p className="mt-1">{errorMessage}</p>
                                {onRetry && <button onClick={onRetry} className="mt-3 min-h-[40px] rounded-lg bg-red-600 px-4 text-sm font-bold text-white">Try again</button>}
                            </div>
                        ) : visible.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                                {tab === 'all' && oldIdleCount > 0 && !search.trim() && (
                                    <button onClick={() => setShowOld((v) => !v)} className="w-full min-h-[40px] bg-slate-50 px-4 text-left text-xs font-semibold text-slate-500">
                                        {showOld ? 'Hide' : 'Show'} {oldIdleCount} old idle chat{oldIdleCount === 1 ? '' : 's'} (no contact details, quiet 14+ days)
                                    </button>
                                )}
                                {visible.map((interaction) => (
                                    <div key={interaction.id} className="relative">
                                        <InteractionListItem
                                            interaction={interaction}
                                            isSelected={selectedInteractionId === interaction.id}
                                            isRead={readIds.has(interaction.id)}
                                            onSelect={() => handleSelectInteraction(interaction.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 px-6 text-slate-500">
                                <span className="material-symbols-outlined w-12 h-12">inbox</span>
                                <p className="mt-2 font-semibold">
                                    {search.trim() ? 'No matches' : interactions.length === 0 ? 'Inbox is empty' : 'Nothing needs you right now'}
                                </p>
                                {tab === 'attention' && hiddenByTab > 0 && !search.trim() && (
                                    <button onClick={() => setTab('all')} className="mt-3 min-h-[40px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">
                                        Show all {interactions.length}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
                <main className={`${mobileDetailOpen ? 'block' : 'hidden md:block'} flex-1 h-full`}>
                    {selectedInteraction ? (
                        <InteractionDetail
                            interaction={selectedInteraction}
                            property={relatedProperty}
                            thread={selectedThread}
                            isArchiving={archivingId === selectedInteraction.id}
                            archiveError={archiveError}
                            onArchive={(id) => void handleArchive(id)}
                            onCreateLead={handleCreateLead}
                            onBack={() => setMobileDetailOpen(false)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full flex-col text-slate-500 bg-slate-50">
                            <span className="material-symbols-outlined w-16 h-16 mb-4">memory</span>
                            <h2 className="text-2xl font-bold">AI Interaction Hub</h2>
                            <p className="mt-2">Select an item from the inbox to see details.</p>
                        </div>
                    )}
                </main>
            </div>
            {isAddLeadModalOpen && (
                <AddLeadModal
                    onClose={() => setIsAddLeadModalOpen(false)}
                    onAddLead={(leadData) => {
                        onAddNewLead(leadData);
                        setIsAddLeadModalOpen(false);
                    }}
                    initialData={leadInitialData}
                />
            )}
        </>
    );
};

export default InteractionHubPage;
