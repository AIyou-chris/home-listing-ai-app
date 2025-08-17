import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { 
	collection, 
	query, 
	onSnapshot, 
	orderBy, 
	limit, 
	where, 
	Timestamp,
	doc,
	getDoc,
	getDocs,
	startAfter,
	endBefore
} from 'firebase/firestore';
import { db } from './firebase';

// Types for admin analytics
export interface AdminMetrics {
	totalUsers: number;
	activeUsers: number;
	newUsersToday: number;
	totalProperties: number;
	totalInteractions: number;
	revenue: number;
	conversionRate: number;
	avgSessionDuration: number;
	topPerformingProperties: Array<{
		id: string;
		title: string;
		views: number;
		leads: number;
		conversionRate: number;
	}>;
	systemHealth: {
		status: 'healthy' | 'warning' | 'critical';
		uptime: number;
		responseTime: number;
		errorRate: number;
	};
}

export interface UserEngagementMetrics {
	totalUsers: number;
	activeUsers: {
		daily: number;
		weekly: number;
		monthly: number;
	};
	engagementScore: number;
	topEngagedUsers: Array<{
		userId: string;
		email: string;
		engagementScore: number;
		lastActivity: Date;
		interactions: number;
	}>;
	userRetention: {
		day1: number;
		day7: number;
		day30: number;
	};
	userSegments: {
		highEngagement: number;
		mediumEngagement: number;
		lowEngagement: number;
		inactive: number;
	};
}

export interface SystemPerformanceMetrics {
	responseTime: {
		average: number;
		p95: number;
		p99: number;
	};
	errorRate: number;
	throughput: {
		requestsPerMinute: number;
		requestsPerHour: number;
	};
	resourceUsage: {
		cpu: number;
		memory: number;
		storage: number;
	};
	functionPerformance: Array<{
		name: string;
		executionTime: number;
		errorRate: number;
		invocationCount: number;
	}>;
	uptime: number;
}

export interface RetentionMetrics {
	overallRetention: {
		day1: number;
		day7: number;
		day30: number;
		day90: number;
	};
	cohortAnalysis: Array<{
		cohort: string;
		day1: number;
		day7: number;
		day30: number;
		day90: number;
	}>;
	churnRate: {
		monthly: number;
		quarterly: number;
	};
	retentionBySegment: {
		premium: number;
		standard: number;
		free: number;
	};
	revenueRetention: number;
}

export interface RealTimeData {
	activeUsers: number;
	recentEvents: Array<{
		id: string;
		type: string;
		userId?: string;
		propertyId?: string;
		timestamp: Date;
		data?: any;
	}>;
	systemAlerts: Array<{
		id: string;
		type: string;
		severity: 'low' | 'medium' | 'high' | 'critical';
		message: string;
		timestamp: Date;
	}>;
	performanceMetrics: {
		responseTime: number;
		errorRate: number;
		throughput: number;
	};
}

// Analytics Service for tracking interactions and generating reports
export class AnalyticsService {
	private static instance: AnalyticsService;
	private functions = functions;
	private realTimeListeners: Map<string, () => void> = new Map();

	private constructor() {}

