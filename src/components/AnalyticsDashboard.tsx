import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

interface AnalyticsData {
	overview: {
		totalInteractions: number;
		uniqueUsers: number;
		uniqueSessions: number;
		averageInteractionsPerUser: number;
		averageInteractionsPerSession: number;
	};
	eventBreakdown: Record<string, number>;
	funnelData: Array<{ step: string; count: number }>;
	conversionRates: Record<string, number>;
	timeAnalysis: {
		hourly: Record<string, number>;
		daily: Record<string, number>;
	};
	userEngagement: number;
}

type ReportType =
  | 'comprehensive'
  | 'performance'
  | 'conversion'
  | 'user_behavior'
  | 'property_analytics';

interface ReportData {
  reportId: string;
  reportType: ReportType;
  content: string;
  data: Record<string, unknown> | null;
  generatedAt: Date;
}

type ExportReportsResponse = {
  success?: boolean;
  data?: unknown;
};

type GenerateReportResponse = {
  success?: boolean;
  reportId?: unknown;
  reportType?: unknown;
  content?: unknown;
  data?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isAnalyticsMetricsResponse = (value: unknown): value is { success: true; metrics: AnalyticsData } =>
  isPlainObject(value) && value.success === true && isPlainObject(value.metrics);

const isExportReportsSuccess = (
  value: unknown,
): value is ExportReportsResponse & { success: true } => isPlainObject(value) && value.success === true;

const isGenerateReportSuccess = (
  value: unknown,
): value is GenerateReportResponse & { success: true } => isPlainObject(value) && value.success === true;

const toReportDataList = (value: unknown): ReportData[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isPlainObject(item)) return [];

    const reportId = typeof item.reportId === 'string' ? item.reportId : crypto.randomUUID();
    const rawType = item.reportType;
    const reportType: ReportType =
      rawType === 'performance' ||
      rawType === 'conversion' ||
      rawType === 'user_behavior' ||
      rawType === 'property_analytics'
        ? rawType
        : 'comprehensive';
    const content = typeof item.content === 'string' ? item.content : '';
    const data = isPlainObject(item.data) ? item.data : null;
    const generatedAtRaw = item.generatedAt;
    const generatedAt =
      generatedAtRaw instanceof Date
        ? generatedAtRaw
        : typeof generatedAtRaw === 'string'
          ? new Date(generatedAtRaw)
          : new Date();

    return [
      {
        reportId,
        reportType,
        content,
        data,
        generatedAt,
      },
    ];
  });
};

