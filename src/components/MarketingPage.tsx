
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Property, FollowUpSequence, Lead, AgentProfile } from '../types';
import SequenceEditorModal from './CreateSequenceModal';
import SequenceAnalyticsModal from './SequenceAnalyticsModal';
import LeadFollowUpsPage from './LeadFollowUpsPage';
import AnalyticsPage from './AnalyticsPage';
import { DEMO_FAT_LEADS, DEMO_ACTIVE_FOLLOWUPS } from '../demoConstants';
import NotificationService from '../services/notificationService';

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

// Comprehensive Messaging & Notification Center
const MessagingCenter: React.FC = () => {
    const [messagingTab, setMessagingTab] = useState('quick-notifications');
    const [customMessage, setCustomMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
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
        // { id: 'messaging', label: 'Notifications & Messaging', icon: 'notifications' }, // Hidden for launch - will re-enable post-launch
        { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
        { id: 'sequences', label: 'Follow-up Sequences', icon: 'lan' },
        { id: 'follow-ups', label: 'Active Follow-ups', icon: 'group' },
        { id: 'qr-code', label: 'QR Code System', icon: 'qr_code_2' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'messaging':
                return <MessagingCenter />;
            case 'analytics':
                return <AnalyticsPage />;
            case 'sequences':
                return <SequencesContent sequences={sequences} setSequences={setSequences} openModal={(seq) => { setEditingSequence(seq); setIsSequenceModalOpen(true); }} />;
            case 'follow-ups':
                 return <LeadFollowUpsPage leads={[]} sequences={sequences} activeFollowUps={[]} />;
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
