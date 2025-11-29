import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LogoWithName } from './LogoWithName'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

type AdminNavItem = {
  to: string
  icon: string
  label: string
  match?: (pathname: string) => boolean
}

const items: AdminNavItem[] = [
  { to: '/admin/dashboard', icon: 'dashboard', label: 'Overview' },
  { to: '/admin/contacts', icon: 'groups', label: 'Contacts' },
  { to: '/admin/knowledge-base', icon: 'smart_toy', label: 'AI Sidekicks' },
  { to: '/admin/ai-training', icon: 'school', label: 'Train Your AI' },
  { to: '/admin/ai-card', icon: 'add_card', label: 'AI Card Builder' },
  { to: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/admin/security', icon: 'security', label: 'Security' },
  { to: '/admin/billing', icon: 'payments', label: 'Billing' },
  { to: '/admin/settings', icon: 'settings', label: 'Settings' }
]

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 h-full w-64 flex-col border-r border-slate-200 bg-white px-4 py-6
          transform transition-transform duration-300 ease-in-out
          md:static md:flex md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex justify-between items-center px-2 mb-6">
          <NavLink
            to="/admin/dashboard"
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-lg"
            onClick={onClose}
          >
            <LogoWithName />
          </NavLink>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-full text-slate-500 hover:bg-slate-100"
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mb-4 px-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Panel</div>
        </div>

        <nav className="flex-1">
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm divide-y divide-slate-200">
            {items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const matches = item.match
                    ? item.match(location.pathname)
                    : isActive || location.pathname === item.to
                  return [
                    'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-200',
                    matches
                      ? 'bg-primary-600 font-semibold text-white shadow-sm'
                      : 'font-medium text-slate-600 hover:bg-slate-100'
                  ].join(' ')
                }}
                onClick={onClose}
              >
                {({ isActive }) => {
                  const matches = item.match
                    ? item.match(location.pathname)
                    : isActive || location.pathname === item.to
                  return (
                    <>
                      <Icon
                        name={item.icon}
                        className={`transition-colors ${
                          matches ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )
                }}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-auto flex flex-col space-y-2 border-t border-slate-200 pt-4">
          <NavLink
            to="/app/dashboard"
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
            onClick={onClose}
          >
            <Icon name="arrow_back" className="text-slate-500" />
            <span>Back to App</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar
