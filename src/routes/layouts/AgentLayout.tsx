import React from 'react'
import Sidebar from '../../components/Sidebar'
import { LogoWithName } from '../../components/LogoWithName'

interface AgentLayoutProps {
  children: React.ReactNode
  isSidebarOpen: boolean
  onSidebarOpen: () => void
  onSidebarClose: () => void
  headerEndSlot?: React.ReactNode
}

const AgentLayout: React.FC<AgentLayoutProps> = ({
  children,
  isSidebarOpen,
  onSidebarOpen,
  onSidebarClose,
  headerEndSlot
}) => {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={onSidebarClose} />
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
            <LogoWithName />
          </div>
          <div className="flex items-center space-x-1">{headerEndSlot}</div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  )
}

export default AgentLayout

