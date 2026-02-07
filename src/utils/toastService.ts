import { toast } from 'react-hot-toast';

/**
 * Robust notification service to replace flickering banners.
 * Styled as requested: Center/Lower-center, rounded, green/red, 3s duration.
 */
export const showToast = {
    success: (message: string) => {
        toast.success(message, {
            duration: 3000,
            position: 'bottom-center',
            style: {
                background: '#10b981', // emerald-500
                color: '#fff',
                padding: '16px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '300px',
                textAlign: 'center',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
            },
        });
    },
    error: (message: string) => {
        toast.error(message, {
            duration: 4000,
            position: 'bottom-center',
            style: {
                background: '#ef4444', // rose-500
                color: '#fff',
                padding: '16px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '300px',
                textAlign: 'center',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
            },
        });
    },
    info: (message: string) => {
        toast(message, {
            duration: 3000,
            position: 'bottom-center',
            style: {
                background: '#3b82f6', // blue-500
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '10px',
                fontWeight: '500',
            },
        });
    }
};

// For debugging in console
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).showToast = showToast;
