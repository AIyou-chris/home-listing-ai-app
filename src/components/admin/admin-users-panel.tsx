import { useMemo, useState } from 'react'

import { User } from '../../types'

type ApiHealthStatus = 'idle' | 'loading' | 'ok' | 'down' | 'error'

interface AdminUsersPanelProps {
  users: User[]
  isLoading?: boolean
  errorMessage?: string | null
  onCreateUser: () => void
  onEditUser: (user: User) => void
  onDeleteUser: (userId: string) => Promise<void> | void
  onRefreshUsers?: () => Promise<void> | void
}

const HEALTH_LABELS: Record<ApiHealthStatus, { label: string; className: string }> = {
  idle: { label: '—', className: 'text-slate-500' },
  loading: { label: 'Checking…', className: 'text-slate-500' },
  ok: { label: 'OK', className: 'text-emerald-600 font-semibold' },
  down: { label: 'DOWN', className: 'text-red-600 font-semibold' },
  error: { label: 'ERROR', className: 'text-red-600 font-semibold' }
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  users,
  isLoading = false,
  errorMessage,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onRefreshUsers
}) => {
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus>('idle')
  const [healthError, setHealthError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const stats = useMemo(() => {
    const totalUsers = users.length
    const activeUsers = users.filter(user => user.status === 'Active').length
    const now = new Date()
    const newThisMonth = users.filter(user => {
      const joined = new Date(user.dateJoined)
      return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear()
    }).length
    const totalAiInteractions = users.reduce((total, user) => total + (user.aiInteractions ?? 0), 0)

    return {
      totalUsers,
      activeUsers,
      newThisMonth,
      totalAiInteractions
    }
  }, [users])

  const handleHealthCheck = async () => {
    setHealthStatus('loading')
    setHealthError(null)

    const baseUrl = import.meta.env.VITE_API_URL ?? 'https://ailisitnghome-43boqi59o-ai-you.vercel.app'

    try {
      const response = await fetch(`${baseUrl}/api/admin/settings`)
      if (!response.ok) {
        throw new Error(String(response.status))
      }

      setHealthStatus('ok')
    } catch (error) {
      setHealthStatus('down')
      setHealthError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleRefreshUsers = async () => {
    if (!onRefreshUsers) {
      return
    }

    setIsRefreshing(true)
    try {
      await onRefreshUsers()
    } finally {
      setIsRefreshing(false)
    }
  }

  const healthDisplay = HEALTH_LABELS[healthStatus]

  const handleDeleteClick = async (userId: string) => {
    const confirmed = typeof window === 'undefined' ? true : window.confirm('Delete this user?')
    if (!confirmed) {
      return
    }
    await onDeleteUser(userId)
  }

  return (
    <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage and support your platform users</p>
          {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        </div>
        <div className="flex items-center gap-3">
          {onRefreshUsers && (
            <button
              onClick={handleRefreshUsers}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition disabled:opacity-60"
            >
              <span className="material-symbols-outlined h-5 w-5">refresh</span>
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}
          <button
            onClick={onCreateUser}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all duration-300 transform hover:scale-105"
          >
            <span className="material-symbols-outlined h-5 w-5">person_add</span>
            <span>Add New User</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon="group" iconBg="bg-blue-100" title="Total Users" value={stats.totalUsers} />
        <StatCard icon="person" iconBg="bg-green-100" title="Active Users" value={stats.activeUsers} />
        <StatCard icon="person_add" iconBg="bg-purple-100" title="New This Month" value={stats.newThisMonth} />
        <StatCard icon="memory" iconBg="bg-orange-100" title="AI Interactions" value={stats.totalAiInteractions} />
      </div>

      <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">API Health</h3>
            {healthError && <p className="text-xs text-red-500">{healthError}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${healthDisplay.className}`}>{healthDisplay.label}</span>
            <button
              onClick={handleHealthCheck}
              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-60"
              disabled={healthStatus === 'loading'}
            >
              Run Check
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">All Users</h2>
          {isLoading && <span className="text-sm text-slate-500">Loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date Joined</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No users found. Add your first user to get started.
                  </td>
                </tr>
              )}
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.dateJoined}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditUser(user)}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: string
  iconBg: string
  title: string
  value: number
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, title, value }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 transform hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined h-6 w-6 text-slate-700">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default AdminUsersPanel

