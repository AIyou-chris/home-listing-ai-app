import React from 'react';
import Modal from './Modal';
import { AgentProfile } from '../types';

interface ContactModalProps {
    agent: AgentProfile;
    onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ agent, onClose }) => {
    return (
        <Modal
            onClose={onClose}
            title={
                <div>
                    <h3 className='text-xl font-bold text-slate-800'>Contact Agent</h3>
                    <p className='text-sm text-slate-500 mt-0.5'>Get in touch directly</p>
                </div>
            }
        >
            <div className="p-6 flex flex-col items-center text-center space-y-6">

                {/* Agent Profile */}
                <div className="flex flex-col items-center">
                    <img
                        src={agent.headshotUrl || 'https://via.placeholder.com/100'}
                        alt={agent.name}
                        className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-md object-cover mb-4"
                    />
                    <h4 className="text-xl font-bold text-slate-900">{agent.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">
                        {agent.title ? `${agent.title} • ` : ''}{agent.company}
                    </p>
                </div>

                {/* Contact Actions */}
                <div className="w-full space-y-3">
                    <a
                        href={`tel:${agent.phone}`}
                        className="flex items-center justify-center gap-3 w-full py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">call</span>
                        </div>
                        <div className="text-left">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</span>
                            <span className="block text-slate-900 font-semibold">{agent.phone || 'Unavailable'}</span>
                        </div>
                    </a>

                    <a
                        href={`mailto:${agent.email}`}
                        className="flex items-center justify-center gap-3 w-full py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">mail</span>
                        </div>
                        <div className="text-left">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email</span>
                            <span className="block text-slate-900 font-semibold">{agent.email || 'Unavailable'}</span>
                        </div>
                    </a>
                </div>

            </div>
        </Modal>
    );
};

export default ContactModal;
