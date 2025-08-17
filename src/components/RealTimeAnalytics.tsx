import React, { useEffect, useState } from 'react';
import { analyticsService, AdminMetrics, UserEngagementMetrics, SystemPerformanceMetrics, RetentionMetrics, RealTimeData } from '../services/analyticsService';

interface RealTimeAnalyticsProps {
  isAdmin?: boolean;
}

const RealTimeAnalytics: React.FC<RealTimeAnalyticsProps> = ({ isAdmin = false }) => {
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [userEngagement, setUserEngagement] = useState<UserEngagementMetrics | null>(null);
  const [systemPerformance, setSystemPerformance] = useState<SystemPerformanceMetrics | null>(null);
  const [retentionMetrics, setRetentionMetrics] = useState<RetentionMetrics | null>(null);
  const [listenerStatus, setListenerStatus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Start real-time listeners
    const listeners: (() => void)[] = [];

    // Listen to active users
    const activeUsersListener = analyticsService.listenToActiveUsers((count) => {
      setActiveUsers(count);
    });
    listeners.push(activeUsersListener);

    // Listen to user activity
    const userActivityListener = analyticsService.listenToUserActivity((activities) => {
      setRecentEvents(activities.slice(0, 10)); // Show last 10 activities
    });
    listeners.push(userActivityListener);

    // Listen to system alerts
    const alertsListener = analyticsService.listenToSystemAlerts((alerts) => {
      setSystemAlerts(alerts);
    });
    listeners.push(alertsListener);

    // Listen to performance metrics
    const performanceListener = analyticsService.listenToPerformanceMetrics((metrics) => {
      setPerformanceMetrics(metrics);
    });
    listeners.push(performanceListener);

    // Load admin-specific metrics if admin
    if (isAdmin) {
      loadAdminMetrics();
    }

    // Update listener status
    setListenerStatus(analyticsService.getListenerStatus());

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
    };
  }, [isAdmin]);

  const loadAdminMetrics = async () => {
    try {
      const [admin, engagement, performance, retention] = await Promise.all([
        analyticsService.getAdminDashboardMetrics(),
        analyticsService.getUserEngagementMetrics(),
        analyticsService.getSystemPerformanceMetrics(),
        analyticsService.getRetentionMetrics()
      ]);

      setAdminMetrics(admin);
      setUserEngagement(engagement);
      setSystemPerformance(performance);
      setRetentionMetrics(retention);
    } catch (error) {
      console.error('Error loading admin metrics:', error);
    }
  };

  const stopAllListeners = () => {
    analyticsService.stopAllListeners();
    setListenerStatus({});
  };

  const stopSpecificListener = (listenerName: string) => {
    analyticsService.stopListener(listenerName);
    setListenerStatus(analyticsService.getListenerStatus());
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Real-Time Analytics</h2>
        <div className="flex gap-2">
          <button
            onClick={stopAllListeners}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop All Listeners
          </button>
        </div>
      </div>

      {/* Listener Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-semibold mb-2">Active Listeners</h3>
        <div className="flex gap-4">
          {Object.entries(listenerStatus).map(([name, active]) => (
            <div key={name} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">{name}</span>
              {active && (
                <button
                  onClick={() => stopSpecificListener(name)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Stop
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Active Users</h3>
          <p className="text-3xl font-bold text-blue-600">{activeUsers}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Recent Events</h3>
          <p className="text-3xl font-bold text-green-600">{recentEvents.length}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">System Alerts</h3>
          <p className="text-3xl font-bold text-yellow-600">{systemAlerts.length}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Response Time</h3>
          <p className="text-3xl font-bold text-purple-600">
            {performanceMetrics?.responseTime || 0}ms
          </p>
        </div>
      </div>

      {/* Recent Events */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Recent Events</h3>
        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-medium">{event.eventType}</span>
                    {event.userId && <span className="text-gray-500 ml-2">User: {event.userId}</span>}
                  </div>
                  <span className="text-sm text-gray-500">
                    {event.timestamp?.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent events</p>
          )}
        </div>
      </div>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">System Alerts</h3>
          <div className="space-y-2">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{alert.type}</h4>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {alert.timestamp?.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Metrics */}
      {isAdmin && adminMetrics && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Admin Dashboard Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800">Users</h4>
              <p className="text-2xl font-bold text-blue-600">{adminMetrics.totalUsers}</p>
              <p className="text-sm text-gray-500">Active: {adminMetrics.activeUsers}</p>
              <p className="text-sm text-gray-500">New Today: {adminMetrics.newUsersToday}</p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800">Properties</h4>
              <p className="text-2xl font-bold text-green-600">{adminMetrics.totalProperties}</p>
              <p className="text-sm text-gray-500">Interactions: {adminMetrics.totalInteractions}</p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800">Conversion</h4>
              <p className="text-2xl font-bold text-purple-600">{adminMetrics.conversionRate}%</p>
              <p className="text-sm text-gray-500">Revenue: ${adminMetrics.revenue}</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {isAdmin && systemPerformance && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">System Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800">Response Time</h4>
              <p className="text-lg font-bold text-blue-600">
                Avg: {systemPerformance.responseTime.average}ms
              </p>
              <p className="text-sm text-gray-500">
                P95: {systemPerformance.responseTime.p95}ms
              </p>
              <p className="text-sm text-gray-500">
                P99: {systemPerformance.responseTime.p99}ms
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800">System Health</h4>
              <p className="text-lg font-bold text-green-600">
                Uptime: {systemPerformance.uptime}%
              </p>
              <p className="text-sm text-gray-500">
                Error Rate: {systemPerformance.errorRate}%
              </p>
              <p className="text-sm text-gray-500">
                Throughput: {systemPerformance.throughput.requestsPerMinute} req/min
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeAnalytics;
