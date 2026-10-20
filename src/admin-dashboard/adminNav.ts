import type { DashboardView } from './AdminDashboard';

// The admin menu has four items. Everything else is a tab inside one of them.
export type NavGroup = {
  id: 'today' | 'marketing' | 'leads' | 'settings';
  label: string;
  icon: string;
  tabs: Array<{ view: DashboardView; label: string }>;
};

export const NAV_GROUPS: NavGroup[] = [
  { id: 'today', label: 'Today', icon: 'home', tabs: [{ view: 'today', label: 'Today' }] },
  {
    id: 'marketing', label: 'Marketing', icon: 'campaign',
    tabs: [
      { view: 'marketing-funnels', label: 'Marketing Funnels' },
      { view: 'broadcast', label: 'Broadcasts' },
      { view: 'blog', label: 'Blog' }
    ]
  },
  {
    id: 'leads', label: 'Leads', icon: 'groups',
    tabs: [
      { view: 'leads', label: 'Leads & Appointments' },
      { view: 'inbox', label: 'Inbox' },
      { view: 'ai-conversations', label: 'AI Conversations' },
      { view: 'listings', label: 'Listings' }
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: 'settings',
    tabs: [
      { view: 'settings', label: 'Settings' },
      { view: 'knowledge-base', label: 'Business Brain' },
      { view: 'users', label: 'Users' },
      { view: 'lo-platform', label: 'LO Platform' }
    ]
  }
];

// Pages that are reached from inside a tab, not from the tab bar.
const EXTRA: Partial<Record<DashboardView, NavGroup['id']>> = {
  dashboard: 'today', property: 'leads', 'add-listing': 'leads', 'ai-card': 'leads', 'ai-card-builder': 'leads', 'white-label': 'settings'
};

export function groupFor(view: DashboardView): NavGroup {
  const direct = NAV_GROUPS.find((g) => g.tabs.some((t) => t.view === view));
  if (direct) return direct;
  const id = EXTRA[view];
  return NAV_GROUPS.find((g) => g.id === id) || NAV_GROUPS[0];
}
