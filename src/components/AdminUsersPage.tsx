import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
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
}

const AdminUsersPage: React.FC = () => {
    const [users, setUsers] = useState<AgentUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { impersonate } = useImpersonation();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Use AuthService to ensure we hit the correct Backend URL and include Auth Headers
            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest('/api/admin/users');

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Server returned ${response.status} `);
            }

            const data = await response.json();

            // The API returns an array directly now
            setUsers(Array.isArray(data) ? data : (data.users || []));
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = (userId: string) => {
        if (confirm('Are you sure you want to impersonate this user? You will see their dashboard exactly as they do.')) {
            impersonate(userId);
            // Redirect to blueprint dashboard
            window.history.pushState(null, '', '/dashboard-blueprint');
            window.dispatchEvent(new Event('popstate'));
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

        try {
            setLoading(true);
            const auth = AuthService.getInstance();
            const response = await auth.makeAuthenticatedRequest(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to delete user');
            }

            // Refresh list
            fetchUsers();
        } catch (err: any) {
            console.error('Delete error:', err);
            setError(err.message);
            setLoading(false);
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
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all agents registered on the platform.
                    </p>
                </div>
            </div>

            {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Email
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Joined
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                {user.first_name} {user.last_name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {user.email}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className={`inline - flex rounded - full px - 2 text - xs font - semibold leading - 5 ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    } `}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleImpersonate(user.auth_user_id)}
                                                    className="text-primary-600 hover:text-primary-900 font-semibold"
                                                >
                                                    Impersonate<span className="sr-only">, {user.first_name}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.auth_user_id || user.id)}
                                                    className="ml-4 text-red-600 hover:text-red-900 font-semibold"
                                                >
                                                    Delete<span className="sr-only">, {user.first_name}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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
