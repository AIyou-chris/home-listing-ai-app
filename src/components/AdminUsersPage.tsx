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
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const { impersonate } = useImpersonation();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest('/api/admin/users');

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Server returned ${response.status}`);
            }

            const data = await response.json();
            setUsers(Array.isArray(data) ? data : (data.users || []));
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = (userId: string) => {
        if (confirm('Are you sure you want to impersonate this user?')) {
            impersonate(userId);
            window.history.pushState(null, '', '/dashboard-blueprint');
            window.dispatchEvent(new Event('popstate'));
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Delete this user? Email becomes immediately available for reuse.')) return;

        try {
            setDeletingUserId(userId);
            setError(null);

            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to delete user');
            }

            console.log('✅ User deleted successfully');
            setUsers(prevUsers => prevUsers.filter(u => u.auth_user_id !== userId && u.id !== userId));
            setError('✅ Deleted! Email is now available.');
            setTimeout(() => setError(null), 3000);

        } catch (err: unknown) {
            console.error('❌ Delete failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Delete failed';
            setError(`❌ ${errorMessage}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setDeletingUserId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* FIXED POSITION TOAST - NO LAYOUT SHIFT */}
            {error && (
                <div className={`fixed top-4 right-4 z-50 max-w-md border px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 ${
                    error.includes('✅') 
                        ? 'bg-green-50 border-green-300 text-green-800' 
                        : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl">
                            {error.includes('✅') ? 'check_circle' : 'error'}
                        </span>
                        <p className="font-semibold">{error}</p>
                    </div>
                </div>
            )}

            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        All registered agents. Delete to free up emails immediately.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Voice</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">SMS</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Joined</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {users.map((user) => {
                                        const voiceUsed = user.voice_minutes_used || 0;
                                        const voiceLimit = user.voice_allowance_monthly || 60;
                                        const voicePercent = Math.min((voiceUsed / voiceLimit) * 100, 100);
                                        const voiceColor = voicePercent >= 90 ? 'bg-red-500' : (voicePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500');
                                        const smsSent = user.sms_sent_monthly || 0;
                                        const isDeleting = deletingUserId === user.auth_user_id || deletingUserId === user.id;

                                        return (
                                            <tr key={user.id} className={isDeleting ? 'opacity-50' : ''}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    {user.first_name} {user.last_name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                                                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>{user.status}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="w-full max-w-[140px]">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className={voiceUsed > voiceLimit ? "text-red-600 font-bold" : ""}>{voiceUsed} min</span>
                                                            <span className="text-gray-400">/ {voiceLimit}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div className={`h-1.5 rounded-full ${voiceColor}`} style={{ width: `${voicePercent}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className="font-medium text-gray-900">{smsSent}</span>
                                                    <span className="text-gray-400 text-xs ml-1">msgs</span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        onClick={() => handleImpersonate(user.auth_user_id)}
                                                        disabled={isDeleting}
                                                        className="text-primary-600 hover:text-primary-900 font-semibold disabled:opacity-50"
                                                    >
                                                        Impersonate
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.auth_user_id || user.id)}
                                                        disabled={isDeleting}
                                                        className="ml-4 text-red-600 hover:text-red-900 font-semibold disabled:opacity-50"
                                                    >
                                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUsersPage;
