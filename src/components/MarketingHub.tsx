import React from 'react';
import PageTipBanner from './PageTipBanner';
import { AgentProfile, Property } from '../types';

interface MarketingHubProps {
    agentProfile: AgentProfile;
    properties: Property[];
}

export const MarketingHub: React.FC<MarketingHubProps> = ({ agentProfile: _agentProfile, properties }) => {
    return (
        <div className="space-y-6">
            <div className="px-4 sm:px-0">
                <PageTipBanner
                    pageKey="marketing"
                    expandedContent={
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">📣 Amplify Your Reach:</h4>
                                <ul className="space-y-2 text-slate-700">
                                    <li className="flex items-start">
                                        <span className="mr-2">🚀</span>
                                        <span><strong>Auto-Promote:</strong> New listings are automatically posted to your connected social channels (Facebook, Instagram, LinkedIn).</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">📅</span>
                                        <span><strong>Smart Calendar:</strong> The AI schedules posts for optimal engagement times so you stay top-of-mind without lifting a finger.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">📧</span>
                                        <span><strong>Email Campaings:</strong> Send "Just Listed" or "Open House" blasts to your lead database instantly.</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
                                <h4 className="font-semibold text-purple-900 mb-2">💡 Pro Tip:</h4>
                                <p className="text-purple-800">
                                    Check "Active Campaigns" below to see which properties are currently being promoted and how they are performing.
                                </p>
                            </div>
                        </div>
                    }
                />
            </div>
            <div className="bg-white p-6 rounded-none md:rounded-xl border-y md:border border-slate-200 shadow-sm">
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

            <div className="bg-white p-6 rounded-none md:rounded-xl border-y md:border border-slate-200 shadow-sm">
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
