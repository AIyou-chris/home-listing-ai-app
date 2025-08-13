import React from 'react';

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
    return (
        <div className="bg-slate-900 min-h-full p-4 sm:p-6 lg:p-8 text-slate-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-slate-400 mt-1">System overview and management controls</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold shadow-sm hover:bg-slate-600 transition">
                        <span className="material-symbols-outlined w-5 h-5">refresh</span>
                        <span>Refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold shadow-sm hover:bg-purple-700 transition animate-glow-purple">
                        <span className="material-symbols-outlined w-5 h-5">settings</span>
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            {/* Top Row: Status Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatusWidget serviceName="Api" status="Online" />
                <StatusWidget serviceName="Database" status="Online" />
                <StatusWidget serviceName="AI" status="Online" />
                <StatusWidget serviceName="Email" status="Online" />
            </div>

            {/* Second Row: Metric Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricWidget title="Total Users" value="1,247" change="+23%" changeUp={true} icon="group" iconBg="bg-blue-500" />
                <MetricWidget title="Active Listings" value="892" change="+12%" changeUp={true} icon="home_work" iconBg="bg-pink-500" />
                <MetricWidget title="AI Interactions" value="15,420" change="+45%" changeUp={true} icon="smart_toy" iconBg="bg-teal-500" />
                <MetricWidget title="Revenue" value="$45,680" change="+18%" changeUp={true} icon="payments" iconBg="bg-green-500" />
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
        </div>
    );
};

export default AdminDashboard;
