import React, { useState, useEffect, useCallback } from 'react';
import { SecurityService, useSecurity } from '../services/securityService';
import { 
	Shield, 
	AlertTriangle, 
	FileText, 
	Database, 
	Activity, 
	Lock, 
	Unlock,
	Download,
	Clock,
	CheckCircle,
	XCircle,
	RefreshCw
} from 'lucide-react';

type TimestampLike = string | number | Date | { toDate?: () => Date };

interface SecurityStatusSummary {
  auditStatus?: { totalActions?: number } & Record<string, unknown>;
  alertsStatus?: { total?: number } & Record<string, unknown>;
  backupStatus?: { total?: number } & Record<string, unknown>;
  lastUpdated?: string;
  [key: string]: unknown;
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  severity: string;
  performedBy: string;
  timestamp: TimestampLike;
  details: Record<string, unknown>;
}

interface SecurityAlert {
  id: string;
  alertType: string;
  description: string;
  severity: string;
  timestamp: TimestampLike;
  resolved: boolean;
}

interface BackupRecord {
  id: string;
  backupId: string;
  backupType: string;
  status: string;
  totalDocuments: number;
  startTime: TimestampLike;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveTimestamp = (value: TimestampLike | undefined): Date => {
  if (!value) {
    return new Date();
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

const formatTimestamp = (value: TimestampLike): string => {
  const resolved = resolveTimestamp(value);
  return Number.isNaN(resolved.valueOf()) ? '—' : resolved.toLocaleString();
};

const toStringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const toNumberOr = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asDetails = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const getArray = (value: unknown, key: string): unknown[] =>
  isRecord(value) && Array.isArray(value[key]) ? (value[key] as unknown[]) : [];

const getSecurityStatus = (value: unknown): SecurityStatusSummary | null =>
  (isRecord(value) ? (value as SecurityStatusSummary) : null);

const SecurityDashboard: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const { logAction } = useSecurity();

  const API_BASE = import.meta.env?.VITE_API_URL ?? import.meta.env?.VITE_API_BASE_URL ?? '';

  const mapAudit = useCallback((log: unknown): AuditLog => {
    const record = isRecord(log) ? log : {};
    const id = toStringOr(record.id ?? record.log_id, `${record.action ?? 'action'}_${record.created_at ?? Date.now()}`);
    const timestamp = (record.timestamp ?? record.created_at) as TimestampLike | undefined;
    return {
      id,
      action: toStringOr(record.action ?? record.event, 'unknown'),
      resourceType: toStringOr(record.resourceType ?? record.resource_type, 'unknown'),
      severity: toStringOr(record.severity, 'info'),
      performedBy: toStringOr(record.performedBy ?? record.user_id, 'system'),
      timestamp: timestamp ?? new Date().toISOString(),
      details: asDetails(record.details)
    };
  }, []);

  const mapAlert = useCallback((alert: unknown): SecurityAlert => {
    const record = isRecord(alert) ? alert : {};
    const id = toStringOr(
      record.id ?? record.alert_id,
      `${record.alert_type ?? record.alertType ?? 'alert'}_${record.created_at ?? Date.now()}`
    );
    const timestamp = (record.timestamp ?? record.created_at) as TimestampLike | undefined;
    return {
      id,
      alertType: toStringOr(record.alertType ?? record.alert_type, 'unknown'),
      description: toStringOr(record.description, ''),
      severity: toStringOr(record.severity, 'warning'),
      timestamp: timestamp ?? new Date().toISOString(),
      resolved: typeof record.resolved === 'boolean' ? record.resolved : false
    };
  }, []);

  const mapBackup = useCallback((backup: unknown): BackupRecord => {
    const record = isRecord(backup) ? backup : {};
    const id = toStringOr(record.id ?? record.backupId, `${record.created_at ?? Date.now()}`);
    const startTime = (record.startTime ?? record.created_at) as TimestampLike | undefined;
    return {
      id,
      backupId: toStringOr(record.backupId ?? record.id, 'unknown'),
      backupType: toStringOr(record.backupType ?? record.backup_type, 'manual'),
      status: toStringOr(record.status, 'completed'),
      totalDocuments: toNumberOr(record.totalDocuments ?? record.total_documents, 0),
      startTime: startTime ?? new Date().toISOString()
    };
  }, []);

  const loadSecurityData = useCallback(
    async (shouldCancel?: () => boolean) => {
      const isCancelled = () => (shouldCancel ? shouldCancel() : false);
      try {
        if (!isCancelled()) setLoading(true);

        const now = new Date();
        const start = new Date(now);
        switch (timeRange) {
          case '1h':
            start.setHours(start.getHours() - 1);
            break;
          case '24h':
            start.setHours(start.getHours() - 24);
            break;
          case '7d':
            start.setDate(start.getDate() - 7);
            break;
          case '30d':
            start.setDate(start.getDate() - 30);
            break;
        }

        const [statusRes, logsRes, alertsRes, backupsRes] = await Promise.all([
          SecurityService.getSecurityStatus(),
          SecurityService.getAuditLogs({ startDate: start.toISOString(), endDate: now.toISOString(), limit: 50 }),
          SecurityService.getSecurityAlerts({ limit: 20 }),
          SecurityService.getBackupHistory({ limit: 10 })
        ]);

        const mappedLogs: AuditLog[] = getArray(logsRes, 'auditLogs').map(mapAudit);
        const mappedAlerts: SecurityAlert[] = getArray(alertsRes, 'alerts').map(mapAlert);
        const mappedBackups: BackupRecord[] = getArray(backupsRes, 'backups').map(mapBackup);

        const derivedStatus: SecurityStatusSummary = {
          auditStatus: { totalActions: mappedLogs.length },
          alertsStatus: { total: mappedAlerts.length },
          backupStatus: { total: mappedBackups.length },
          lastUpdated: new Date().toISOString()
        };

        if (!isCancelled()) {
          const statusSummary = getSecurityStatus(statusRes);
          const mergedStatus: SecurityStatusSummary = statusSummary
            ? {
                ...statusSummary,
                auditStatus: {
                  ...(statusSummary.auditStatus ?? {}),
                  totalActions:
                    statusSummary.auditStatus?.totalActions ?? derivedStatus.auditStatus?.totalActions
                },
                alertsStatus: {
                  ...(statusSummary.alertsStatus ?? {}),
                  total: statusSummary.alertsStatus?.total ?? derivedStatus.alertsStatus?.total
                },
                backupStatus: {
                  ...(statusSummary.backupStatus ?? {}),
                  total: statusSummary.backupStatus?.total ?? derivedStatus.backupStatus?.total
                },
                lastUpdated: statusSummary.lastUpdated ?? derivedStatus.lastUpdated
              }
            : derivedStatus;
          setSecurityStatus(mergedStatus);
          setAuditLogs(mappedLogs);
          setSecurityAlerts(mappedAlerts);
          setBackupHistory(mappedBackups);
        }
      } catch (error) {
        console.error('Error loading security data:', error);
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [mapAlert, mapAudit, mapBackup, timeRange]
  );

  const logDashboardAccess = useCallback(() => {
    logAction('security_dashboard_accessed', 'security', { timeRange });
  }, [logAction, timeRange]);

  useEffect(() => {
    let cancelled = false;
    const shouldCancel = () => cancelled;

    const run = async () => {
      await loadSecurityData(shouldCancel);
      if (!shouldCancel()) {
        logDashboardAccess();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadSecurityData, logDashboardAccess]);

	const handleCreateBackup = async () => {
		try {
			await fetch(`${API_BASE}/api/security/backup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			await loadSecurityData();
			logAction('backup_created', 'security', { type: 'manual' });
		} catch (error) {
			console.error('Error creating backup:', error);
		}
	};

	const handleResolveAlert = async (alertId: string) => {
		try {
			const res = await fetch(`${API_BASE}/api/security/alerts/${alertId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resolution: 'resolved via UI' })
			});
			if (!res.ok) {
				const err = await res.text();
				console.error('Resolve Alert API error', res.status, err);
			} else {
				await loadSecurityData();
				logAction('security_alert_resolved', 'security', { alertId });
			}
		} catch (error) {
			console.error('Error resolving alert:', error);
		}
	};

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case 'critical': return 'text-red-600 bg-red-50';
			case 'error': return 'text-orange-600 bg-orange-50';
			case 'warning': return 'text-yellow-600 bg-yellow-50';
			case 'info': return 'text-blue-600 bg-blue-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	};

	const getSeverityIcon = (severity: string) => {
		switch (severity) {
			case 'critical': return <XCircle className="w-4 h-4" />;
			case 'error': return <AlertTriangle className="w-4 h-4" />;
			case 'warning': return <AlertTriangle className="w-4 h-4" />;
			case 'info': return <CheckCircle className="w-4 h-4" />;
			default: return <Clock className="w-4 h-4" />;
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
								<Shield className="w-8 h-8 text-blue-600" />
								Security & Compliance Dashboard
							</h1>
							<p className="text-gray-600 mt-2">
								Monitor security status, audit logs, and compliance metrics
							</p>
						</div>
						<div className="flex items-center gap-4">
							<select
								value={timeRange}
								onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d' | '30d')}
								className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="1h">Last Hour</option>
								<option value="24h">Last 24 Hours</option>
								<option value="7d">Last 7 Days</option>
								<option value="30d">Last 30 Days</option>
							</select>
											<button
												onClick={() => loadSecurityData()}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4" />
								Refresh
							</button>
						</div>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="mb-6">
					<nav className="flex space-x-8">
						{[
							{ id: 'overview', label: 'Overview', icon: Activity },
							{ id: 'audit', label: 'Audit Logs', icon: FileText },
							{ id: 'alerts', label: 'Security Alerts', icon: AlertTriangle },
							{ id: 'backup', label: 'Backup & Restore', icon: Database },
							{ id: 'encryption', label: 'Encryption', icon: Lock }
						].map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										activeTab === tab.id
											? 'bg-blue-100 text-blue-700'
											: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<Icon className="w-4 h-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Content */}
				<div className="space-y-6">
					{/* Quick test actions */}
					<div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4 flex flex-wrap gap-2">
						<button
							onClick={async () => {
								try {
									const res = await fetch(`${API_BASE}/api/security/audit`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ action: 'test_event', resourceType: 'security', severity: 'info', details: { note: 'Manual test audit' } })
									});
									if (!res.ok) {
										const err = await res.text();
										console.error('Audit API error', res.status, err);
									} else {
										await loadSecurityData();
									}
								} catch (e) {
									console.error('Audit API network error', e);
								}
							}}
							className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
						>
							Log Test Event
						</button>
						<button
							onClick={async () => {
								try {
									const res = await fetch(`${API_BASE}/api/security/alerts`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ alertType: 'manual_test', description: 'Manual test alert', severity: 'warning' })
									});
									if (!res.ok) {
										const err = await res.text();
										console.error('Create Alert API error', res.status, err);
									} else {
										await loadSecurityData();
									}
								} catch (e) {
									console.error('Create Alert API network error', e);
								}
							}}
							className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm"
						>
							Create Test Alert
						</button>
						<button onClick={handleCreateBackup} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Create Backup</button>
					</div>
					{/* Overview Tab */}
					{activeTab === 'overview' && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Security Metrics Cards */}
							<div className="bg-white p-6 rounded-lg shadow-sm border">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Total Actions</p>
										<p className="text-2xl font-bold text-gray-900">
											{securityStatus?.auditStatus?.totalActions || 0}
										</p>
									</div>
									<Activity className="w-8 h-8 text-blue-600" />
								</div>
							</div>

							<div className="bg-white p-6 rounded-lg shadow-sm border">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Active Alerts</p>
										<p className="text-2xl font-bold text-red-600">
											{securityAlerts.filter(alert => !alert.resolved).length}
										</p>
									</div>
									<AlertTriangle className="w-8 h-8 text-red-600" />
								</div>
							</div>

							<div className="bg-white p-6 rounded-lg shadow-sm border">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Recent Backups</p>
										<p className="text-2xl font-bold text-green-600">
											{backupHistory.length}
										</p>
									</div>
									<Database className="w-8 h-8 text-green-600" />
								</div>
							</div>

							<div className="bg-white p-6 rounded-lg shadow-sm border">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600">Critical Actions</p>
										<p className="text-2xl font-bold text-orange-600">
											{auditLogs.filter(log => log.severity === 'critical').length}
										</p>
									</div>
									<Shield className="w-8 h-8 text-orange-600" />
								</div>
							</div>
						</div>
					)}

					{/* Audit Logs Tab */}
					{activeTab === 'audit' && (
						<div className="bg-white rounded-lg shadow-sm border">
							<div className="p-6 border-b">
								<h2 className="text-xl font-semibold text-gray-900">Audit Logs</h2>
								<p className="text-gray-600 mt-1">Recent system activities and user actions</p>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Action
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Resource
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												User
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Severity
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Timestamp
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{auditLogs.map((log) => (
											<tr key={log.id} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
													{log.action}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{log.resourceType}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{log.performedBy}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
														{getSeverityIcon(log.severity)}
														<span className="ml-1">{log.severity}</span>
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatTimestamp(log.timestamp)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Security Alerts Tab */}
					{activeTab === 'alerts' && (
						<div className="bg-white rounded-lg shadow-sm border">
							<div className="p-6 border-b">
								<h2 className="text-xl font-semibold text-gray-900">Security Alerts</h2>
								<p className="text-gray-600 mt-1">Active security alerts and notifications</p>
							</div>
							<div className="p-6">
								{securityAlerts.length === 0 ? (
									<div className="text-center py-8">
										<CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
										<p className="text-gray-600">No active security alerts</p>
									</div>
								) : (
									<div className="space-y-4">
										{securityAlerts.map((alert) => (
											<div
												key={alert.id}
												className={`p-4 rounded-lg border ${
													alert.resolved
														? 'bg-gray-50 border-gray-200'
														: 'bg-red-50 border-red-200'
												}`}
											>
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-2">
															{getSeverityIcon(alert.severity)}
															<h3 className="font-medium text-gray-900">
																{alert.alertType}
															</h3>
															<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
																{alert.severity}
															</span>
														</div>
														<p className="text-gray-600 mb-2">{alert.description}</p>
														<p className="text-sm text-gray-500">
															{formatTimestamp(alert.timestamp)}
														</p>
													</div>
													{!alert.resolved && (
														<button
															onClick={() => handleResolveAlert(alert.id)}
															className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
														>
															Resolve
														</button>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Backup & Restore Tab */}
					{activeTab === 'backup' && (
						<div className="space-y-6">
							<div className="bg-white p-6 rounded-lg shadow-sm border">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-xl font-semibold text-gray-900">Backup Management</h2>
									<button
										onClick={handleCreateBackup}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
									>
										<Download className="w-4 h-4" />
										Create Backup
									</button>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Backup ID
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Type
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Status
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Documents
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Created
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{backupHistory.map((backup) => (
												<tr key={backup.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
														{backup.backupId}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{backup.backupType}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															backup.status === 'completed' 
																? 'bg-green-100 text-green-800' 
																: 'bg-yellow-100 text-yellow-800'
														}`}>
															{backup.status}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{backup.totalDocuments || 0}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatTimestamp(backup.startTime)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* Encryption Tab */}
					{activeTab === 'encryption' && (
						<div className="bg-white p-6 rounded-lg shadow-sm border">
							<div className="mb-6">
								<h2 className="text-xl font-semibold text-gray-900 mb-2">Data Encryption</h2>
								<p className="text-gray-600">
									Manage encryption keys and monitor encrypted data access
								</p>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="p-4 bg-blue-50 rounded-lg">
									<div className="flex items-center gap-2 mb-2">
										<Lock className="w-5 h-5 text-blue-600" />
										<h3 className="font-medium text-gray-900">Encryption Status</h3>
									</div>
									<p className="text-sm text-gray-600">
										All sensitive data is encrypted using AES-256-GCM encryption
									</p>
								</div>
								<div className="p-4 bg-green-50 rounded-lg">
									<div className="flex items-center gap-2 mb-2">
										<Unlock className="w-5 h-5 text-green-600" />
										<h3 className="font-medium text-gray-900">Key Management</h3>
									</div>
									<p className="text-sm text-gray-600">
										Encryption keys are securely stored and automatically rotated
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SecurityDashboard;
