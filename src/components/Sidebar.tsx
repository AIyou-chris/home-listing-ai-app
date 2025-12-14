import React from 'react';
import { LogoWithName } from './LogoWithName';
import { adminAuthService } from '../services/adminAuthService';
import { supabase } from '../services/supabase';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
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

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, isOpen, onClose, isDemoMode = false }) => {
  const navItems = [
    { view: 'dashboard', icon: 'home', label: 'Overview' },
    { view: 'leads', icon: 'groups', label: 'Leads & Appointments' },
    { view: 'ai-card', icon: 'badge', label: 'AI Card' },
    { view: 'ai-conversations', icon: 'chat_bubble', label: 'AI Conversations' },
    { view: 'listings', icon: 'storefront', label: 'AI Listings' },
    { view: 'knowledge-base', icon: 'smart_toy', label: 'AI Sidekicks' },
    { view: 'marketing-reports', icon: 'description', label: 'Marketing Reports' },
    { view: 'funnel-analytics', icon: 'monitoring', label: 'Leads Funnel' },
    { view: 'settings', icon: 'settings', label: 'Settings' },
  ];

  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // const token = (await supabase.auth.getSession()).data.session?.access_token; // Not using token yet, simple CORS

      // Use the live API URL or current origin?
      // Since backend serves frontend, relative path works.
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_1SeMLsGtlY59RT0yAVUe2vTJ',
          successUrl: window.location.origin + '/dashboard?payment=success',
          cancelUrl: window.location.origin + '/dashboard?payment=cancelled',
          userId: user?.id,
          email: user?.email
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to initialize checkout. ' + (data.error || ''));
      }
    } catch (e) {
      console.error(e);
      alert('Connection error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setView('landing');
    window.location.hash = 'landing';
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


        <nav className="flex-1 flex flex-col">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm divide-y divide-slate-200">
            {navItems.map((item) => (
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

          {!isDemoMode && (
            <div className="mt-auto px-2 pb-6 border-t border-slate-100 pt-4">
              {/* UPGRADE BUTTON */}
              <button
                disabled={checkoutLoading}
                onClick={handleSubscribe}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-md transition-all mb-4"
              >
                <Icon name={checkoutLoading ? "sync" : "diamond"} className={checkoutLoading ? "animate-spin" : ""} />
                <span>{checkoutLoading ? 'Loading...' : 'Upgrade to Pro'}</span>
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('adminUser', 'true');
                  window.location.hash = 'admin-dashboard';
                  window.location.reload();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors mb-2"
              >
                <Icon name="admin_panel_settings" className="text-slate-500" />
                <span>Switch to Admin</span>
              </button>

              <button
                onClick={() => adminAuthService.logout()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Icon name="logout" className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {isDemoMode && (
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
