import React, { useState, useEffect } from 'react'
import { AISidekickRole } from '../context/AISidekickContext'

interface AssignmentRule {
	id: string
	name: string
	priority: number
	enabled: boolean
	conditions: {
		source: string[]
		leadScore: { min: number; max: number }
		timeOfDay: { start: string; end: string }
		userLanguage: string[]
		conversationType: string[]
		propertyType: string[]
		priceRange: { min: number; max: number }
		userBehavior: string[]
	}
	assignment: {
		sidekickId: AISidekickRole
		escalationRules: {
			enabled: boolean
			conditions: string[]
			escalateTo: AISidekickRole | 'human_agent'
		}
		responseStyle: 'formal' | 'casual' | 'enthusiastic' | 'professional'
		maxConversationLength: number
	}
	performance: {
		totalAssignments: number
		successRate: number
		avgSatisfaction: number
		avgResponseTime: number
	}
}

interface AssignmentLog {
	id: string
	timestamp: string
	leadId: string
	leadName: string
	originalSidekick: AISidekickRole | null
	assignedSidekick: AISidekickRole
	ruleId: string
	ruleName: string
	reason: string
	context: {
		source: string
		leadScore: number
		language: string
		conversationType: string
	}
	outcome: 'successful' | 'escalated' | 'failed' | 'pending'
}

type TabId = 'rules' | 'create' | 'logs' | 'analytics'

const TAB_OPTIONS: Array<{ id: TabId; label: string; icon: string }> = [
	{ id: 'rules', label: 'Assignment Rules', icon: 'rule' },
	{ id: 'create', label: 'Create Rule', icon: 'add_circle' },
	{ id: 'logs', label: 'Assignment Logs', icon: 'history' },
	{ id: 'analytics', label: 'Analytics', icon: 'analytics' }
]

