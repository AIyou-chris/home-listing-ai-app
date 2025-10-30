
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Property, FollowUpSequence, Lead, SequenceStep } from '../types';
import SequenceAnalyticsModal from './SequenceAnalyticsModal';
import LeadFollowUpsPage from './LeadFollowUpsPage';
import AnalyticsPage from './AnalyticsPage';
import QuickEmailModal from './QuickEmailModal';
import { useFunnelEditorStore, StylePresetId } from '../state/useFunnelEditorStore';
import { FunnelStepEditor } from './funnel/FunnelStepEditor';
import { AISuggestionsPanel } from './funnel/AISuggestionsPanel';

interface MarketingPageProps {
  properties: Property[];
  sequences: FollowUpSequence[];
  setSequences: React.Dispatch<React.SetStateAction<FollowUpSequence[]>>;
  onBackToDashboard: () => void;
}

const SequencesContent: React.FC<{
    sequences: FollowUpSequence[];
    setSequences: React.Dispatch<React.SetStateAction<FollowUpSequence[]>>;
    onQuickEmail: () => void;
    activeSequenceId?: string;
    activeStepId?: string;
    onActivateSequence: (sequence: FollowUpSequence) => void;
    onEditStep: (sequence: FollowUpSequence, stepId: string) => void;
}> = ({ sequences, setSequences, onQuickEmail, activeSequenceId, activeStepId, onActivateSequence, onEditStep }) => {
    const [showTips, setShowTips] = useState(true);
    const [expandedSequenceIds, setExpandedSequenceIds] = useState<string[]>([]);

    useEffect(() => {
        if (!activeSequenceId) return;
        setExpandedSequenceIds((prev) => (prev.includes(activeSequenceId) ? prev : [...prev, activeSequenceId]));
    }, [activeSequenceId]);

    const toggleActive = (sequenceId: string) => {
        setSequences(prev => prev.map(s => s.id === sequenceId ? { ...s, isActive: !s.isActive } : s));
    };

    const toggleExpanded = (sequenceId: string) => {
        setExpandedSequenceIds((prev) =>
            prev.includes(sequenceId) ? prev.filter((id) => id !== sequenceId) : [...prev, sequenceId]
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 pt-6">
                <h3 className="text-xl font-bold text-slate-800">Follow-up Sequences</h3>
                <button
                    type="button"
                    onClick={onQuickEmail}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                    <span className="material-symbols-outlined w-5 h-5">outgoing_mail</span>
                    Quick Email
                </button>
            </div>
            <div className="px-6 pt-4">
                <button
                    type="button"
                    onClick={() => setShowTips(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                    aria-expanded={showTips}
                >
                    <span className="material-symbols-outlined text-xl">{showTips ? 'psychiatry' : 'tips_and_updates'}</span>
                    {showTips ? 'Hide Sequence Tips' : 'Show Sequence Tips'}
                    <span className="material-symbols-outlined text-base ml-auto">{showTips ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showTips && (
                    <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">calendar_month</span>
                                Designing Drip Sequences
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Map the milestones:</strong> Line up emails, AI touches, tasks, and meetings around the buyer journey (new lead, hot lead, nurture).</li>
                                <li><strong>Mix the mediums:</strong> Alternate AI follow-ups, personal emails, and tasks so agents know exactly when to jump in.</li>
                                <li><strong>Refresh templates quarterly:</strong> Duplicate high-performers, tweak messaging, and keep a warm-up step at the start.</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-lg">mail</span>
                                Quick Email vs. Sequence
                            </h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li><strong>Use sequences</strong> for consistent nurture flows.</li>
                                <li><strong>Use Quick Email</strong> for one-off messages without editing automations.</li>
                                <li><strong>Mailgun handles delivery:</strong> Templates stay handy so you can send polished responses fast.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6">
                <ul className="divide-y divide-slate-200">
                    {sequences.map((sequence) => {
                        const isActiveSequence = sequence.id === activeSequenceId;
                        const isExpanded = expandedSequenceIds.includes(sequence.id);
                        return (
                            <li key={sequence.id} className={`px-6 py-5 transition ${isActiveSequence ? 'bg-primary-50/40' : 'bg-white hover:bg-slate-50'}`}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onActivateSequence(sequence)}
                                                    className="text-left flex-1"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-xl text-slate-500">
                                                            {isExpanded ? 'expand_less' : 'expand_more'}
                                                        </span>
                                                        <h4 className="text-base font-bold text-slate-900">{sequence.name}</h4>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1 max-w-xl">{sequence.description}</p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(sequence.id)}
                                                    className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                                                >
                                                    {isExpanded ? 'Collapse' : 'Expand'}
                                                </button>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                                <span><strong>Trigger:</strong> {sequence.triggerType}</span>
                                                <span><strong>Steps:</strong> {sequence.steps.length}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleActive(sequence.id)}
                                                className={`px-3 py-1 text-sm font-semibold rounded-full ${sequence.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}
                                            >
                                                {sequence.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('openSequenceAnalytics', { detail: sequence }))}
                                                className="p-2 rounded-md hover:bg-blue-100"
                                                title="View analytics"
                                            >
                                                <span className="material-symbols-outlined w-4 h-4 text-slate-600">monitoring</span>
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="flex flex-col gap-2">
                                            {sequence.steps.map((step) => {
                                                const isActiveStep = isActiveSequence && step.id === activeStepId;
                                                return (
                                                    <div key={step.id} className={`border border-slate-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isActiveStep ? 'border-primary-400 bg-primary-50/60' : ''}`}>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">{step.subject || step.id}</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {step.type.toUpperCase()} • {step.delay.value} {step.delay.unit}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => onEditStep(sequence, step.id)}
                                                                className="px-3 py-1.5 text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
                                                            >
                                                                Edit step
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
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
            alert('Please provide a name and a URL.');
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
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.address} - ${p.price?.toLocaleString() || 'N/A'}
                                </option>
                            ))}
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

// Comprehensive Messaging & Notification Center
const MessagingCenter: React.FC = () => {
    const [messagingTab, setMessagingTab] = useState('quick-notifications');
    const [customMessage, setCustomMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [messageHistory, setMessageHistory] = useState([
        { id: '1', type: 'notification', title: 'New Lead Alert', message: 'John Smith is interested in 742 Ocean Drive', timestamp: '2 minutes ago', status: 'sent' },
        { id: '2', type: 'sms', title: 'Appointment Reminder', message: 'Tomorrow at 2:00 PM - Property showing', timestamp: '1 hour ago', status: 'delivered' },
        { id: '3', type: 'email', title: 'Follow-up Sequence', message: 'Welcome to our listing updates!', timestamp: '3 hours ago', status: 'opened' },
        { id: '4', type: 'notification', title: 'Hot Lead Alert', message: 'Sarah Williams (Score: 95) viewed 3 properties', timestamp: '5 hours ago', status: 'sent' }
    ]);

    const messageTemplates = [
        { id: 'welcome', title: 'Welcome New Lead', content: 'Hi {name}, thank you for your interest in {property}! I\'d love to help you find your perfect home.' },
        { id: 'appointment-reminder', title: 'Appointment Reminder', content: 'Hi {name}, this is a friendly reminder about our meeting tomorrow at {time} for {property}.' },
        { id: 'follow-up', title: 'Property Follow-up', content: 'Hi {name}, I wanted to follow up on {property}. Do you have any questions or would you like to schedule a viewing?' },
        { id: 'price-change', title: 'Price Change Alert', content: 'Great news! The price for {property} has been reduced to {price}. Would you like to take another look?' },
        { id: 'hot-lead', title: 'Urgent Follow-up', content: 'Hi {name}, I noticed you\'ve been very active looking at properties. I have some exclusive listings that might interest you!' }
    ];

    const quickNotificationTypes = [
        { id: 'test', title: 'Test Notification', icon: 'science', color: 'blue', description: 'Send a test notification to verify your setup' },
        { id: 'new-lead', title: 'New Lead Alert', icon: 'person_add', color: 'green', description: 'Alert about a new potential client' },
        { id: 'appointment', title: 'Appointment Reminder', icon: 'schedule', color: 'purple', description: 'Remind about upcoming meetings' },
        { id: 'hot-lead', title: 'Hot Lead Alert', icon: 'whatshot', color: 'red', description: 'High-priority lead notification' },
        { id: 'price-change', title: 'Price Change', icon: 'trending_down', color: 'orange', description: 'Property price update alert' },
        { id: 'showing-request', title: 'Showing Request', icon: 'home', color: 'indigo', description: 'New property showing request' }
    ];

    const handleSendQuickNotification = async (type: string) => {
        const notificationType = quickNotificationTypes.find(n => n.id === type);
        if (!notificationType) return;

        try {
            // Browser notification functionality - will be implemented later
            console.log(`Sending notification: ${type}`);
            // For now, just simulate the notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationType.title, {
                    body: notificationType.description,
                    icon: '/newlogo.png'
                });
            }

            // Add to message history
            const newMessage = {
                id: Date.now().toString(),
                type: 'notification',
                title: notificationType.title,
                message: notificationType.description,
                timestamp: 'Just now',
                status: 'sent'
            };
            setMessageHistory(prev => [newMessage, ...prev]);

        } catch (error) {
            console.error('Error sending notification:', error);
            alert('Please enable browser notifications in Settings first!');
        }
    };

    const handleSendCustomMessage = async () => {
        if (!customMessage.trim()) {
            alert('Please enter a message to send');
            return;
        }

        try {
            // Browser notification functionality - will be implemented later
            console.log('Sending custom message:', customMessage);
            // For now, just simulate the notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Custom Message', {
                    body: customMessage,
                    icon: '/newlogo.png'
                });
            }

            // Add to message history
            const newMessage = {
                id: Date.now().toString(),
                type: 'custom',
                title: 'Custom Message',
                message: customMessage,
                timestamp: 'Just now',
                status: 'sent'
            };
            setMessageHistory(prev => [newMessage, ...prev]);
            setCustomMessage('');

        } catch (error) {
            console.error('Error sending custom message:', error);
            alert('Please enable browser notifications in Settings first!');
        }
    };

    const messagingTabs = [
        { id: 'quick-notifications', label: 'Quick Notifications', icon: 'flash_on' },
        { id: 'message-templates', label: 'Message Templates', icon: 'article' },
        { id: 'message-history', label: 'Message History', icon: 'history' },
        { id: 'scheduled-messages', label: 'Scheduled Messages', icon: 'schedule_send' }
    ];

    const renderMessagingContent = () => {
        switch (messagingTab) {
            case 'quick-notifications':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quickNotificationTypes.map(notification => {
                            const colorClasses = {
                                blue: { bg: 'bg-blue-100', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
                                green: { bg: 'bg-green-100', text: 'text-green-600', btn: 'bg-green-600 hover:bg-green-700' },
                                purple: { bg: 'bg-purple-100', text: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' },
                                red: { bg: 'bg-red-100', text: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
                                orange: { bg: 'bg-orange-100', text: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
                                indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700' }
                            }[notification.color] || { bg: 'bg-slate-100', text: 'text-slate-600', btn: 'bg-slate-600 hover:bg-slate-700' };

                            return (
                                <div key={notification.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${colorClasses.bg}`}>
                                            <span className={`material-symbols-outlined w-6 h-6 ${colorClasses.text}`}>
                                                {notification.icon}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{notification.title}</h3>
                                    <p className="text-sm text-slate-600 mb-4">{notification.description}</p>
                                    <button
                                        onClick={() => handleSendQuickNotification(notification.id)}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 ${colorClasses.btn} text-white rounded-lg font-semibold shadow-sm transition`}
                                    >
                                        <span className="material-symbols-outlined w-4 h-4">send</span>
                                        <span>Send Now</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'message-templates':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Message Templates</h3>
                            <div className="space-y-3">
                                {messageTemplates.map(template => (
                                    <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                                         onClick={() => setSelectedTemplate(template.content)}>
                                        <h4 className="font-semibold text-slate-900">{template.title}</h4>
                                        <p className="text-sm text-slate-600 mt-1">{template.content.substring(0, 80)}...</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Custom Message</h3>
                            <div className="space-y-4">
                                <textarea
                                    value={customMessage || selectedTemplate}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="Type your custom message here..."
                                    className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSendCustomMessage}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition"
                                    >
                                        <span className="material-symbols-outlined w-4 h-4">send</span>
                                        <span>Send Message</span>
                                    </button>
                                    <button
                                        onClick={() => {setCustomMessage(''); setSelectedTemplate('');}}
                                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500">
                                    💡 Use variables like {'{name}'}, {'{property}'}, {'{time}'} in your messages
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'message-history':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Message History</h3>
                            <button className="flex items-center gap-2 px-3 py-1 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                                <span className="material-symbols-outlined w-4 h-4">download</span>
                                Export
                            </button>
                        </div>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {messageHistory.map(message => (
                                <div key={message.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`material-symbols-outlined w-4 h-4 ${
                                                    message.type === 'notification' ? 'text-blue-600' :
                                                    message.type === 'sms' ? 'text-green-600' :
                                                    message.type === 'email' ? 'text-purple-600' : 'text-orange-600'
                                                }`}>
                                                    {message.type === 'notification' ? 'notifications' :
                                                     message.type === 'sms' ? 'sms' :
                                                     message.type === 'email' ? 'email' : 'message'}
                                                </span>
                                                <h4 className="font-semibold text-slate-900">{message.title}</h4>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    message.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                    message.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                    message.status === 'opened' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {message.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600">{message.message}</p>
                                        </div>
                                        <span className="text-xs text-slate-500 ml-4">{message.timestamp}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'scheduled-messages':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined w-16 h-16 text-slate-400 mx-auto mb-4 block">schedule_send</span>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Scheduled Messages</h3>
                            <p className="text-slate-600 mb-4">Schedule notifications and messages for later delivery</p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 transition mx-auto">
                                <span className="material-symbols-outlined w-4 h-4">add</span>
                                <span>Schedule Message</span>
                            </button>
                            <p className="text-xs text-slate-500 mt-4">Coming soon: Set up automated message scheduling</p>
                        </div>
                    </div>
                );

            default:
                return <div>Select a messaging option</div>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Messaging Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-2">
                <nav className="flex space-x-1 overflow-x-auto">
                    {messagingTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMessagingTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                                messagingTab === tab.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <span className="material-symbols-outlined w-4 h-4">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Alert Status */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined w-5 h-5 text-orange-600">info</span>
                    <div>
                        <h4 className="font-semibold text-orange-900">Notification Status</h4>
                        <p className="text-sm text-orange-700">
                            Browser notifications: <span className="font-semibold">Ready to send</span> • 
                            Enable in Settings first for best experience
                        </p>
                    </div>
                </div>
            </div>

            {/* Messaging Content */}
            {renderMessagingContent()}
        </div>
    );
};


const MarketingPage: React.FC<MarketingPageProps> = ({ properties, sequences, setSequences, onBackToDashboard }) => {
    const [activeTab, setActiveTab] = useState('sequences');
    const [isQuickEmailOpen, setIsQuickEmailOpen] = useState(false);

    // Analytics modal state
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [analyticsSequence, setAnalyticsSequence] = useState<FollowUpSequence | null>(null);

    // Follow-ups state
    const [leads, setLeads] = useState<Lead[]>([]);

    const activeSequence = useFunnelEditorStore((state) => state.activeSequence);
    const activeSequenceId = activeSequence?.id;
    const activeStepId = useFunnelEditorStore((state) => state.activeStepId);
    const setActiveSequenceInStore = useFunnelEditorStore((state) => state.setActiveSequence);
    const setActiveStep = useFunnelEditorStore((state) => state.setActiveStep);
    const setShowStepEditor = useFunnelEditorStore((state) => state.setShowStepEditor);
    const showStepEditor = useFunnelEditorStore((state) => state.showStepEditor);
    const applyDraftOverrides = useFunnelEditorStore((state) => state.applyDraftOverrides);
    const stepDrafts = useFunnelEditorStore((state) => state.stepDrafts);
    const upsertAISuggestions = useFunnelEditorStore((state) => state.upsertAISuggestions);
    const clearAISuggestions = useFunnelEditorStore((state) => state.clearAISuggestions);
    const aiSuggestions = useFunnelEditorStore((state) => state.aiSuggestions);

    const getDraftStorageKey = useCallback((sequenceId: string) => `hlai:funnelDrafts:${sequenceId}`, []);

    const loadDraftOverrides = useCallback(
        (sequence: FollowUpSequence) => {
            if (typeof window === 'undefined') return;
            try {
                const raw = window.localStorage.getItem(getDraftStorageKey(sequence.id));
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    applyDraftOverrides(parsed);
                }
            } catch (error) {
                console.warn('Failed to load saved funnel drafts', error);
            }
        },
        [applyDraftOverrides, getDraftStorageKey]
    );

    const persistDraft = useCallback(
        (sequenceId: string, stepId: string, draftMessage: string, tonePresetId: string | undefined) => {
            if (typeof window === 'undefined') return;
            try {
                const key = getDraftStorageKey(sequenceId);
                const existing = window.localStorage.getItem(key);
                const parsed = existing ? JSON.parse(existing) : {};
                parsed[stepId] = {
                    draftMessage,
                    tonePresetId,
                    lastSavedAt: new Date().toISOString()
                };
                window.localStorage.setItem(key, JSON.stringify(parsed));
                applyDraftOverrides(parsed);
            } catch (error) {
                console.warn('Failed to save funnel draft', error);
            }
        },
        [applyDraftOverrides, getDraftStorageKey]
    );

    const allowedVariables = useMemo(() => {
        if (!activeSequence) return [] as string[];
        const variablePattern = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;
        const variables = new Set<string>();
        activeSequence.steps.forEach((step) => {
            let match: RegExpExecArray | null;
            while ((match = variablePattern.exec(step.content)) !== null) {
                if (match[1]) variables.add(match[1]);
            }
        });
        return Array.from(variables);
    }, [activeSequence]);

    // Load leads for follow-up context
    useEffect(() => {
        const loadLeads = async () => {
            try {
                const response = await fetch('/api/admin/leads');
                if (!response.ok) {
                    throw new Error(`Failed to load leads: ${response.status}`);
                }
                const leadsData = await response.json();
                setLeads(Array.isArray(leadsData?.leads) ? leadsData.leads : []);
            } catch (error) {
                console.error('Failed to load marketing leads:', error);
            }
        };

        loadLeads();
    }, []);

    useEffect(() => {
        if (!sequences || sequences.length === 0) return;
        const matchingActive = activeSequenceId ? sequences.find((sequence) => sequence.id === activeSequenceId) : undefined;
        const target = matchingActive ?? sequences[0];

        if (!activeSequenceId || activeSequenceId !== target.id) {
            setActiveSequenceInStore(target);
            loadDraftOverrides(target);
            return;
        }

        if (matchingActive) {
            loadDraftOverrides(matchingActive);
        }
    }, [sequences, activeSequenceId, setActiveSequenceInStore, loadDraftOverrides]);

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

    const handleActivateSequence = useCallback(
        (sequence: FollowUpSequence) => {
            setActiveSequenceInStore(sequence);
            loadDraftOverrides(sequence);
            setShowStepEditor(false);
        },
        [loadDraftOverrides, setActiveSequenceInStore, setShowStepEditor]
    );

    const handleEditStep = useCallback(
        (sequence: FollowUpSequence, stepId: string) => {
            if (!sequence) return;
            if (!activeSequence || sequence.id !== activeSequence.id) {
                setActiveSequenceInStore(sequence);
                loadDraftOverrides(sequence);
            }
            setActiveStep(stepId);
            setShowStepEditor(true);
        },
        [activeSequence, loadDraftOverrides, setActiveSequenceInStore, setActiveStep, setShowStepEditor]
    );

    const handleCloseEditor = useCallback(() => {
        setShowStepEditor(false);
    }, [setShowStepEditor]);

    const handleSaveStepDraft = useCallback(
        async (stepId: string, message: string) => {
            if (!activeSequence) return;
            const tonePresetId = stepDrafts[stepId]?.tonePresetId;
            persistDraft(activeSequence.id, stepId, message, tonePresetId);
            alert('Step saved for this agent workspace.');
        },
        [activeSequence, persistDraft, stepDrafts]
    );

    const handleShareDraft = useCallback((stepId: string) => {
        console.info('Share coming soon for step', stepId);
        alert('Sharing coming soon!');
    }, []);

    const convertDelayToHours = useCallback((step: SequenceStep) => {
        const { value, unit } = step.delay;
        switch (unit) {
            case 'minutes':
                return value / 60;
            case 'hours':
                return value;
            case 'days':
                return value * 24;
            default:
                return value * 24;
        }
    }, []);

    const handleRunAISuggestions = useCallback(() => {
        if (!activeSequence) return;
        const suggestions: typeof aiSuggestions = [];
        const steps = activeSequence.steps;

        // Ordering check
        let previousDelay = 0;
        const proposedOrder: string[] = [];
        let orderingIssue = false;
        steps.forEach((step) => {
            const current = convertDelayToHours(step);
            if (current < previousDelay) orderingIssue = true;
            previousDelay = current;
            proposedOrder.push(step.id);
        });
        if (orderingIssue) {
            suggestions.push({
                type: 'ordering',
                message: 'Consider reordering steps so delays increase gradually.',
                proposedOrder
            });
        }

        // Tone consistency
        const toneSet = new Set(
            steps
                .map((step) => stepDrafts[step.id]?.tonePresetId)
                .filter((tone): tone is Exclude<StylePresetId, undefined> => Boolean(tone))
        );
        if (toneSet.size > 1) {
            suggestions.push({
                type: 'tone',
                stepId: steps[0].id,
                message: 'Tone presets vary across steps. Align styles for consistency.'
            });
        }

        // Fatigue detection
        for (let index = 1; index < steps.length; index += 1) {
            const prev = convertDelayToHours(steps[index - 1]);
            const current = convertDelayToHours(steps[index]);
            if (current - prev < 12) {
                suggestions.push({
                    type: 'fatigue',
                    window: `${steps[index - 1].id}-${steps[index].id}`,
                    message: 'Two steps are very close together. Consider spacing to avoid fatigue.'
                });
                break;
            }
        }

        // Missing reminder/task step
        const hasReminder = steps.some((step) => step.type === 'reminder' || step.type === 'task');
        if (!hasReminder) {
            suggestions.push({
                type: 'missing-step',
                message: 'Add a reminder/task step to prompt agent action.',
                suggestedStep: {
                    type: 'reminder',
                    delay: { value: 48, unit: 'hours' },
                    content: 'Agent task: personalize outreach based on recent engagement.'
                }
            });
        }

        if (suggestions.length === 0) {
            alert('No AI opportunities detected. Great job!');
            clearAISuggestions();
            return;
        }

        upsertAISuggestions(suggestions);
    }, [activeSequence, clearAISuggestions, convertDelayToHours, stepDrafts, upsertAISuggestions]);

    const handleApplySuggestion = useCallback(
        (index: number) => {
            if (!aiSuggestions[index]) return;
            alert('Suggestion applied! Review changes and save when ready.');
            const remaining = aiSuggestions.filter((_, idx) => idx !== index);
            upsertAISuggestions(remaining);
        },
        [aiSuggestions, upsertAISuggestions]
    );

    const tabs = [
        { id: 'sequences', label: 'Lead Sequences', icon: 'filter_alt' },
        { id: 'follow-ups', label: 'Active Follow-ups', icon: 'group' },
        { id: 'analytics', label: 'Lead Scoring', icon: 'grade' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'messaging':
                return <MessagingCenter />;
            case 'analytics':
                return <AnalyticsPage />;
            case 'sequences':
                return (
                    <div className="relative space-y-6">
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700">AI Optimization</h3>
                                <p className="text-xs text-slate-500">Let the AI analyze this funnel for ordering, tone, and fatigue improvements.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleRunAISuggestions}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700"
                                >
                                    <span className="material-symbols-outlined text-base">auto_fix_high</span>
                                    AI Improve Funnel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearAISuggestions();
                                    }}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                >
                                    Clear suggestions
                                </button>
                            </div>
                        </div>
                        <AISuggestionsPanel onApplySuggestion={handleApplySuggestion} />
                        <SequencesContent
                            sequences={sequences}
                            setSequences={setSequences}
                            onQuickEmail={() => setIsQuickEmailOpen(true)}
                            activeSequenceId={activeSequence?.id}
                            activeStepId={activeStepId}
                            onActivateSequence={handleActivateSequence}
                            onEditStep={handleEditStep}
                        />
                        <QRCodeSystem properties={properties} />
                        {showStepEditor && (
                            <FunnelStepEditor
                                allowedVariables={allowedVariables}
                                onSaveDraft={handleSaveStepDraft}
                                onShareDraft={handleShareDraft}
                                onClose={handleCloseEditor}
                            />
                        )}
                    </div>
                );
            case 'follow-ups':
                return <LeadFollowUpsPage leads={leads} sequences={sequences} />;
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
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary-600">filter_alt</span>
                        AI Funnel
                    </h1>
                    <p className="text-slate-500 mt-1">Automate lead nurturing with intelligent sequences and track conversion performance.</p>
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
             {isAnalyticsModalOpen && analyticsSequence && (
                <SequenceAnalyticsModal
                    sequence={analyticsSequence}
                    onClose={() => {
                        setIsAnalyticsModalOpen(false);
                        setAnalyticsSequence(null);
                    }}
                />
            )}
            {isQuickEmailOpen && (
                <QuickEmailModal
                    onClose={() => setIsQuickEmailOpen(false)}
                />
            )}
        </div>
    );
};

export default MarketingPage;
