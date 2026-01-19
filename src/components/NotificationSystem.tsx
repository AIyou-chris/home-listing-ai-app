import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, MessageSquare } from 'lucide-react';
import { UserNotification } from '../types';

import NotificationService from '../services/notificationService';

interface NotificationSystemProps {
    userId: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ userId }) => {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId) return;

        // Subscribe to real-time notifications (handles initial load too)
        const unsubscribe = NotificationService.subscribeToUserNotifications(userId, (updatedNotifications) => {
            setNotifications(updatedNotifications);
            setUnreadCount(updatedNotifications.filter(n => !n.read).length);
        });

        return () => {
            unsubscribe();
        };
    }, [userId]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await NotificationService.markNotificationAsRead(notificationId);
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await NotificationService.markAllNotificationsAsRead(userId);
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const getNotificationIcon = (type: UserNotification['type']) => {
        switch (type) {
            case 'broadcast':
                return <MessageSquare className="w-4 h-4" />;
            case 'system':
                return <AlertCircle className="w-4 h-4" />;
            case 'billing':
                return <Info className="w-4 h-4" />;
            case 'feature':
                return <Info className="w-4 h-4" />;
            default:
                return <Bell className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays}d ago`;
        }
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 text-gray-600 hover:text-gray-900 transition-colors ${unreadCount > 0 ? 'animate-ring' : ''}`}
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-gray-200 shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                            <div className="flex items-center space-x-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={async () => {
                                        try {
                                            await NotificationService.sendNotificationToUser(
                                                userId,
                                                'Test Notification',
                                                'This is a verification test message.',
                                                'system',
                                                'high'
                                            );
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded"
                                    title="Send Test Notification"
                                >
                                    Test
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                No notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`mt-1 p-1 rounded-full ${notification.read ? 'text-gray-400' : 'text-blue-600'
                                                }`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <p className={`text-sm font-medium ${notification.read ? 'text-gray-900' : 'text-blue-900'
                                                        }`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.content}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-400">
                                                        {formatDate(notification.createdAt)}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                                        notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                            notification.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {notification.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSystem;
