
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
                            <li><a href="/#how-it-works" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                            <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                            <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Legal Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/compliance" className="hover:text-white transition-colors">Compliance Policy</Link></li>
                            <li><Link to="/marketing-guidelines" className="hover:text-white transition-colors">Marketing Guidelines</Link></li>
                            <li><Link to="/dmca" className="hover:text-white transition-colors">DMCA Policy</Link></li>
                        </ul>
                    </div>

                    {/* Company Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                            <li><a href="/admin" onClick={handleAdminClick} className="hover:text-white transition-colors">Admin</a></li>
                        </ul>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Contact</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="mailto:homelistingai@gmail.com" className="hover:text-white transition-colors">Email</a></li>
                            <li><a href="tel:9495994013" className="hover:text-white transition-colors">949-599-4013</a></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright Notice */}
                <div className="mt-12 border-t border-slate-700 pt-8 text-center">
                    <p className="text-sm text-slate-300">&copy; 2026 HomeListingAI. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};
