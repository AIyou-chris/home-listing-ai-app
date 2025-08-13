import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { TriggerType, FollowUpSequence, SequenceStep } from './types';

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
                <Label htmlFor={`content-${step.id}`}>
                    {step.type === 'meeting' ? 'Notes' : 
                     step.type === 'ai-email' ? 'AI Prompt' :
                     'Content'}
                </Label>
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
            <span className="material-symbols-outlined w-6 h-6 text-primary-600">sparkles</span>
            <h3 className="text-xl font-bold text-slate-800">{sequence ? 'Edit Sequence' : 'Create New Sequence'}</h3>
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
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleAddStep('email')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add Email
                            </button>
                            <button type="button" onClick={() => handleAddStep('ai-email')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add AI Email
                            </button>
                            <button type="button" onClick={() => handleAddStep('task')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200">
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add Task
                            </button>
                            <button type="button" onClick={() => handleAddStep('meeting')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">
                                <span className="material-symbols-outlined w-4 h-4">add</span> Add Meeting
                            </button>
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
        </Modal>
    );
};

export default SequenceEditorModal;