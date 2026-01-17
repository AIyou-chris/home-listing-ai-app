import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AuthService } from '../services/authService'
import { AgentProfile, User } from '../types'

type NewUserPayload = {
  name: string
  email: string
  role: User['role']
  plan: User['plan']
}

type UpdateUserPayload = Partial<Omit<User, 'id'>> & { id: string }

interface UseAdminUsersResult {
  users: User[]
  agentProfile: AgentProfile
  isLoading: boolean
  error: string | null
  refreshUsers: () => Promise<void>
  addUser: (payload: NewUserPayload) => Promise<User>
  updateUser: (payload: UpdateUserPayload) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
}

const USERS_STORAGE_KEY = 'adminUsers'

const DEFAULT_USERS: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'agent',
    plan: 'Solo Agent',
    status: 'Active',
    dateJoined: '2024-01-01',
    lastActive: '2024-01-15T12:00:00Z',
    propertiesCount: 0,
    leadsCount: 0,
    aiInteractions: 0,
    subscriptionStatus: 'active',
    renewalDate: '2025-01-01'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'admin',
    plan: 'Pro Team',
    status: 'Active',
    dateJoined: '2024-01-01',
    lastActive: '2024-01-14T09:00:00Z',
    propertiesCount: 0,
    leadsCount: 0,
    aiInteractions: 0,
    subscriptionStatus: 'active',
    renewalDate: '2025-01-01'
  },
  {
    id: '3',
    name: 'Mike Davis',
    email: 'mike@example.com',
    role: 'agent',
    plan: 'Solo Agent',
    status: 'Inactive',
    dateJoined: '2023-12-15',
    lastActive: '2024-01-10T15:00:00Z',
    propertiesCount: 0,
    leadsCount: 0,
    aiInteractions: 0,
    subscriptionStatus: 'expired',
    renewalDate: '2024-01-01'
  }
]

const isBrowser = () => typeof window !== 'undefined'

const readUsersFromStorage = (): User[] => {
  if (!isBrowser()) {
    return DEFAULT_USERS
  }

  try {
    const saved = window.localStorage.getItem(USERS_STORAGE_KEY)
    if (!saved) {
      return DEFAULT_USERS
    }

    const parsed = JSON.parse(saved) as unknown
    if (Array.isArray(parsed)) {
      return parsed as User[]
    }

    return DEFAULT_USERS
  } catch (error) {
    console.error('useAdminUsers: failed to parse users from storage', error)
    return DEFAULT_USERS
  }
}

const persistUsersToStorage = (users: User[]) => {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('useAdminUsers: failed to persist users', error)
  }
}

export const useAdminUsers = (): UseAdminUsersResult => {
  const [users, setUsers] = useState<User[]>(() => readUsersFromStorage())
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const didInitialFetch = useRef(false)

  useEffect(() => {
    persistUsersToStorage(users)
  }, [users])

  const refreshUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const fallbackToStoredUsers = () => {
      setUsers(readUsersFromStorage())
    }

    try {
      const response = await AuthService.getInstance().makeAuthenticatedRequest(
        '/api/admin/users'
      )

      if (!response.ok) {
        fallbackToStoredUsers()
        setError(`Failed to load users: ${response.status}`)
        return
      }

      const data = await response.json()
      if (Array.isArray(data?.users) && data.users.length > 0) {
        setUsers(data.users)
        persistUsersToStorage(data.users)
      } else {
        fallbackToStoredUsers()
      }
    } catch (err) {
      console.error('useAdminUsers: refresh failed', err)
      setError(err instanceof Error ? err.message : 'Unknown error fetching users')
      fallbackToStoredUsers()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInitialFetch.current) {
      return
    }

    didInitialFetch.current = true
    refreshUsers().catch(() => { })
  }, [refreshUsers])

  const addUser = useCallback(
    async ({ name, email, role, plan }: NewUserPayload) => {
      const now = new Date()
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        role,
        plan,
        status: 'Active',
        dateJoined: now.toISOString().slice(0, 10),
        lastActive: now.toISOString(),
        propertiesCount: 0,
        leadsCount: 0,
        aiInteractions: 0,
        subscriptionStatus: 'active',
        renewalDate: new Date(now.getFullYear() + 1, 0, 1).toISOString().slice(0, 10)
      }

      setUsers(prev => [newUser, ...prev])
      return newUser
    },
    []
  )

  const updateUser = useCallback(async ({ id, ...rest }: UpdateUserPayload) => {
    setUsers(prev => prev.map(user => (user.id === id ? { ...user, ...rest } : user)))
  }, [])

  const deleteUser = useCallback(async (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId))
  }, [])

  const agentProfile = useMemo<AgentProfile>(() => {
    const primaryUser = users[0]
    return {
      name: primaryUser?.name ?? 'Your Name',
      title: 'Real Estate Professional',
      company: 'Home Listing AI',
      phone: primaryUser?.phone ?? '(555) 555-5555',
      email: primaryUser?.email ?? 'agent@example.com',
      headshotUrl:
        primaryUser?.profileImage ??
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=320&h=320&auto=format&fit=facearea&facepad=3.2',
      socials: [
        { platform: 'LinkedIn', url: 'https://www.linkedin.com' },
        { platform: 'Facebook', url: 'https://www.facebook.com' },
        { platform: 'Instagram', url: 'https://www.instagram.com' }
      ],
      website: 'https://homelistingai.com',
      bio: 'Trusted real estate advisor leveraging AI to deliver exceptional client experiences.'
    }
  }, [users])

  return {
    users,
    agentProfile,
    isLoading,
    error,
    refreshUsers,
    addUser,
    updateUser,
    deleteUser
  }
}

export type { NewUserPayload, UpdateUserPayload }

