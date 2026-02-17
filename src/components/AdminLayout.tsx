
import React, { ReactNode } from 'react';

interface AdminLayoutProps {
    children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    return (
        <div className="admin-layout min-h-screen bg-slate-50">
            {children}
        </div>
    );
};

export default AdminLayout;
