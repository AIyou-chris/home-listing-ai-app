import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogoWithName } from './LogoWithName';
import { adminAuthService } from '../services/adminAuthService';
import { fetchOnboardingState } from '../services/onboardingService';
import { authHeaders } from '../services/dashboard/utils';
import { buildApiUrl } from '../lib/api';
import { AI_POWER_EVENT } from './dashboard-command/AiPowerSwitch';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  isBlueprintMode?: boolean;
}

// Desktop = viewport >= 1280px. Sidebar is static (always visible).
// Mobile/tablet = viewport < 1280px. Sidebar is a fixed overlay controlled by isOpen.
const DESKTOP_WIDTH = 1280;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_WIDTH : true);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= DESKTOP_WIDTH);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
}

const REALTOR_NAV_ITEMS = [
  { key: 'today', icon: 'today', label: 'Today', path: '/today', testid: 'nav-today' },
  { key: 'listings', icon: 'storefront', label: 'Listings', path: '/listings', testid: 'nav-listings' },
  { key: 'leads', icon: 'groups', label: 'Leads', path: '/leads', testid: 'nav-leads' },
  { key: 'appointments', icon: 'event_available', label: 'Appointments', path: '/appointments', testid: 'nav-appointments' },
  { key: 'settings', icon: 'settings', label: 'Settings', path: '/settings', testid: 'nav-settings' }
] as const;

const LO_NAV_ITEMS = [
  { key: 'lo-today', icon: 'today', label: 'Today', path: '/lo-today', testid: 'nav-today' },
  { key: 'lo-partners', icon: 'handshake', label: 'Partners', path: '/lo-partners', testid: 'nav-lo-partners' },
  { key: 'lo-listings', icon: 'storefront', label: 'Listings', path: '/lo-listings', testid: 'nav-lo-listings' },
  { key: 'lo-chatbot', icon: 'psychology', label: 'AI Brain', path: '/lo-chatbot', testid: 'nav-lo-chatbot' },
  { key: 'lo-leads', icon: 'person_search', label: 'Leads', path: '/lo-leads', testid: 'nav-lo-leads' },
  { key: 'lo-appointments', icon: 'event_available', label: 'Appointments', path: '/lo-appointments', testid: 'nav-lo-appointments' },
  { key: 'settings', icon: 'settings', label: 'Settings', path: '/settings', testid: 'nav-settings' }
] as const;

const OFFICE_NAV_ITEMS = [
  { key: 'office', icon: 'corporate_fare', label: 'Office', path: '/office', testid: 'nav-office' },
  { key: 'settings', icon: 'settings', label: 'Settings', path: '/settings', testid: 'nav-settings' }
] as const;

