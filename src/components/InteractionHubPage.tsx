
import React, { useState, useEffect } from 'react';
import { Interaction, Property, InteractionSourceType } from '../types';
import AddLeadModal from './AddLeadModal';

interface InteractionHubPageProps {
    properties: Property[];
    onBackToDashboard: () => void;
    onAddNewLead: (leadData: any) => void;
    interactions: Interaction[];
    setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>;
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

const InteractionListItem: React.FC<{
    interaction: Interaction;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ interaction, isSelected, onSelect }) => {
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
            {!interaction.isRead && (
                 <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary-500 rounded-full"></div>
            )}
        </button>
    );
};

const InteractionDetail: React.FC<{
    interaction: Interaction;
    property: Property | undefined;
    onReply: () => void;
    onArchive: (id: string) => void;
    onCreateLead: () => void;
}> = ({ interaction, property, onReply, onArchive, onCreateLead }) => {
    const colors = sourceColors[interaction.sourceType];
    
    return (
        <div className="flex flex-col h-full">
            <header className="p-5 border-b border-slate-200">
                 <div className={`flex items-center gap-3 text-sm font-bold mb-3 ${colors.text}`}>
                    <div className={`p-2 rounded-full ${colors.bg}`}>{sourceIcons[interaction.sourceType]}</div>
                    <span>{interaction.sourceName}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{interaction.contact.name}</h2>
                <p className="text-sm text-slate-500">Received {interaction.timestamp}</p>
            </header>
            <main className="flex-grow p-6 overflow-y-auto bg-slate-50/50">
                <div className="prose prose-slate max-w-none">
                    <p>{interaction.message}</p>
                </div>
                {property && (
                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h4 className="font-semibold text-slate-800 mb-2">Related Property</h4>
                        <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                             <img src={property.imageUrl} alt={property.address} className="w-16 h-16 rounded-md object-cover"/>
                            <div>
                                <h5 className="font-bold text-slate-800">{property.address}</h5>
                                <p className="text-sm text-primary-600 font-semibold">${property.price.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <footer className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center justify-between">
                    <button onClick={onReply} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                       <span className="material-symbols-outlined w-4 h-4">send</span>
                       <span>Reply</span>
                    </button>
                     <div className="flex items-center gap-2">
                        <button onClick={() => onArchive(interaction.id)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition">
                            Archive
                        </button>
                         <button onClick={onCreateLead} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition">
                           <span className="material-symbols-outlined w-4 h-4">add</span>
                           <span>Create Lead</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const InteractionHubPage: React.FC<InteractionHubPageProps> = ({ properties, onBackToDashboard, onAddNewLead, interactions, setInteractions }) => {
    const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [leadInitialData, setLeadInitialData] = useState<{ name: string; message: string } | undefined>(undefined);

    useEffect(() => {
        // When interactions load or change, select the first one if none is selected
        // or if the currently selected one no longer exists.
        if (!selectedInteractionId || !interactions.some(i => i.id === selectedInteractionId)) {
            setSelectedInteractionId(interactions[0]?.id || null);
        }
    }, [interactions, selectedInteractionId]);


    const handleSelectInteraction = (id: string) => {
        setSelectedInteractionId(id);
        setInteractions(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
    };

    const handleArchive = (interactionId: string) => {
        const currentIndex = interactions.findIndex(i => i.id === interactionId);
        const newInteractions = interactions.filter(i => i.id !== interactionId);
        setInteractions(newInteractions);

        if (newInteractions.length === 0) {
            setSelectedInteractionId(null);
        } else if (currentIndex >= newInteractions.length) {
            setSelectedInteractionId(newInteractions[newInteractions.length - 1].id);
        } else {
            setSelectedInteractionId(newInteractions[currentIndex].id);
        }
    };
    
    const handleCreateLead = () => {
        const interaction = interactions.find(i => i.id === selectedInteractionId);
        if (!interaction) return;
        setLeadInitialData({
            name: interaction.contact.name,
            message: `Original inquiry about "${interaction.sourceName}":\n${interaction.message}`
        });
        setIsAddLeadModalOpen(true);
    };

    const handleReply = () => {
        alert("Reply functionality coming soon! This will open an email composer or chat reply.");
    };

    const selectedInteraction = interactions.find(i => i.id === selectedInteractionId);
    const relatedProperty = selectedInteraction?.relatedPropertyId 
        ? properties.find(p => p.id === selectedInteraction.relatedPropertyId) 
        : undefined;

    return (
        <>
            <div className="flex h-full bg-white">
                <aside className="w-full md:w-2/5 lg:w-1/3 max-w-md h-full flex flex-col border-r border-slate-200">
                    <div className="p-4 border-b border-slate-200">
                        <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-4 -ml-1">
                            <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                            <span>Back to Dashboard</span>
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900">AI Inbox</h1>
                         <div className="relative mt-2">
                            <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                            <input type="text" placeholder="Search inbox..." className="w-full bg-slate-100 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {interactions.length > 0 ? (
                            <div className="divide-y divide-slate-200">
                                {interactions.map(interaction => (
                                    <div key={interaction.id} className="relative">
                                        <InteractionListItem
                                            interaction={interaction}
                                            isSelected={selectedInteractionId === interaction.id}
                                            onSelect={() => handleSelectInteraction(interaction.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-16 text-slate-400">
                                <span className="material-symbols-outlined w-12 h-12">inbox</span>
                                <p className="mt-2 font-semibold">Inbox is empty</p>
                            </div>
                        )}
                    </div>
                </aside>
                <main className="flex-1 h-full">
                    {selectedInteraction ? (
                        <InteractionDetail 
                            interaction={selectedInteraction} 
                            property={relatedProperty} 
                            onReply={handleReply}
                            onArchive={handleArchive}
                            onCreateLead={handleCreateLead}
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
