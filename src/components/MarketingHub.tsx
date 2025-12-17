import React from 'react';
import { AgentProfile, Property } from '../types';

interface MarketingHubProps {
    agentProfile: AgentProfile;
    properties: Property[];
}

export const MarketingHub: React.FC<MarketingHubProps> = ({ agentProfile: _agentProfile, properties }) => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                        <span className="material-symbols-outlined text-2xl">campaign</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Marketing Hub</h2>
                        <p className="text-slate-500">Manage your social posts and ad campaigns</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2">Social Media Automations</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Connect your accounts to auto-post new listings.
                        </p>
                        <button className="text-indigo-600 font-medium text-sm hover:underline">
                            Configure Settings →
                        </button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2">Content Calendar</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Schedule upcoming posts and emails.
                        </p>
                        <button className="text-indigo-600 font-medium text-sm hover:underline">
                            View Calendar →
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Active Campaigns</h3>
                {properties.length > 0 ? (
                    <div className="space-y-4">
                        {properties.slice(0, 2).map((prop) => (
                            <div key={prop.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <img src={prop.imageUrl} alt={prop.address} className="w-12 h-12 rounded object-cover" />
                                    <div>
                                        <p className="font-medium text-slate-900 text-sm">{prop.address}</p>
                                        <p className="text-xs text-green-600 font-medium">Active • Facebook, Instagram</p>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">more_vert</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm text-center py-4">No active campaigns.</p>
                )}
            </div>
        </div>
    );
};
