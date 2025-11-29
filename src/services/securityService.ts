// Firebase removed
// Supabase-backed lightweight security service
// Mocking flag for local/dev usage. When true, service methods return mock data and avoid network calls.
export const MOCK_MODE = true;
import { supabase } from './supabase'
import { resolveUserId } from './userId'

interface ValidationResult {
	isValid: boolean
	reason?: string
}

type AuditDetails = Record<string, unknown> | null

interface AuditLogRow {
	id: string
	user_id: string
	action: string
	resource_type: string
	resource_id: string | null
	severity: 'info' | 'warning' | 'error' | 'critical'
	details: AuditDetails
	created_at: string
}

interface AuditLogsResponse {
	auditLogs: AuditLogRow[]
}

interface AuditActionResult {
	success: boolean
	error?: string
}

interface SecurityAlertRow {
	id: string
	alert_type: string
	description: string
	severity: string
	resolved: boolean
	created_at: string
	resolution?: string | null
}

interface SecurityAlertsResponse {
	alerts: SecurityAlertRow[]
}

interface BackupRow {
	id: string
	backup_type: string
	status: string
	file_path: string
	created_at: string
}

interface BackupHistoryResponse {
	backups: BackupRow[]
}

interface OperationResult {
	success: boolean
	error?: string
}

interface BackupResult extends OperationResult {
	filePath?: string
}

interface EncryptionResult {
	ciphertext: string
	encryptionType: string
}

interface SecurityStatusSnapshot {
	auditStatus: AuditLogsResponse
	alertsStatus: SecurityAlertsResponse
	backupStatus: BackupHistoryResponse
	lastUpdated: string
}

// Security Service for handling all security and compliance operations
export class SecurityService {
	// User validation and permission checking (dev-allow)
	static async validateUser(_params: {
		userId?: string;
		requiredPermissions?: string[];
		resourceId?: string;
		resourceType?: string;
	}): Promise<ValidationResult> {
		return { isValid: true };
	}

	// Audit logging
	static async auditAction(params: {
		action: string;
		resourceType: string;
		resourceId?: string;
		details?: Record<string, unknown> | null;
		severity?: 'info' | 'warning' | 'error' | 'critical';
		userId?: string;
	}): Promise<AuditActionResult> {
			if (MOCK_MODE) {
				console.debug('[MOCK] auditAction', params);
				return { success: true };
			}
			try {
				const uid = params.userId || resolveUserId();
				const { error } = await supabase.from('audit_logs').insert({
					user_id: uid,
					action: params.action,
					resource_type: params.resourceType,
					resource_id: params.resourceId || null,
					severity: params.severity || 'info',
					details: params.details ?? null
				});
				if (error) throw error;
				return { success: true };
			} catch (err) {
				console.error('auditAction error:', err);
				return { success: false, error: err instanceof Error ? err.message : String(err) };
			}
	}

	// Get audit logs
	static async getAuditLogs(params: {
		userId?: string;
		action?: string;
		resourceType?: string;
		startDate?: string;
		endDate?: string;
		limit?: number;
	}): Promise<AuditLogsResponse> {
			if (MOCK_MODE) {
				return {
					auditLogs: [
						{ id: 'm1', user_id: 'demo', action: 'login', resource_type: 'auth', resource_id: null, severity: 'info', details: { ip: '127.0.0.1' }, created_at: new Date(Date.now() - 120000).toISOString() },
						{ id: 'm2', user_id: 'demo', action: 'view_dashboard', resource_type: 'ui', resource_id: null, severity: 'info', details: {}, created_at: new Date(Date.now() - 600000).toISOString() }
					]
				};
			}
			try {
				let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
				if (params.startDate) q = q.gte('created_at', params.startDate);
				if (params.endDate) q = q.lte('created_at', params.endDate);
				if (params.action) q = q.eq('action', params.action);
				if (params.resourceType) q = q.eq('resource_type', params.resourceType);
				if (params.limit) q = q.limit(params.limit);
				const { data, error } = await q;
				if (error) throw error;
				return { auditLogs: (data as AuditLogRow[] | null) || [] };
			} catch (err) {
				console.error('getAuditLogs error:', err);
				return { auditLogs: [] };
			}
	}

