import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { EmailTemplate } from '../constants/emailTemplates';
import { useAgentBranding } from '../hooks/useAgentBranding';

interface TemplateVariableFormProps {
    template: EmailTemplate;
    onClose: () => void;
    onComplete: (filledTemplate: { subject: string; content: string }) => void;
}

interface VariableValues {
    [key: string]: string;
}

interface SmartSuggestion {
    field: string;
    suggestions: string[];
    context: string;
}

const TemplateVariableForm: React.FC<TemplateVariableFormProps> = ({ template, onClose, onComplete }) => {
    const [variables, setVariables] = useState<VariableValues>({});
    const [showAISuggestions, setShowAISuggestions] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const { contact, getSignature } = useAgentBranding();
    const signature = useMemo(() => getSignature(), [getSignature]);
    const defaultAgentValues = useMemo<Record<string, string>>(() => {
        const entries: Record<string, string> = {};
        if (contact.name) entries['agent.name'] = contact.name;
        if (contact.title) entries['agent.title'] = contact.title;
        if (contact.company) entries['agent.company'] = contact.company;
        if (contact.phone) entries['agent.phone'] = contact.phone;
        if (contact.email) entries['agent.email'] = contact.email;
        if (contact.website) entries['agent.website'] = contact.website;
        if (signature) entries['agent.signature'] = signature;
        return entries;
    }, [contact, signature]);

    // Extract variables from template
    const extractVariables = (text: string): string[] => {
        const regex = /\{\{([^}]+)\}\}/g;
        const matches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push(match[1]);
        }
        return [...new Set(matches)]; // Remove duplicates
    };

    const templateVariables = [
        ...extractVariables(template.subject),
        ...extractVariables(template.content)
    ];

    // Smart suggestions based on real estate context
    const withPrimary = (value?: string, defaults: string[] = []) => {
        const trimmed = value?.trim();
        if (!trimmed) return defaults;
        const filtered = defaults.filter((entry) => entry !== trimmed);
        return [trimmed, ...filtered];
    };

    const getSmartSuggestions = (variable: string): SmartSuggestion => {
        const suggestions: Record<string, SmartSuggestion> = {
            'lead.name': {
                field: 'Lead Name',
                suggestions: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Chen'],
                context: 'The name of your potential client'
            },
            'property.address': {
                field: 'Property Address', 
                suggestions: ['123 Main Street', '456 Oak Avenue', '789 Pine Road', '321 Elm Drive'],
                context: 'Full street address of the property'
            },
            'property.type': {
                field: 'Property Type',
                suggestions: ['single-family home', 'condo', 'townhouse', 'luxury estate'],
                context: 'Type of property being discussed'
            },
            'property.bedrooms': {
                field: 'Bedrooms',
                suggestions: ['2', '3', '4', '5'],
                context: 'Number of bedrooms'
            },
            'property.bathrooms': {
                field: 'Bathrooms',
                suggestions: ['1.5', '2', '2.5', '3'],
                context: 'Number of bathrooms'
            },
            'property.squareFeet': {
                field: 'Square Feet',
                suggestions: ['1,200', '1,800', '2,400', '3,200'],
                context: 'Total square footage'
            },
            'property.price': {
                field: 'Property Price',
                suggestions: ['$299,000', '$425,000', '$650,000', '$895,000'],
                context: 'Listed price of the property'
            },
            'agent.name': {
                field: 'Your Name',
                suggestions: withPrimary(contact.name, ['John Agent', 'Sarah Realtor', 'Mike Broker', 'Lisa Sales']),
                context: 'Your professional name'
            },
            'agent.title': {
                field: 'Your Title',
                suggestions: withPrimary(contact.title, ['Licensed Real Estate Agent', 'Senior Realtor', 'Real Estate Specialist', 'Property Consultant']),
                context: 'Your professional title'
            },
            'agent.company': {
                field: 'Company Name',
                suggestions: withPrimary(contact.company, ['ABC Realty', 'Premier Properties', 'Dream Home Real Estate', 'Elite Realty Group']),
                context: 'Your real estate company'
            },
            'agent.phone': {
                field: 'Phone Number',
                suggestions: withPrimary(contact.phone, ['(555) 123-4567', '(555) 987-6543', '(555) 246-8135', '(555) 369-2580']),
                context: 'Your direct phone number'
            },
            'agent.email': {
                field: 'Your Email',
                suggestions: withPrimary(contact.email, ['agent@yourdomain.com', 'hello@yourbrokerage.com']),
                context: 'Your preferred contact email'
            },
            'agent.website': {
                field: 'Website',
                suggestions: withPrimary(contact.website, ['https://yourdomain.com', 'https://yourbrokerage.com']),
                context: 'Website or landing page link'
            },
            'agent.signature': {
                field: 'Email Signature',
                suggestions: signature ? [signature] : [],
                context: 'Signature block for consistent branding'
            },
            'date': {
                field: 'Date',
                suggestions: [
                    new Date().toLocaleDateString(),
                    new Date(Date.now() + 86400000).toLocaleDateString(),
                    new Date(Date.now() + 172800000).toLocaleDateString()
                ],
                context: 'Date for the appointment or event'
            },
            'time': {
                field: 'Time',
                suggestions: ['10:00 AM', '2:00 PM', '4:30 PM', '6:00 PM'],
                context: 'Time for the appointment'
            }
        };

        return suggestions[variable] || {
            field: variable.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            suggestions: [],
            context: 'Custom value for this field'
        };
    };

    useEffect(() => {
        setVariables(prev => {
            const next = { ...prev };
            Object.entries(defaultAgentValues).forEach(([variable, value]) => {
                if (!next[variable] && value) {
                    next[variable] = value;
                }
            });
            return next;
        });
    }, [template.id, defaultAgentValues]);

    const handleVariableChange = (variable: string, value: string) => {
        setVariables(prev => ({ ...prev, [variable]: value }));
    };

    const fillTemplate = (text: string): string => {
        let result = text;
        for (const [variable, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
            result = result.replace(regex, value || `{{${variable}}}`);
        }
        return result;
    };

    const handleComplete = () => {
        const filledSubject = fillTemplate(template.subject);
        const filledContent = fillTemplate(template.content);
        onComplete({ subject: filledSubject, content: filledContent });
    };

    const isComplete = templateVariables.every(variable => variables[variable]?.trim());

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">edit_note</span>
            <span className="text-xl font-bold text-slate-800">Customize Template</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="flex h-[80vh]">
                {/* Form Section */}
                <div className="w-1/2 border-r border-slate-200 p-6 overflow-y-auto">
                    <div className="mb-4">
                        <h3 className="font-semibold text-slate-800 mb-2">{template.name}</h3>
                        <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                        
                        <div className="flex items-center gap-2 mb-6">
                            <button
                                onClick={() => setPreviewMode(false)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    !previewMode 
                                        ? 'bg-primary-600 text-white' 
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                            >
                                Edit Variables
                            </button>
                            <button
                                onClick={() => setPreviewMode(true)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    previewMode 
                                        ? 'bg-primary-600 text-white' 
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>

                    {!previewMode ? (
                        <div className="space-y-4">
                            {templateVariables.map(variable => {
                                const suggestion = getSmartSuggestions(variable);
                                return (
                                    <div key={variable} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-medium text-slate-700">
                                                {suggestion.field}
                                            </label>
                                            {suggestion.suggestions.length > 0 && (
                                                <button
                                                    onClick={() => setShowAISuggestions(
                                                        showAISuggestions === variable ? null : variable
                                                    )}
                                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                >
                                                    💡 Suggestions
                                                </button>
                                            )}
                                        </div>
                                        
                                        <input
                                            type="text"
                                            value={variables[variable] || ''}
                                            onChange={(e) => handleVariableChange(variable, e.target.value)}
                                            placeholder={`Enter ${suggestion.field.toLowerCase()}`}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        
                                        <p className="text-xs text-slate-500">{suggestion.context}</p>
                                        
                                        {showAISuggestions === variable && suggestion.suggestions.length > 0 && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs font-medium text-blue-800 mb-2">Smart Suggestions:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {suggestion.suggestions.map((sug, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => {
                                                                handleVariableChange(variable, sug);
                                                                setShowAISuggestions(null);
                                                            }}
                                                            className="text-xs px-2 py-1 bg-white border border-blue-300 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            {sug}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Subject Line</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <p className="text-sm">{fillTemplate(template.subject)}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email Content</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                                    <pre className="text-sm whitespace-pre-wrap font-sans">
                                        {fillTemplate(template.content)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Smart Assistant Panel */}
                <div className="w-1/2 bg-slate-50 p-6 overflow-y-auto">
                    <div className="mb-6">
                        <h4 className="font-semibold text-slate-800 mb-2">🤖 Smart Assistant</h4>
                        <p className="text-sm text-slate-600">AI-powered suggestions to help you complete this template quickly and professionally.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Completion Status */}
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <h5 className="font-medium text-slate-800 mb-2">Progress</h5>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                    <div 
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${(Object.keys(variables).filter(k => variables[k]?.trim()).length / templateVariables.length) * 100}%` 
                                        }}
                                    ></div>
                                </div>
                                <span className="text-xs text-slate-600">
                                    {Object.keys(variables).filter(k => variables[k]?.trim()).length}/{templateVariables.length}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600">
                                {isComplete ? '✅ Ready to use!' : 'Fill in the remaining fields to complete your template'}
                            </p>
                        </div>

                        {/* Quick Fill Options */}
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <h5 className="font-medium text-slate-800 mb-3">🚀 Quick Fill</h5>
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        // Auto-fill agent info
                                        setVariables(prev => ({
                                            ...prev,
                                            'agent.name': 'John Smith',
                                            'agent.title': 'Licensed Real Estate Agent',
                                            'agent.company': 'Premier Properties',
                                            'agent.phone': '(555) 123-4567'
                                        }));
                                    }}
                                    className="w-full text-left text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                    📝 Fill Agent Information
                                </button>
                                <button
                                    onClick={() => {
                                        // Auto-fill sample property
                                        setVariables(prev => ({
                                            ...prev,
                                            'property.address': '123 Main Street',
                                            'property.type': 'single-family home',
                                            'property.bedrooms': '3',
                                            'property.bathrooms': '2',
                                            'property.squareFeet': '1,800'
                                        }));
                                    }}
                                    className="w-full text-left text-xs px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                    🏠 Fill Sample Property
                                </button>
                            </div>
                        </div>

                        {/* Writing Tips */}
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <h5 className="font-medium text-slate-800 mb-3">💡 Writing Tips</h5>
                            <div className="space-y-2 text-xs text-slate-600">
                                <p>• Use the lead's actual name for personalization</p>
                                <p>• Include specific property details that matter</p>
                                <p>• Keep your tone professional but friendly</p>
                                <p>• Add your direct contact information</p>
                                <p>• Include a clear call-to-action</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center px-6 py-4 bg-white border-t border-slate-200">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleComplete}
                    disabled={!isComplete}
                    className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                >
                    Use Completed Template
                </button>
            </div>
        </Modal>
    );
};

export default TemplateVariableForm;
