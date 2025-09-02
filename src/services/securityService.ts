// Firebase removed

const functions = getFunctions();
const auth = getAuth();

// Security Service for handling all security and compliance operations
export class SecurityService {
	// User validation and permission checking
	static async validateUser(params: {
		userId?: string;
		requiredPermissions?: string[];
		resourceId?: string;
		resourceType?: string;
	}) {
		try {
			const validateUserFunction = httpsCallable(functions, 'validateUser');
			const result = await validateUserFunction(params);
			return result.data;
		} catch (error: any) {
			console.error('User validation error:', error);
			throw new Error(`User validation failed: ${error.message || 'Unknown error'}`);
		}
	}

	// Audit logging
	static async auditAction(params: {
		action: string;
		resourceType: string;
		resourceId?: string;
		details?: any;
		severity?: 'info' | 'warning' | 'error' | 'critical';
		userId?: string;
	}) {
		try {
			const auditActionFunction = httpsCallable(functions, 'auditAction');
			const result = await auditActionFunction(params);
			return result.data;
		} catch (error) {
			console.error('Audit action error:', error);
			throw error;
		}
	}

	// Data encryption
	static async encryptData(params: {
		dataToEncrypt: any;
		encryptionType?: string;
		userId?: string;
	}) {
		try {
			const encryptDataFunction = httpsCallable(functions, 'encryptData');
			const result = await encryptDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data encryption error:', error);
			throw error;
		}
	}

	// Data decryption
	static async decryptData(params: {
		encryptedDataId: string;
		keyId: string;
	}) {
		try {
			const decryptDataFunction = httpsCallable(functions, 'decryptData');
			const result = await decryptDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data decryption error:', error);
			throw error;
		}
	}

	// Data backup
	static async backupData(params: {
		backupType?: string;
		collections?: string[];
		userId?: string;
		includeMetadata?: boolean;
	}) {
		try {
			const backupDataFunction = httpsCallable(functions, 'backupData');
			const result = await backupDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data backup error:', error);
			throw error;
		}
	}

	// Data restore
	static async restoreData(params: {
		backupId: string;
		collections?: string[];
		restoreMode?: 'selective' | 'overwrite';
	}) {
		try {
			const restoreDataFunction = httpsCallable(functions, 'restoreData');
			const result = await restoreDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data restore error:', error);
			throw error;
		}
	}

	// Security monitoring
	static async monitorSecurity(params: {
		monitoringType: 'audit_logs' | 'failed_logins' | 'suspicious_activity' | 'data_access' | 'comprehensive';
		timeRange?: '1h' | '24h' | '7d' | '30d';
	}) {
		try {
			const monitorSecurityFunction = httpsCallable(functions, 'monitorSecurity');
			const result = await monitorSecurityFunction(params);
			return result.data;
		} catch (error) {
			console.error('Security monitoring error:', error);
			throw error;
		}
	}

	// Get security reports
	static async getSecurityReports(params: {
		startDate?: string;
		endDate?: string;
		reportType?: string;
		limit?: number;
	}) {
		try {
			const getSecurityReportsFunction = httpsCallable(functions, 'getSecurityReports');
			const result = await getSecurityReportsFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get security reports error:', error);
			throw error;
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
	}) {
		try {
			const getAuditLogsFunction = httpsCallable(functions, 'getAuditLogs');
			const result = await getAuditLogsFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get audit logs error:', error);
			throw error;
		}
	}

	// Get security alerts
	static async getSecurityAlerts(params: {
		userId?: string;
		severity?: string;
		resolved?: boolean;
		limit?: number;
	}) {
		try {
			const getSecurityAlertsFunction = httpsCallable(functions, 'getSecurityAlerts');
			const result = await getSecurityAlertsFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get security alerts error:', error);
			throw error;
		}
	}

	// Resolve security alert
	static async resolveSecurityAlert(params: {
		alertId: string;
		resolution?: string;
	}) {
		try {
			const resolveSecurityAlertFunction = httpsCallable(functions, 'resolveSecurityAlert');
			const result = await resolveSecurityAlertFunction(params);
			return result.data;
		} catch (error) {
			console.error('Resolve security alert error:', error);
			throw error;
		}
	}

