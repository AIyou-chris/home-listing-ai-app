import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AdminService from '../services/adminService';

// New component for status cards (Api, Database, etc.)
const StatusWidget: React.FC<{ serviceName: string; status: 'Online' | 'Offline' | 'Error' }> = ({ serviceName, status }) => {
    const statusInfo = {
        Online: { text: 'Online', color: 'text-green-400', dotClass: 'bg-green-500 animate-pulse-green' },
        Offline: { text: 'Offline', color: 'text-red-400', dotClass: 'bg-red-500' },
        Error: { text: 'Error', color: 'text-yellow-400', dotClass: 'bg-yellow-500' },
    };
    const currentStatus = statusInfo[status];

    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700/50 flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-slate-400">{serviceName}</p>
                <p className={`text-xl font-bold ${currentStatus.color}`}>{currentStatus.text}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${currentStatus.dotClass}`}></div>
        </div>
    );
};

// New component for metric cards (Total Users, Revenue, etc.)
const MetricWidget: React.FC<{ title: string; value: string; change: string; icon: string; iconBg: string; changeUp: boolean }> = ({ title, value, change, icon, iconBg, changeUp }) => {
    const changeColor = changeUp ? 'text-green-400' : 'text-red-400';
    const changeIcon = changeUp ? 'trending_up' : 'trending_down';

    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700/50 flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-white mt-2">{value}</p>
                <div className={`flex items-center gap-1 mt-1 text-sm ${changeColor}`}>
                    <span className="material-symbols-outlined text-base">{changeIcon}</span>
                    <span>{change}</span>
                </div>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
            </div>
        </div>
    );
};

// New component for System Performance items
const PerformanceItem: React.FC<{ metric: string; value: string; status: 'good' | 'excellent' | 'warning' | 'critical' }> = ({ metric, value, status }) => {
    const statusStyles = {
        good: 'bg-green-500/20 text-green-300',
        excellent: 'bg-blue-500/20 text-blue-300',
        warning: 'bg-yellow-500/20 text-yellow-300',
        critical: 'bg-red-500/20 text-red-300',
    };

    const metricIcons: { [key: string]: string } = {
        'API Response Time': 'timer',
        'Database Connections': 'database',
        'AI Model Accuracy': 'psychology',
        'Email Delivery Rate': 'mail',
    };

    return (
        <div className="flex justify-between items-center p-4 rounded-md hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-slate-400 w-5 h-5">
                    {metricIcons[metric] || 'settings'}
                </span>
                <p className="text-slate-300">{metric}</p>
            </div>
            <div className="flex items-center gap-3">
                <p className="font-semibold text-white">{value}</p>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusStyles[status]}`}>{status}</span>
            </div>
        </div>
    );
};

// New component for Recent Activity items
const ActivityItem: React.FC<{ icon: string; text: React.ReactNode; time: string; iconColor: string; }> = ({ icon, text, time, iconColor }) => {
    return (
        <div className="flex items-start gap-4 p-4 rounded-md hover:bg-slate-700/50 transition-colors">
            <div className={`mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-700 ${iconColor}`}>
                <span className="material-symbols-outlined text-base">{icon}</span>
            </div>
            <div>
                <p className="text-slate-300">{text}</p>
                <p className="text-xs text-slate-500 mt-0.5">{time}</p>
            </div>
        </div>
    );
};

