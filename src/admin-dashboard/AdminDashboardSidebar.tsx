import React from 'react';
import { LogoWithName } from '../components/LogoWithName';
import { adminAuthService } from '../services/adminAuthService';
import { NAV_GROUPS, groupFor } from './adminNav';

type DashboardView =
  | 'today'
  | 'dashboard'
  | 'leads'
  | 'ai-card'
  | 'ai-conversations'
  | 'listings'
  | 'knowledge-base'
  | 'settings'
  | 'inbox'
  | 'property'
  | 'add-listing'
  | 'ai-card-builder'
  | 'marketing-funnels'
  | 'users'
  | 'broadcast'
  | 'blog'
  | 'white-label'
  | 'lo-platform';

interface AdminDashboardSidebarProps {
  activeView: DashboardView;
  setView: (view: DashboardView) => void;
  isOpen: boolean;
  onClose: () => void;
  isDesktop: boolean;
  badgeCounts?: Partial<Record<DashboardView, number>>;
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const NavItem: React.FC<{
  viewName: DashboardView;
  activeView: DashboardView;
  setView: (view: DashboardView) => void;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
  badge?: number;
  active: boolean;
}> = ({ viewName, setView, icon, children, onClose, badge, active }) => {
  const isActive = active;

  return (
    <button
      onClick={() => {
        setView(viewName);
        onClose();
      }}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200 ${isActive ? 'bg-primary-600 font-semibold text-white shadow-sm' : 'font-medium text-slate-600 hover:bg-slate-100'
        }`}
    >
      <Icon name={icon} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
      <span>{children}</span>
      {badge ? (
        <span aria-label={`${badge} waiting`} className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'bg-white text-primary-700' : 'bg-red-500 text-white'}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
};

const AdminDashboardSidebar: React.FC<AdminDashboardSidebarProps> = ({ activeView, setView, isOpen, onClose, isDesktop, badgeCounts }) => {
  const navItems = NAV_GROUPS.map((g) => ({
    view: g.tabs[0].view,
    icon: g.icon,
    label: g.label,
    active: groupFor(activeView).id === g.id,
    badge: g.tabs.reduce((n, t) => n + (badgeCounts?.[t.view] || 0), 0)
  }));

  const handleLogoClick = () => {
    setView('dashboard');
    onClose();
  };

  const asideStyle: React.CSSProperties = isDesktop
    ? { position: 'relative', flexShrink: 0, transform: 'none' }
    : { position: 'fixed', top: 0, left: 0, bottom: 0, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' };

  return (
    <>
      {!isDesktop && (
        <div
          className={`fixed inset-0 bg-black/50 z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className="z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-300 ease-in-out"
        style={asideStyle}
      >
        <div className="flex justify-between items-center px-2 mb-6">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); handleLogoClick(); }}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
          >
            <LogoWithName />
          </a>
          {!isDesktop && (
            <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100">
              <Icon name="close" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm divide-y divide-slate-200">
            {navItems.map((item) => (
              <NavItem
                key={item.view}
                viewName={item.view as DashboardView}
                activeView={activeView}
                active={item.active}
                setView={setView}
                icon={item.icon}
                onClose={onClose}
                badge={item.badge}
              >
                {item.label}
              </NavItem>
            ))}
          </div>
        </nav>

        <div className="mt-auto flex flex-col space-y-2 border-t border-slate-200 pt-4">
          <button
            onClick={async () => {
              console.log("🚪 Sign Out Clicked");
              try {
                await adminAuthService.logout();
              } catch (e) { console.error("Logout err", e); }
              // Force redirect regardless of service success
              window.location.href = '/signin';
            }}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Icon name="logout" className="text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminDashboardSidebar;
