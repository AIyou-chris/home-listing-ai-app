import React from 'react';
import { LogoWithName } from './LogoWithName';
import { View } from '../types';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
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
  const isAiContentActive = viewName === 'ai-content' && (activeView === 'ai-content' || activeView === 'inbox');
  
  const isActive = activeView === viewName || isListingsActive || isLeadsActive || isAiContentActive;

  return (
    <button
      onClick={() => {
        setView(viewName);
        onClose();
      }}
      className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 font-semibold text-primary-700'
          : 'font-medium text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      <Icon name={icon} className={`transition-colors ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
      <span>{children}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, isOpen, onClose }) => {
  const navItems = [
    { view: 'dashboard', icon: 'home', label: 'Overview' },
    { view: 'leads', icon: 'groups', label: 'Leads & Appointments' },
    { view: 'listings', icon: 'storefront', label: 'Listings' },
    { view: 'ai-content', icon: 'forum', label: 'AI Content' },
    { view: 'knowledge-base', icon: 'description', label: 'Knowledge Base' },
    { view: 'marketing', icon: 'campaign', label: 'Marketing' },
    { view: 'settings', icon: 'settings', label: 'Settings' },
  ];
  
  const handleLogoClick = () => {
    setView('dashboard');
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
                 <button
                    onClick={handleLogoClick}
                    className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
                >
                    <LogoWithName />
                </button>
                 <button onClick={onClose} className="md:hidden p-1 rounded-full text-slate-500 hover:bg-slate-100">
                    <Icon name="close" />
                </button>
            </div>


            <nav className="flex-1 space-y-1">
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
            </nav>

            <div className="mt-auto flex flex-col space-y-2 border-t border-slate-200 pt-4">
                <button className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 transition-colors">
                    <Icon name="notifications" className="text-slate-500" />
                    <span>Notifications</span>
                </button>
            </div>
        </aside>
    </>
  );
};

export default Sidebar;


