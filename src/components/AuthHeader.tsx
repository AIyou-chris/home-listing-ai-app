import React from 'react';
import { LogoWithName } from './LogoWithName';

interface AuthHeaderProps {
  onNavigateToSignUp: () => void;
  onNavigateToSignIn: () => void;
  onNavigateToLanding: () => void;
  onNavigateToSection: (sectionId: string) => void;
  onEnterDemoMode: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ onNavigateToSignUp, onNavigateToSignIn, onNavigateToLanding, onNavigateToSection, onEnterDemoMode }) => {
    const navLinks = [
        { name: "Features", href: "#what-you-get" },
        { name: "Comparison", href: "#comparison" },
        { name: "Pricing", href: "#pricing" },
        { name: "About", href: "#about" },
        { name: "Contact", href: "#contact" }
    ];

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <button onClick={onNavigateToLanding} className="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg">
                        <LogoWithName />
                    </button>
                    <div className="hidden lg:flex lg:items-center lg:space-x-6">
                        {navLinks.map(link => (
                            <button 
                                key={link.name} 
                                onClick={() => onNavigateToSection(link.href)} 
                                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                {link.name}
                            </button>
                        ))}
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:space-x-2">
                        <button onClick={onEnterDemoMode} className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-md hover:bg-slate-100 transition-colors">Demo</button>
                        <button onClick={onNavigateToSignUp} className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-md hover:bg-slate-100 transition-colors">Sign Up</button>
                        <button onClick={onNavigateToSignIn} className="px-4 py-2 bg-slate-800 text-white font-semibold text-sm rounded-md shadow-sm hover:bg-slate-900 transition-colors">
                            Login
                        </button>
                    </div>
                    {/* Mobile menu button can be added here if needed */}
                </div>
            </div>
        </header>
    );
};
