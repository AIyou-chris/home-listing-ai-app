import React, { useEffect, useState } from 'react';
import { useImpersonation } from '../context/ImpersonationContext';
import { AuthService } from '../services/authService';

interface AgentUser {
    id: string;
    auth_user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    created_at: string;
    voice_minutes_used?: number;
    voice_allowance_monthly?: number;
    sms_sent_monthly?: number;
}

const AdminUsersPage: React.FC = () => {
    const [users, setUsers] = useState<AgentUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const isInitialMount = React.useRef(true);
    const { impersonate } = useImpersonation();

    const fetchUsers = React.useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest('/api/admin/users');

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            setUsers(Array.isArray(data) ? data : (data.users || []));
            setError(null);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Failed to load users');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            fetchUsers(true);
            isInitialMount.current = false;
        }
    }, [fetchUsers]);

    const handleImpersonate = (userId: string) => {
        if (confirm('Are you sure you want to impersonate this user?')) {
            impersonate(userId);
            window.location.href = '/dashboard-blueprint';
        }
    };

    const handleDelete = async (userId: string) => {
        if (deletingId) return;
        if (!confirm('Delete this user? Email becomes immediately available for reuse.')) return;

        console.log(`[Admin] Deleting user: ${userId}`);

        try {
            setDeletingId(userId);

            // Immediate local update for zero-latency feel
            const usersBeforeDelete = [...users];
            setUsers(prev => prev.filter(u => u.auth_user_id !== userId && u.id !== userId));

            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                // Revert on error
                setUsers(usersBeforeDelete);
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete user');
            }

            console.log('✅ User deleted successfully');
            setError('✅ Deleted! Email is now free.');
            setTimeout(() => setError(null), 3000);

        } catch (err: any) {
            console.error('❌ Delete failed:', err);
            setError(`❌ ${err.message}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" key="admin-users-page-root">
            {/* TOAST NOTIFICATION */}
            {error && (
                <div className="fixed top-24 right-4 z-[9999] max-w-md border px-6 py-4 rounded-xl shadow-2xl bg-white animate-fade-in-up">
                    <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-2xl ${error.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>
                            {error.includes('✅') ? 'check_circle' : 'error'}
                        </span>
                        <p className="font-semibold text-gray-800">{error}</p>
                    </div>
                </div>
            )}

            <div className="sm:flex sm:items-center mb-8">
                <div className="sm:flex-auto">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Manage all registered agents and their platform access.
                    </p>
                </div>
            </div>

            <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${deletingId === (user.auth_user_id || user.id) ? 'bg-red-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-gray-400">Joined {new Date(user.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {user.status?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex gap-4">
                                            <div className="text-xs">
                                                <span className="text-gray-400 block mb-1">Voice</span>
                                                <span className="font-bold text-gray-700">{user.voice_minutes_used || 0}m</span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-gray-400 block mb-1">SMS</span>
                                                <span className="font-bold text-gray-700">{user.sms_sent_monthly || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleImpersonate(user.auth_user_id)}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                Impersonate
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.auth_user_id || user.id)}
                                                disabled={deletingId !== null}
                                                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === (user.auth_user_id || user.id) ? '...' : (
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                        No agents found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsersPage;
