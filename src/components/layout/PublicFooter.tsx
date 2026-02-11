
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PublicFooterProps {
    onNavigateToAdmin?: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigateToAdmin }) => {
    const navigate = useNavigate();

    const handleAdminClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onNavigateToAdmin) onNavigateToAdmin();
        else navigate('/admin');
    };

    return (
        <footer className="bg-slate-800 text-slate-400">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* HomeListingAI Section */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src="/newlogo.png"
                                alt="HomeListingAI Logo"
                                className="w-8 h-8 object-contain"
                            />
                            <span className="text-white font-semibold text-lg">HomeListingAI</span>
                        </div>
                        <p className="text-sm text-slate-300">Transform your real estate business with AI-powered lead generation.</p>
                    </div>

                    {/* Product Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/#what-you-get" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                            <li><a href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} className="hover:text-white transition-colors">Blog</a></li>
                        </ul>
                    </div>

                    {/* Legal Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/terms-of-service.html" target="_blank" className="hover:text-white transition-colors">Terms of Service</a></li>
                            <li><a href="/privacy-policy.html" target="_blank" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="/compliance" className="hover:text-white transition-colors">Compliance Policy</a></li>
                            <li><a href="/dmca" className="hover:text-white transition-colors">DMCA Policy</a></li>
                        </ul>
                    </div>

                    {/* Company Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/#about-us" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="/admin" onClick={handleAdminClick} className="hover:text-white transition-colors">Admin</a></li>
                        </ul>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Contact</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="mailto:us@homelistingai.com" className="hover:text-white transition-colors">us@homelistingai.com</a></li>
                            <li><span className="text-slate-300">Seattle, WA</span></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright Notice */}
                <div className="mt-12 border-t border-slate-700 pt-8 text-center">
                    <p className="text-sm text-slate-300">&copy; 2025 HomeListingAI. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};
