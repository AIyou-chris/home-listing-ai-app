import React, { Suspense } from 'react'
import AdminSidebar from '../../components/AdminSidebar'

interface AdminAppLayoutProps {
  children: React.ReactNode
  isSidebarOpen: boolean
  onSidebarOpen: () => void
  onSidebarClose: () => void
  fallback?: React.ReactNode
}

const AdminAppLayout: React.FC<AdminAppLayoutProps> = ({
  children,
  isSidebarOpen,
  onSidebarOpen,
  onSidebarClose,
  fallback
}) => {
  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar isOpen={isSidebarOpen} onClose={onSidebarClose} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={onSidebarOpen}
            className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            type="button"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="flex-1 flex justify-center">
            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Admin Panel</span>
          </div>
          <div className="w-10" />
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <Suspense fallback={fallback}>{children}</Suspense>
        </main>
      </div>
    </div>
  )
}

export default AdminAppLayout