// The loan officer's AI on/off, visible on every page. Stays in sync with the switch on the Listings page.
const AiPowerChip: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { headers: await authHeaders(null) });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOn(data.is_active !== false);
      } catch { /* chip stays hidden if the brain can't be reached */ }
    })();
    const sync = (e: Event) => setOn(Boolean((e as CustomEvent<{ on: boolean }>).detail?.on));
    window.addEventListener(AI_POWER_EVENT, sync);
    return () => { cancelled = true; window.removeEventListener(AI_POWER_EVENT, sync); };
  }, []);

  if (on === null) return null;

  const flip = async () => {
    if (saving) return;
    const next = !on;
    setOn(next);
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/lo/chatbot-config'), { method: 'PUT', headers: await authHeaders(null), body: JSON.stringify({ is_active: next }) });
      if (!res.ok) throw new Error('save_failed');
      window.dispatchEvent(new CustomEvent(AI_POWER_EVENT, { detail: { on: next } }));
    } catch {
      setOn(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mb-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${on ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${on ? 'bg-emerald-600' : 'bg-rose-600'}`} aria-hidden="true" />
      <button type="button" onClick={() => { onNavigate(); navigate('/dashboard/lo-chatbot'); }} className="min-w-0 flex-1 text-left" aria-label="Open AI Brain">
        <span className={`block text-sm font-bold ${on ? 'text-emerald-900' : 'text-rose-900'}`}>My AI is {on ? 'ON' : 'OFF'}</span>
        <span className="block truncate text-xs text-slate-600">{on ? 'Answering buyers 24/7' : 'Buyers come straight to you'}</span>
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="My AI"
        disabled={saving}
        onClick={() => void flip()}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-70 ${on ? 'bg-emerald-600' : 'bg-rose-500'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
};

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
          isActive ? 'font-semibold text-white shadow-sm' : 'font-medium text-slate-600 hover:bg-slate-100'
        }`
      }
      style={({ isActive }) => isActive ? { backgroundColor: 'var(--brand-primary, #2563eb)' } : undefined}
    >
      <Icon name={icon} className="transition-colors" />
      <span>{children}</span>
    </NavLink>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDemoMode = false, isBlueprintMode = false }) => {
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const derivedDemoMode = isDemoMode || location.pathname.startsWith('/demo-dashboard');
  const derivedBlueprintMode = isBlueprintMode || location.pathname.startsWith('/agent-blueprint-dashboard') || location.pathname.startsWith('/blueprint-dashboard');
  const ACCT_KEY = 'hla_account_type';
  const [accountType, setAccountType] = useState<string>(
    () => localStorage.getItem(ACCT_KEY) || 'realtor'
  );

  useEffect(() => {
    fetchOnboardingState()
      .then(s => {
        const t = s?.account_type || 'realtor';
        localStorage.setItem(ACCT_KEY, t);
        setAccountType(t);
      })
      .catch(() => {/* keep cached value */});
  }, []);

  // Auto-close when screen grows to desktop (not needed, but close when shrinking)
  useEffect(() => {
    if (!isDesktop) return;
    // Don't call onClose when switching to desktop — sidebar auto-shows via CSS
  }, [isDesktop, onClose]);

  // In demo/blueprint mode there's no logged-in account, so accountType defaults
  // to 'realtor'. Detect the LO/office context from the URL so the correct nav shows.
  const pathIsLO = /\/lo-(today|partners|listings|chatbot|leads|appointments|onboarding)/.test(location.pathname);
  const pathIsOffice = /\/office(\/|$)/.test(location.pathname);
  const isLO = accountType === 'lo' || pathIsLO;
  const isOffice = accountType === 'office' || pathIsOffice;

  const blueprintBase = location.pathname.startsWith('/blueprint-dashboard') ? '/blueprint-dashboard' : '/agent-blueprint-dashboard';
  const basePath = derivedBlueprintMode ? blueprintBase : derivedDemoMode ? '/demo-dashboard' : '';

  const getPath = (path: string) => `${basePath}${path}`;
  const pathMap: Record<string, string> = {
    '/today': derivedDemoMode || derivedBlueprintMode ? getPath('/today') : '/dashboard/today',
    '/lo-today': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-today') : '/dashboard/lo-today',
    '/command-center': derivedDemoMode || derivedBlueprintMode ? getPath('/command-center') : '/dashboard/command-center',
    '/listings': derivedDemoMode || derivedBlueprintMode ? getPath('/listings') : '/dashboard/listings',
    '/lo-listings': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-listings') : '/dashboard/lo-listings',
    '/lo-partners': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-partners') : '/dashboard/lo-partners',
    '/lo-chatbot': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-chatbot') : '/dashboard/lo-chatbot',
    '/lo-leads': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-leads') : '/dashboard/lo-leads',
    '/lo-appointments': derivedDemoMode || derivedBlueprintMode ? getPath('/lo-appointments') : '/dashboard/lo-appointments',
    '/office': derivedDemoMode || derivedBlueprintMode ? getPath('/office') : '/dashboard/office',
    '/leads': derivedDemoMode || derivedBlueprintMode ? getPath('/leads') : '/dashboard/leads',
    '/appointments': derivedDemoMode || derivedBlueprintMode ? getPath('/appointments') : '/dashboard/appointments',
    '/settings': derivedDemoMode || derivedBlueprintMode ? getPath('/settings') : '/dashboard/settings'
  };

  const activeNavItems = isOffice ? OFFICE_NAV_ITEMS : isLO ? LO_NAV_ITEMS : REALTOR_NAV_ITEMS;
  const visibleNavItems = derivedDemoMode && !derivedBlueprintMode
    ? activeNavItems.filter((item) => item.key !== 'settings')
    : activeNavItems;

  // ── Positioning logic (JS-driven, no Tailwind breakpoint classes) ──────────
  // Desktop: sidebar is part of the normal flex flow, always visible.
  // Mobile/tablet: sidebar is a fixed overlay, slide in/out with transform.
  const asideStyle: React.CSSProperties = isDesktop
    ? {
        position: 'relative',
        flexShrink: 0,
        transform: 'none',
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)'
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)'
      };

  return (
    <>
      {/* Backdrop — only on mobile/tablet when open */}
      {!isDesktop && (
        <div
          className={`fixed inset-0 z-30 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className="z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-300 ease-in-out"
        style={asideStyle}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <a
            href={derivedBlueprintMode ? '/agent-blueprint-dashboard/today' : derivedDemoMode ? '/demo-dashboard/today' : '/dashboard/today'}
            onClick={onClose}
            className="group rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <LogoWithName />
          </a>
          {/* Close button — only on mobile/tablet */}
          {!isDesktop && (
            <button onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close navigation">
              <Icon name="close" />
            </button>
          )}
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
              {isLO && !isOffice && <AiPowerChip onNavigate={onClose} />}
              <button
                onClick={() => adminAuthService.logout()}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <Icon name="logout" className="text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {derivedDemoMode && !derivedBlueprintMode && isDesktop && (
            <div className="mt-auto space-y-3 pt-6">
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
