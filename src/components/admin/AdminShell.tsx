import React, { useMemo, useState } from 'react';

import AdminSidebar, { AdminNavItem } from '../AdminSidebar';
import { LogoWithName } from '../LogoWithName';
import type { View } from '../../types';

interface AdminShellProps {
  activeView: View;
  onNavigate: (view: View) => void;
  navItems: AdminNavItem[];
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const AdminShell: React.FC<AdminShellProps> = ({
  activeView,
  onNavigate,
  navItems,
  title,
  subtitle,
  headerActions,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTab = useMemo(() => navItems.find((item) => item.view === activeView), [activeView, navItems]);
  const resolvedTitle = title ?? activeTab?.label ?? 'Admin Dashboard';
  const resolvedSubtitle =
    subtitle ?? 'Admin-only control center aligned to the blueprint layout without touching agent routes.';

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar
        activeView={activeView}
        setView={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navItems={navItems}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="flex-1 flex justify-center">
            <LogoWithName />
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <div className="min-h-full space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Admin Workspace</p>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{resolvedTitle}</h1>
                {resolvedSubtitle && <p className="text-sm text-slate-600">{resolvedSubtitle}</p>}
              </div>
              {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
export type { AdminNavItem };
