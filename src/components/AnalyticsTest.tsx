import React, { useState } from 'react';
import { analyticsService } from '../services/analyticsService';

const AnalyticsTest: React.FC = () => {
	const [testResults, setTestResults] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	const addResult = (message: string) => {
		setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
	};

	const runTests = async () => {
		setLoading(true);
		setTestResults([]);

		try {
			// Test 1: Track interaction
			addResult('Testing trackInteraction...');
			await analyticsService.trackInteraction({
				eventType: 'page_view',
				eventData: { test: true, page: 'analytics-test' }
			});
			addResult('✅ trackInteraction successful');

			// Test 2: Track property view
			addResult('Testing trackPropertyView...');
			await analyticsService.trackPropertyView('test-property-123', { test: true });
			addResult('✅ trackPropertyView successful');

			// Test 3: Track contact form
			addResult('Testing trackContactForm...');
			await analyticsService.trackContactForm('test-property-123', { test: true });
			addResult('✅ trackContactForm successful');

			// Test 4: Calculate metrics
			addResult('Testing calculateMetrics...');
			const metricsResult = await analyticsService.calculateMetrics({
				startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date().toISOString()
			});
			addResult('✅ calculateMetrics successful');

			// Test 5: Generate report
			addResult('Testing generateReport...');
			const reportResult = await analyticsService.generateReport({
				reportType: 'performance',
				startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date().toISOString()
			});
			addResult('✅ generateReport successful');

			// Test 6: Export data
			addResult('Testing exportData...');
			const exportResult = await analyticsService.exportData({
				dataType: 'interactions',
				format: 'json',
				startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				endDate: new Date().toISOString()
			});
			addResult('✅ exportData successful');

			addResult('🎉 All tests completed successfully!');

		} catch (error) {
			addResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics System Test</h1>
					<p className="text-gray-600 mb-6">
						This component tests all the analytics functions to ensure they're working properly.
					</p>

					<button
						onClick={runTests}
						disabled={loading}
						className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
					>
						{loading ? 'Running Tests...' : 'Run Analytics Tests'}
					</button>

					{testResults.length > 0 && (
						<div className="bg-gray-100 rounded-lg p-4">
							<h3 className="font-semibold text-gray-900 mb-3">Test Results:</h3>
							<div className="space-y-1 max-h-96 overflow-y-auto">
								{testResults.map((result, index) => (
									<div key={index} className="text-sm font-mono">
										{result}
									</div>
								))}
							</div>
						</div>
					)}

					<div className="mt-6 p-4 bg-blue-50 rounded-lg">
						<h3 className="font-semibold text-blue-900 mb-2">Analytics Functions Available:</h3>
						<ul className="text-sm text-blue-800 space-y-1">
							<li>• trackInteraction() - Record user interactions</li>
							<li>• calculateMetrics() - Compute conversion rates and metrics</li>
							<li>• generateReport() - Create performance reports</li>
							<li>• exportData() - Export data for external analysis</li>
							<li>• Helper methods for specific event types</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AnalyticsTest;
