import React, { useState, useEffect } from 'react'
import { AISidekickRole } from '../context/AISidekickContext'

interface SidekickLeadIntegration {
	sidekickId: AISidekickRole
	name: string
	leadScoringEnabled: boolean
	scoringTriggers: {
		onMessage: boolean
		onEngagement: boolean
		onPropertyInquiry: boolean
		onSchedulingRequest: boolean
	}
	responseAdaptation: {
		enabled: boolean
		hotLeadResponse: string
		warmLeadResponse: string
		coldLeadResponse: string
	}
	autoActions: {
		hotLeadNotification: boolean
		warmLeadFollowUp: boolean
		coldLeadNurturing: boolean
		escalateToAgent: boolean
	}
	scoringWeights: {
		messageEngagement: number
		responseTime: number
		questionComplexity: number
		propertyInterest: number
	}
}

interface LeadInteraction {
	id: string
	leadId: string
	leadName: string
	sidekickId: AISidekickRole
	message: string
	response: string
	scoreBefore: number
	scoreAfter: number
	scoreChange: number
	timestamp: string
	triggers: string[]
}

type LeadScoringTab = 'overview' | 'configure' | 'interactions' | 'automation'

const TAB_OPTIONS: Array<{ id: LeadScoringTab; label: string; icon: string }> = [
	{ id: 'overview', label: 'Overview', icon: 'dashboard' },
	{ id: 'configure', label: 'Configure', icon: 'settings' },
	{ id: 'interactions', label: 'Interactions', icon: 'chat' },
	{ id: 'automation', label: 'Automation', icon: 'smart_toy' }
]

