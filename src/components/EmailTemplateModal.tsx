import React, { useState } from 'react';
import Modal from './Modal';
import TemplateVariableForm from './TemplateVariableForm';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_CATEGORIES, EmailTemplate } from '../constants/emailTemplates';

interface EmailTemplateModalProps {
    onClose: () => void;
    onSelectTemplate: (template: EmailTemplate) => void;
    templates?: EmailTemplate[];
}

interface FilledTemplate {
    subject: string;
    content: string;
}

const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ onClose, onSelectTemplate, templates = EMAIL_TEMPLATES }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [showVariableForm, setShowVariableForm] = useState<EmailTemplate | null>(null);

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
        const matchesSearch = searchTerm === '' ||
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesCategory && matchesSearch;
    });

    const handleSelectTemplate = (template: EmailTemplate) => {
        // Check if template has variables
        const hasVariables = /\{\{[^}]+\}\}/.test(template.subject + template.content);

        if (hasVariables) {
            setShowVariableForm(template);
        } else {
            onSelectTemplate(template);
            onClose();
        }
    };

    const handleVariableFormComplete = (filledTemplate: FilledTemplate) => {
        if (showVariableForm) {
            const completedTemplate: EmailTemplate = {
                ...showVariableForm,
                subject: filledTemplate.subject,
                content: filledTemplate.content
            };
            onSelectTemplate(completedTemplate);
        }
        setShowVariableForm(null);
        onClose();
    };

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">mail</span>
            <span className="text-xl font-bold text-slate-800">Email Templates</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="flex h-[80vh]">
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Search and Filter */}
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div className="sm:w-48">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="all">All Categories</option>
                                    {EMAIL_TEMPLATE_CATEGORIES.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Templates List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredTemplates.map(template => {
                                const category = EMAIL_TEMPLATE_CATEGORIES.find(cat => cat.id === template.category);
                                return (
                                    <div
                                        key={template.id}
                                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-slate-800 text-sm">{template.name}</h3>
                                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                                {category?.name}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 mb-3">{template.description}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-1">
                                                {template.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectTemplate(template);
                                                }}
                                                className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                                            >
                                                {/\{\{[^}]+\}\}/.test(template.subject + template.content) ? 'Customize' : 'Use Template'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredTemplates.length === 0 && (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined w-12 h-12 text-slate-300 mx-auto mb-4 block">mail</span>
                                <p className="text-slate-500">No templates found matching your criteria</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                {previewTemplate && (
                    <div className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">{previewTemplate.name}</h3>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-1 hover:bg-slate-100 rounded"
                                >
                                    <span className="material-symbols-outlined w-4 h-4 text-slate-500">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Subject Preview */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Subject Line</label>
                                <div className="bg-white border border-slate-200 rounded p-2 text-sm">
                                    {previewTemplate.subject}
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Email Content</label>
                                <div className="bg-white border border-slate-200 rounded p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                                    {previewTemplate.content}
                                </div>
                            </div>

                            {/* Use Case */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Best Used For</label>
                                <p className="text-sm text-slate-700">{previewTemplate.useCase}</p>
                            </div>

                            {/* Variables Info */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Template Variables</label>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <p>• {`{{lead.name}}`} - Lead's name</p>
                                    <p>• {`{{property.address}}`} - Property address</p>
                                    <p>• {`{{agent.name}}`} - Your name</p>
                                    <p className="text-blue-600">+ many more variables available</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white">
                            <button
                                onClick={() => handleSelectTemplate(previewTemplate)}
                                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                {/\{\{[^}]+\}\}/.test(previewTemplate.subject + previewTemplate.content) ? 'Customize Template' : 'Use This Template'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Variable Form */}
            {showVariableForm && (
                <TemplateVariableForm
                    template={showVariableForm}
                    onClose={() => setShowVariableForm(null)}
                    onComplete={handleVariableFormComplete}
                />
            )}
        </Modal>
    );
};

export default EmailTemplateModal;