const buildReportFromGenerateResponse = (
  response: GenerateReportResponse,
  fallbackType: ReportType,
): ReportData => {
  const reportId = typeof response.reportId === 'string' ? response.reportId : crypto.randomUUID();
  const rawType = response.reportType;
  const reportType: ReportType =
    rawType === 'comprehensive' ||
    rawType === 'performance' ||
    rawType === 'conversion' ||
    rawType === 'user_behavior' ||
    rawType === 'property_analytics'
      ? rawType
      : fallbackType;
  const content = typeof response.content === 'string' ? response.content : '';
  const data = isPlainObject(response.data) ? response.data : null;

  return {
    reportId,
    reportType,
    content,
    data,
    generatedAt: new Date(),
  };
};

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('comprehensive');
  const [generatingReport, setGeneratingReport] = useState(false);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
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
        default:
          break;
      }

      const response = await analyticsService.calculateMetrics({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      });

      if (isAnalyticsMetricsResponse(response)) {
        setAnalyticsData(response.metrics as AnalyticsData);
      } else {
        setAnalyticsData(null);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const loadReports = useCallback(async () => {
    try {
      const response = await analyticsService.exportData({
        dataType: 'reports',
        format: 'json',
      });

      if (isExportReportsSuccess(response)) {
        setReports(toReportDataList(response.data).slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }, []);

  const generateReport = useCallback(async () => {
    try {
      setGeneratingReport(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await analyticsService.generateReport({
        reportType: selectedReportType,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        format: 'text',
        includeCharts: true,
      });

      if (isGenerateReportSuccess(response)) {
        setReports((prev) => {
          const next = [buildReportFromGenerateResponse(response, selectedReportType), ...prev];
          return next.slice(0, 10);
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(false);
    }
  }, [selectedReportType]);

  const downloadReport = useCallback(async (reportId: string, format: 'pdf' | 'csv' | 'excel') => {
    try {
      await analyticsService.downloadReport(reportId, format);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  }, []);

  const trackDemoInteraction = useCallback(
    async (eventType: string) => {
      try {
        await analyticsService.trackInteraction({
          eventType,
          eventData: { demo: true, timestamp: new Date().toISOString() },
        });
        await loadAnalyticsData();
      } catch (error) {
        console.error('Error tracking demo interaction:', error);
      }
    },
    [loadAnalyticsData],
  );

  useEffect(() => {
    void loadAnalyticsData();
  }, [loadAnalyticsData]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleReportTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportType(event.target.value as ReportType);
  };

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="bg-white p-6 rounded-lg shadow">
									<div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
									<div className="h-8 bg-gray-200 rounded w-1/3"></div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
					<p className="text-gray-600">Track performance, conversions, and user behavior</p>
				</div>

				{/* Time Range Selector */}
				<div className="mb-6 flex flex-wrap gap-4 items-center">
					<div className="flex space-x-2">
						{(['24h', '7d', '30d', '90d'] as const).map((range) => (
							<button
								key={range}
								onClick={() => setTimeRange(range)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
									timeRange === range
										? 'bg-blue-600 text-white'
										: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
								}`}
							>
								{range}
							</button>
						))}
					</div>

					{/* Demo Interaction Buttons */}
					<div className="flex space-x-2 ml-auto">
						<button
							onClick={() => trackDemoInteraction('page_view')}
							className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
						>
							Track Page View
						</button>
						<button
							onClick={() => trackDemoInteraction('contact_form')}
							className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
						>
							Track Contact
						</button>
					</div>
				</div>

				<div className="mb-10">
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Link Sharing</h2>
					<p className="text-sm text-gray-600 mb-4 max-w-3xl">
						Link shortening is no longer supported. Share listing and AI Card URLs directly from the listings view or the AI Card builder.
					</p>
				</div>

				{/* Overview Cards */}
				{analyticsData && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-sm font-medium text-gray-500 mb-2">Total Interactions</h3>
							<p className="text-3xl font-bold text-gray-900">
								{analyticsData.overview.totalInteractions.toLocaleString()}
							</p>
						</div>
						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-sm font-medium text-gray-500 mb-2">Unique Users</h3>
							<p className="text-3xl font-bold text-gray-900">
								{analyticsData.overview.uniqueUsers.toLocaleString()}
							</p>
						</div>
						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-sm font-medium text-gray-500 mb-2">User Engagement</h3>
							<p className="text-3xl font-bold text-gray-900">
								{analyticsData.userEngagement.toLocaleString()}
							</p>
						</div>
						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-sm font-medium text-gray-500 mb-2">Avg. Interactions/User</h3>
							<p className="text-3xl font-bold text-gray-900">
								{analyticsData.overview.averageInteractionsPerUser.toFixed(1)}
							</p>
						</div>
					</div>
				)}

				{/* Charts and Analytics */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					{/* Event Breakdown */}
					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Event Breakdown</h3>
						<div className="space-y-3">
							{analyticsData?.eventBreakdown && Object.entries(analyticsData.eventBreakdown).map(([event, count]) => (
								<div key={event} className="flex justify-between items-center">
									<span className="text-sm text-gray-600 capitalize">
										{event.replace('_', ' ')}
									</span>
									<span className="text-sm font-medium text-gray-900">
										{count.toLocaleString()}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Conversion Funnel */}
					<div className="bg-white p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
						<div className="space-y-3">
							{analyticsData?.funnelData.map((step, index) => (
								<div key={step.step} className="flex justify-between items-center">
									<span className="text-sm text-gray-600 capitalize">
										{step.step.replace('_', ' ')}
									</span>
									<div className="flex items-center space-x-2">
										<span className="text-sm font-medium text-gray-900">
											{step.count.toLocaleString()}
										</span>
										{index > 0 && analyticsData?.conversionRates && (
											<span className="text-xs text-gray-500">
												({analyticsData.conversionRates[`${analyticsData.funnelData[index - 1].step}_to_${step.step}`] || 0}%)
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Reports Section */}
				<div className="bg-white rounded-lg shadow">
					<div className="p-6 border-b border-gray-200">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-semibold text-gray-900">Reports</h3>
							<div className="flex space-x-3">
                <select
                  value={selectedReportType}
                  onChange={handleReportTypeChange}
									className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="comprehensive">Comprehensive</option>
									<option value="performance">Performance</option>
									<option value="conversion">Conversion</option>
									<option value="user_behavior">User Behavior</option>
									<option value="property_analytics">Property Analytics</option>
								</select>
								<button
									onClick={generateReport}
									disabled={generatingReport}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{generatingReport ? 'Generating...' : 'Generate Report'}
								</button>
							</div>
						</div>
					</div>

					<div className="p-6">
						{reports.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-gray-500">No reports generated yet. Create your first report above.</p>
							</div>
						) : (
							<div className="space-y-4">
								{reports.map((report) => (
									<div key={report.reportId} className="border border-gray-200 rounded-lg p-4">
										<div className="flex justify-between items-start mb-3">
											<div>
												<h4 className="font-medium text-gray-900 capitalize">
													{report.reportType.replace('_', ' ')} Report
												</h4>
												<p className="text-sm text-gray-500">
													Generated: {new Date(report.generatedAt).toLocaleDateString()}
												</p>
											</div>
											<div className="flex space-x-2">
												<button
													onClick={() => downloadReport(report.reportId, 'csv')}
													className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
												>
													CSV
												</button>
												<button
													onClick={() => downloadReport(report.reportId, 'excel')}
													className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
												>
													Excel
												</button>
											</div>
										</div>
										<div className="text-sm text-gray-600 line-clamp-3">
											{report.content}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Data Export Section */}
				<div className="mt-8 bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<button
							onClick={() => analyticsService.exportData({
								dataType: 'interactions',
								format: 'csv',
								startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
								endDate: new Date().toISOString()
							})}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
						>
							<h4 className="font-medium text-gray-900">Export Interactions</h4>
							<p className="text-sm text-gray-500">Download user interaction data as CSV</p>
						</button>
						<button
							onClick={() => analyticsService.exportData({
								dataType: 'analytics',
								format: 'json',
								startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
								endDate: new Date().toISOString()
							})}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
						>
							<h4 className="font-medium text-gray-900">Export Analytics</h4>
							<p className="text-sm text-gray-500">Download calculated metrics as JSON</p>
						</button>
						<button
							onClick={() => analyticsService.exportData({
								dataType: 'reports',
								format: 'excel'
							})}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
						>
							<h4 className="font-medium text-gray-900">Export Reports</h4>
							<p className="text-sm text-gray-500">Download all reports as Excel</p>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AnalyticsDashboard;
