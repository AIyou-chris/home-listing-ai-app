import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogoWithName } from './LogoWithName';
import { adminAuthService } from '../services/adminAuthService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
}

const NAV_ITEMS = [
  { key: 'today', icon: 'today', label: 'Today', path: '/today', testid: 'nav-today' },
  { key: 'command-center', icon: 'space_dashboard', label: 'Command Center', path: '/command-center', testid: 'nav-command-center' },
  { key: 'listings', icon: 'storefront', label: 'Listings', path: '/listings', testid: 'nav-listings' },
  { key: 'leads', icon: 'groups', label: 'Leads', path: '/leads', testid: 'nav-leads' },
  { key: 'appointments', icon: 'event_available', label: 'Appointments', path: '/appointments', testid: 'nav-appointments' },
  { key: 'settings', icon: 'settings', label: 'Settings', path: '/settings', testid: 'nav-settings' }
] as const;

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const NavItem: React.FC<{
  to: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
  testid?: string;
}> = ({ to, icon, children, onClose, testid }) => {
  return (
    <NavLink
      to={to}
      data-testid={testid}
      onClick={onClose}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200 ${
          isActive ? 'bg-primary-600 font-semibold text-white shadow-sm' : 'font-medium text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <Icon name={icon} className="transition-colors" />
      <span>{children}</span>
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDemoMode = false, isBlueprintMode = false }) => {
  const location = useLocation();
  const derivedDemoMode = isDemoMode || location.pathname.startsWith('/demo-dashboard');
  const derivedBlueprintMode = isBlueprintMode || location.pathname.startsWith('/agent-blueprint-dashboard') || location.pathname.startsWith('/blueprint-dashboard');

  // New blueprint dashboard uses /blueprint-dashboard; legacy uses /agent-blueprint-dashboard
  const blueprintBase = location.pathname.startsWith('/blueprint-dashboard') ? '/blueprint-dashboard' : '/agent-blueprint-dashboard';
  const basePath = derivedBlueprintMode ? blueprintBase : derivedDemoMode ? '/demo-dashboard' : '';

  const getPath = (path: string) => `${basePath}${path}`;
  const pathMap: Record<string, string> = {
    '/today': derivedDemoMode || derivedBlueprintMode ? getPath('/today') : '/dashboard/today',
    '/command-center': derivedDemoMode || derivedBlueprintMode ? getPath('/command-center') : '/dashboard/command-center',
    '/listings': derivedDemoMode || derivedBlueprintMode ? getPath('/listings') : '/dashboard/listings',
    '/leads': derivedDemoMode || derivedBlueprintMode ? getPath('/leads') : '/dashboard/leads',
    '/appointments': derivedDemoMode || derivedBlueprintMode ? getPath('/appointments') : '/dashboard/appointments',
    '/settings': derivedDemoMode || derivedBlueprintMode ? getPath('/settings') : '/dashboard/settings'
  };
  const visibleNavItems = derivedDemoMode && !derivedBlueprintMode
    ? NAV_ITEMS.filter((item) => item.key !== 'settings')
    : NAV_ITEMS;

  const handleLogoClick = () => {
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)'
        }}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <a
            href={derivedBlueprintMode ? '/agent-blueprint-dashboard/today' : derivedDemoMode ? '/demo-dashboard/today' : '/dashboard/today'}
            onClick={handleLogoClick}
            className="group rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <LogoWithName />
            {!derivedDemoMode && !derivedBlueprintMode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-600">
                  Trial Mode
                </span>
                <span className="text-[10px] font-medium text-slate-400">Active Trial</span>
              </div>
            )}
          </a>
          <button onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {visibleNavItems.map((item) => (
              <NavItem key={item.key} to={pathMap[item.path]} icon={item.icon} onClose={onClose} testid={item.testid}>
                {item.label}
              </NavItem>
            ))}
          </div>

          {!derivedDemoMode && !derivedBlueprintMode && (
            <div className="mt-auto border-t border-slate-100 px-2 pb-6 pt-4">
              <button
                onClick={() => adminAuthService.logout()}
                className="hidden w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 lg:flex"
              >
                <Icon name="logout" className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {derivedDemoMode && !derivedBlueprintMode && (
            <div className="mt-auto hidden space-y-3 pt-6 lg:block">
              <div className="px-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Demo Mode</p>
                  <div className="space-y-2">
                    <a
                      href="/"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Back to Home
                    </a>
                    <a
                      href="/#signup"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                    >
                      <span className="material-symbols-outlined text-lg">rocket_launch</span>
                      Start Your App
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