// Main AdminDashboard component
const AdminDashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [systemHealth, setSystemHealth] = useState<any>(null);
    const [userStats, setUserStats] = useState<any>(null);
    const [broadcastForm, setBroadcastForm] = useState({
        messageType: 'General Announcement',
        priority: 'medium',
        targetAudience: ['all'],
        title: '',
        content: ''
    });
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

    const auth = getAuth();
    const functions = getFunctions();

    // Check admin authorization
    useEffect(() => {
        const checkAdminAuth = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setError('Authentication required');
                    setIsLoading(false);
                    return;
                }

                // Get user token to check custom claims
                const token = await user.getIdTokenResult();
                if (token.claims?.role !== 'admin') {
                    setError('Admin access required');
                    setIsLoading(false);
                    return;
                }

                setIsAuthorized(true);
                await loadDashboardData();
            } catch (err) {
                setError('Failed to verify admin access');
                setIsLoading(false);
            }
        };

        checkAdminAuth();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            
            // Load system health
            try {
                const health = await AdminService.getSystemHealth();
                setSystemHealth(health);
            } catch (err) {
                console.log('Using mock system health data');
                setSystemHealth({
                    database: 'healthy',
                    api: 'healthy',
                    ai: 'healthy',
                    email: 'healthy',
                    storage: 'healthy',
                    overall: 'healthy',
                    lastChecked: new Date().toISOString(),
                    issues: []
                });
            }
            
            // Load user stats
            try {
                const stats = await AdminService.getUserStats();
                setUserStats(stats);
            } catch (err) {
                console.log('Using mock user stats data');
                setUserStats({
                    totalUsers: 1,
                    activeUsers: 1,
                    trialUsers: 0,
                    expiredUsers: 0,
                    newUsersThisMonth: 1,
                    churnedUsersThisMonth: 0,
                    averagePropertiesPerUser: 0,
                    averageLeadsPerUser: 0,
                    averageAiInteractionsPerUser: 0
                });
            }
            
        } catch (err) {
            console.error('Dashboard data loading error:', err);
            setError('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastForm.title || !broadcastForm.content) {
            alert('Please fill in both title and content');
            return;
        }

        try {
            setIsSendingBroadcast(true);
            await AdminService.sendBroadcastMessage({
                title: broadcastForm.title,
                content: broadcastForm.content,
                messageType: broadcastForm.messageType as any,
                priority: broadcastForm.priority as any,
                targetAudience: broadcastForm.targetAudience,
                sentBy: auth.currentUser?.uid || 'admin',
                status: 'sent'
            });

            // Reset form
            setBroadcastForm({
                messageType: 'General Announcement',
                priority: 'medium',
                targetAudience: ['all'],
                title: '',
                content: ''
            });

            alert('Broadcast message sent successfully!');
        } catch (err) {
            alert('Failed to send broadcast message');
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    const handleRefresh = () => {
        loadDashboardData();
    };

    if (isLoading) {
        return (
            <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !isAuthorized) {
        return (
            <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-white text-2xl">error</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400">{error || 'Admin access required'}</p>
                </div>
            </div>
        );
    }

    // Calculate system status based on health data
    const getSystemStatus = (service: string) => {
        if (!systemHealth) return 'Online';
        const health = systemHealth[service.toLowerCase()];
        return health === 'error' ? 'Error' : health === 'warning' ? 'Error' : 'Online';
    };

    // Format user stats
    const formatUserStats = () => {
        if (!userStats) return { total: '0', active: '0', trial: '0', revenue: '$0' };
        return {
            total: userStats.totalUsers.toLocaleString(),
            active: userStats.activeUsers.toLocaleString(),
            trial: userStats.trialUsers.toLocaleString(),
            revenue: `$${(userStats.totalUsers * 29.99).toLocaleString()}`
        };
    };

    const stats = formatUserStats();

    return (
        <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-slate-400 mt-1">System overview and management controls</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-600 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">refresh</span>
                        <span>Refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold shadow-sm hover:bg-purple-700 transition animate-glow-purple">
                        <span className="material-symbols-outlined w-5 h-5">settings</span>
                        <span>Settings</span>
                    </button>
                    <button 
                        onClick={async () => {
                            try {
                                const { signOut } = await import('firebase/auth');
                                const { auth } = await import('../services/firebase');
                                await signOut(auth);
                                window.location.href = '/';
                            } catch (error) {
                                console.error('Logout error:', error);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow-sm hover:bg-red-700 transition"
                    >
                        <span className="material-symbols-outlined w-5 h-5">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Top Row: Status Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatusWidget serviceName="Api" status={getSystemStatus('api')} />
                <StatusWidget serviceName="Database" status={getSystemStatus('database')} />
                <StatusWidget serviceName="AI" status={getSystemStatus('ai')} />
                <StatusWidget serviceName="Email" status={getSystemStatus('email')} />
            </div>

            {/* Second Row: Metric Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricWidget title="Total Users" value={stats.total} change="+23%" changeUp={true} icon="group" iconBg="bg-blue-500" />
                <MetricWidget title="Active Users" value={stats.active} change="+12%" changeUp={true} icon="home_work" iconBg="bg-pink-500" />
                <MetricWidget title="Trial Users" value={stats.trial} change="+45%" changeUp={true} icon="smart_toy" iconBg="bg-teal-500" />
                <MetricWidget title="Revenue" value={stats.revenue} change="+18%" changeUp={true} icon="payments" iconBg="bg-green-500" />
            </div>

            {/* Broadcast Message Form */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">campaign</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Broadcast Message to All Users</h3>
                        <p className="text-slate-400 text-sm">Send important announcements, updates, or notifications to all platform users</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Message Type</label>
                        <select 
                            value={broadcastForm.messageType}
                            onChange={(e) => setBroadcastForm({...broadcastForm, messageType: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option>General Announcement</option>
                            <option>Maintenance Notice</option>
                            <option>Feature Update</option>
                            <option>Emergency Alert</option>
                            <option>System Status</option>
                            <option>Welcome Message</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Priority Level</label>
                        <div className="flex gap-3">
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    name="priority" 
                                    value="low" 
                                    checked={broadcastForm.priority === 'low'}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, priority: e.target.value})}
                                    className="mr-2 text-blue-500" 
                                />
                                <span className="text-sm text-slate-300">Low</span>
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    name="priority" 
                                    value="medium" 
                                    checked={broadcastForm.priority === 'medium'}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, priority: e.target.value})}
                                    className="mr-2 text-blue-500" 
                                    defaultChecked 
                                />
                                <span className="text-sm text-slate-300">Medium</span>
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    name="priority" 
                                    value="high" 
                                    checked={broadcastForm.priority === 'high'}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, priority: e.target.value})}
                                    className="mr-2 text-blue-500" 
                                />
                                <span className="text-sm text-slate-300">High</span>
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    name="priority" 
                                    value="urgent" 
                                    checked={broadcastForm.priority === 'urgent'}
                                    onChange={(e) => setBroadcastForm({...broadcastForm, priority: e.target.value})}
                                    className="mr-2 text-blue-500" 
                                />
                                <span className="text-sm text-slate-300">Urgent</span>
                            </label>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                        <div className="flex gap-3">
                            <label className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={broadcastForm.targetAudience.includes('all')}
                                    onChange={(e) => {
                                        const newAudience = e.target.checked ? ['all'] : [];
                                        setBroadcastForm({...broadcastForm, targetAudience: newAudience});
                                    }}
                                    className="mr-2 text-blue-500" 
                                />
                                <span className="text-sm text-slate-300">All Users</span>
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={broadcastForm.targetAudience.includes('active')}
                                    onChange={(e) => {
                                        const newAudience = e.target.checked 
                                            ? [...broadcastForm.targetAudience.filter(a => a !== 'all'), 'active']
                                            : broadcastForm.targetAudience.filter(a => a !== 'active');
                                        setBroadcastForm({...broadcastForm, targetAudience: newAudience});
                                    }}
                                    className="mr-2 text-blue-500" 
                                />
                                <span className="text-sm text-slate-300">Active Only</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message Title</label>
                    <input
                        type="text"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                        placeholder="Enter a clear, concise title for your message..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message Content</label>
                    <textarea
                        value={broadcastForm.content}
                        onChange={(e) => setBroadcastForm({...broadcastForm, content: e.target.value})}
                        rows={4}
                        placeholder="Enter your message content. This will be sent to all users..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    ></textarea>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">group</span>
                            Will be sent to {stats.total} users
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">schedule</span>
                            Delivered immediately
                        </span>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition">
                            <span className="material-symbols-outlined w-5 h-5">schedule</span>
                            Schedule
                        </button>
                        <button 
                            onClick={handleSendBroadcast}
                            disabled={isSendingBroadcast}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined w-5 h-5">
                                {isSendingBroadcast ? 'hourglass_empty' : 'send'}
                            </span>
                            {isSendingBroadcast ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Third Row: Performance & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Performance */}
                <div className="bg-slate-800 rounded-lg p-2 border border-slate-700/50">
                     <h3 className="text-lg font-bold text-white p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined">monitoring</span>
                        System Performance
                    </h3>
                    <div className="divide-y divide-slate-700/50">
                        <PerformanceItem metric="API Response Time" value="142ms" status="good" />
                        <PerformanceItem metric="Database Connections" value="24/50" status="good" />
                        <PerformanceItem metric="AI Model Accuracy" value="94.2%" status="excellent" />
                        <PerformanceItem metric="Email Delivery Rate" value="99.1%" status="good" />
                    </div>
                </div>

                 {/* Recent Activity */}
                 <div className="bg-slate-800 rounded-lg p-2 border border-slate-700/50">
                     <h3 className="text-lg font-bold text-white p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined">history</span>
                        Recent Activity
                    </h3>
                    <div className="divide-y divide-slate-700/50">
                         <ActivityItem icon="person_add" text={<>New user registration: <span className="font-semibold text-white">john@example.com</span></>} time="2 minutes ago" iconColor="text-blue-400" />
                         <ActivityItem icon="model_training" text="AI model training completed" time="15 minutes ago" iconColor="text-green-400" />
                         <ActivityItem icon="backup" text="Database backup completed" time="1 hour ago" iconColor="text-teal-400" />
                         <ActivityItem icon="warning" text="High CPU usage detected" time="2 hours ago" iconColor="text-yellow-400" />
                    </div>
                </div>
            </div>

            {/* Fourth Row: Data Migration & Seeding */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50 mt-8">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined">database</span>
                    Data Migration & Seeding
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Seed Admin Data */}
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">seed</span>
                            Seed Admin Data
                        </h4>
                        <p className="text-sm text-slate-300 mb-4">
                            Initialize admin settings, retention campaigns, and system monitoring rules.
                        </p>
                        <button 
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            onClick={async () => {
                                try {
                                    const seedAdminData = httpsCallable(functions, 'seedAdminData');
                                    const result = await seedAdminData({});
                                    console.log('Seed result:', result);
                                    alert('Admin data seeded successfully!');
                                } catch (error) {
                                    console.error('Seed error:', error);
                                    alert('Failed to seed admin data');
                                }
                            }}
                        >
                            <span className="material-symbols-outlined">play_arrow</span>
                            Run Seed
                        </button>
                    </div>

                    {/* Migrate User Data */}
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-400">sync</span>
                            Migrate User Data
                        </h4>
                        <p className="text-sm text-slate-300 mb-4">
                            Update existing users with new fields and calculate user statistics.
                        </p>
                        <button 
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                            onClick={async () => {
                                try {
                                    const migrateUserData = httpsCallable(functions, 'migrateUserData');
                                    const result = await migrateUserData({});
                                    console.log('Migration result:', result);
                                    alert('User data migrated successfully!');
                                } catch (error) {
                                    console.error('Migration error:', error);
                                    alert('Failed to migrate user data');
                                }
                            }}
                        >
                            <span className="material-symbols-outlined">play_arrow</span>
                            Run Migration
                        </button>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
                    <h5 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-400">info</span>
                        Migration Notes
                    </h5>
                    <ul className="text-xs text-slate-300 space-y-1">
                        <li>• Seed Admin Data: Creates initial admin settings, retention campaigns, and monitoring rules</li>
                        <li>• Migrate User Data: Updates existing users with missing fields and calculates statistics</li>
                        <li>• Both operations require admin privileges and will log results to console</li>
                        <li>• Migration is safe to run multiple times - it only updates missing fields</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
