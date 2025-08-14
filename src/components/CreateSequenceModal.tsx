import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import EmailTemplateModal from './EmailTemplateModal';
import SequenceTemplateModal from './SequenceTemplateModal';
import { TriggerType, FollowUpSequence, SequenceStep } from '../types';
import { EmailTemplate } from '../constants/emailTemplates';
// TODO: Add drag and drop functionality later
// import { DndContext, closestCenter } from '@dnd-kit/core';

interface SequenceEditorModalProps {
    sequence?: FollowUpSequence | null;
    onClose: () => void;
    onSave: (sequenceData: FollowUpSequence) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">{children}</label>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
);
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
);

// Validation functions
const validateStep = (step: SequenceStep): string[] => {
    const errors: string[] = [];
    
    if (!step.content.trim()) {
        errors.push('Content is required');
    }
    
    if ((step.type === 'email' || step.type === 'ai-email') && !step.subject?.trim()) {
        errors.push('Subject is required for emails');
    }
    
    if (step.delay.value <= 0) {
        errors.push('Delay must be greater than 0');
    }
    
    if (step.type === 'meeting' && step.meetingDetails) {
        if (!step.meetingDetails.location?.trim()) {
            errors.push('Meeting location is required');
        }
    }
    
    return errors;
};

const validateSequence = (name: string, steps: SequenceStep[]): string[] => {
    const errors: string[] = [];
    
    if (!name.trim()) {
        errors.push('Sequence name is required');
    }
    
    if (steps.length === 0) {
        errors.push('At least one step is required');
    }
    
    steps.forEach((step, index) => {
        const stepErrors = validateStep(step);
        stepErrors.forEach(error => {
            errors.push(`Step ${index + 1}: ${error}`);
        });
    });
    
    return errors;
};

