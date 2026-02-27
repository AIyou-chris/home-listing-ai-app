import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogoWithName } from './LogoWithName';
import { adminAuthService } from '../services/adminAuthService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);


const NavItem: React.FC<{
  to: string;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ to, icon, children, onClose }) => {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => `flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200 ${isActive
        ? 'bg-primary-600 font-semibold text-white shadow-sm'
        : 'font-medium text-slate-600 hover:bg-slate-100'
        }`}
    >
      <Icon name={icon} className="transition-colors" />
      <span>{children}</span>
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDemoMode = false, isBlueprintMode = false }) => {
  const [isAiToolsOpen, setIsAiToolsOpen] = React.useState(false);

  // BASE PATH LOGIC FOR BLUEPRINT AND DEMO
  const basePath = isBlueprintMode ? '/agent-blueprint-dashboard' : (isDemoMode ? '/demo-dashboard' : '');

  const getPath = (path: string) => `${basePath}${path}`;
  const commandCenterPath = isDemoMode || isBlueprintMode ? getPath('/daily-pulse') : '/dashboard';
  const leadsPath = isDemoMode || isBlueprintMode ? getPath('/leads') : '/dashboard/leads';
  const appointmentsPath = isDemoMode || isBlueprintMode ? getPath('/leads') : '/dashboard/appointments';
  const billingPath = isDemoMode || isBlueprintMode ? getPath('/settings') : '/dashboard/billing';
  const onboardingPath = isDemoMode || isBlueprintMode ? getPath('/daily-pulse') : '/dashboard/onboarding';

  const primaryItems = [
    { to: commandCenterPath, icon: 'home', label: 'My Daily Pulse' },
    { to: leadsPath, icon: 'groups', label: 'Leads & Appointments' },
    ...(!(isDemoMode || isBlueprintMode)
      ? [{ to: appointmentsPath, icon: 'event_available', label: 'Appointments' }]
      : [])
    ,
    ...(!(isDemoMode || isBlueprintMode)
      ? [{ to: billingPath, icon: 'credit_card', label: 'Billing' }]
      : []),
    ...(!(isDemoMode || isBlueprintMode)
      ? [{ to: onboardingPath, icon: 'checklist', label: 'Launch Checklist' }]
      : [])
  ];

  const aiToolsItems = [
    { to: getPath('/ai-card'), icon: 'badge', label: 'AI Business Card' },
    { to: getPath('/ai-agent'), icon: 'smart_toy', label: 'AI Agent' },
    { to: getPath('/listings'), icon: 'storefront', label: 'AI Listings' },
    { to: getPath('/listings-v2'), icon: 'auto_awesome', label: 'Listings Studio V2' },
  ];

  const communicationItems = [
    { to: getPath('/inbox'), icon: 'bolt', label: 'AI Communication' },
  ];

  const handleLogoClick = () => {
    // Rely on router for native behavior, or keep close logic
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`
            fixed inset-y-0 left-0 z-40 h-full w-64 flex flex-col border-r border-slate-200 bg-white px-4 py-6
            transform transition-transform duration-300 ease-in-out
            md:static md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
        <div className="flex justify-between items-center px-2 mb-6">
          <a
            href={isBlueprintMode ? "/agent-blueprint-dashboard" : "/"}
            onClick={handleLogoClick}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg group"
          >
            <LogoWithName />
            {!isDemoMode && !isBlueprintMode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tight">
                  Trial Mode
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Active Trial</span>
              </div>
            )}
          </a>
          <button onClick={onClose} className="md:hidden p-1 rounded-full text-slate-500 hover:bg-slate-100">
            <Icon name="close" />
          </button>
        </div>


        <nav className="flex-1 flex flex-col gap-4">
          {/* Primary Section */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
            {/* Top Items */}
            {primaryItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                onClose={onClose}
              >
                {item.label}
              </NavItem>
            ))}

            {/* AI Tools Expandable Section */}
            <div className="border-t border-slate-100">
              <button
                onClick={() => setIsAiToolsOpen(!isAiToolsOpen)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon name="construction" className="text-slate-400" />
                  <span>AI Tools</span>
                </div>
                <Icon name={isAiToolsOpen ? 'expand_less' : 'expand_more'} className="text-slate-400" />
              </button>

              {isAiToolsOpen && (
                <div className="divide-y divide-slate-100 bg-slate-50/50">
                  {aiToolsItems.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      onClose={onClose}
                    >
                      {item.label}
                    </NavItem>
                  ))}
                </div>
              )}
            </div>

            {/* AI Funnels (Top Level) */}
            <div className="border-t border-slate-100">
              <NavItem
                to={getPath("/funnel-analytics")}
                icon="monitoring"
                onClose={onClose}
              >
                AI Funnels
              </NavItem>
            </div>

            {/* Marketing Hub */}
            <div className="border-t border-slate-100">
              <NavItem
                to={getPath("/marketing")}
                icon="campaign"
                onClose={onClose}
              >
                Marketing Hub
              </NavItem>
            </div>

            {/* AI Communication */}
            <div className="border-t border-slate-100">
              {communicationItems.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  onClose={onClose}
                >
                  {item.label}
                </NavItem>
              ))}
            </div>

            {/* Settings (Formerly Systems) */}
            <div className="border-t border-slate-100">
              <NavItem
                to={getPath("/settings")}
                icon="settings"
                onClose={onClose}
              >
                Settings
              </NavItem>
            </div>
          </div>

          {!isDemoMode && (
            <div className="mt-auto px-2 pb-6 border-t border-slate-100 pt-4">
              {/* UPGRADE BUTTON */}




              <button
                onClick={() => adminAuthService.logout()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Icon name="logout" className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {isDemoMode && !isBlueprintMode && (
            <div className="mt-auto pt-6 space-y-3">
              <div className="px-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Demo Mode</p>
                  <div className="space-y-2">
                    <a
                      href="/"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Back to Home
                    </a>
                    <a
                      href="/#signup"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
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