	public static getInstance(): AnalyticsService {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	// Track user interactions
	async trackInteraction(data: {
		eventType: string;
		eventData?: any;
		propertyId?: string;
		sessionId?: string;
		timestamp?: Date;
		userId?: string;
	}) {
		try {
			const trackInteractionFunction = httpsCallable(this.functions, 'trackInteraction');
			const result = await trackInteractionFunction({
				...data,
				timestamp: data.timestamp?.toISOString()
			});
			return result.data;
		} catch (error) {
			console.error('Error tracking interaction:', error);
			throw error;
		}
	}

	// Calculate metrics and conversion rates
	async calculateMetrics(data: {
		userId?: string;
		propertyId?: string;
		startDate?: string;
		endDate?: string;
		metrics?: string[];
	}) {
		try {
			const calculateMetricsFunction = httpsCallable(this.functions, 'calculateMetrics');
			const result = await calculateMetricsFunction(data);
			return result.data;
		} catch (error) {
			console.error('Error calculating metrics:', error);
			throw error;
		}
	}

	// Generate comprehensive reports
	async generateReport(data: {
		userId?: string;
		reportType: 'performance' | 'conversion' | 'user_behavior' | 'property_analytics' | 'comprehensive';
		startDate?: string;
		endDate?: string;
		propertyId?: string;
		format?: string;
		includeCharts?: boolean;
	}) {
		try {
			const generateReportFunction = httpsCallable(this.functions, 'generateReport');
			const result = await generateReportFunction(data);
			return result.data;
		} catch (error) {
			console.error('Error generating report:', error);
			throw error;
		}
	}

	// Export data for external analysis
	async exportData(data: {
		userId?: string;
		dataType: 'interactions' | 'properties' | 'analytics' | 'reports';
		startDate?: string;
		endDate?: string;
		propertyId?: string;
		format?: 'json' | 'csv' | 'excel';
		filters?: Array<{
			field: string;
			operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
			value: any;
		}>;
	}) {
		try {
			const exportDataFunction = httpsCallable(this.functions, 'exportData');
			const result = await exportDataFunction(data);
			return result.data;
		} catch (error) {
			console.error('Error exporting data:', error);
			throw error;
		}
	}

	// Helper method to track page views
	async trackPageView(pageName: string, additionalData?: any) {
		return this.trackInteraction({
			eventType: 'page_view',
			eventData: {
				pageName,
				...additionalData
			}
		});
	}

	// Helper method to track property views
	async trackPropertyView(propertyId: string, additionalData?: any) {
		return this.trackInteraction({
			eventType: 'property_view',
			propertyId,
			eventData: additionalData
		});
	}

	// Helper method to track contact form submissions
	async trackContactForm(propertyId?: string, formData?: any) {
		return this.trackInteraction({
			eventType: 'contact_form',
			propertyId,
			eventData: formData
		});
	}

	// Helper method to track phone calls
	async trackPhoneCall(propertyId?: string, callData?: any) {
		return this.trackInteraction({
			eventType: 'phone_call',
			propertyId,
			eventData: callData
		});
	}

	// Helper method to track email sends
	async trackEmailSent(propertyId?: string, emailData?: any) {
		return this.trackInteraction({
			eventType: 'email_sent',
			propertyId,
			eventData: emailData
		});
	}

	// Helper method to track appointment scheduling
	async trackAppointmentScheduled(propertyId?: string, appointmentData?: any) {
		return this.trackInteraction({
			eventType: 'appointment_scheduled',
			propertyId,
			eventData: appointmentData
		});
	}

	// Helper method to track favorites
	async trackFavoriteAdded(propertyId: string, favoriteData?: any) {
		return this.trackInteraction({
			eventType: 'favorite_added',
			propertyId,
			eventData: favoriteData
		});
	}

	// Helper method to track property shares
	async trackPropertyShare(propertyId: string, shareData?: any) {
		return this.trackInteraction({
			eventType: 'share_property',
			propertyId,
			eventData: shareData
		});
	}

	// Get real-time analytics
	async getRealTimeAnalytics(): Promise<RealTimeData> {
		try {
			// This would typically call a separate function or use Firestore directly
			// For now, we'll return a placeholder
			return {
				activeUsers: 0,
				recentEvents: [],
				systemAlerts: [],
				performanceMetrics: {
					responseTime: 0,
					errorRate: 0,
					throughput: 0
				}
			};
		} catch (error) {
			console.error('Error getting real-time analytics:', error);
			throw error;
		}
	}

	// Get user engagement score
	async getUserEngagementScore(userId: string, timeRange?: string) {
		try {
			const metrics = await this.calculateMetrics({
				userId,
				startDate: timeRange === '7d' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
				endDate: new Date().toISOString()
			});
			return metrics.metrics?.userEngagement || 0;
		} catch (error) {
			console.error('Error getting user engagement score:', error);
			throw error;
		}
	}

	// Get property performance metrics
	async getPropertyPerformance(propertyId: string, timeRange?: string) {
		try {
			const metrics = await this.calculateMetrics({
				propertyId,
				startDate: timeRange === '30d' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
				endDate: new Date().toISOString()
			});
			return metrics.metrics;
		} catch (error) {
			console.error('Error getting property performance:', error);
			throw error;
		}
	}

	// Get conversion funnel data
	async getConversionFunnel(timeRange?: string) {
		try {
			const metrics = await this.calculateMetrics({
				startDate: timeRange === '30d' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
				endDate: new Date().toISOString()
			});
			return {
				funnelData: metrics.metrics?.funnelData || [],
				conversionRates: metrics.metrics?.conversionRates || {}
			};
		} catch (error) {
			console.error('Error getting conversion funnel:', error);
			throw error;
		}
	}

	// Get time-based analytics
	async getTimeBasedAnalytics(timeRange: '24h' | '7d' | '30d' | '90d') {
		try {
			const startDate = new Date();
			switch (timeRange) {
				case '24h':
					startDate.setHours(startDate.getHours() - 24);
					break;
				case '7d':
					startDate.setDate(startDate.getDate() - 7);
					break;
				case '30d':
					startDate.setDate(startDate.getDate() - 30);
					break;
				case '90d':
					startDate.setDate(startDate.getDate() - 90);
					break;
			}

			const metrics = await this.calculateMetrics({
				startDate: startDate.toISOString(),
				endDate: new Date().toISOString()
			});

			return {
				hourly: metrics.metrics?.timeAnalysis?.hourly || {},
				daily: metrics.metrics?.timeAnalysis?.daily || {}
			};
		} catch (error) {
			console.error('Error getting time-based analytics:', error);
			throw error;
		}
	}

	// Download report as PDF/CSV
	async downloadReport(reportId: string, format: 'pdf' | 'csv' | 'excel') {
		try {
			const exportResult = await this.exportData({
				dataType: 'reports',
				format: format === 'pdf' ? 'json' : format,
				filters: [{
					field: 'id',
					operator: 'equals',
					value: reportId
				}]
			});

			// Create and download file
			if (format === 'csv' && typeof exportResult.data === 'string') {
				this.downloadCSV(exportResult.data, `report_${reportId}.csv`);
			} else if (format === 'excel') {
				this.downloadExcel(exportResult.data, `report_${reportId}.xlsx`);
			}

			return exportResult;
		} catch (error) {
			console.error('Error downloading report:', error);
			throw error;
		}
	}

	// Helper method to download CSV
	private downloadCSV(csvContent: string, filename: string) {
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	// Helper method to download Excel (placeholder)
	private downloadExcel(data: any, filename: string) {
		// In a real implementation, you'd use a library like SheetJS
		// For now, we'll just download as JSON
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename.replace('.xlsx', '.json');
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	// ===== ADMIN-SPECIFIC ANALYTICS =====

	// Get admin dashboard metrics
	async getAdminDashboardMetrics(): Promise<AdminMetrics> {
		try {
			const adminMetricsFunction = httpsCallable(this.functions, 'getAdminDashboardMetrics');
			const result = await adminMetricsFunction({});
			return result.data as AdminMetrics;
		} catch (error) {
			console.error('Error getting admin dashboard metrics:', error);
			throw error;
		}
	}

	// Get user engagement metrics
	async getUserEngagementMetrics(): Promise<UserEngagementMetrics> {
		try {
			const userEngagementFunction = httpsCallable(this.functions, 'getUserEngagementMetrics');
			const result = await userEngagementFunction({});
			return result.data as UserEngagementMetrics;
		} catch (error) {
			console.error('Error getting user engagement metrics:', error);
			throw error;
		}
	}

	// Get system performance metrics
	async getSystemPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
		try {
			const systemPerformanceFunction = httpsCallable(this.functions, 'getSystemPerformanceMetrics');
			const result = await systemPerformanceFunction({});
			return result.data as SystemPerformanceMetrics;
		} catch (error) {
			console.error('Error getting system performance metrics:', error);
			throw error;
		}
	}

	// Get retention metrics
	async getRetentionMetrics(): Promise<RetentionMetrics> {
		try {
			const retentionMetricsFunction = httpsCallable(this.functions, 'getRetentionMetrics');
			const result = await retentionMetricsFunction({});
			return result.data as RetentionMetrics;
		} catch (error) {
			console.error('Error getting retention metrics:', error);
			throw error;
		}
	}

	// ===== REAL-TIME LISTENERS =====

	// Listen to real-time user activity
	listenToUserActivity(callback: (data: any) => void, limit: number = 50): () => void {
		const q = query(
			collection(db, 'userInteractions'),
			orderBy('timestamp', 'desc'),
			limit(limit)
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const activities = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate()
			}));
			callback(activities);
		});

		this.realTimeListeners.set('userActivity', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time system alerts
	listenToSystemAlerts(callback: (alerts: any[]) => void, severity?: 'low' | 'medium' | 'high' | 'critical'): () => void {
		let q = query(
			collection(db, 'alerts'),
			orderBy('timestamp', 'desc'),
			limit(20)
		);

		if (severity) {
			q = query(q, where('severity', '==', severity));
		}

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const alerts = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate()
			}));
			callback(alerts);
		});

		this.realTimeListeners.set('systemAlerts', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time performance metrics
	listenToPerformanceMetrics(callback: (metrics: any) => void): () => void {
		const q = query(
			collection(db, 'performanceMetrics'),
			orderBy('timestamp', 'desc'),
			limit(1)
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			if (!snapshot.empty) {
				const doc = snapshot.docs[0];
				const metrics = {
					id: doc.id,
					...doc.data(),
					timestamp: doc.data().timestamp?.toDate()
				};
				callback(metrics);
			}
		});

		this.realTimeListeners.set('performanceMetrics', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time user count
	listenToActiveUsers(callback: (count: number) => void): () => void {
		const q = query(
			collection(db, 'activeUsers'),
			where('lastActivity', '>', Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000))) // Last 5 minutes
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			callback(snapshot.size);
		});

		this.realTimeListeners.set('activeUsers', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time property views
	listenToPropertyViews(callback: (views: any[]) => void, propertyId?: string): () => void {
		let q = query(
			collection(db, 'propertyViews'),
			orderBy('timestamp', 'desc'),
			limit(20)
		);

		if (propertyId) {
			q = query(q, where('propertyId', '==', propertyId));
		}

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const views = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate()
			}));
			callback(views);
		});

		this.realTimeListeners.set('propertyViews', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time conversion events
	listenToConversions(callback: (conversions: any[]) => void): () => void {
		const q = query(
			collection(db, 'conversions'),
			orderBy('timestamp', 'desc'),
			limit(50)
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const conversions = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate()
			}));
			callback(conversions);
		});

		this.realTimeListeners.set('conversions', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time revenue data
	listenToRevenue(callback: (revenue: any) => void): () => void {
		const q = query(
			collection(db, 'revenue'),
			orderBy('timestamp', 'desc'),
			limit(1)
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			if (!snapshot.empty) {
				const doc = snapshot.docs[0];
				const revenue = {
					id: doc.id,
					...doc.data(),
					timestamp: doc.data().timestamp?.toDate()
				};
				callback(revenue);
			}
		});

		this.realTimeListeners.set('revenue', unsubscribe);
		return unsubscribe;
	}

	// Listen to real-time system health
	listenToSystemHealth(callback: (health: any) => void): () => void {
		const q = query(
			collection(db, 'systemHealth'),
			orderBy('timestamp', 'desc'),
			limit(1)
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			if (!snapshot.empty) {
				const doc = snapshot.docs[0];
				const health = {
					id: doc.id,
					...doc.data(),
					timestamp: doc.data().timestamp?.toDate()
				};
				callback(health);
			}
		});

		this.realTimeListeners.set('systemHealth', unsubscribe);
		return unsubscribe;
	}

	// Stop all real-time listeners
	stopAllListeners(): void {
		this.realTimeListeners.forEach(unsubscribe => unsubscribe());
		this.realTimeListeners.clear();
	}

	// Stop specific listener
	stopListener(listenerName: string): void {
		const unsubscribe = this.realTimeListeners.get(listenerName);
		if (unsubscribe) {
			unsubscribe();
			this.realTimeListeners.delete(listenerName);
		}
	}

	// Get listener status
	getListenerStatus(): { [key: string]: boolean } {
		const status: { [key: string]: boolean } = {};
		this.realTimeListeners.forEach((_, key) => {
			status[key] = true;
		});
		return status;
	}
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
