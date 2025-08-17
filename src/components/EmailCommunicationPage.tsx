import React, { useState, useEffect } from 'react';
import { AgentProfile } from '../types';
import { fileUploadService } from '../services/fileUploadService';
import { auth } from '../services/firebase';

interface EmailCommunicationPageProps {
    agentProfile: AgentProfile;
}

const EmailCommunicationPage: React.FC<EmailCommunicationPageProps> = ({ agentProfile }) => {
    const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'bulk' | 'scheduled' | 'analytics'>('compose');
    
    // Email Composition State
    const [emailData, setEmailData] = useState({
        to: '',
        subject: '',
        content: '',
        templateId: '',
        personalityId: '',
        variables: {} as any,
        priority: 'normal'
    });
    
    // Template State
    const [templates, setTemplates] = useState<any[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('general');
    
    // Bulk Email State
    const [bulkEmailData, setBulkEmailData] = useState({
        recipients: [] as any[],
        subject: '',
        content: '',
        templateId: '',
        personalityId: '',
        variables: {} as any,
        scheduleAt: ''
    });
    const [recipientInput, setRecipientInput] = useState('');
    
    // Scheduled Emails State
    const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
    
    // Analytics State
    const [analytics, setAnalytics] = useState<any>(null);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    
    // Personalities State
    const [personalities, setPersonalities] = useState<any[]>([]);
    
    // UI State
    const [isSending, setIsSending] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    const priorities = [
        { value: 'low', label: 'Low Priority', color: 'text-green-600' },
        { value: 'normal', label: 'Normal Priority', color: 'text-blue-600' },
        { value: 'high', label: 'High Priority', color: 'text-orange-600' },
        { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
    ];

    const categories = [
        'general', 'listing', 'lead-followup', 'client-communication', 'marketing'
    ];

    // Load data on component mount
    useEffect(() => {
        if (auth.currentUser) {
            loadTemplates();
            loadPersonalities();
            loadAnalytics();
        }
    }, []);

    const loadTemplates = async () => {
        if (!auth.currentUser) return;
        
        try {
            const result = await fileUploadService.getEmailTemplates(
                auth.currentUser.uid,
                selectedCategory,
                'email'
            );
            setTemplates(result.templates);
            setAiSuggestions(result.aiSuggestions);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const loadPersonalities = async () => {
        if (!auth.currentUser) return;
        
        try {
            const result = await fileUploadService.getUserPersonalities(auth.currentUser.uid);
            setPersonalities(result.personalities);
        } catch (error) {
            console.error('Failed to load personalities:', error);
        }
    };

    const loadAnalytics = async () => {
        if (!auth.currentUser) return;
        
        try {
            const result = await fileUploadService.getEmailAnalytics(
                auth.currentUser.uid,
                dateRange.startDate,
                dateRange.endDate
            );
            setAnalytics(result);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    };

    const handleSendEmail = async () => {
        if (!auth.currentUser || !emailData.to || !emailData.subject || !emailData.content) {
            alert('Please fill in all required fields');
            return;
        }

        setIsSending(true);
        try {
            const result = await fileUploadService.sendEmail(
                auth.currentUser.uid,
                emailData.to,
                emailData.subject,
                emailData.content,
                emailData.templateId || undefined,
                emailData.personalityId || undefined,
                emailData.variables,
                emailData.priority
            );

            alert('Email sent successfully!');
            setEmailData({
                to: '',
                subject: '',
                content: '',
                templateId: '',
                personalityId: '',
                variables: {},
                priority: 'normal'
            });
        } catch (error) {
            console.error('Email sending error:', error);
            alert('Failed to send email. Please try again.');
        }
        setIsSending(false);
    };

    const handleScheduleEmail = async () => {
        if (!auth.currentUser || !emailData.to || !emailData.subject || !emailData.content) {
            alert('Please fill in all required fields');
            return;
        }

        const scheduledAt = prompt('Enter scheduled date and time (YYYY-MM-DD HH:MM):');
        if (!scheduledAt) return;

        setIsScheduling(true);
        try {
            const result = await fileUploadService.scheduleEmail(
                auth.currentUser.uid,
                emailData.to,
                emailData.subject,
                emailData.content,
                scheduledAt,
                emailData.templateId || undefined,
                emailData.personalityId || undefined,
                emailData.variables,
                emailData.priority
            );

            alert('Email scheduled successfully!');
            setEmailData({
                to: '',
                subject: '',
                content: '',
                templateId: '',
                personalityId: '',
                variables: {},
                priority: 'normal'
            });
        } catch (error) {
            console.error('Email scheduling error:', error);
            alert('Failed to schedule email. Please try again.');
        }
        setIsScheduling(false);
    };

    const handleSendBulkEmail = async () => {
        if (!auth.currentUser || bulkEmailData.recipients.length === 0 || !bulkEmailData.subject || !bulkEmailData.content) {
            alert('Please fill in all required fields and add recipients');
            return;
        }

        setIsSendingBulk(true);
        try {
            const result = await fileUploadService.sendBulkEmail(
                auth.currentUser.uid,
                bulkEmailData.recipients,
                bulkEmailData.subject,
                bulkEmailData.content,
                bulkEmailData.templateId || undefined,
                bulkEmailData.personalityId || undefined,
                bulkEmailData.variables,
                bulkEmailData.scheduleAt || undefined
            );

            alert(`Bulk email sent to ${result.totalRecipients} recipients!`);
            setBulkEmailData({
                recipients: [],
                subject: '',
                content: '',
                templateId: '',
                personalityId: '',
                variables: {},
                scheduleAt: ''
            });
        } catch (error) {
            console.error('Bulk email sending error:', error);
            alert('Failed to send bulk emails. Please try again.');
        }
        setIsSendingBulk(false);
    };

    const addRecipient = () => {
        if (recipientInput.trim()) {
            const newRecipient = {
                email: recipientInput.trim(),
                variables: {}
            };
            setBulkEmailData(prev => ({
                ...prev,
                recipients: [...prev.recipients, newRecipient]
            }));
            setRecipientInput('');
        }
    };

    const removeRecipient = (index: number) => {
        setBulkEmailData(prev => ({
            ...prev,
            recipients: prev.recipients.filter((_, i) => i !== index)
        }));
    };

    const handleTemplateSelect = (template: any) => {
        setEmailData(prev => ({
            ...prev,
            templateId: template.id,
            subject: template.templateName,
            content: template.content
        }));
    };

    const handlePersonalitySelect = (personality: any) => {
        setEmailData(prev => ({
            ...prev,
            personalityId: personality.id
        }));
    };

    const tabs = [
        { id: 'compose', label: 'Compose Email', icon: 'edit' },
        { id: 'templates', label: 'Templates', icon: 'description' },
        { id: 'bulk', label: 'Bulk Email', icon: 'send' },
        { id: 'scheduled', label: 'Scheduled', icon: 'schedule' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' }
    ];

    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">📧 Email & Communication System</h1>
                    <p className="text-slate-500 mt-1">Send personalized emails, manage templates, and track communication analytics.</p>
                </header>

                {/* Tab Navigation */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                    <nav className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600 bg-primary-50'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="material-symbols-outlined w-5 h-5">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    {activeTab === 'compose' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Email Composition */}
                            <div className="lg:col-span-2">
                                <h2 className="text-xl font-bold text-slate-900 mb-6">✍️ Compose Email</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">To</label>
                                        <input
                                            type="email"
                                            value={emailData.to}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                                            placeholder="recipient@example.com"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={emailData.subject}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                            placeholder="Email subject"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                                        <select
                                            value={emailData.priority}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, priority: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {priorities.map(priority => (
                                                <option key={priority.value} value={priority.value}>
                                                    {priority.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                                        <textarea
                                            value={emailData.content}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="Write your email content here..."
                                            rows={8}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSending}
                                            className="flex-1 px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                                        >
                                            {isSending ? 'Sending...' : 'Send Email'}
                                        </button>
                                        <button
                                            onClick={handleScheduleEmail}
                                            disabled={isScheduling}
                                            className="flex-1 px-4 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                                        >
                                            {isScheduling ? 'Scheduling...' : 'Schedule Email'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">⚡ Quick Actions</h2>
                                
                                <div className="space-y-6">
                                    {/* Template Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Use Template</label>
                                        <select
                                            value={emailData.templateId}
                                            onChange={(e) => {
                                                const template = templates.find(t => t.id === e.target.value);
                                                if (template) handleTemplateSelect(template);
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">Select a template</option>
                                            {templates.map(template => (
                                                <option key={template.id} value={template.id}>
                                                    {template.templateName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* AI Personality Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">AI Personality</label>
                                        <select
                                            value={emailData.personalityId}
                                            onChange={(e) => {
                                                const personality = personalities.find(p => p.id === e.target.value);
                                                if (personality) handlePersonalitySelect(personality);
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">Select AI personality</option>
                                            {personalities.map(personality => (
                                                <option key={personality.id} value={personality.id}>
                                                    {personality.personalityName} ({personality.personalityType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Template Variables */}
                                    {emailData.templateId && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Template Variables</label>
                                            <div className="space-y-2">
                                                {['clientName', 'propertyAddress', 'agentName', 'price'].map(variable => (
                                                    <div key={variable} className="flex gap-2">
                                                        <span className="text-sm text-slate-600 w-20">{variable}:</span>
                                                        <input
                                                            type="text"
                                                            value={emailData.variables[variable] || ''}
                                                            onChange={(e) => setEmailData(prev => ({
                                                                ...prev,
                                                                variables: { ...prev.variables, [variable]: e.target.value }
                                                            }))}
                                                            placeholder={`Enter ${variable}`}
                                                            className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">📋 Email Templates</h2>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        loadTemplates();
                                    }}
                                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    {categories.map(category => (
                                        <option key={category} value={category}>
                                            {category.replace('-', ' ').toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Existing Templates */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Templates</h3>
                                    <div className="space-y-4">
                                        {templates.length === 0 ? (
                                            <div className="text-center py-8">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                                                <p className="text-slate-500">No email templates found.</p>
                                            </div>
                                        ) : (
                                            templates.map(template => (
                                                <div key={template.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-slate-900">{template.templateName}</h4>
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                            {template.category}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2">Used: {template.usageCount || 0} times</p>
                                                    <p className="text-sm text-slate-600 line-clamp-2">
                                                        {template.content.substring(0, 100)}...
                                                    </p>
                                                    <button
                                                        onClick={() => handleTemplateSelect(template)}
                                                        className="mt-2 text-primary-600 hover:text-primary-800 text-sm font-medium"
                                                    >
                                                        Use Template
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* AI Suggestions */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">🤖 AI Suggestions</h3>
                                    <div className="space-y-4">
                                        {aiSuggestions.length === 0 ? (
                                            <div className="text-center py-8">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">psychology</span>
                                                <p className="text-slate-500">No AI suggestions available.</p>
                                            </div>
                                        ) : (
                                            aiSuggestions.map((suggestion, index) => (
                                                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                                                    <h4 className="font-semibold text-slate-900 mb-2">{suggestion.name || `Suggestion ${index + 1}`}</h4>
                                                    <p className="text-sm text-slate-600 mb-2"><strong>Subject:</strong> {suggestion.subject}</p>
                                                    <p className="text-sm text-slate-600 mb-2"><strong>Use Case:</strong> {suggestion.useCase}</p>
                                                    <p className="text-sm text-slate-600 line-clamp-3">
                                                        {suggestion.content}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bulk' && (
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">📬 Bulk Email Campaign</h2>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Email Content */}
                                <div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                                            <input
                                                type="text"
                                                value={bulkEmailData.subject}
                                                onChange={(e) => setBulkEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                                placeholder="Bulk email subject"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                                            <textarea
                                                value={bulkEmailData.content}
                                                onChange={(e) => setBulkEmailData(prev => ({ ...prev, content: e.target.value }))}
                                                placeholder="Write your bulk email content here..."
                                                rows={8}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Schedule (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={bulkEmailData.scheduleAt}
                                                onChange={(e) => setBulkEmailData(prev => ({ ...prev, scheduleAt: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>

                                        <button
                                            onClick={handleSendBulkEmail}
                                            disabled={isSendingBulk}
                                            className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                                        >
                                            {isSendingBulk ? 'Sending...' : `Send to ${bulkEmailData.recipients.length} Recipients`}
                                        </button>
                                    </div>
                                </div>

                                {/* Recipients */}
                                <div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Add Recipients</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={recipientInput}
                                                    onChange={(e) => setRecipientInput(e.target.value)}
                                                    placeholder="email@example.com"
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            addRecipient();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={addRecipient}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Recipients ({bulkEmailData.recipients.length})
                                            </label>
                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                {bulkEmailData.recipients.length === 0 ? (
                                                    <p className="text-slate-500 text-sm">No recipients added yet.</p>
                                                ) : (
                                                    bulkEmailData.recipients.map((recipient, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                                            <span className="text-sm text-slate-700">{recipient.email}</span>
                                                            <button
                                                                onClick={() => removeRecipient(index)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick Add Sample */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Quick Add Sample</label>
                                            <button
                                                onClick={() => {
                                                    const sampleEmails = [
                                                        'client1@example.com',
                                                        'client2@example.com',
                                                        'client3@example.com'
                                                    ];
                                                    sampleEmails.forEach(email => {
                                                        setBulkEmailData(prev => ({
                                                            ...prev,
                                                            recipients: [...prev.recipients, { email, variables: {} }]
                                                        }));
                                                    });
                                                }}
                                                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                                            >
                                                Add Sample Recipients
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'scheduled' && (
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">⏰ Scheduled Emails</h2>
                            
                            <div className="space-y-4">
                                {scheduledEmails.length === 0 ? (
                                    <div className="text-center py-8">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">schedule</span>
                                        <p className="text-slate-500">No scheduled emails found.</p>
                                    </div>
                                ) : (
                                    scheduledEmails.map(email => (
                                        <div key={email.id} className="p-4 border border-slate-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold text-slate-900">{email.subject}</h3>
                                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                                    Scheduled
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2">To: {email.to}</p>
                                            <p className="text-sm text-slate-600 mb-2">
                                                Scheduled for: {new Date(email.scheduledAt).toLocaleString()}
                                            </p>
                                            <p className="text-sm text-slate-600 line-clamp-2">
                                                {email.content.substring(0, 100)}...
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">📊 Email Analytics</h2>
                                <div className="flex gap-4">
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => {
                                            setDateRange(prev => ({ ...prev, startDate: e.target.value }));
                                            loadAnalytics();
                                        }}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => {
                                            setDateRange(prev => ({ ...prev, endDate: e.target.value }));
                                            loadAnalytics();
                                        }}
                                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {analytics ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-blue-600">mail</span>
                                            <div>
                                                <p className="text-sm text-blue-600">Total Emails</p>
                                                <p className="text-xl font-bold text-blue-900">{analytics.metrics.totalEmails}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-green-600">send</span>
                                            <div>
                                                <p className="text-sm text-green-600">Sent</p>
                                                <p className="text-xl font-bold text-green-900">{analytics.metrics.sentEmails}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-purple-600">visibility</span>
                                            <div>
                                                <p className="text-sm text-purple-600">Open Rate</p>
                                                <p className="text-xl font-bold text-purple-900">{analytics.metrics.openRate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-orange-600">click</span>
                                            <div>
                                                <p className="text-sm text-orange-600">Click Rate</p>
                                                <p className="text-xl font-bold text-orange-900">{analytics.metrics.clickRate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">analytics</span>
                                    <p className="text-slate-500">No analytics data available.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailCommunicationPage;
