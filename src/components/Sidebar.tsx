import React from 'react';
import { LogoWithName } from './LogoWithName';
import { adminAuthService } from '../services/adminAuthService';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);


const NavItem: React.FC<{
  viewName: View;
  activeView: View;
  setView: (view: View) => void;
  icon: string;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ viewName, activeView, setView, icon, children, onClose }) => {
  const isListingsActive = viewName === 'listings' && (activeView === 'listings' || activeView === 'property' || activeView === 'add-listing');
  const isLeadsActive = viewName === 'leads' && activeView === 'leads';
  const isAiCardActive = viewName === 'ai-card' && (activeView === 'ai-card' || activeView === 'inbox');

  const isActive = activeView === viewName || isListingsActive || isLeadsActive || isAiCardActive;

  return (
    <button
      onClick={() => {
        setView(viewName);
        onClose();
      }}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200 ${isActive
        ? 'bg-primary-600 font-semibold text-white shadow-sm'
        : 'font-medium text-slate-600 hover:bg-slate-100'
        }`}
    >
      <Icon name={icon} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
      <span>{children}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, isOpen, onClose, isDemoMode = false, isBlueprintMode = false }) => {
  const [isAiToolsOpen, setIsAiToolsOpen] = React.useState(false);

  const primaryItems = [
    { view: 'dashboard', icon: 'home', label: 'My Daily Pulse' },
    { view: 'leads', icon: 'groups', label: 'Leads & Appointments' },
  ];

  const aiToolsItems = [
    { view: 'ai-card', icon: 'badge', label: 'AI Business Card' },
    { view: 'knowledge-base', icon: 'smart_toy', label: 'AI Agent Buddy' },
    { view: 'listings', icon: 'storefront', label: 'AI Listings' },

  ];

  const communicationItems = [
    { view: 'ai-interaction-hub', icon: 'bolt', label: 'AI Communication' },
  ];

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('landing');
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new Event('popstate'));
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
            fixed inset-y-0 left-0 z-40 h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6
            transform transition-transform duration-300 ease-in-out
            md:static md:flex md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
        <div className="flex justify-between items-center px-2 mb-6">
          <a
            href="/"
            onClick={handleLogoClick}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
          >
            <LogoWithName />
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
                key={item.view}
                viewName={item.view as View}
                activeView={activeView}
                setView={setView}
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
                      key={item.view}
                      viewName={item.view as View}
                      activeView={activeView}
                      setView={setView}
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
                viewName="funnel-analytics"
                activeView={activeView}
                setView={setView}
                icon="monitoring"
                onClose={onClose}
              >
                AI Funnels
              </NavItem>
            </div>

            {/* AI Communication */}
            <div className="border-t border-slate-100">
              {communicationItems.map((item) => (
                <NavItem
                  key={item.view}
                  viewName={item.view as View}
                  activeView={activeView}
                  setView={setView}
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
                viewName="settings"
                activeView={activeView}
                setView={setView}
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
