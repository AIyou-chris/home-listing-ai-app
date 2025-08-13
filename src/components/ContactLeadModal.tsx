

import React, { useState } from 'react';
import Modal from './Modal';
import { Lead } from '../types';

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}> = ({ isActive, onClick, icon, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            isActive 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        }`}
    >
        <span className="material-symbols-outlined w-5 h-5">{icon}</span>
        <span>{children}</span>
    </button>
);

interface ContactLeadModalProps {
    lead: Lead;
    onClose: () => void;
    onSchedule: (lead: Lead) => void;
}

const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-4">{children}</div>
);

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        rows={6}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const ContactLeadModal: React.FC<ContactLeadModalProps> = ({ lead, onClose, onSchedule }) => {
    const [activeTab, setActiveTab] = useState<'email' | 'call' | 'note'>('email');
    const [emailSubject, setEmailSubject] = useState(`Re: Your inquiry`);
    const [emailMessage, setEmailMessage] = useState(
`Hi ${lead.name.split(' ')[0]},

Thank you for your interest. I'd love to discuss this property with you and answer any questions you may have.

Would you be available for a quick call or showing?

Best regards,`
    );
    const [noteContent, setNoteContent] = useState('');


    const handleTabClick = (tab: 'email' | 'call' | 'note' | 'schedule') => {
        if (tab === 'schedule') {
            onSchedule(lead);
        } else {
            setActiveTab(tab);
            setNoteContent(''); // Reset note content when switching tabs
        }
    }

    const titleNode = (
        <div>
            <h3 className="text-xl font-bold text-slate-800">Contact {lead.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Log an interaction or schedule a follow-up</p>
        </div>
    );
    
    return (
        <Modal title={titleNode} onClose={onClose}>
            <div className="border-b border-slate-200">
                <nav className="flex items-center">
                    <TabButton isActive={activeTab === 'email'} onClick={() => handleTabClick('email')} icon='mail'>Email</TabButton>
                    <TabButton isActive={activeTab === 'call'} onClick={() => handleTabClick('call')} icon='call'>Log Call</TabButton>
                    <TabButton isActive={activeTab === 'note'} onClick={() => handleTabClick('note')} icon='edit_note'>Add Note</TabButton>
                    <TabButton isActive={false} onClick={() => handleTabClick('schedule')} icon='calendar_today'>Schedule</TabButton>
                </nav>
            </div>
            
            <div className="p-6">
                {activeTab === 'email' && (
                    <>
                        <FormRow>
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        </FormRow>
                        <FormRow>
                            <Label htmlFor="message">Message</Label>
                            <Textarea id="message" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} />
                        </FormRow>
                    </>
                )}
                 {activeTab === 'call' && (
                    <FormRow>
                        <Label htmlFor="note-content">Log Call Details</Label>
                        <Textarea 
                            id="note-content" 
                            value={noteContent} 
                            onChange={(e) => setNoteContent(e.target.value)} 
                            placeholder={`Log details about your call with ${lead.name}... e.g., "Left voicemail, will try again tomorrow."`}
                        />
                    </FormRow>
                 )}
                 {activeTab === 'note' && (
                    <FormRow>
                        <Label htmlFor="note-content">Add a Note</Label>
                        <Textarea 
                            id="note-content" 
                            value={noteContent} 
                            onChange={(e) => setNoteContent(e.target.value)} 
                            placeholder={`Add a private note for ${lead.name}...`}
                        />
                    </FormRow>
                 )}
            </div>

            <div className="flex justify-end items-center px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    {activeTab === 'email' && (
                        <button type="button" onClick={() => { alert('Email sent!'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">send</span>
                            <span>Send Email</span>
                        </button>
                    )}
                    {(activeTab === 'call' || activeTab === 'note') && (
                         <button type="button" onClick={() => { alert('Log saved!'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                            <span className="material-symbols-outlined w-5 h-5">save</span>
                            <span>Save Log</span>
                        </button>
                    )}
                </div>
        </Modal>
    );
};

export default ContactLeadModal;