	// Get security alerts
	static async getSecurityAlerts(params: {
		userId?: string;
		severity?: string;
		resolved?: boolean;
		limit?: number;
	}): Promise<SecurityAlertsResponse> {
			if (MOCK_MODE) {
				return {
					alerts: [
						{ id: 'a1', alert_type: 'failed_login', description: 'Multiple failed login attempts', severity: 'low', resolved: false, created_at: new Date(Date.now() - 300000).toISOString() },
						{ id: 'a2', alert_type: 'rate_limit', description: 'API rate limit exceeded', severity: 'medium', resolved: true, created_at: new Date(Date.now() - 7200000).toISOString() }
					]
				};
			}
			try {
				let q = supabase.from('security_alerts').select('*').order('created_at', { ascending: false });
				if (params.severity) q = q.eq('severity', params.severity);
				if (typeof params.resolved === 'boolean') q = q.eq('resolved', params.resolved);
				if (params.limit) q = q.limit(params.limit);
				const { data, error } = await q;
				if (error) throw error;
				return { alerts: (data as SecurityAlertRow[] | null) || [] };
			} catch (err) {
				console.error('getSecurityAlerts error:', err);
				return { alerts: [] };
			}
	}

	// Resolve security alert
	static async resolveSecurityAlert(params: { alertId: string; resolution?: string }): Promise<OperationResult> {
			if (MOCK_MODE) {
				console.debug('[MOCK] resolveSecurityAlert', params);
				return { success: true };
			}
			try {
				const { error } = await supabase
					.from('security_alerts')
					.update({ resolved: true, resolution: params.resolution || null })
					.eq('id', params.alertId);
				if (error) throw error;
				return { success: true };
			} catch (err) {
				console.error('resolveSecurityAlert error:', err);
				return { success: false, error: err instanceof Error ? err.message : String(err) };
			}
	}

	// Create security alert (for testing or manual alerts)
	static async createSecurityAlert(params: { alertType: string; description: string; severity?: string }): Promise<OperationResult> {
			if (MOCK_MODE) {
				console.debug('[MOCK] createSecurityAlert', params);
				return { success: true };
			}
			try {
				const { error } = await supabase.from('security_alerts').insert({
					alert_type: params.alertType,
					description: params.description,
					severity: params.severity || 'warning',
					resolved: false
				});
				if (error) throw error;
				return { success: true };
			} catch (err) {
				console.error('createSecurityAlert error:', err);
				return { success: false, error: err instanceof Error ? err.message : String(err) };
			}
	}

	// Get backup history
	static async getBackupHistory(params: { backupType?: string; status?: string; limit?: number }): Promise<BackupHistoryResponse> {
			if (MOCK_MODE) {
				return {
					backups: [
						{ id: 'b1', backup_type: 'manual', status: 'completed', file_path: 'backup_123.json', created_at: new Date(Date.now() - 86400000).toISOString() },
						{ id: 'b2', backup_type: 'scheduled', status: 'completed', file_path: 'backup_124.json', created_at: new Date(Date.now() - 2*86400000).toISOString() }
					]
				};
			}
			try {
				let q = supabase.from('backups').select('*').order('created_at', { ascending: false });
				if (params.backupType) q = q.eq('backup_type', params.backupType);
				if (params.status) q = q.eq('status', params.status);
				if (params.limit) q = q.limit(params.limit);
				const { data, error } = await q;
				if (error) throw error;
				return { backups: (data as BackupRow[] | null) || [] };
			} catch (err) {
				console.error('getBackupHistory error:', err);
				return { backups: [] };
			}
	}

