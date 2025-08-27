import React, { useState, useEffect } from 'react';
import { AgentProfile } from '../types';
import { fileUploadService } from '../services/fileUploadService';
import { auth } from '../services/firebase';

interface AIPersonalityTemplatePageProps {
    agentProfile: AgentProfile;
}

const AIPersonalityTemplatePage: React.FC<AIPersonalityTemplatePageProps> = ({ agentProfile }) => {
    const [activeTab, setActiveTab] = useState<'personalities' | 'templates' | 'testing'>('personalities');
    
    // AI Personality State
    const [personalities, setPersonalities] = useState<any[]>([]);
    const [newPersonality, setNewPersonality] = useState({
        name: '',
        type: 'agent',
        traits: [] as string[],
        communicationStyle: 'professional',
        voiceSettings: { voice: 'female-1', speed: 1.0, pitch: 1.0 },
        trainingData: ''
    });
    const [selectedTrait, setSelectedTrait] = useState('');
    
    // Template State
    const [templates, setTemplates] = useState<any[]>([]);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        type: 'email',
        content: '',
        variables: [] as string[],
        category: 'general',
        tags: [] as string[]
    });
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [templateVariables, setTemplateVariables] = useState<any>({});
    
    // Testing State
    const [testMessage, setTestMessage] = useState('');
    const [testResponse, setTestResponse] = useState('');
    const [selectedPersonality, setSelectedPersonality] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const availableTraits = [
        'Professional', 'Friendly', 'Enthusiastic', 'Calm', 'Casual', 'Formal',
        'Knowledgeable', 'Patient', 'Confident', 'Empathetic', 'Direct', 'Warm'
    ];

    const templateTypes = [
        { value: 'email', label: 'Email Template' },
        { value: 'sms', label: 'SMS Template' },
        { value: 'social', label: 'Social Media Post' },
        { value: 'followup', label: 'Follow-up Message' },
        { value: 'proposal', label: 'Proposal Template' }
    ];

    const categories = [
        'general', 'listing', 'lead-followup', 'client-communication', 'marketing'
    ];

    // Load data on component mount
    useEffect(() => {
        if (auth.currentUser) {
            loadPersonalities();
            loadTemplates();
        }
    }, []);

    const loadPersonalities = async () => {
        if (!auth.currentUser) return;
        
        try {
            const result = await fileUploadService.getUserPersonalities(auth.currentUser.uid);
            setPersonalities(result.personalities);
        } catch (error) {
            console.error('Failed to load personalities:', error);
        }
    };

    const loadTemplates = async () => {
        if (!auth.currentUser) return;
        
        try {
            const result = await fileUploadService.getUserTemplates(auth.currentUser.uid);
            setTemplates(result.templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const handleCreatePersonality = async () => {
        if (!auth.currentUser || !newPersonality.name.trim()) {
            alert('Please enter a personality name');
            return;
        }

        try {
            const result = await fileUploadService.createAIPersonality(
                auth.currentUser.uid,
                newPersonality.name,
                newPersonality.type,
                newPersonality.traits,
                newPersonality.communicationStyle,
                newPersonality.voiceSettings,
                newPersonality.trainingData
            );

            alert('AI Personality created successfully!');
            setNewPersonality({
                name: '',
                type: 'agent',
                traits: [],
                communicationStyle: 'professional',
                voiceSettings: { voice: 'female-1', speed: 1.0, pitch: 1.0 },
                trainingData: ''
            });
            loadPersonalities();
        } catch (error) {
            console.error('Personality creation error:', error);
            alert('Failed to create personality. Please try again.');
        }
    };

    const handleSaveTemplate = async () => {
        if (!auth.currentUser || !newTemplate.name.trim() || !newTemplate.content.trim()) {
            alert('Please fill in template name and content');
            return;
        }

        try {
            const result = await fileUploadService.saveTemplate(
                auth.currentUser.uid,
                newTemplate.name,
                newTemplate.type,
                newTemplate.content,
                newTemplate.variables,
                newTemplate.category,
                newTemplate.tags
            );

            alert('Template saved successfully!');
            setNewTemplate({
                name: '',
                type: 'email',
                content: '',
                variables: [],
                category: 'general',
                tags: []
            });
            loadTemplates();
        } catch (error) {
            console.error('Template save error:', error);
            alert('Failed to save template. Please try again.');
        }
    };

    const handleTestResponse = async () => {
        if (!auth.currentUser || !testMessage.trim() || !selectedPersonality) {
            alert('Please enter a message and select a personality');
            return;
        }

        setIsGenerating(true);
        try {
            const result = await fileUploadService.generateResponse(
                auth.currentUser.uid,
                selectedPersonality,
                testMessage,
                'Testing conversation',
                'conversational'
            );

            setTestResponse(result.response);
        } catch (error) {
            console.error('Response generation error:', error);
            setTestResponse('Error: Unable to generate response');
        }
        setIsGenerating(false);
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate) {
            alert('Please select a template');
            return;
        }

        try {
            const result = await fileUploadService.applyTemplate(
                selectedTemplate.id,
                templateVariables,
                'Template application'
            );

            setTestResponse(`Original: ${result.originalContent}\n\nEnhanced: ${result.enhancedContent}`);
        } catch (error) {
            console.error('Template application error:', error);
            alert('Failed to apply template');
        }
    };

    const addTrait = () => {
        if (selectedTrait && !newPersonality.traits.includes(selectedTrait)) {
            setNewPersonality(prev => ({
                ...prev,
                traits: [...prev.traits, selectedTrait]
            }));
            setSelectedTrait('');
        }
    };

    const removeTrait = (trait: string) => {
        setNewPersonality(prev => ({
            ...prev,
            traits: prev.traits.filter(t => t !== trait)
        }));
    };

    const addTag = (tag: string) => {
        if (tag && !newTemplate.tags.includes(tag)) {
            setNewTemplate(prev => ({
                ...prev,
                tags: [...prev.tags, tag]
            }));
        }
    };

    const removeTag = (tag: string) => {
        setNewTemplate(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }));
    };

    const tabs = [
        { id: 'personalities', label: 'AI Personalities', icon: 'psychology' },
        { id: 'templates', label: 'Templates', icon: 'description' },
        { id: 'testing', label: 'Testing & Preview', icon: 'science' }
    ];

    return (
        <div className="bg-slate-50 min-h-full">
            <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">AI Personality & Template System</h1>
                    <p className="text-slate-500 mt-1">Create custom AI personalities and manage communication templates.</p>
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
                    {activeTab === 'personalities' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Create New Personality */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">🤖 Create AI Personality</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Personality Name</label>
                                        <input
                                            type="text"
                                            value={newPersonality.name}
                                            onChange={(e) => setNewPersonality(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Professional Sarah, Friendly Mike"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Personality Type</label>
                                        <select
                                            value={newPersonality.type}
                                            onChange={(e) => setNewPersonality(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="agent">Agent</option>
                                            <option value="listing">Listing Specialist</option>
                                            <option value="helper">Helper</option>
                                            <option value="marketing">Marketing</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Communication Style</label>
                                        <select
                                            value={newPersonality.communicationStyle}
                                            onChange={(e) => setNewPersonality(prev => ({ ...prev, communicationStyle: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="professional">Professional</option>
                                            <option value="friendly">Friendly</option>
                                            <option value="enthusiastic">Enthusiastic</option>
                                            <option value="calm">Calm</option>
                                            <option value="casual">Casual</option>
                                            <option value="formal">Formal</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Personality Traits</label>
                                        <div className="flex gap-2 mb-2">
                                            <select
                                                value={selectedTrait}
                                                onChange={(e) => setSelectedTrait(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">Select a trait</option>
                                                {availableTraits.map(trait => (
                                                    <option key={trait} value={trait}>{trait}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={addTrait}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newPersonality.traits.map(trait => (
                                                <span
                                                    key={trait}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                                                >
                                                    {trait}
                                                    <button
                                                        onClick={() => removeTrait(trait)}
                                                        className="text-primary-600 hover:text-primary-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Training Data</label>
                                        <textarea
                                            value={newPersonality.trainingData}
                                            onChange={(e) => setNewPersonality(prev => ({ ...prev, trainingData: e.target.value }))}
                                            placeholder="Describe how this personality should behave, respond, and communicate..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <button
                                        onClick={handleCreatePersonality}
                                        className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
                                    >
                                        Create AI Personality
                                    </button>
                                </div>
                            </div>

                            {/* Existing Personalities */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">🎭 Your AI Personalities</h2>
                                
                                <div className="space-y-4">
                                    {personalities.length === 0 ? (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">psychology</span>
                                            <p className="text-slate-500">No AI personalities created yet.</p>
                                        </div>
                                    ) : (
                                        personalities.map(personality => (
                                            <div key={personality.id} className="p-4 border border-slate-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-semibold text-slate-900">{personality.personalityName}</h3>
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        {personality.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-2">Type: {personality.personalityType}</p>
                                                <p className="text-sm text-slate-600 mb-3">Style: {personality.communicationStyle}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {personality.traits?.map((trait: string) => (
                                                        <span key={trait} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                                            {trait}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Create New Template */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">📝 Create Template</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
                                        <input
                                            type="text"
                                            value={newTemplate.name}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Follow-up Email, Property Introduction"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Template Type</label>
                                        <select
                                            value={newTemplate.type}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {templateTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                        <select
                                            value={newTemplate.category}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            {categories.map(category => (
                                                <option key={category} value={category}>{category.replace('-', ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Template Content</label>
                                        <textarea
                                            value={newTemplate.content}
                                            onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="Enter your template content. Use {{variable}} for dynamic content..."
                                            rows={6}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Use {'{{clientName}}'}, {'{{propertyAddress}}'}, {'{{agentName}}'} etc. for variables
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                                        <input
                                            type="text"
                                            placeholder="Enter tags separated by commas"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const tag = e.currentTarget.value.trim();
                                                    if (tag) {
                                                        addTag(tag);
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {newTemplate.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => removeTag(tag)}
                                                        className="text-slate-500 hover:text-slate-700"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveTemplate}
                                        className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </div>

                            {/* Existing Templates */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">📋 Your Templates</h2>
                                
                                <div className="space-y-4">
                                    {templates.length === 0 ? (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">description</span>
                                            <p className="text-slate-500">No templates created yet.</p>
                                        </div>
                                    ) : (
                                        templates.map(template => (
                                            <div key={template.id} className="p-4 border border-slate-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-semibold text-slate-900">{template.templateName}</h3>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        {template.templateType}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 mb-2">Category: {template.category}</p>
                                                <p className="text-sm text-slate-600 mb-3">Used: {template.usageCount || 0} times</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {template.tags?.map((tag: string) => (
                                                        <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                                    {template.content.substring(0, 100)}...
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'testing' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* AI Response Testing */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">🧪 Test AI Responses</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Personality</label>
                                        <select
                                            value={selectedPersonality}
                                            onChange={(e) => setSelectedPersonality(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">Choose a personality</option>
                                            {personalities.map(personality => (
                                                <option key={personality.id} value={personality.id}>
                                                    {personality.personalityName} ({personality.personalityType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Test Message</label>
                                        <textarea
                                            value={testMessage}
                                            onChange={(e) => setTestMessage(e.target.value)}
                                            placeholder="Enter a message to test the AI personality..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>

                                    <button
                                        onClick={handleTestResponse}
                                        disabled={!selectedPersonality || !testMessage.trim() || isGenerating}
                                        className="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Response'}
                                    </button>

                                    {testResponse && (
                                        <div className="p-4 bg-slate-50 rounded-lg">
                                            <h4 className="font-semibold text-slate-900 mb-2">AI Response:</h4>
                                            <p className="text-slate-700 whitespace-pre-wrap">{testResponse}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Template Testing */}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-6">📋 Test Templates</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Template</label>
                                        <select
                                            value={selectedTemplate?.id || ''}
                                            onChange={(e) => {
                                                const template = templates.find(t => t.id === e.target.value);
                                                setSelectedTemplate(template);
                                                if (template) {
                                                    const vars: any = {};
                                                    template.variables?.forEach((v: string) => {
                                                        vars[v] = '';
                                                    });
                                                    setTemplateVariables(vars);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">Choose a template</option>
                                            {templates.map(template => (
                                                <option key={template.id} value={template.id}>
                                                    {template.templateName} ({template.templateType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedTemplate && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Template Variables</label>
                                                <div className="space-y-2">
                                                    {selectedTemplate.variables?.map((variable: string) => (
                                                        <div key={variable} className="flex gap-2">
                                                            <span className="text-sm text-slate-600 w-24">{variable}:</span>
                                                            <input
                                                                type="text"
                                                                value={templateVariables[variable] || ''}
                                                                onChange={(e) => setTemplateVariables(prev => ({
                                                                    ...prev,
                                                                    [variable]: e.target.value
                                                                }))}
                                                                placeholder={`Enter ${variable}`}
                                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleApplyTemplate}
                                                className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                                            >
                                                Apply Template
                                            </button>

                                            <div className="p-4 bg-slate-50 rounded-lg">
                                                <h4 className="font-semibold text-slate-900 mb-2">Template Preview:</h4>
                                                <p className="text-slate-700 text-sm">{selectedTemplate.content}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIPersonalityTemplatePage;
