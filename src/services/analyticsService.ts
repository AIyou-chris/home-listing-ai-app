// Firebase removed: replace callable function usage with local no-ops
// Firebase removed: stubbed realtime listeners and data access

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

// Generic callable response shapes used by frontend consumers
export interface CalculateMetricsResult {
	success: boolean;
	metrics?: any;
	message?: string;
	data?: any;
}

export interface GenerateReportResult {
	success: boolean;
	reportId?: string;
	reportType?: string;
	content?: string;
	data?: any;
	generatedAt?: string;
}

export interface ExportDataResult {
	success: boolean;
	data?: any;
	message?: string;
}

export interface TrackInteractionResult {
	success: boolean;
	data?: any;
}

// Analytics Service for tracking interactions and generating reports
export class AnalyticsService {
	private static instance: AnalyticsService;
	private realTimeListeners: Map<string, () => void> = new Map();

	private constructor() {}

	public static getInstance(): AnalyticsService {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	async trackInteraction(_data: {
		eventType: string;
		eventData?: any;
		propertyId?: string;
		sessionId?: string;
		timestamp?: Date;
		userId?: string;
	}) {
		return { success: true } as TrackInteractionResult;
	}

	async calculateMetrics(_data: {
		userId?: string;
		propertyId?: string;
		startDate?: string;
		endDate?: string;
		metrics?: string[];
	}) {
		return { success: true, metrics: {} } as CalculateMetricsResult;
	}

	async generateReport(_data: {
		userId?: string;
		reportType: 'performance' | 'conversion' | 'user_behavior' | 'property_analytics' | 'comprehensive';
		startDate?: string;
		endDate?: string;
		propertyId?: string;
		format?: string;
		includeCharts?: boolean;
	}) {
		return { success: true, reportId: `rep_${Date.now()}`, generatedAt: new Date().toISOString() } as GenerateReportResult;
	}

	async exportData(_data: {
		userId?: string;
		dataType: 'interactions' | 'properties' | 'analytics' | 'reports';
		startDate?: string;
		endDate?: string;
		propertyId?: string;
		format?: 'json' | 'csv' | 'excel';
		filters?: Array<{ field: string; operator: 'equals' | 'contains' | 'greater_than' | 'less_than'; value: any }>;
	}) {
		return { success: true, data: [] } as ExportDataResult;
	}

	async trackPageView(pageName: string, additionalData?: any) {
		return this.trackInteraction({ eventType: 'page_view', eventData: { pageName, ...additionalData } });
	}

	async trackPropertyView(propertyId: string, additionalData?: any) {
		return this.trackInteraction({ eventType: 'property_view', propertyId, eventData: additionalData });
	}

	async trackContactForm(propertyId?: string, formData?: any) {
		return this.trackInteraction({ eventType: 'contact_form', propertyId, eventData: formData });
	}

	async trackPhoneCall(propertyId?: string, callData?: any) {
		return this.trackInteraction({ eventType: 'phone_call', propertyId, eventData: callData });
	}

	async trackEmailSent(propertyId?: string, emailData?: any) {
		return this.trackInteraction({ eventType: 'email_sent', propertyId, eventData: emailData });
	}

	async trackAppointmentScheduled(propertyId?: string, appointmentData?: any) {
		return this.trackInteraction({ eventType: 'appointment_scheduled', propertyId, eventData: appointmentData });
	}

	async trackFavoriteAdded(propertyId: string, favoriteData?: any) {
		return this.trackInteraction({ eventType: 'favorite_added', propertyId, eventData: favoriteData });
	}

	async trackPropertyShare(propertyId: string, shareData?: any) {
		return this.trackInteraction({ eventType: 'share_property', propertyId, eventData: shareData });
	}

	async getRealTimeAnalytics(): Promise<RealTimeData> {
		return { activeUsers: 0, recentEvents: [], systemAlerts: [], performanceMetrics: { responseTime: 0, errorRate: 0, throughput: 0 } };
	}

	async getUserEngagementScore(_userId: string, _timeRange?: string) { return 0; }
	async getPropertyPerformance(_propertyId: string, _timeRange?: string) { return {}; }
	async getConversionFunnel(_timeRange?: string) { return { funnelData: [], conversionRates: {} }; }
	async getTimeBasedAnalytics(_timeRange: '24h' | '7d' | '30d' | '90d') { return { hourly: {}, daily: {} } as any; }
	async downloadReport(_reportId: string, _format: 'pdf' | 'csv' | 'excel') { return { success: true } as ExportDataResult; }

	async getAdminDashboardMetrics(): Promise<AdminMetrics> {
		return { totalUsers: 0, activeUsers: 0, newUsersToday: 0, totalProperties: 0, totalInteractions: 0, revenue: 0, conversionRate: 0, avgSessionDuration: 0, topPerformingProperties: [], systemHealth: { status: 'healthy', uptime: 100, responseTime: 0, errorRate: 0 } };
	}
	async getUserEngagementMetrics(): Promise<UserEngagementMetrics> {
		return { totalUsers: 0, activeUsers: { daily: 0, weekly: 0, monthly: 0 }, engagementScore: 0, topEngagedUsers: [], userRetention: { day1: 0, day7: 0, day30: 0 }, userSegments: { highEngagement: 0, mediumEngagement: 0, lowEngagement: 0, inactive: 0 } };
	}
	async getSystemPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
		return { responseTime: { average: 0, p95: 0, p99: 0 }, errorRate: 0, throughput: { requestsPerMinute: 0, requestsPerHour: 0 }, resourceUsage: { cpu: 0, memory: 0, storage: 0 }, functionPerformance: [], uptime: 100 };
	}
	async getRetentionMetrics(): Promise<RetentionMetrics> {
		return { overallRetention: { day1: 0, day7: 0, day30: 0, day90: 0 }, cohortAnalysis: [], churnRate: { monthly: 0, quarterly: 0 }, retentionBySegment: { premium: 0, standard: 0, free: 0 }, revenueRetention: 0 };
	}

	listenToUserActivity(_callback: (data: any) => void, _maxResults: number = 50): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('userActivity', unsub);
		return unsub;
	}
	listenToSystemAlerts(_callback: (alerts: any[]) => void, _severity?: 'low' | 'medium' | 'high' | 'critical'): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('systemAlerts', unsub);
		return unsub;
	}
	listenToPerformanceMetrics(_callback: (metrics: any) => void): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('performanceMetrics', unsub);
		return unsub;
	}
	listenToActiveUsers(_callback: (count: number) => void): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('activeUsers', unsub);
		return unsub;
	}
	listenToPropertyViews(_callback: (views: any[]) => void, _propertyId?: string): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('propertyViews', unsub);
		return unsub;
	}
	listenToConversions(_callback: (conversions: any[]) => void): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('conversions', unsub);
		return unsub;
	}
	listenToRevenue(_callback: (revenue: any) => void): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('revenue', unsub);
		return unsub;
	}
	listenToSystemHealth(_callback: (health: any) => void): () => void {
		const unsub = () => {};
		this.realTimeListeners.set('systemHealth', unsub);
		return unsub;
	}

	stopAllListeners(): void { this.realTimeListeners.forEach(unsub => unsub()); this.realTimeListeners.clear(); }
	stopListener(listenerName: string): void { const unsub = this.realTimeListeners.get(listenerName); if (unsub) { unsub(); this.realTimeListeners.delete(listenerName); } }
	getListenerStatus(): { [key: string]: boolean } { const status: { [key: string]: boolean } = {}; this.realTimeListeners.forEach((_, key) => { status[key] = true; }); return status; }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