	// Get backup history
	static async getBackupHistory(params: {
		backupType?: string;
		status?: string;
		limit?: number;
	}) {
		try {
			const getBackupHistoryFunction = httpsCallable(functions, 'getBackupHistory');
			const result = await getBackupHistoryFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get backup history error:', error);
			throw error;
		}
	}

	// Get restore history
	static async getRestoreHistory(params: {
		restoreMode?: string;
		status?: string;
		limit?: number;
	}) {
		try {
			const getRestoreHistoryFunction = httpsCallable(functions, 'getRestoreHistory');
			const result = await getRestoreHistoryFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get restore history error:', error);
			throw error;
		}
	}

	// User management and role assignment
	static async manageUserRole(params: {
		targetUserId: string;
		newRole: string;
		permissions?: string[];
		reason?: string;
	}) {
		try {
			const manageUserRoleFunction = httpsCallable(functions, 'manageUserRole');
			const result = await manageUserRoleFunction(params);
			return result.data;
		} catch (error) {
			console.error('User role management error:', error);
			throw error;
		}
	}

	// Data retention and cleanup
	static async cleanupExpiredData(params: {
		dataType?: string;
		retentionDays?: number;
		dryRun?: boolean;
	}) {
		try {
			const cleanupExpiredDataFunction = httpsCallable(functions, 'cleanupExpiredData');
			const result = await cleanupExpiredDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data cleanup error:', error);
			throw error;
		}
	}

	// GDPR compliance - Right to be forgotten
	static async deleteUserData(params: {
		userId: string;
		reason?: string;
		includeAuditLogs?: boolean;
	}) {
		try {
			const deleteUserDataFunction = httpsCallable(functions, 'deleteUserData');
			const result = await deleteUserDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('User deletion error:', error);
			throw error;
		}
	}

	// Data export for GDPR compliance
	static async exportUserData(params: {
		userId: string;
		dataTypes?: string[];
	}) {
		try {
			const exportUserDataFunction = httpsCallable(functions, 'exportUserData');
			const result = await exportUserDataFunction(params);
			return result.data;
		} catch (error) {
			console.error('Data export error:', error);
			throw error;
		}
	}

	// Security policy management
	static async updateSecurityPolicy(params: {
		policyType: string;
		policyData?: any;
		enabled?: boolean;
	}) {
		try {
			const updateSecurityPolicyFunction = httpsCallable(functions, 'updateSecurityPolicy');
			const result = await updateSecurityPolicyFunction(params);
			return result.data;
		} catch (error) {
			console.error('Security policy update error:', error);
			throw error;
		}
	}

	// Get security policies
	static async getSecurityPolicies(params: {
		policyType?: string;
	}) {
		try {
			const getSecurityPoliciesFunction = httpsCallable(functions, 'getSecurityPolicies');
			const result = await getSecurityPoliciesFunction(params);
			return result.data;
		} catch (error) {
			console.error('Get security policies error:', error);
			throw error;
		}
	}

	// Automated security checks
	static async runSecurityChecks(params: {
		checkTypes?: string[];
	}) {
		try {
			const runSecurityChecksFunction = httpsCallable(functions, 'runSecurityChecks');
			const result = await runSecurityChecksFunction(params);
			return result.data;
		} catch (error) {
			console.error('Security checks error:', error);
			throw error;
		}
	}

