import React, { useState } from 'react';
import Modal from './Modal';
import { SEQUENCE_TEMPLATES, SEQUENCE_CATEGORIES, convertTemplateToSequence, SequenceTemplate } from '../constants/sequenceTemplates';
import { FollowUpSequence } from '../types';

interface SequenceTemplateModalProps {
    onClose: () => void;
    onSelectTemplate: (sequence: Omit<FollowUpSequence, 'id'>) => void;
}

const SequenceTemplateModal: React.FC<SequenceTemplateModalProps> = ({ onClose, onSelectTemplate }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [previewTemplate, setPreviewTemplate] = useState<SequenceTemplate | null>(null);

    const filteredTemplates = SEQUENCE_TEMPLATES.filter(template => 
        selectedCategory === 'all' || template.category === selectedCategory
    );

    const handleSelectTemplate = (template: SequenceTemplate) => {
        const sequence = convertTemplateToSequence(template);
        onSelectTemplate(sequence);
        onClose();
    };

    const getDifficultyColor = (difficulty: SequenceTemplate['difficulty']) => {
        switch (difficulty) {
            case 'Beginner': return 'bg-green-100 text-green-700';
            case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
            case 'Advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">auto_awesome</span>
            <span className="text-xl font-bold text-slate-800">Sequence Templates</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="flex h-[80vh]">
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200">
                        <p className="text-slate-600 mb-4">Start with a proven sequence template and customize it for your needs.</p>
                        
                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedCategory === 'all' 
                                        ? 'bg-primary-600 text-white' 
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                All Templates
                            </button>
                            {SEQUENCE_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        selectedCategory === category.id 
                                            ? 'bg-primary-600 text-white' 
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    <span className="material-symbols-outlined w-4 h-4">{category.icon}</span>
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredTemplates.map(template => {
                                const category = SEQUENCE_CATEGORIES.find(cat => cat.id === template.category);
                                return (
                                    <div
                                        key={template.id}
                                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined w-5 h-5 text-${category?.color}-600`}>
                                                    {category?.icon}
                                                </span>
                                                <h3 className="font-semibold text-slate-800 text-sm">{template.name}</h3>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
                                                {template.difficulty}
                                            </span>
                                        </div>
                                        
                                        <p className="text-xs text-slate-600 mb-3">{template.description}</p>
                                        
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-4 text-xs text-slate-500">
                                                <span>⏱️ {template.estimatedDuration}</span>
                                                <span>📧 {template.steps.length} steps</span>
                                                {template.conversionRate && (
                                                    <span>📈 {template.conversionRate}% conversion</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-1">
                                                {template.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {template.tags.length > 2 && (
                                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                                        +{template.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectTemplate(template);
                                                }}
                                                className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                                            >
                                                Use Template
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {filteredTemplates.length === 0 && (
                            <div className="text-center py-12">
                                <span className="material-symbols-outlined w-12 h-12 text-slate-300 mx-auto mb-4 block">auto_awesome</span>
                                <p className="text-slate-500">No templates found in this category</p>
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
                            {/* Template Details */}
                            <div>
                                <p className="text-sm text-slate-700 mb-3">{previewTemplate.description}</p>
                                
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="font-medium text-slate-600">Duration:</span>
                                        <div className="text-slate-800">{previewTemplate.estimatedDuration}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">Steps:</span>
                                        <div className="text-slate-800">{previewTemplate.steps.length} steps</div>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">Trigger:</span>
                                        <div className="text-slate-800">{previewTemplate.triggerType}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">Difficulty:</span>
                                        <div className="text-slate-800">{previewTemplate.difficulty}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Steps Preview */}
                            <div>
                                <h4 className="font-medium text-slate-700 mb-2">Sequence Steps</h4>
                                <div className="space-y-3">
                                    {previewTemplate.steps.map((step, index) => {
                                        const stepIcons = {
                                            email: { icon: 'mail', color: 'text-blue-600' },
                                            'ai-email': { icon: 'sparkles', color: 'text-purple-600' },
                                            task: { icon: 'edit', color: 'text-yellow-600' },
                                            meeting: { icon: 'calendar_month', color: 'text-green-600' }
                                        };
                                        const stepInfo = stepIcons[step.type as keyof typeof stepIcons];
                                        
                                        return (
                                            <div key={index} className="bg-white rounded p-3 border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`material-symbols-outlined w-4 h-4 ${stepInfo.color}`}>
                                                        {stepInfo.icon}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-700 capitalize">
                                                        {step.type.replace('-', ' ')}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        after {step.delay.value} {step.delay.unit}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    {step.type === 'email' || step.type === 'ai-email' ? (
                                                        <>
                                                            <div className="font-medium mb-1">Subject: {step.subject}</div>
                                                            <div className="line-clamp-2">{step.content}</div>
                                                        </>
                                                    ) : (
                                                        <div className="line-clamp-2">{step.content}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Performance Info */}
                            {previewTemplate.conversionRate && (
                                <div className="bg-green-50 border border-green-200 rounded p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined w-4 h-4 text-green-600">trending_up</span>
                                        <span className="text-sm font-medium text-green-800">Performance</span>
                                    </div>
                                    <div className="text-xs text-green-700">
                                        Average conversion rate: {previewTemplate.conversionRate}%
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <button
                                onClick={() => handleSelectTemplate(previewTemplate)}
                                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Use This Template
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default SequenceTemplateModal;