const StepEditor: React.FC<{ step: SequenceStep; onUpdate: (field: keyof SequenceStep, value: any) => void; onRemove: () => void; }> = ({ step, onUpdate, onRemove }) => {
    const icons = {
        email: <span className="material-symbols-outlined w-5 h-5 text-blue-600">mail</span>,
        'ai-email': <span className="material-symbols-outlined w-5 h-5 text-purple-600">sparkles</span>,
        meeting: <span className="material-symbols-outlined w-5 h-5 text-green-600">calendar_month</span>,
        task: <span className="material-symbols-outlined w-5 h-5 text-yellow-700">edit</span>,
    };

    const handleMeetingDetailsChange = (field: keyof NonNullable<SequenceStep['meetingDetails']>, value: string) => {
        onUpdate('meetingDetails', {
            ...step.meetingDetails,
            [field]: value,
        });
    };

    const mapLink = step.type === 'meeting' && step.meetingDetails?.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.meetingDetails.location)}`
        : null;


    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {icons[step.type as keyof typeof icons]}
                    <h4 className="font-bold text-slate-700 capitalize">{step.type.replace('-', ' ')}</h4>
                </div>
                <button type="button" onClick={onRemove} className="p-1 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600">
                    <span className="material-symbols-outlined w-4 h-4">delete</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                     <Label htmlFor={`delay-value-${step.id}`}>Wait</Label>
                    <Input id={`delay-value-${step.id}`} type="number" value={step.delay.value} onChange={e => onUpdate('delay', { ...step.delay, value: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor={`delay-unit-${step.id}`}>&nbsp;</Label>
                     <select id={`delay-unit-${step.id}`} value={step.delay.unit} onChange={e => onUpdate('delay', { ...step.delay, unit: e.target.value as 'minutes' | 'hours' | 'days' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
            </div>

            {step.type === 'email' && (
                <div>
                    <Label htmlFor={`subject-${step.id}`}>Subject</Label>
                    <Input id={`subject-${step.id}`} type="text" placeholder="Email subject line" value={step.subject} onChange={e => onUpdate('subject', e.target.value)} />
                </div>
            )}
             {step.type === 'meeting' && (
                <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor={`date-${step.id}`}>Date</Label>
                            <Input id={`date-${step.id}`} type="date" value={step.meetingDetails?.date || ''} onChange={e => handleMeetingDetailsChange('date', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor={`time-${step.id}`}>Time</Label>
                            <Input id={`time-${step.id}`} type="time" value={step.meetingDetails?.time || ''} onChange={e => handleMeetingDetailsChange('time', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor={`location-${step.id}`}>Location</Label>
                        <Input id={`location-${step.id}`} type="text" placeholder="e.g., Office or Property Address" value={step.meetingDetails?.location || ''} onChange={e => handleMeetingDetailsChange('location', e.target.value)} />
                        {mapLink && (
                            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                                View on Map
                            </a>
                        )}
                    </div>
                </div>
            )}
             <div>
                <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor={`content-${step.id}`}>
                        {step.type === 'meeting' ? 'Notes' : 
                         step.type === 'ai-email' ? 'AI Prompt' :
                         'Content'}
                    </Label>
                    {(step.type === 'email' || step.type === 'ai-email') && (
                        <button
                            type="button"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('openEmailTemplates', { detail: step.id }));
                            }}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                            Use Template
                        </button>
                    )}
                </div>
                <Textarea 
                    id={`content-${step.id}`} 
                    rows={4} 
                    placeholder={
                        step.type === 'task' ? 'Describe the task for the agent...' : 
                        step.type === 'meeting' ? 'Add notes for the meeting...' :
                        step.type === 'ai-email' ? 'e.g., Follow up on their interest in the kitchen and suggest a showing.' :
                        'Write your message content here...'
                    } 
                    value={step.content} 
                    onChange={e => onUpdate('content', e.target.value)} 
                />
            </div>
        </div>
    );
};

const SequenceEditorModal: React.FC<SequenceEditorModalProps> = ({ sequence, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerType, setTriggerType] = useState<TriggerType>('Lead Capture');
    const [steps, setSteps] = useState<SequenceStep[]>([]);
    
    // Template modal state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    
    // Sequence template modal state
    const [isSequenceTemplateModalOpen, setIsSequenceTemplateModalOpen] = useState(false);
    
    // Validation state
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    useEffect(() => {
        if (sequence) {
            setName(sequence.name);
            setDescription(sequence.description);
            setTriggerType(sequence.triggerType);
            setSteps(sequence.steps);
        } else {
            setName('');
            setDescription('');
            setTriggerType('Lead Capture');
            setSteps([]);
        }
    }, [sequence]);

    // Listen for template modal events
    useEffect(() => {
        const handleOpenTemplates = (event: CustomEvent) => {
            setEditingStepId(event.detail);
            setIsTemplateModalOpen(true);
        };

        window.addEventListener('openEmailTemplates', handleOpenTemplates as EventListener);
        return () => {
            window.removeEventListener('openEmailTemplates', handleOpenTemplates as EventListener);
        };
    }, []);

    const handleAddStep = (type: 'email' | 'task' | 'meeting' | 'ai-email') => {
        const newStep: SequenceStep = {
            id: `step-${Date.now()}`,
            type,
            delay: { value: 1, unit: 'days' },
            content: '',
            ...(type === 'email' && { subject: '' }),
        };
        setSteps(prev => [...prev, newStep]);
    };

    const handleUpdateStep = (stepId: string, field: keyof SequenceStep, value: any) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));
    };

    const handleRemoveStep = (stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId));
    };

    const handleTemplateSelect = (template: EmailTemplate) => {
        if (editingStepId) {
            // Apply template to existing step
            setSteps(prev => prev.map(step => {
                if (step.id === editingStepId && (step.type === 'email' || step.type === 'ai-email')) {
                    return {
                        ...step,
                        subject: template.subject,
                        content: template.content
                    };
                }
                return step;
            }));
        } else {
            // Create new email step with template
            const newStep: SequenceStep = {
                id: `step-${Date.now()}`,
                type: 'email',
                delay: { value: 1, unit: 'days' },
                content: template.content,
                subject: template.subject
            };
            setSteps(prev => [...prev, newStep]);
        }
        setEditingStepId(null);
    };

    const handleSequenceTemplateSelect = (sequenceTemplate: Omit<FollowUpSequence, 'id'>) => {
        setName(sequenceTemplate.name);
        setDescription(sequenceTemplate.description);
        setTriggerType(sequenceTemplate.triggerType);
        setSteps(sequenceTemplate.steps);
        setValidationErrors([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate the sequence
        const errors = validateSequence(name, steps);
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        
        const sequenceData: FollowUpSequence = {
            id: sequence?.id || `seq-${Date.now()}`,
            name,
            description,
            triggerType,
            steps,
            isActive: sequence?.isActive ?? true,
        };
        onSave(sequenceData);
    };

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">auto_awesome</span>
            <span className="text-xl font-bold text-slate-800">{sequence ? 'Edit Sequence' : 'Create New Sequence'}</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="seq-name">Sequence Name</Label>
                            <Input id="seq-name" type="text" placeholder="e.g., New Zillow Lead Follow-up" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="seq-desc">Description</Label>
                            <Textarea id="seq-desc" rows={2} placeholder="A short description of this sequence's purpose." value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        
                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined w-4 h-4 text-red-600">error</span>
                                    <h4 className="text-sm font-semibold text-red-800">Please fix the following errors:</h4>
                                </div>
                                <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                                    {validationErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="seq-trigger">Trigger</Label>
                             <div className="relative">
                                <select
                                    id="seq-trigger"
                                    value={triggerType}
                                    onChange={e => setTriggerType(e.target.value as TriggerType)}
                                    className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option>Lead Capture</option>
                                    <option>Appointment Scheduled</option>
                                    <option>Property Viewed</option>
                                    <option>Market Update</option>
                                    <option>Custom</option>
                                </select>
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Sequence Steps</h3>
                        <div className="space-y-4">
                            {steps.map((step) => (
                                <StepEditor
                                    key={step.id}
                                    step={step}
                                    onUpdate={(field, value) => handleUpdateStep(step.id, field, value)}
                                    onRemove={() => handleRemoveStep(step.id)}
                                />
                            ))}
                        </div>
                        <div className="mt-4 space-y-3">
                            {/* Template Browser */}
                            {/* Sequence Template Section */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg mb-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-purple-800">🚀 Sequence Templates</h4>
                                    <p className="text-xs text-purple-600">Start with proven, complete sequences</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSequenceTemplateModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined w-4 h-4">auto_awesome</span>
                                    Choose Template
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-800">Email Templates</h4>
                                    <p className="text-xs text-blue-600">Professional templates for every situation</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingStepId(null);
                                        setIsTemplateModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined w-4 h-4">library_books</span>
                                    Browse Templates
                                </button>
                            </div>
                            
                            {/* Manual Step Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => handleAddStep('email')} 
                                    className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-all"
                                    title="Send a personalized email with custom subject and content"
                                >
                                    <span className="material-symbols-outlined w-4 h-4">add</span> Add Email
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                        Send personalized email
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-800"></div>
                                    </div>
                                </button>
                            <button 
                                type="button" 
                                onClick={() => handleAddStep('ai-email')} 
                                className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-all"
                                title="Let AI write and send a personalized email based on your prompt"
                            >
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add AI Email
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    AI writes personalized email
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-800"></div>
                                </div>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleAddStep('task')} 
                                className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-all"
                                title="Create a reminder task for you or your team to complete"
                            >
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add Task
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    Create reminder task
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-800"></div>
                                </div>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleAddStep('meeting')} 
                                className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-all"
                                title="Schedule an appointment or meeting with date, time, and location"
                            >
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add Meeting
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    Schedule appointment
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-slate-800"></div>
                                </div>
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                        Save Sequence
                    </button>
                </div>
            </form>
            
            {/* Email Template Modal */}
            {isTemplateModalOpen && (
                <EmailTemplateModal
                    onClose={() => {
                        setIsTemplateModalOpen(false);
                        setEditingStepId(null);
                    }}
                    onSelectTemplate={handleTemplateSelect}
                />
            )}
            
            {isSequenceTemplateModalOpen && (
                <SequenceTemplateModal
                    onClose={() => setIsSequenceTemplateModalOpen(false)}
                    onSelectTemplate={handleSequenceTemplateSelect}
                />
            )}
        </Modal>
    );
};

export default SequenceEditorModal;