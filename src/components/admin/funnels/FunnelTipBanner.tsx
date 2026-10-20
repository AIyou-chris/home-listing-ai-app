import React from 'react';
import PageTipBanner from '../../PageTipBanner';

const FunnelTipBanner: React.FC = () => (
    <div className="mb-8 px-4 md:px-0">
                <PageTipBanner
                    pageKey="ai-funnels"
                    expandedContent={
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">🚀 Power Up Your AI Funnels:</h4>
                                <ul className="space-y-2 text-slate-700">
                                    <li className="flex items-start">
                                        <span className="mr-2">✏️</span>
                                        <span><strong>Complete Control:</strong> Edit any step to customize the voice. You can mix emails, texts, and task reminders to build the perfect nurturing journey.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">💬</span>
                                        <span><strong>Multi-Channel Magic:</strong> Don't just email. Set up automated text sequences that feel personal, triggering real conversations that the AI takes over instantly.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">🔄</span>
                                        <span><strong>Smart Follow-Ups:</strong> Configure specific time delays (2 days, 1 week) so your leads hear from you exactly when it counts, running 24/7 in the background.</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-semibold text-blue-900 mb-2">💎 Why It Works:</h4>
                                <p className="text-blue-800">
                                    Most agents give up after 2 attempts. These AI funnels persist indefinitely, turning cold leads warm and booking appointments automatically so you wake up to a booked calendar.
                                </p>
                            </div>
                        </div>
                    }
                />
    </div>
);

export default FunnelTipBanner;
