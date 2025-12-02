import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ImpersonationContextType {
    impersonatedUserId: string | null;
    isImpersonating: boolean;
    impersonate: (userId: string) => void;
    stopImpersonating: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'hlai_impersonated_user_id';

export const ImpersonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
        return localStorage.getItem(STORAGE_KEY);
    });

    const impersonate = (userId: string) => {
        setImpersonatedUserId(userId);
        localStorage.setItem(STORAGE_KEY, userId);
    };

    const stopImpersonating = () => {
        setImpersonatedUserId(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <ImpersonationContext.Provider
            value={{
                impersonatedUserId,
                isImpersonating: !!impersonatedUserId,
                impersonate,
                stopImpersonating
            }}
        >
            {children}
        </ImpersonationContext.Provider>
    );
};

export const useImpersonation = () => {
    const context = useContext(ImpersonationContext);
    if (context === undefined) {
        throw new Error('useImpersonation must be used within an ImpersonationProvider');
    }
    return context;
};
