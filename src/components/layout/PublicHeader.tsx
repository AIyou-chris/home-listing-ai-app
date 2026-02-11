
import React from 'react';
import { LogoWithName } from '../LogoWithName';
import { useNavigate, useLocation } from 'react-router-dom';

interface PublicHeaderProps {
    onNavigateToSignUp?: () => void;
    onNavigateToSignIn?: () => void;
    onEnterDemoMode?: () => void;
    onNavigateToShowcase?: () => void;
    onOpenContact?: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
    onNavigateToSignUp,
    onNavigateToSignIn,
    onEnterDemoMode,
    onNavigateToShowcase,
    onOpenContact
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isHome = location.pathname === '/';

    const navLinks = [
        { name: "Price", href: "/#pricing" },
        { name: "Demo", href: "/#demo" },
        { name: "White Label", href: "/#white-label" },
        { name: "Contact", href: "/#contact" },
        { name: "Blog", href: "/blog" }
    ];

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
        e.preventDefault();

        // Handle specific actions
        if (targetHref === '/#demo') {
            if (onNavigateToShowcase) onNavigateToShowcase();
            else if (onEnterDemoMode) onEnterDemoMode();
            else navigate('/demo-dashboard'); // Fallback
            setIsMenuOpen(false);
            return;
        }

        if (targetHref === '/#contact') {
            if (onOpenContact) onOpenContact();
            else navigate('/#contact'); // Fallback
            setIsMenuOpen(false);
            return;
        }

        if (targetHref === '/blog') {
            navigate('/blog');
            setIsMenuOpen(false);
            return;
        }

        // Handle scroll or navigation
        if (targetHref.startsWith('/#')) {
            const targetId = targetHref.substring(2); // Remove /#
            if (isHome) {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                navigate(targetHref);
            }
        } else {
            navigate(targetHref);
        }
        setIsMenuOpen(false);
    };

    const handleLogin = () => {
        if (onNavigateToSignIn) onNavigateToSignIn();
        else navigate('/signin');
    };

    const handleSignUp = () => {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'click_signup_header', { event_category: 'engagement', event_label: 'header_desktop' });
        }
        if (onNavigateToSignUp) onNavigateToSignUp();
        else navigate('/signup');
    };

    return (
        <header className="absolute top-0 left-0 right-0 z-50 py-4 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="relative flex items-center justify-between">
                    <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center">
                        <LogoWithName />
                    </a>
                    <div className="hidden lg:flex lg:items-center lg:space-x-6">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                onClick={(e) => handleLinkClick(e, link.href)}
                                className={`text-sm font-semibold transition-colors ${location.pathname === link.href ? 'text-primary-600' : 'text-slate-700 hover:text-primary-600'}`}
                            >
                                {link.name}
                            </a>
                        ))}
                    </div>
                    <div className="hidden lg:flex items-center gap-4">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            🛡️ 30-Day Money-Back Guarantee
                        </span>
                        <button onClick={handleLogin} className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors">Login</button>
                        <button onClick={handleSignUp} className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-blue-700 transition-all">
                            Sign Up
                        </button>
                    </div>
                    <div className="lg:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-slate-600 hover:bg-slate-100">
                            <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </nav>
                {isMenuOpen && (
                    <div className="lg:hidden mt-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={(e) => handleLinkClick(e, link.href)} className="block px-3 py-2 text-base font-medium text-slate-700 rounded-md hover:bg-slate-50">
                                {link.name}
                            </a>
                        ))}
                        <div className="border-t border-slate-200 pt-4 space-y-2">
                            <button onClick={handleLogin} className="w-full text-left block px-3 py-2 text-base font-medium text-slate-700 rounded-md hover:bg-slate-50">Login</button>
                            <button onClick={handleSignUp} className="w-full text-left block px-3 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Sign Up</button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