const SidekickAutoAssignment: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabId>('rules')
	const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([])
	const [assignmentLogs, setAssignmentLogs] = useState<AssignmentLog[]>([])
	const [selectedRule, setSelectedRule] = useState<string | null>(null)

	// Initialize demo data
	useEffect(() => {
		const demoRules: AssignmentRule[] = [
			{
				id: 'rule-1',
				name: 'High-Value Hot Leads',
				priority: 1,
				enabled: true,
				conditions: {
					source: ['website', 'referral'],
					leadScore: { min: 80, max: 100 },
					timeOfDay: { start: '09:00', end: '18:00' },
					userLanguage: ['en'],
					conversationType: ['property_inquiry', 'scheduling'],
					propertyType: ['luxury', 'commercial'],
					priceRange: { min: 500000, max: 10000000 },
					userBehavior: ['multiple_inquiries', 'quick_responses']
				},
				assignment: {
					sidekickId: 'agent',
					escalationRules: {
						enabled: true,
						conditions: ['complex_question', 'pricing_negotiation'],
						escalateTo: 'human_agent'
					},
					responseStyle: 'professional',
					maxConversationLength: 10
				},
				performance: {
					totalAssignments: 45,
					successRate: 92,
					avgSatisfaction: 4.7,
					avgResponseTime: 1200
				}
			},
			{
				id: 'rule-2',
				name: 'Property-Specific Inquiries',
				priority: 2,
				enabled: true,
				conditions: {
					source: ['listing_page', 'property_search'],
					leadScore: { min: 40, max: 100 },
					timeOfDay: { start: '00:00', end: '23:59' },
					userLanguage: ['en', 'es'],
					conversationType: ['property_details', 'amenities'],
					propertyType: ['residential', 'condo'],
					priceRange: { min: 0, max: 1000000 },
					userBehavior: ['browsing', 'detailed_questions']
				},
				assignment: {
					sidekickId: 'listing',
					escalationRules: {
						enabled: true,
						conditions: ['scheduling_request', 'pricing_question'],
						escalateTo: 'agent'
					},
					responseStyle: 'enthusiastic',
					maxConversationLength: 15
				},
				performance: {
					totalAssignments: 128,
					successRate: 87,
					avgSatisfaction: 4.3,
					avgResponseTime: 800
				}
			},
			{
				id: 'rule-3',
				name: 'Marketing & General Support',
				priority: 3,
				enabled: true,
				conditions: {
					source: ['social_media', 'email_campaign'],
					leadScore: { min: 0, max: 60 },
					timeOfDay: { start: '00:00', end: '23:59' },
					userLanguage: ['en', 'es', 'fr'],
					conversationType: ['general_inquiry', 'market_info'],
					propertyType: [],
					priceRange: { min: 0, max: 10000000 },
					userBehavior: ['casual_browsing', 'information_seeking']
				},
				assignment: {
					sidekickId: 'marketing',
					escalationRules: {
						enabled: true,
						conditions: ['specific_property_request'],
						escalateTo: 'listing'
					},
					responseStyle: 'casual',
					maxConversationLength: 20
				},
				performance: {
					totalAssignments: 89,
					successRate: 78,
					avgSatisfaction: 4.1,
					avgResponseTime: 1500
				}
			}
		]

		const demoLogs: AssignmentLog[] = [
			{
				id: 'log-1',
				timestamp: '2024-01-16T14:30:00Z',
				leadId: 'lead-1',
				leadName: 'Sarah Johnson',
				originalSidekick: null,
				assignedSidekick: 'agent',
				ruleId: 'rule-1',
				ruleName: 'High-Value Hot Leads',
				reason: 'Lead score 85, luxury property inquiry',
				context: {
					source: 'website',
					leadScore: 85,
					language: 'en',
					conversationType: 'property_inquiry'
				},
				outcome: 'successful'
			},
			{
				id: 'log-2',
				timestamp: '2024-01-16T13:15:00Z',
				leadId: 'lead-2',
				leadName: 'Mike Chen',
				originalSidekick: 'marketing',
				assignedSidekick: 'listing',
				ruleId: 'rule-2',
				ruleName: 'Property-Specific Inquiries',
				reason: 'Escalated from marketing due to specific property request',
				context: {
					source: 'listing_page',
					leadScore: 52,
					language: 'en',
					conversationType: 'property_details'
				},
				outcome: 'successful'
			},
			{
				id: 'log-3',
				timestamp: '2024-01-16T12:45:00Z',
				leadId: 'lead-3',
				leadName: 'Emma Davis',
				originalSidekick: null,
				assignedSidekick: 'marketing',
				ruleId: 'rule-3',
				ruleName: 'Marketing & General Support',
				reason: 'Low lead score, general market inquiry',
				context: {
					source: 'social_media',
					leadScore: 22,
					language: 'en',
					conversationType: 'market_info'
				},
				outcome: 'pending'
			}
		]

		setAssignmentRules(demoRules)
		setAssignmentLogs(demoLogs)
	}, [])

	const getOutcomeColor = (outcome: AssignmentLog['outcome']) => {
		switch (outcome) {
			case 'successful': return 'bg-green-100 text-green-800'
			case 'escalated': return 'bg-blue-100 text-blue-800'
			case 'failed': return 'bg-red-100 text-red-800'
			case 'pending': return 'bg-yellow-100 text-yellow-800'
			default: return 'bg-slate-100 text-slate-800'
		}
	}

	const getPerformanceColor = (value: number, type: 'rate' | 'satisfaction' | 'time') => {
		if (type === 'rate') {
			if (value >= 90) return 'text-green-600'
			if (value >= 80) return 'text-blue-600'
			return 'text-yellow-600'
		}
		if (type === 'satisfaction') {
			if (value >= 4.5) return 'text-green-600'
			if (value >= 4.0) return 'text-blue-600'
			return 'text-yellow-600'
		}
		if (type === 'time') {
			if (value <= 1000) return 'text-green-600'
			if (value <= 1500) return 'text-blue-600'
			return 'text-yellow-600'
		}
		return 'text-slate-600'
	}

	const toggleRule = (ruleId: string) => {
		setAssignmentRules(prev => prev.map(rule => 
			rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
		))
	}

	const renderRules = () => (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-slate-900">Assignment Rules</h3>
				<button
					onClick={() => setActiveTab('create')}
					className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
				>
					Create Rule
				</button>
			</div>

			<div className="space-y-3">
				{assignmentRules
					.sort((a, b) => a.priority - b.priority)
					.map(rule => (
						<div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-6">
							<div className="flex justify-between items-start mb-4">
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-slate-500">#{rule.priority}</span>
										<input
											type="checkbox"
											checked={rule.enabled}
											onChange={() => toggleRule(rule.id)}
											className="rounded"
										/>
									</div>
									<div>
										<h4 className="text-lg font-medium text-slate-900">{rule.name}</h4>
										<p className="text-sm text-slate-600 capitalize">
											Assigns to {rule.assignment.sidekickId} sidekick
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className={`px-3 py-1 rounded-full text-xs font-medium ${rule.enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
										{rule.enabled ? 'Active' : 'Disabled'}
									</span>
									<button
										onClick={() => setSelectedRule(selectedRule === rule.id ? null : rule.id)}
										className="px-3 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
									>
										{selectedRule === rule.id ? 'Hide' : 'Details'}
									</button>
								</div>
							</div>

							{/* Performance Metrics */}
							<div className="grid grid-cols-4 gap-4 mb-4">
								<div className="text-center">
									<p className="text-lg font-semibold text-slate-900">{rule.performance.totalAssignments}</p>
									<p className="text-xs text-slate-600">Assignments</p>
								</div>
								<div className="text-center">
									<p className={`text-lg font-semibold ${getPerformanceColor(rule.performance.successRate, 'rate')}`}>
										{rule.performance.successRate}%
									</p>
									<p className="text-xs text-slate-600">Success Rate</p>
								</div>
								<div className="text-center">
									<p className={`text-lg font-semibold ${getPerformanceColor(rule.performance.avgSatisfaction, 'satisfaction')}`}>
										{rule.performance.avgSatisfaction}
									</p>
									<p className="text-xs text-slate-600">Satisfaction</p>
								</div>
								<div className="text-center">
									<p className={`text-lg font-semibold ${getPerformanceColor(rule.performance.avgResponseTime, 'time')}`}>
										{(rule.performance.avgResponseTime / 1000).toFixed(1)}s
									</p>
									<p className="text-xs text-slate-600">Response Time</p>
								</div>
							</div>

							{/* Detailed Conditions */}
							{selectedRule === rule.id && (
								<div className="pt-4 border-t border-slate-100">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h5 className="font-medium text-slate-900 mb-2">Conditions</h5>
											<div className="space-y-2 text-sm">
												<div className="flex justify-between">
													<span className="text-slate-600">Lead Score:</span>
													<span>{rule.conditions.leadScore.min}-{rule.conditions.leadScore.max}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-slate-600">Time:</span>
													<span>{rule.conditions.timeOfDay.start}-{rule.conditions.timeOfDay.end}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-slate-600">Sources:</span>
													<span>{rule.conditions.source.join(', ')}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-slate-600">Languages:</span>
													<span>{rule.conditions.userLanguage.join(', ')}</span>
												</div>
											</div>
										</div>
										<div>
											<h5 className="font-medium text-slate-900 mb-2">Assignment Settings</h5>
											<div className="space-y-2 text-sm">
												<div className="flex justify-between">
													<span className="text-slate-600">Style:</span>
													<span className="capitalize">{rule.assignment.responseStyle}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-slate-600">Max Length:</span>
													<span>{rule.assignment.maxConversationLength} messages</span>
												</div>
												<div className="flex justify-between">
													<span className="text-slate-600">Escalation:</span>
													<span>{rule.assignment.escalationRules.enabled ? 'Enabled' : 'Disabled'}</span>
												</div>
												{rule.assignment.escalationRules.enabled && (
													<div className="flex justify-between">
														<span className="text-slate-600">Escalate To:</span>
														<span className="capitalize">{rule.assignment.escalationRules.escalateTo.replace('_', ' ')}</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					))}
			</div>
		</div>
	)

	const renderCreateRule = () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold text-slate-900">Create Assignment Rule</h3>
			
			<div className="bg-white border border-slate-200 rounded-lg p-6">
				<div className="space-y-6">
					{/* Basic Info */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Rule Name</label>
							<input
								type="text"
								placeholder="Enter rule name"
								className="w-full px-3 py-2 border border-slate-300 rounded-lg"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
							<select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
								<option value="1">1 (Highest)</option>
								<option value="2">2</option>
								<option value="3">3</option>
								<option value="4">4</option>
								<option value="5">5 (Lowest)</option>
							</select>
						</div>
					</div>

					{/* Conditions */}
					<div>
						<h4 className="font-medium text-slate-900 mb-3">Conditions</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Lead Score Range</label>
								<div className="flex gap-2">
									<input type="number" placeholder="Min" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
									<input type="number" placeholder="Max" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Time of Day</label>
								<div className="flex gap-2">
									<input type="time" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
									<input type="time" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Lead Sources</label>
								<div className="space-y-2">
									{['website', 'social_media', 'referral', 'email_campaign', 'listing_page'].map(source => (
										<div key={source} className="flex items-center gap-2">
											<input type="checkbox" id={source} className="rounded" />
											<label htmlFor={source} className="text-sm text-slate-700 capitalize">
												{source.replace('_', ' ')}
											</label>
										</div>
									))}
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Languages</label>
								<div className="space-y-2">
									{['en', 'es', 'fr', 'de', 'pt'].map(lang => (
										<div key={lang} className="flex items-center gap-2">
											<input type="checkbox" id={lang} className="rounded" />
											<label htmlFor={lang} className="text-sm text-slate-700 uppercase">{lang}</label>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Assignment Settings */}
					<div>
						<h4 className="font-medium text-slate-900 mb-3">Assignment Settings</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Assign to Sidekick</label>
								<select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
									<option value="agent">Agent Sidekick</option>
									<option value="marketing">Marketing Sidekick</option>
									<option value="listing">Listing Sidekick</option>
									<option value="sales">Sales Sidekick</option>
									<option value="helper">Helper Sidekick</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Response Style</label>
								<select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
									<option value="professional">Professional</option>
									<option value="casual">Casual</option>
									<option value="enthusiastic">Enthusiastic</option>
									<option value="formal">Formal</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Max Conversation Length</label>
								<input
									type="number"
									placeholder="Number of messages"
									className="w-full px-3 py-2 border border-slate-300 rounded-lg"
								/>
							</div>
						</div>
					</div>

					{/* Escalation Rules */}
					<div>
						<div className="flex items-center gap-2 mb-3">
							<input type="checkbox" id="enableEscalation" className="rounded" />
							<label htmlFor="enableEscalation" className="font-medium text-slate-900">
								Enable Escalation Rules
							</label>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Escalate To</label>
								<select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
									<option value="agent">Agent Sidekick</option>
									<option value="sales">Sales Sidekick</option>
									<option value="human_agent">Human Agent</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Escalation Triggers</label>
								<div className="space-y-2">
									{['complex_question', 'pricing_negotiation', 'scheduling_request', 'complaint'].map(trigger => (
										<div key={trigger} className="flex items-center gap-2">
											<input type="checkbox" id={trigger} className="rounded" />
											<label htmlFor={trigger} className="text-sm text-slate-700 capitalize">
												{trigger.replace('_', ' ')}
											</label>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							onClick={() => setActiveTab('rules')}
							className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
						>
							Cancel
						</button>
						<button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
							Create Rule
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderLogs = () => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-slate-900">Assignment Logs</h3>
			
			<div className="space-y-3">
				{assignmentLogs.map(log => (
					<div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4">
						<div className="flex justify-between items-start mb-3">
							<div>
								<h4 className="font-medium text-slate-900">{log.leadName}</h4>
								<p className="text-sm text-slate-600">
									{log.originalSidekick ? `${log.originalSidekick} → ` : ''}
									<span className="capitalize">{log.assignedSidekick}</span> sidekick
								</p>
							</div>
							<div className="flex items-center gap-2">
								<span className={`px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(log.outcome)}`}>
									{log.outcome}
								</span>
								<span className="text-xs text-slate-500">
									{new Date(log.timestamp).toLocaleString()}
								</span>
							</div>
						</div>
						
						<div className="text-sm text-slate-700 mb-2">
							<strong>Rule:</strong> {log.ruleName}
						</div>
						<div className="text-sm text-slate-600 mb-3">
							<strong>Reason:</strong> {log.reason}
						</div>
						
						<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
							<span><strong>Source:</strong> {log.context.source}</span>
							<span><strong>Score:</strong> {log.context.leadScore}</span>
							<span><strong>Language:</strong> {log.context.language}</span>
							<span><strong>Type:</strong> {log.context.conversationType}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	)

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900">Automated Sidekick Assignment</h1>
				<p className="text-slate-600">Intelligent context-based assignment of AI sidekicks to conversations</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Active Rules</p>
							<p className="text-2xl font-bold text-slate-900">
								{assignmentRules.filter(r => r.enabled).length}
							</p>
						</div>
						<span className="material-symbols-outlined text-blue-500">rule</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Today's Assignments</p>
							<p className="text-2xl font-bold text-slate-900">{assignmentLogs.length}</p>
						</div>
						<span className="material-symbols-outlined text-green-500">assignment</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Success Rate</p>
							<p className="text-2xl font-bold text-green-600">
								{Math.round(assignmentLogs.filter(l => l.outcome === 'successful').length / assignmentLogs.length * 100)}%
							</p>
						</div>
						<span className="material-symbols-outlined text-amber-500">check_circle</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Escalations</p>
							<p className="text-2xl font-bold text-slate-900">
								{assignmentLogs.filter(l => l.outcome === 'escalated').length}
							</p>
						</div>
						<span className="material-symbols-outlined text-purple-500">trending_up</span>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-slate-200 mb-6">
				<nav className="flex space-x-8">
					{TAB_OPTIONS.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === tab.id
									? 'border-primary-500 text-primary-600'
									: 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
							}`}
						>
							<span className="material-symbols-outlined text-sm">{tab.icon}</span>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Content */}
			{activeTab === 'rules' && renderRules()}
			{activeTab === 'create' && renderCreateRule()}
			{activeTab === 'logs' && renderLogs()}
			{activeTab === 'analytics' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">analytics</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Assignment Analytics</h3>
					<p className="text-slate-600">Detailed performance metrics and optimization insights</p>
				</div>
			)}
		</div>
	)
}

export default SidekickAutoAssignment