	// Check user permissions
	static async checkPermissions(requiredPermissions: string[]) {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			const result = await this.validateUser({
				userId: currentUser.uid,
				requiredPermissions
			});

			return result.isValid;
		} catch (error) {
			console.error('Permission check error:', error);
			return false;
		}
	}

	// Log user action with automatic context
	static async logAction(action: string, resourceType: string, details?: any) {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) {
				console.warn('Cannot log action: user not authenticated');
				return;
			}

			await this.auditAction({
				action,
				resourceType,
				details: {
					...details,
					userAgent: navigator.userAgent,
					sessionId: this.getSessionId(),
					timestamp: new Date().toISOString()
				}
			});
		} catch (error) {
			console.error('Action logging error:', error);
		}
	}

	// Encrypt sensitive data
	static async encryptSensitiveData(data: any, encryptionType = 'standard') {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			const result = await this.encryptData({
				dataToEncrypt: data,
				encryptionType,
				userId: currentUser.uid
			});

			return result;
		} catch (error) {
			console.error('Sensitive data encryption error:', error);
			throw error;
		}
	}

	// Decrypt sensitive data
	static async decryptSensitiveData(encryptedDataId: string, keyId: string) {
		try {
			const result = await this.decryptData({
				encryptedDataId,
				keyId
			});

			return result.decryptedData;
		} catch (error) {
			console.error('Sensitive data decryption error:', error);
			throw error;
		}
	}

	// Create automated backup
	static async createBackup(collections?: string[]) {
		try {
			const result = await this.backupData({
				backupType: 'automated',
				collections: collections || ['users', 'properties', 'auditLogs'],
				includeMetadata: true
			});

			return result;
		} catch (error) {
			console.error('Backup creation error:', error);
			throw error;
		}
	}

	// Get comprehensive security status
	static async getSecurityStatus() {
		try {
			const [auditReport, alertsReport, backupReport] = await Promise.all([
				this.monitorSecurity({ monitoringType: 'audit_logs', timeRange: '24h' }),
				this.monitorSecurity({ monitoringType: 'suspicious_activity', timeRange: '24h' }),
				this.getBackupHistory({ limit: 5 })
			]);

			return {
				auditStatus: auditReport,
				alertsStatus: alertsReport,
				backupStatus: backupReport,
				lastUpdated: new Date().toISOString()
			};
		} catch (error) {
			console.error('Security status error:', error);
			throw error;
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
	static readonly SECURITY_LEVELS = {
		LOW: 'low',
		MEDIUM: 'medium',
		HIGH: 'high',
		CRITICAL: 'critical'
	} as const;

	static readonly AUDIT_SEVERITY = {
		INFO: 'info',
		WARNING: 'warning',
		ERROR: 'error',
		CRITICAL: 'critical'
	} as const;

	static readonly BACKUP_TYPES = {
		MANUAL: 'manual',
		AUTOMATED: 'automated',
		SCHEDULED: 'scheduled'
	} as const;

	static readonly RESTORE_MODES = {
		SELECTIVE: 'selective',
		OVERWRITE: 'overwrite'
	} as const;
}

// Security middleware for automatic logging
export const securityMiddleware = {
	// Wrap function calls with security logging
	withAudit: <T extends any[], R>(
		fn: (...args: T) => Promise<R>,
		action: string,
		resourceType: string
	) => {
		return async (...args: T): Promise<R> => {
			try {
				// Log action start
				await SecurityService.logAction(`${action}_started`, resourceType, {
					args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
				});

				// Execute function
				const result = await fn(...args);

				// Log successful completion
				await SecurityService.logAction(`${action}_completed`, resourceType, {
					success: true
				});

				return result;
			} catch (error) {
				// Log error
				await SecurityService.logAction(`${action}_failed`, resourceType, {
					error: error instanceof Error ? error.message : 'Unknown error',
					success: false
				});

				throw error;
			}
		};
	},

	// Check permissions before executing
	withPermission: <T extends any[], R>(
		fn: (...args: T) => Promise<R>,
		requiredPermissions: string[]
	) => {
		return async (...args: T): Promise<R> => {
			const hasPermission = await SecurityService.checkPermissions(requiredPermissions);
			if (!hasPermission) {
				throw new Error('Insufficient permissions');
			}
			return fn(...args);
		};
	}
};

// Security hooks for React components
export const useSecurity = () => {
	const checkPermission = async (permissions: string[]) => {
		return await SecurityService.checkPermissions(permissions);
	};

	const logAction = async (action: string, resourceType: string, details?: any) => {
		return await SecurityService.logAction(action, resourceType, details);
	};

	const getSecurityStatus = async () => {
		return await SecurityService.getSecurityStatus();
	};

	return {
		checkPermission,
		logAction,
		getSecurityStatus
	};
};

export default SecurityService;
