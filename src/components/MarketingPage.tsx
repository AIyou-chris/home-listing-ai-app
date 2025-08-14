
import React, { useState, useEffect, useMemo } from 'react';
import { Property, FollowUpSequence } from '../types';
import SequenceEditorModal from './CreateSequenceModal';
import SequenceAnalyticsModal from './SequenceAnalyticsModal';
import LeadFollowUpsPage from './LeadFollowUpsPage';
import AnalyticsPage from './AnalyticsPage';
import { DEMO_FAT_LEADS, DEMO_ACTIVE_FOLLOWUPS } from '../demoConstants';

interface MarketingPageProps {
  properties: Property[];
  sequences: FollowUpSequence[];
  setSequences: React.Dispatch<React.SetStateAction<FollowUpSequence[]>>;
  onBackToDashboard: () => void;
}

const SequencesContent: React.FC<{ sequences: FollowUpSequence[], setSequences: React.Dispatch<React.SetStateAction<FollowUpSequence[]>>, openModal: (seq: FollowUpSequence | null) => void }> = ({ sequences, setSequences, openModal }) => {
    const toggleActive = (sequenceId: string) => {
        setSequences(prev => prev.map(s => s.id === sequenceId ? { ...s, isActive: !s.isActive } : s));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-slate-800">Follow-up Sequences</h3>
                <button onClick={() => openModal(null)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition whitespace-nowrap">
                    <span className="material-symbols-outlined w-5 h-5">add</span>
                    <span>Create New Sequence</span>
                </button>
            </div>
            <div className="mt-6 space-y-4">
                {sequences.map(seq => (
                    <div key={seq.id} className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${seq.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                <h4 className="font-bold text-slate-800">{seq.name}</h4>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 ml-5">{seq.description}</p>
                            <div className="ml-5 mt-2 flex items-center gap-4 text-xs text-slate-600">
                                <span><strong>Trigger:</strong> {seq.triggerType}</span>
                                <span><strong>Steps:</strong> {seq.steps.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            <button onClick={() => toggleActive(seq.id)} className={`px-3 py-1 text-sm font-semibold rounded-full ${seq.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                {seq.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button 
                                onClick={() => window.dispatchEvent(new CustomEvent('openSequenceAnalytics', { detail: seq }))}
                                className="p-2 rounded-md hover:bg-blue-100 group"
                                title="View analytics"
                            >
                                <span className="material-symbols-outlined w-4 h-4 text-slate-600 group-hover:text-blue-600">monitoring</span>
                            </button>
                            <button onClick={() => openModal(seq)} className="p-2 rounded-md hover:bg-slate-200" title="Edit sequence">
                                <span className="material-symbols-outlined w-4 h-4 text-slate-600">edit</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const QRCodeSystem: React.FC<{ properties: Property[] }> = ({ properties }) => {
    const [url, setUrl] = useState('');
    const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || '');
    const [qrCodeName, setQrCodeName] = useState('');
    const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState('');

    const [trackedQRCodes, setTrackedQRCodes] = useState([
        { id: 'qr1', name: '742 Ocean Drive - Flyer', destinationUrl: 'https://homelistingai.app/p/prop-demo-1', scanCount: 152, createdAt: '2024-08-01', qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://homelistingai.app/p/prop-demo-1` },
        { id: 'qr2', name: 'Agent Website - Business Card', destinationUrl: 'https://prestigeproperties.com', scanCount: 89, createdAt: '2024-07-28', qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://prestigeproperties.com` }
    ]);
    
    useEffect(() => {
        const property = properties.find(p => p.id === selectedPropertyId);
        if (property) {
            const propertyUrl = `https://homelistingai.app/p/${property.id}`;
            setUrl(propertyUrl);
            setQrCodeName(`${property.address.split(',')[0]} - Sign Rider`);
        }
    }, [selectedPropertyId, properties]);

    const handleGenerate = () => {
        if (!url.trim() || !qrCodeName.trim()) {
            alert("Please provide a name and a URL.");
            return;
        }
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
        setGeneratedQrCodeUrl(qrUrl);
    };

    const handleTrackCode = () => {
        if (!generatedQrCodeUrl || !qrCodeName.trim() || !url.trim()) return;
        const newCode = {
            id: `qr${Date.now()}`,
            name: qrCodeName,
            destinationUrl: url,
            scanCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
            qrCodeUrl: generatedQrCodeUrl.replace('size=250x250', 'size=150x150')
        };
        setTrackedQRCodes(prev => [newCode, ...prev]);
        setGeneratedQrCodeUrl('');
    };
    
    const handleDownload = (qrUrl: string, name: string) => {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `${name.replace(/\s+/g, '-')}-qrcode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 self-start">
                <h3 className="text-lg font-bold text-slate-800 mb-4">QR Code Generator</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Link to Property (Optional)</label>
                        <select onChange={e => setSelectedPropertyId(e.target.value)} value={selectedPropertyId} className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition">
                            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Destination URL</label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name (for tracking)</label>
                        <input type="text" value={qrCodeName} onChange={e => setQrCodeName(e.target.value)} placeholder="e.g., Open House Flyer" className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition" />
                    </div>
                    <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition">
                        <span className="material-symbols-outlined w-5 h-5">auto_awesome</span>
                        <span>Generate QR Code</span>
                    </button>
                    {generatedQrCodeUrl && (
                        <div className="text-center pt-4 border-t border-slate-200 space-y-4">
                            <img src={generatedQrCodeUrl} alt="Generated QR Code" className="mx-auto rounded-lg border-4 border-white shadow-md" />
                            <div className="flex gap-2">
                                <button onClick={() => handleDownload(generatedQrCodeUrl, qrCodeName)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition">
                                    <span className="material-symbols-outlined w-4 h-4">download</span> Download
                                </button>
                                <button onClick={handleTrackCode} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition">
                                    <span className="material-symbols-outlined w-4 h-4">add</span> Add to Tracker
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="material-symbols-outlined w-5 h-5 text-slate-500">analytics</span> Tracked QR Codes</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {trackedQRCodes.map(code => (
                        <div key={code.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                            <img src={code.qrCodeUrl} alt={`QR Code for ${code.name}`} className="w-16 h-16 rounded-md flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                                <h4 className="font-bold text-slate-800 truncate">{code.name}</h4>
                                <p className="text-xs text-slate-500 truncate">{code.destinationUrl}</p>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined w-5 h-5 text-primary-600">qr_code_scanner</span>
                                    <span className="font-bold text-slate-700">{code.scanCount}</span>
                                    <span className="text-slate-500">Scans</span>
                                </div>
                            </div>
                            <button className="p-2 rounded-md hover:bg-slate-200 flex-shrink-0">
                                <span className="material-symbols-outlined w-5 h-5 text-slate-600">more_vert</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const MarketingPage: React.FC<MarketingPageProps> = ({ properties, sequences, setSequences, onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState('analytics');

    // Sequence state
    const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false);
    const [editingSequence, setEditingSequence] = useState<FollowUpSequence | null>(null);
    
    // Analytics modal state
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [analyticsSequence, setAnalyticsSequence] = useState<FollowUpSequence | null>(null);

    const handleSaveSequence = (sequenceData: FollowUpSequence) => {
        setSequences(prev => {
            const index = prev.findIndex(s => s.id === sequenceData.id);
            if (index > -1) {
                const newSequences = [...prev];
                newSequences[index] = sequenceData;
                return newSequences;
            } else {
                return [sequenceData, ...prev];
            }
        });
        setIsSequenceModalOpen(false);
    };

    // Listen for analytics modal events
    useEffect(() => {
        const handleOpenAnalytics = (event: CustomEvent) => {
            setAnalyticsSequence(event.detail);
            setIsAnalyticsModalOpen(true);
        };

        window.addEventListener('openSequenceAnalytics', handleOpenAnalytics as EventListener);
        return () => {
            window.removeEventListener('openSequenceAnalytics', handleOpenAnalytics as EventListener);
        };
    }, []);

    const tabs = [
        { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
        { id: 'sequences', label: 'Follow-up Sequences', icon: 'lan' },
        { id: 'follow-ups', label: 'Active Follow-ups', icon: 'group' },
        { id: 'qr-code', label: 'QR Code System', icon: 'qr_code_2' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'analytics':
                return <AnalyticsPage />;
            case 'sequences':
                return <SequencesContent sequences={sequences} setSequences={setSequences} openModal={(seq) => { setEditingSequence(seq); setIsSequenceModalOpen(true); }} />;
            case 'follow-ups':
                 return <LeadFollowUpsPage leads={DEMO_FAT_LEADS} sequences={sequences} activeFollowUps={DEMO_ACTIVE_FOLLOWUPS} />;
            case 'qr-code':
                return <QRCodeSystem properties={properties} />;
            default:
                return <div>Select a tab</div>;
        }
    };
    
    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors mb-6">
                    <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                    <span>Back to Dashboard</span>
                </button>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Marketing Center</h1>
                    <p className="text-slate-500 mt-1">Automate your outreach, create content, and track your performance.</p>
                </header>
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-1 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                            >
                                <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                <main className="mt-8">
                    {renderContent()}
                </main>
            </div>
             {isSequenceModalOpen && <SequenceEditorModal sequence={editingSequence} onClose={() => setIsSequenceModalOpen(false)} onSave={handleSaveSequence} />}
             {isAnalyticsModalOpen && analyticsSequence && (
                <SequenceAnalyticsModal
                    sequence={analyticsSequence}
                    onClose={() => {
                        setIsAnalyticsModalOpen(false);
                        setAnalyticsSequence(null);
                    }}
                />
            )}
        </div>
    );
};

export default MarketingPage;