const SidekickLeadScoring: React.FC = () => {
	const [activeTab, setActiveTab] = useState<LeadScoringTab>('overview')
	const [sidekickIntegrations, setSidekickIntegrations] = useState<SidekickLeadIntegration[]>([])
	const [recentInteractions, setRecentInteractions] = useState<LeadInteraction[]>([])
	const [selectedSidekick, setSelectedSidekick] = useState<AISidekickRole>('agent')
	const [isLoading, setIsLoading] = useState(true)

	// Initialize and fetch real data
	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true)
			try {
				// 1. Fetch Integrations (Static for now, but enabled)
				const demoIntegrations: SidekickLeadIntegration[] = [
					{
						sidekickId: 'agent',
						name: 'Agent Sidekick',
						leadScoringEnabled: true,
						scoringTriggers: { onMessage: true, onEngagement: true, onPropertyInquiry: true, onSchedulingRequest: true },
						responseAdaptation: { enabled: true, hotLeadResponse: "I can see you're very interested! Let me connect you with our top agent right away.", warmLeadResponse: "Great questions! I'd love to help you explore this further. Would you like to schedule a call?", coldLeadResponse: "Thanks for your interest! Let me share some helpful information to get you started." },
						autoActions: { hotLeadNotification: true, warmLeadFollowUp: true, coldLeadNurturing: false, escalateToAgent: true },
						scoringWeights: { messageEngagement: 25, responseTime: 15, questionComplexity: 20, propertyInterest: 40 }
					},
					{
						sidekickId: 'listing',
						name: 'Listing Sidekick',
						leadScoringEnabled: true,
						scoringTriggers: { onMessage: true, onEngagement: false, onPropertyInquiry: true, onSchedulingRequest: true },
						responseAdaptation: { enabled: true, hotLeadResponse: "This property is perfect for you! Let me schedule an immediate viewing.", warmLeadResponse: "I can tell you're interested in this property. Would you like more details?", coldLeadResponse: "Here's what makes this property special. Feel free to ask any questions!" },
						autoActions: { hotLeadNotification: true, warmLeadFollowUp: false, coldLeadNurturing: true, escalateToAgent: false },
						scoringWeights: { messageEngagement: 20, responseTime: 10, questionComplexity: 30, propertyInterest: 40 }
					}
				]
				setSidekickIntegrations(demoIntegrations)

				// 2. Fetch REAL interactions from backend
				const response = await fetch('/api/leads/recent-scoring')
				if (response.ok) {
					const data = await response.json()
					if (data.success && data.interactions) {
						// Map backend fields to frontend interface if necessary
						const mapped = data.interactions.map((it: any) => ({
							...it,
							scoreChange: it.scoreChange || 5, // Backend doesn't store change yet, defaulting to positive engagement
							triggers: ['onMessage']
						}))
						setRecentInteractions(mapped)
					}
				}
			} catch (error) {
				console.error('Failed to fetch sidekick scoring data:', error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchData()
	}, [])

	const currentIntegration = sidekickIntegrations.find(s => s.sidekickId === selectedSidekick)

	const getScoreChangeColor = (change: number) => {
		if (change > 10) return 'text-green-600'
		if (change > 0) return 'text-green-500'
		if (change < -5) return 'text-red-600'
		return 'text-red-500'
	}

	const getScoreTierColor = (score: number) => {
		if (score >= 80) return 'bg-green-100 text-green-800'
		if (score >= 60) return 'bg-yellow-100 text-yellow-800'
		if (score >= 40) return 'bg-blue-100 text-blue-800'
		return 'bg-slate-100 text-slate-800'
	}

	const getScoreTier = (score: number) => {
		if (score >= 80) return 'Hot'
		if (score >= 60) return 'Warm'
		if (score >= 40) return 'Qualified'
		return 'Cold'
	}

	const updateIntegrationSetting = (
		updater: (integration: SidekickLeadIntegration) => SidekickLeadIntegration
	) => {
		setSidekickIntegrations(prev =>
			prev.map(integration =>
				integration.sidekickId === selectedSidekick ? updater(integration) : integration
			)
		)
	}

	const renderOverview = () => (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Active Integrations</p>
							<p className="text-2xl font-bold text-slate-900">
								{sidekickIntegrations.filter(s => s.leadScoringEnabled).length}
							</p>
						</div>
						<span className="material-symbols-outlined text-blue-500">integration_instructions</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Interactions Today</p>
							<p className="text-2xl font-bold text-slate-900">{recentInteractions.length}</p>
						</div>
						<span className="material-symbols-outlined text-green-500">chat</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Avg Score Change</p>
							<p className="text-2xl font-bold text-green-600">
								+{Math.round(recentInteractions.reduce((sum, i) => sum + i.scoreChange, 0) / recentInteractions.length)}
							</p>
						</div>
						<span className="material-symbols-outlined text-amber-500">trending_up</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Hot Leads Generated</p>
							<p className="text-2xl font-bold text-slate-900">
								{recentInteractions.filter(i => i.scoreAfter >= 80).length}
							</p>
						</div>
						<span className="material-symbols-outlined text-red-500">local_fire_department</span>
					</div>
				</div>
			</div>

			{/* Sidekick Integration Status */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Sidekick Integration Status</h3>
				<div className="space-y-4">
					{sidekickIntegrations.map(integration => (
						<div key={integration.sidekickId} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
							<div className="flex items-center gap-4">
								<div className={`w-3 h-3 rounded-full ${integration.leadScoringEnabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
								<div>
									<h4 className="font-medium text-slate-900">{integration.name}</h4>
									<p className="text-sm text-slate-600">
										{integration.leadScoringEnabled ? 'Lead scoring active' : 'Lead scoring disabled'} •
										{Object.values(integration.scoringTriggers).filter(Boolean).length} triggers enabled
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								{integration.responseAdaptation.enabled && (
									<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Adaptive Responses</span>
								)}
								{Object.values(integration.autoActions).some(Boolean) && (
									<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Auto Actions</span>
								)}
								<button
									onClick={() => {
										setSelectedSidekick(integration.sidekickId)
										setActiveTab('configure')
									}}
									className="px-3 py-1 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
								>
									Configure
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Recent Scoring Interactions */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Scoring Interactions</h3>
				<div className="space-y-3">
					{recentInteractions.map(interaction => (
						<div key={interaction.id} className="border border-slate-200 rounded-lg p-4">
							<div className="flex justify-between items-start mb-2">
								<div>
									<h4 className="font-medium text-slate-900">{interaction.leadName}</h4>
									<p className="text-sm text-slate-600 capitalize">{interaction.sidekickId} Sidekick</p>
								</div>
								<div className="flex items-center gap-2">
									<span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreTierColor(interaction.scoreAfter)}`}>
										{getScoreTier(interaction.scoreAfter)}
									</span>
									<span className={`text-sm font-semibold ${getScoreChangeColor(interaction.scoreChange)}`}>
										{interaction.scoreChange > 0 ? '+' : ''}{interaction.scoreChange}
									</span>
								</div>
							</div>
							<div className="text-sm text-slate-700 mb-2">
								<strong>User:</strong> {interaction.message}
							</div>
							<div className="text-sm text-slate-600 mb-3">
								<strong>Response:</strong> {interaction.response}
							</div>
							<div className="flex justify-between items-center text-xs text-slate-500">
								<span>Score: {interaction.scoreBefore} → {interaction.scoreAfter}</span>
								<span>{new Date(interaction.timestamp).toLocaleString()}</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)

	const renderConfigure = () => (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-slate-900">Configure Lead Scoring Integration</h3>
				<select
					value={selectedSidekick}
					onChange={(e) => setSelectedSidekick(e.target.value as AISidekickRole)}
					className="px-3 py-2 border border-slate-300 rounded-lg"
				>
					<option value="agent">Agent Sidekick</option>
					<option value="marketing">Marketing Sidekick</option>
					<option value="listing">Listing Sidekick</option>
					<option value="sales">Sales Sidekick</option>
					<option value="helper">Helper Sidekick</option>
				</select>
			</div>

			{currentIntegration && (
				<>
					{/* Basic Settings */}
					<div className="bg-white rounded-lg border border-slate-200 p-6">
						<h4 className="font-medium text-slate-900 mb-4">Basic Settings</h4>
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="leadScoringEnabled"
									checked={currentIntegration.leadScoringEnabled}
									onChange={(e) => updateIntegrationSetting(integration => ({
										...integration,
										leadScoringEnabled: e.target.checked
									}))}
									className="rounded"
								/>
								<label htmlFor="leadScoringEnabled" className="text-sm text-slate-700">
									Enable lead scoring for this sidekick
								</label>
							</div>
						</div>
					</div>

					{/* Scoring Triggers */}
					<div className="bg-white rounded-lg border border-slate-200 p-6">
						<h4 className="font-medium text-slate-900 mb-4">Scoring Triggers</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.entries(currentIntegration.scoringTriggers).map(([key, value]) => (
								<div key={key} className="flex items-center gap-2">
									<input
										type="checkbox"
										id={key}
										checked={value}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											scoringTriggers: {
												...integration.scoringTriggers,
												[key]: e.target.checked
											}
										}))}
										className="rounded"
									/>
									<label htmlFor={key} className="text-sm text-slate-700 capitalize">
										{key.replace(/([A-Z])/g, ' $1').toLowerCase()}
									</label>
								</div>
							))}
						</div>
					</div>

					{/* Response Adaptation */}
					<div className="bg-white rounded-lg border border-slate-200 p-6">
						<div className="flex items-center gap-2 mb-4">
							<input
								type="checkbox"
								id="responseAdaptationEnabled"
								checked={currentIntegration.responseAdaptation.enabled}
								onChange={(e) => updateIntegrationSetting(integration => ({
									...integration,
									responseAdaptation: {
										...integration.responseAdaptation,
										enabled: e.target.checked
									}
								}))}
								className="rounded"
							/>
							<label htmlFor="responseAdaptationEnabled" className="font-medium text-slate-900">
								Adaptive Responses Based on Lead Score
							</label>
						</div>

						{currentIntegration.responseAdaptation.enabled && (
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Hot Lead Response (80+ score)</label>
									<textarea
										value={currentIntegration.responseAdaptation.hotLeadResponse}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											responseAdaptation: {
												...integration.responseAdaptation,
												hotLeadResponse: e.target.value
											}
										}))}
										rows={2}
										className="w-full px-3 py-2 border border-slate-300 rounded-lg"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Warm Lead Response (60-79 score)</label>
									<textarea
										value={currentIntegration.responseAdaptation.warmLeadResponse}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											responseAdaptation: {
												...integration.responseAdaptation,
												warmLeadResponse: e.target.value
											}
										}))}
										rows={2}
										className="w-full px-3 py-2 border border-slate-300 rounded-lg"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Cold Lead Response (Below 60 score)</label>
									<textarea
										value={currentIntegration.responseAdaptation.coldLeadResponse}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											responseAdaptation: {
												...integration.responseAdaptation,
												coldLeadResponse: e.target.value
											}
										}))}
										rows={2}
										className="w-full px-3 py-2 border border-slate-300 rounded-lg"
									/>
								</div>
							</div>
						)}
					</div>

					{/* Auto Actions */}
					<div className="bg-white rounded-lg border border-slate-200 p-6">
						<h4 className="font-medium text-slate-900 mb-4">Automated Actions</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.entries(currentIntegration.autoActions).map(([key, value]) => (
								<div key={key} className="flex items-center gap-2">
									<input
										type="checkbox"
										id={`auto-${key}`}
										checked={value}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											autoActions: {
												...integration.autoActions,
												[key]: e.target.checked
											}
										}))}
										className="rounded"
									/>
									<label htmlFor={`auto-${key}`} className="text-sm text-slate-700 capitalize">
										{key.replace(/([A-Z])/g, ' $1').toLowerCase()}
									</label>
								</div>
							))}
						</div>
					</div>

					{/* Scoring Weights */}
					<div className="bg-white rounded-lg border border-slate-200 p-6">
						<h4 className="font-medium text-slate-900 mb-4">Scoring Weights (%)</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.entries(currentIntegration.scoringWeights).map(([key, value]) => (
								<div key={key}>
									<label className="block text-sm font-medium text-slate-700 mb-2 capitalize">
										{key.replace(/([A-Z])/g, ' $1').toLowerCase()}
									</label>
									<input
										type="range"
										min="0"
										max="50"
										value={value}
										onChange={(e) => updateIntegrationSetting(integration => ({
											...integration,
											scoringWeights: {
												...integration.scoringWeights,
												[key]: parseInt(e.target.value, 10)
											}
										}))}
										className="w-full"
									/>
									<div className="flex justify-between text-xs text-slate-500 mt-1">
										<span>0%</span>
										<span className="font-medium">{value}%</span>
										<span>50%</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	)

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
					<span className="ml-3 text-slate-600">Loading lead scoring integration...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900">Lead Scoring Integration</h1>
				<p className="text-slate-600">Connect AI sidekicks with intelligent lead scoring for better conversions</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-slate-200 mb-6">
				<nav className="flex space-x-8">
					{TAB_OPTIONS.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
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
			{activeTab === 'overview' && renderOverview()}
			{activeTab === 'configure' && renderConfigure()}
			{activeTab === 'interactions' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">chat</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Interaction History</h3>
					<p className="text-slate-600">Detailed conversation and scoring history</p>
				</div>
			)}
			{activeTab === 'automation' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">smart_toy</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Automation Rules</h3>
					<p className="text-slate-600">Advanced automation workflows based on lead scores</p>
				</div>
			)}
		</div>
	)
}

export default SidekickLeadScoring
