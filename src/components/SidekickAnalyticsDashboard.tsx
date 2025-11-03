import React, { useState, useEffect, useMemo } from 'react'
import { AISidekickRole } from '../context/AISidekickContext'

interface SidekickMetrics {
	sidekickId: AISidekickRole
	name: string
	totalConversations: number
	totalMessages: number
	avgResponseTime: number
	satisfactionScore: number
	leadConversions: number
	knowledgeBaseHits: number
	fallbackRate: number
	activeUsers: number
	peakHours: { hour: number; count: number }[]
	topTopics: { topic: string; count: number }[]
	languageBreakdown: { language: string; percentage: number }[]
	performanceTrend: { date: string; score: number }[]
}

interface ConversationAnalytics {
	totalConversations: number
	avgConversationLength: number
	completionRate: number
	escalationRate: number
	userRetentionRate: number
}

const SidekickAnalyticsDashboard: React.FC = () => {
	const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
	const [selectedSidekick, setSelectedSidekick] = useState<AISidekickRole | 'all'>('all')
	const [metrics, setMetrics] = useState<SidekickMetrics[]>([])
	const [isLoading, setIsLoading] = useState(true)

	// Generate demo data
	const generateDemoMetrics = (): SidekickMetrics[] => {
		const sidekicks: Array<{ id: AISidekickRole; name: string }> = [
			{ id: 'agent', name: 'Agent Sidekick' },
			{ id: 'marketing', name: 'Marketing Sidekick' },
			{ id: 'listing', name: 'Listing Sidekick' },
			{ id: 'sales', name: 'Sales Sidekick' },
			{ id: 'helper', name: 'Helper Sidekick' }
		]

		return sidekicks.map(sidekick => ({
			sidekickId: sidekick.id,
			name: sidekick.name,
			totalConversations: Math.floor(Math.random() * 500) + 100,
			totalMessages: Math.floor(Math.random() * 2000) + 500,
			avgResponseTime: Math.floor(Math.random() * 3000) + 500, // ms
			satisfactionScore: Math.floor(Math.random() * 30) + 70, // 70-100
			leadConversions: Math.floor(Math.random() * 50) + 10,
			knowledgeBaseHits: Math.floor(Math.random() * 200) + 50,
			fallbackRate: Math.floor(Math.random() * 15) + 5, // 5-20%
			activeUsers: Math.floor(Math.random() * 100) + 20,
			peakHours: Array.from({ length: 24 }, (_, i) => ({
				hour: i,
				count: Math.floor(Math.random() * 50) + (i >= 9 && i <= 17 ? 20 : 5)
			})),
			topTopics: [
				{ topic: 'Property Details', count: Math.floor(Math.random() * 100) + 50 },
				{ topic: 'Pricing', count: Math.floor(Math.random() * 80) + 30 },
				{ topic: 'Scheduling', count: Math.floor(Math.random() * 60) + 20 },
				{ topic: 'Location Info', count: Math.floor(Math.random() * 40) + 15 },
				{ topic: 'Amenities', count: Math.floor(Math.random() * 30) + 10 }
			],
			languageBreakdown: [
				{ language: 'English', percentage: 85 },
				{ language: 'Spanish', percentage: 10 },
				{ language: 'French', percentage: 3 },
				{ language: 'German', percentage: 2 }
			],
			performanceTrend: Array.from({ length: 30 }, (_, i) => ({
				date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				score: Math.floor(Math.random() * 20) + 75 + Math.sin(i / 5) * 5
			}))
		}))
	}

	useEffect(() => {
		setIsLoading(true)
		// Simulate API call
		setTimeout(() => {
			const demoMetrics = generateDemoMetrics()
			setMetrics(demoMetrics)
			setIsLoading(false)
		}, 1000)
	}, [selectedTimeframe])

	const filteredMetrics = useMemo(() => {
		if (selectedSidekick === 'all') return metrics
		return metrics.filter(m => m.sidekickId === selectedSidekick)
	}, [metrics, selectedSidekick])

	const overallStats = useMemo(() => {
		if (!metrics.length) return null
		return {
			totalConversations: metrics.reduce((sum, m) => sum + m.totalConversations, 0),
			avgSatisfaction: Math.round(metrics.reduce((sum, m) => sum + m.satisfactionScore, 0) / metrics.length),
			totalLeadConversions: metrics.reduce((sum, m) => sum + m.leadConversions, 0),
			avgResponseTime: Math.round(metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length)
		}
	}, [metrics])

	const conversationAnalytics = useMemo<ConversationAnalytics | null>(() => {
		if (!metrics.length) return null
		return {
			totalConversations: metrics.reduce((sum, m) => sum + m.totalConversations, 0),
			avgConversationLength: 4.2,
			completionRate: 87,
			escalationRate: 8,
			userRetentionRate: 73
		}
	}, [metrics])

	const getPerformanceColor = (score: number) => {
		if (score >= 90) return 'text-green-600'
		if (score >= 80) return 'text-blue-600'
		if (score >= 70) return 'text-yellow-600'
		return 'text-red-600'
	}

	const getPerformanceBadgeColor = (score: number) => {
		if (score >= 90) return 'bg-green-100 text-green-800'
		if (score >= 80) return 'bg-blue-100 text-blue-800'
		if (score >= 70) return 'bg-yellow-100 text-yellow-800'
		return 'bg-red-100 text-red-800'
	}

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
					<span className="ml-3 text-slate-600">Loading sidekick analytics...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">AI Sidekick Analytics</h1>
					<p className="text-slate-600">Performance insights and metrics for your AI assistants</p>
				</div>
				<div className="flex gap-3">
					<select
						value={selectedSidekick}
						onChange={(e) => setSelectedSidekick(e.target.value as AISidekickRole | 'all')}
						className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
					>
						<option value="all">All Sidekicks</option>
						<option value="agent">Agent Sidekick</option>
						<option value="marketing">Marketing Sidekick</option>
						<option value="listing">Listing Sidekick</option>
						<option value="sales">Sales Sidekick</option>
						<option value="helper">Helper Sidekick</option>
					</select>
					<select
						value={selectedTimeframe}
						onChange={(e) => setSelectedTimeframe(e.target.value as '24h' | '7d' | '30d' | '90d')}
						className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
					>
						<option value="24h">Last 24 Hours</option>
						<option value="7d">Last 7 Days</option>
						<option value="30d">Last 30 Days</option>
						<option value="90d">Last 90 Days</option>
					</select>
				</div>
			</div>

			{/* Overall Stats */}
			{overallStats && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white p-4 rounded-lg border border-slate-200">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600">Total Conversations</p>
								<p className="text-2xl font-bold text-slate-900">{overallStats.totalConversations.toLocaleString()}</p>
							</div>
							<span className="material-symbols-outlined text-blue-500">chat</span>
						</div>
					</div>
					<div className="bg-white p-4 rounded-lg border border-slate-200">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600">Avg Satisfaction</p>
								<p className={`text-2xl font-bold ${getPerformanceColor(overallStats.avgSatisfaction)}`}>
									{overallStats.avgSatisfaction}%
								</p>
							</div>
							<span className="material-symbols-outlined text-green-500">sentiment_satisfied</span>
						</div>
					</div>
					<div className="bg-white p-4 rounded-lg border border-slate-200">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600">Lead Conversions</p>
								<p className="text-2xl font-bold text-slate-900">{overallStats.totalLeadConversions}</p>
							</div>
							<span className="material-symbols-outlined text-amber-500">trending_up</span>
						</div>
					</div>
					<div className="bg-white p-4 rounded-lg border border-slate-200">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-slate-600">Avg Response Time</p>
								<p className="text-2xl font-bold text-slate-900">{(overallStats.avgResponseTime / 1000).toFixed(1)}s</p>
							</div>
							<span className="material-symbols-outlined text-purple-500">speed</span>
						</div>
					</div>
				</div>
			)}

			{/* Sidekick Performance Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
				{filteredMetrics.map((sidekick) => (
					<div key={sidekick.sidekickId} className="bg-white rounded-lg border border-slate-200 p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-slate-900">{sidekick.name}</h3>
							<span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceBadgeColor(sidekick.satisfactionScore)}`}>
								{sidekick.satisfactionScore}% Satisfaction
							</span>
						</div>

						<div className="space-y-3">
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Conversations</span>
								<span className="text-sm font-medium">{sidekick.totalConversations.toLocaleString()}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Messages</span>
								<span className="text-sm font-medium">{sidekick.totalMessages.toLocaleString()}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Response Time</span>
								<span className="text-sm font-medium">{(sidekick.avgResponseTime / 1000).toFixed(1)}s</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Lead Conversions</span>
								<span className="text-sm font-medium text-green-600">{sidekick.leadConversions}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">KB Hit Rate</span>
								<span className="text-sm font-medium">{Math.round((sidekick.knowledgeBaseHits / sidekick.totalMessages) * 100)}%</span>
							</div>
							<div className="flex justify-between">
								<span className="text-sm text-slate-600">Fallback Rate</span>
								<span className={`text-sm font-medium ${sidekick.fallbackRate > 15 ? 'text-red-600' : 'text-green-600'}`}>
									{sidekick.fallbackRate}%
								</span>
							</div>
						</div>

						{/* Top Topics */}
						<div className="mt-4 pt-4 border-t border-slate-100">
							<h4 className="text-sm font-medium text-slate-700 mb-2">Top Topics</h4>
							<div className="space-y-1">
								{sidekick.topTopics.slice(0, 3).map((topic, idx) => (
									<div key={idx} className="flex justify-between text-xs">
										<span className="text-slate-600">{topic.topic}</span>
										<span className="font-medium">{topic.count}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Detailed Analytics */}
			{conversationAnalytics && (
				<div className="bg-white rounded-lg border border-slate-200 p-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Conversation Analytics</h3>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="text-center">
							<p className="text-2xl font-bold text-blue-600">{conversationAnalytics.avgConversationLength}</p>
							<p className="text-sm text-slate-600">Avg Messages/Conversation</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-green-600">{conversationAnalytics.completionRate}%</p>
							<p className="text-sm text-slate-600">Completion Rate</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-yellow-600">{conversationAnalytics.escalationRate}%</p>
							<p className="text-sm text-slate-600">Escalation Rate</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-purple-600">{conversationAnalytics.userRetentionRate}%</p>
							<p className="text-sm text-slate-600">User Retention</p>
						</div>
					</div>
				</div>
			)}

			{/* Language Breakdown */}
			{selectedSidekick !== 'all' && filteredMetrics.length === 1 && (
				<div className="bg-white rounded-lg border border-slate-200 p-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Language Distribution</h3>
					<div className="space-y-3">
						{filteredMetrics[0].languageBreakdown.map((lang, idx) => (
							<div key={idx} className="flex items-center justify-between">
								<span className="text-sm text-slate-700">{lang.language}</span>
								<div className="flex items-center gap-2">
									<div className="w-32 bg-slate-200 rounded-full h-2">
										<div 
											className="bg-blue-600 h-2 rounded-full" 
											style={{ width: `${lang.percentage}%` }}
										></div>
									</div>
									<span className="text-sm font-medium text-slate-600">{lang.percentage}%</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export default SidekickAnalyticsDashboard
