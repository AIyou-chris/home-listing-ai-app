import { AdminNavItem } from '../components/AdminSidebar';

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { view: 'admin-dashboard', icon: 'space_dashboard', label: 'Overview' },
  { view: 'admin-marketing', icon: 'monitoring', label: 'Funnels' },
  { view: 'admin-leads', icon: 'event', label: 'Appointments' },
  { view: 'admin-knowledge-base', icon: 'robot_2', label: 'AI Sidekicks & Knowledge Base' },
  { view: 'admin-ai-training', icon: 'school', label: 'Train AI' },
  { view: 'admin-users', icon: 'group', label: 'Users' },
  { view: 'admin-analytics', icon: 'insights', label: 'Analytics' },
  { view: 'admin-billing', icon: 'payments', label: 'Billing' },
  { view: 'admin-settings', icon: 'settings', label: 'Settings' },
  { view: 'admin-security', icon: 'shield_lock', label: 'Security' },
  { view: 'admin-ai-card', icon: 'badge', label: 'AI Cards' },
  { view: 'admin-blog-writer', icon: 'article', label: 'AI Content' }
];