	// Create backup (manifest-only)
	static async createBackup(collections?: string[]): Promise<BackupResult> {
			if (MOCK_MODE) {
				console.debug('[MOCK] createBackup', collections);
				return { success: true, filePath: `backup_${Date.now()}.json` };
			}
			try {
				const bucket = 'backups';
				const filename = `backup_${Date.now()}.json`;
				const manifest = {
					collections: collections || ['users', 'properties', 'audit_logs', 'security_alerts'],
					created_at: new Date().toISOString()
				};
				const { error: uploadErr } = await supabase.storage
					.from(bucket)
					.upload(filename, new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), { upsert: true });
				if (uploadErr) throw uploadErr;
				const { error } = await supabase.from('backups').insert({ backup_type: 'manual', status: 'completed', file_path: filename });
				if (error) throw error;
				return { success: true, filePath: filename };
			} catch (err) {
				console.error('createBackup error:', err);
				return { success: false, error: err instanceof Error ? err.message : String(err) };
			}
	}

	// Check user permissions (dev-allow)
	static async checkPermissions(_requiredPermissions: string[]): Promise<boolean> {
		return true;
	}

	// Log user action with automatic context
	static async logAction(action: string, resourceType: string, details?: Record<string, unknown>) {
			try {
				const uid = resolveUserId();
				const detailPayload: Record<string, unknown> = {
					...(details ?? {}),
					userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
					sessionId: this.getSessionId(),
					timestamp: new Date().toISOString()
				};
				await this.auditAction({
					action,
					resourceType,
					userId: uid,
					details: detailPayload
				});
			} catch (err) {
				console.error('logAction error:', err);
			}
	}

	// Encrypt/Decrypt placeholders (keep API stable)
	static async encryptSensitiveData(data: unknown, encryptionType = 'standard'): Promise<EncryptionResult> {
		const serialized = typeof data === 'string' ? data : JSON.stringify(data ?? null);
		return { ciphertext: btoa(serialized ?? ''), encryptionType };
	}

	static async decryptSensitiveData(encryptedDataId: string, _keyId: string): Promise<unknown> {
		return JSON.parse(atob(encryptedDataId));
	}

	// Get comprehensive security status
	static async getSecurityStatus(): Promise<SecurityStatusSnapshot> {
			try {
				const [logs, alerts, backups] = await Promise.all([
					this.getAuditLogs({ limit: 5 }),
					this.getSecurityAlerts({ limit: 5 }),
					this.getBackupHistory({ limit: 5 })
				]);
				return { auditStatus: logs, alertsStatus: alerts, backupStatus: backups, lastUpdated: new Date().toISOString() };
			} catch (err) {
				console.error('getSecurityStatus error:', err);
				// Fallback mock aggregate
				return {
					auditStatus: await this.getAuditLogs({ limit: 5 }),
					alertsStatus: await this.getSecurityAlerts({ limit: 5 }),
					backupStatus: await this.getBackupHistory({ limit: 5 }),
					lastUpdated: new Date().toISOString()
				};
			}
	}

	// Generate session ID for tracking
	private static getSessionId(): string {
		let sessionId = sessionStorage.getItem('security_session_id');
		if (!sessionId) {
			sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			sessionStorage.setItem('security_session_id', sessionId);
		}
		return sessionId;
	}

	// Security constants and utilities
	static readonly SECURITY_LEVELS = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' } as const;
	static readonly AUDIT_SEVERITY = { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'critical' } as const;
	static readonly BACKUP_TYPES = { MANUAL: 'manual', AUTOMATED: 'automated', SCHEDULED: 'scheduled' } as const;
	static readonly RESTORE_MODES = { SELECTIVE: 'selective', OVERWRITE: 'overwrite' } as const;
}

// Security middleware for automatic logging
export const securityMiddleware = {
	withAudit: <T extends unknown[], R>(fn: (...args: T) => Promise<R>, action: string, resourceType: string) => {
		return async (...args: T): Promise<R> => {
			const argsSummary = args.map(arg => {
				if (typeof arg === 'object' && arg !== null) {
					return '[Object]';
				}
				return String(arg);
			});
			await SecurityService.logAction(`${action}_started`, resourceType, { args: argsSummary });
			try {
				const result = await fn(...args);
				await SecurityService.logAction(`${action}_completed`, resourceType, { success: true });
				return result;
			} catch (error) {
				await SecurityService.logAction(`${action}_failed`, resourceType, { error: error instanceof Error ? error.message : 'Unknown error', success: false });
				throw error;
			}
		};
	},
	withPermission: <T extends unknown[], R>(fn: (...args: T) => Promise<R>, _requiredPermissions: string[]) => {
		return async (...args: T): Promise<R> => { return fn(...args); };
	}
};

// Security hooks for React components
export const useSecurity = () => {
	const checkPermission = async (permissions: string[]) => { return await SecurityService.checkPermissions(permissions); };
	const logAction = async (action: string, resourceType: string, details?: Record<string, unknown>) => { return await SecurityService.logAction(action, resourceType, details); };
	const getSecurityStatus = async () => { return await SecurityService.getSecurityStatus(); };
	return { checkPermission, logAction, getSecurityStatus };
};

export default SecurityService;
