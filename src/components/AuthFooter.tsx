import React from 'react';

export const AuthFooter: React.FC = () => {
    return (
        <footer className="bg-slate-800 text-slate-400">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <p className="text-sm">&copy; 2025 HomeListingAI. All rights reserved.</p>
                        <p className="text-xs mt-2">AI-powered real estate management platform</p>
                    </div>
                    <div className="col-span-1">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" 
                                   className="hover:text-white transition-colors">
                                    Terms of Service
                                </a>
                            </li>
                            <li>
                                <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" 
                                   className="hover:text-white transition-colors">
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a href="/refund-policy.html" target="_blank" rel="noopener noreferrer" 
                                   className="hover:text-white transition-colors">
                                    Refund Policy
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="col-span-1">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="mailto:support@homelistingai.com" 
                                   className="hover:text-white transition-colors">
                                    support@homelistingai.com
                                </a>
                            </li>
                            <li>
                                <a href="mailto:legal@homelistingai.com" 
                                   className="hover:text-white transition-colors">
                                    legal@homelistingai.com
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="col-span-1">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">Admin</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="#admin-dashboard" 
                                   className="hover:text-white transition-colors">
                                    Admin Dashboard
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};