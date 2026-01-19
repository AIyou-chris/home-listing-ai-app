import React, { useState, useEffect } from 'react';
import NotificationService from '../../services/notificationService';
import { AuthService } from '../../services/authService';
import { BroadcastMessage } from '../../types';

const AdminBroadcastPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<BroadcastMessage['messageType']>('Feature');
    const [priority, setPriority] = useState<BroadcastMessage['priority']>('medium');
    const [audience, setAudience] = useState<'all' | 'active' | 'demo'>('all');

    const [isSending, setIsSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number>(0);
    const [users, setUsers] = useState<{ id: string; auth_user_id?: string }[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const auth = AuthService.getInstance();
            // Reuse the admin users endpoint to get the count and IDs
            const response = await auth.makeAuthenticatedRequest('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                const fetchedUsers = Array.isArray(data) ? data : (data.users || []);
                setUsers(fetchedUsers);
                setUserCount(fetchedUsers.length);
            }
        } catch (err) {
            console.error('Failed to fetch users count:', err);
        }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 1. Determine Target Audience
            let targetUserIds: string[] = [];

            if (audience === 'all') {
                targetUserIds = users.map(u => u.auth_user_id || u.id);
            } else if (audience === 'demo') {
                // Filter for demo users if we had a way to distinguish them easily in this list, 
                // but for now we'll just target explicit demo IDs or assume the list contains them.
                // Ideally, we'd filter by a 'is_demo' flag if available. 
                // For this implementation, 'demo' might just target the current known demo IDs or themselves.
                targetUserIds = ['demo-user', 'blueprint-agent'];
            } else {
                // Active users logic could go here
                targetUserIds = users.map(u => u.auth_user_id || u.id);
            }

            if (targetUserIds.length === 0) {
                throw new Error("No users found to send broadcast to.");
            }

            // 2. Send Broadcast via Service
            // We use 'system' as the sender ID for now
            await NotificationService.sendBroadcastMessage(
                title,
                content,
                type,
                priority,
                targetUserIds,
                'admin-system'
            );

            // 3. Reset Form & Success State
            setSuccessMessage(`Broadcast sent successfully to ${targetUserIds.length} users!`);
            setTitle('');
            setContent('');
            // Reset after 3 seconds
            setTimeout(() => setSuccessMessage(null), 5000);

        } catch (err: unknown) {
            console.error('Broadcast failed:', err);
            const errorMessage = (err as Error).message || 'Failed to send broadcast';
            setError(errorMessage);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Broadcast Center</h1>
                <p className="text-slate-500">
                    Send announcements, tips, and alerts to all users. notifications will appear in their dashboard bell.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary-600">edit_note</span>
                            Compose Message
                        </h2>

                        <form onSubmit={handleSendBroadcast} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. New AI Features Released!"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your message here..."
                                    rows={5}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1 text-right">{content.length} characters</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as BroadcastMessage['messageType'])}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="Feature">Feature Announcement</option>
                                        <option value="System">System Update</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="General">General/Tips</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value as BroadcastMessage['priority'])}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={audience}
                                            onChange={(e) => setAudience(e.target.value as 'all' | 'active' | 'demo')}
                                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
                                        >
                                            <option value="all">All Users</option>
                                            <option value="active">Active Users Only</option>
                                            <option value="demo">Demo / Test</option>
                                        </select>
                                        <span className="text-sm text-slate-500">
                                            Est. Reach: <strong>{audience === 'demo' ? 2 : userCount} users</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm flex items-center gap-2 animate-fade-in-up">
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    {successMessage}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSending || !title || !content}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium
                                        transition-all duration-200 shadow-sm
                                        ${isSending || !title || !content
                                            ? 'bg-slate-300 cursor-not-allowed'
                                            : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md active:scale-95'
                                        }
                                    `}
                                >
                                    {isSending ? (
                                        <>
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">send</span>
                                            Send Broadcast
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preview Column */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Preview</h2>

                        <div className="bg-white border border-slate-100 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className={`mt-1 p-2 rounded-full ${priority === 'urgent' ? 'bg-rose-100 text-rose-600' :
                                    priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    <span className="material-symbols-outlined text-xl">
                                        {type === 'Feature' ? 'new_releases' :
                                            type === 'Maintenance' ? 'build' :
                                                type === 'System' ? 'dns' : 'notifications'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-slate-800 truncate">
                                            {title || 'Message Title'}
                                        </p>
                                        <span className="text-xs text-slate-400">Just now</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-3">
                                        {content || 'Message content will appear here...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Tips</h3>
                            <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                                <li>Use <strong>Feature</strong> for new updates.</li>
                                <li>Use <strong>General</strong> for weekly tips.</li>
                                <li><strong>High Priority</strong> notifications usually vibrate the bell more intensely (if configured).</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBroadcastPage;
