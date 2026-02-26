import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoWithName } from './LogoWithName';

export const NotFound: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-[#02050D] flex flex-col items-center justify-center font-sans text-center px-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="mb-8 cursor-pointer transform hover:scale-105 transition-transform" onClick={() => navigate('/')}>
                    <LogoWithName />
                </div>
                <h1 className="text-8xl font-extrabold text-white tracking-tighter mb-4">404</h1>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">Page Not Found</h2>
                <p className="text-slate-400 max-w-lg mb-10 text-lg">
                    The page you are looking for doesn't exist or has been moved. We've captured the bad link, but let's get you back on track.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 group border border-blue-500"
                >
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
                    Back to Home
                </button>
            </div>
        </div>
    );
};
