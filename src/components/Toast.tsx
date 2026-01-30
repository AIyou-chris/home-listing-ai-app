import React, { useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };

    const icons = {
        success: <Check className="w-5 h-5 text-white" />,
        error: <AlertCircle className="w-5 h-5 text-white" />,
        info: <Info className="w-5 h-5 text-white" />
    };

    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg shadow-black/10 text-white ${bgColors[type]} animate-in fade-in slide-in-from-bottom-5 duration-300`}>
            <div className="bg-white/20 p-1 rounded-full">
                {icons[type]}
            </div>
            <span className="font-medium text-sm">{message}</span>
            <button
                onClick={onClose}
                className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"
                aria-label="Close notification"
            >
                <X className="w-4 h-4 text-white" />
            </button>
        </div>
    );
};
