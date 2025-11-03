import React, { useState, useEffect } from 'react'
import { AISidekickRole } from '../context/AISidekickContext'

interface TrainingSession {
	id: string
	sidekickId: AISidekickRole
	name: string
	type: 'conversation' | 'knowledge' | 'behavior' | 'performance'
	status: 'pending' | 'in_progress' | 'completed' | 'failed'
	progress: number
	startedAt: string
	completedAt?: string
	metrics: {
		accuracy: number
		responseTime: number
		userSatisfaction: number
	}
	trainingData: {
		conversations: number
		documents: number
		corrections: number
	}
}

interface TrainingTemplate {
	id: string
	name: string
	description: string
	type: 'conversation' | 'knowledge' | 'behavior' | 'performance'
	estimatedDuration: string
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	requirements: string[]
}

type TrainingTab = 'sessions' | 'templates' | 'create' | 'analytics'

const TRAINING_TABS: Array<{ id: TrainingTab; label: string; icon: string }> = [
	{ id: 'sessions', label: 'Training Sessions', icon: 'play_circle' },
	{ id: 'templates', label: 'Templates', icon: 'template_add' },
	{ id: 'create', label: 'Create Session', icon: 'add_circle' },
	{ id: 'analytics', label: 'Training Analytics', icon: 'analytics' }
]

const SidekickTrainingWorkflows: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TrainingTab>('sessions')
	const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([])
	const [trainingTemplates] = useState<TrainingTemplate[]>([
		{
			id: 'conv-basic',
			name: 'Basic Conversation Training',
			description: 'Improve natural conversation flow and context understanding',
			type: 'conversation',
			estimatedDuration: '2-4 hours',
			difficulty: 'beginner',
			requirements: ['50+ conversation examples', 'User feedback data']
		},
		{
			id: 'knowledge-expansion',
			name: 'Knowledge Base Expansion',
			description: 'Enhance domain-specific knowledge and accuracy',
			type: 'knowledge',
			estimatedDuration: '1-2 hours',
			difficulty: 'intermediate',
			requirements: ['Domain documents', 'FAQ data', 'Product information']
		},
		{
			id: 'behavior-optimization',
			name: 'Behavior Pattern Optimization',
			description: 'Fine-tune personality traits and response patterns',
			type: 'behavior',
			estimatedDuration: '3-6 hours',
			difficulty: 'advanced',
			requirements: ['Personality guidelines', 'Brand voice examples', 'Tone samples']
		},
		{
			id: 'performance-tuning',
			name: 'Performance Enhancement',
			description: 'Optimize response speed and accuracy metrics',
			type: 'performance',
			estimatedDuration: '4-8 hours',
			difficulty: 'advanced',
			requirements: ['Performance benchmarks', 'Speed targets', 'Quality metrics']
		}
	])
	const [selectedSidekick, setSelectedSidekick] = useState<AISidekickRole>('agent')
	const [isCreatingSession, setIsCreatingSession] = useState(false)

	// Generate demo training sessions
	useEffect(() => {
		const demoSessions: TrainingSession[] = [
			{
				id: 'ts-1',
				sidekickId: 'agent',
				name: 'Agent Conversation Enhancement',
				type: 'conversation',
				status: 'completed',
				progress: 100,
				startedAt: '2024-01-15T10:00:00Z',
				completedAt: '2024-01-15T12:30:00Z',
				metrics: { accuracy: 94, responseTime: 1200, userSatisfaction: 89 },
				trainingData: { conversations: 150, documents: 0, corrections: 23 }
			},
			{
				id: 'ts-2',
				sidekickId: 'marketing',
				name: 'Marketing Knowledge Update',
				type: 'knowledge',
				status: 'in_progress',
				progress: 67,
				startedAt: '2024-01-16T09:00:00Z',
				metrics: { accuracy: 87, responseTime: 1500, userSatisfaction: 85 },
				trainingData: { conversations: 0, documents: 45, corrections: 12 }
			},
			{
				id: 'ts-3',
				sidekickId: 'listing',
				name: 'Property Description Optimization',
				type: 'behavior',
				status: 'pending',
				progress: 0,
				startedAt: '2024-01-17T14:00:00Z',
				metrics: { accuracy: 0, responseTime: 0, userSatisfaction: 0 },
				trainingData: { conversations: 0, documents: 0, corrections: 0 }
			}
		]
		setTrainingSessions(demoSessions)
	}, [])

	const getStatusColor = (status: TrainingSession['status']) => {
		switch (status) {
			case 'completed': return 'bg-green-100 text-green-800'
			case 'in_progress': return 'bg-blue-100 text-blue-800'
			case 'pending': return 'bg-yellow-100 text-yellow-800'
			case 'failed': return 'bg-red-100 text-red-800'
			default: return 'bg-slate-100 text-slate-800'
		}
	}

	const getDifficultyColor = (difficulty: TrainingTemplate['difficulty']) => {
		switch (difficulty) {
			case 'beginner': return 'bg-green-100 text-green-800'
			case 'intermediate': return 'bg-yellow-100 text-yellow-800'
			case 'advanced': return 'bg-red-100 text-red-800'
			default: return 'bg-slate-100 text-slate-800'
		}
	}

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'conversation': return 'chat'
			case 'knowledge': return 'school'
			case 'behavior': return 'psychology'
			case 'performance': return 'speed'
			default: return 'settings'
		}
	}

	const startTrainingSession = async (templateId: string) => {
		setIsCreatingSession(true)
		const template = trainingTemplates.find(t => t.id === templateId)
		if (!template) return

		// Simulate session creation
		setTimeout(() => {
			const newSession: TrainingSession = {
				id: `ts-${Date.now()}`,
				sidekickId: selectedSidekick,
				name: `${template.name} - ${selectedSidekick}`,
				type: template.type,
				status: 'pending',
				progress: 0,
				startedAt: new Date().toISOString(),
				metrics: { accuracy: 0, responseTime: 0, userSatisfaction: 0 },
				trainingData: { conversations: 0, documents: 0, corrections: 0 }
			}
			setTrainingSessions(prev => [newSession, ...prev])
			setIsCreatingSession(false)
			setActiveTab('sessions')
		}, 1500)
	}

	const renderSessions = () => (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-slate-900">Training Sessions</h3>
				<button
					onClick={() => setActiveTab('create')}
					className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
				>
					New Session
				</button>
			</div>

			{trainingSessions.map(session => (
				<div key={session.id} className="bg-white border border-slate-200 rounded-lg p-6">
					<div className="flex justify-between items-start mb-4">
						<div>
							<h4 className="text-lg font-medium text-slate-900">{session.name}</h4>
							<p className="text-sm text-slate-600 capitalize">{session.sidekickId} Sidekick • {session.type} Training</p>
						</div>
						<span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
							{session.status.replace('_', ' ')}
						</span>
					</div>

					{/* Progress Bar */}
					<div className="mb-4">
						<div className="flex justify-between text-sm text-slate-600 mb-1">
							<span>Progress</span>
							<span>{session.progress}%</span>
						</div>
						<div className="w-full bg-slate-200 rounded-full h-2">
							<div 
								className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
								style={{ width: `${session.progress}%` }}
							></div>
						</div>
					</div>

					{/* Metrics */}
					<div className="grid grid-cols-3 gap-4 mb-4">
						<div className="text-center">
							<p className="text-lg font-semibold text-slate-900">{session.metrics.accuracy}%</p>
							<p className="text-xs text-slate-600">Accuracy</p>
						</div>
						<div className="text-center">
							<p className="text-lg font-semibold text-slate-900">{session.metrics.responseTime}ms</p>
							<p className="text-xs text-slate-600">Response Time</p>
						</div>
						<div className="text-center">
							<p className="text-lg font-semibold text-slate-900">{session.metrics.userSatisfaction}%</p>
							<p className="text-xs text-slate-600">Satisfaction</p>
						</div>
					</div>

					{/* Training Data */}
					<div className="flex justify-between text-sm text-slate-600 pt-4 border-t border-slate-100">
						<span>{session.trainingData.conversations} conversations</span>
						<span>{session.trainingData.documents} documents</span>
						<span>{session.trainingData.corrections} corrections</span>
					</div>
				</div>
			))}
		</div>
	)

	const renderTemplates = () => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-slate-900">Training Templates</h3>
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{trainingTemplates.map(template => (
					<div key={template.id} className="bg-white border border-slate-200 rounded-lg p-6">
						<div className="flex items-start justify-between mb-3">
							<div className="flex items-center gap-3">
								<span className="material-symbols-outlined text-primary-600">{getTypeIcon(template.type)}</span>
								<div>
									<h4 className="font-medium text-slate-900">{template.name}</h4>
									<p className="text-sm text-slate-600 capitalize">{template.type} Training</p>
								</div>
							</div>
							<span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
								{template.difficulty}
							</span>
						</div>

						<p className="text-sm text-slate-700 mb-4">{template.description}</p>

						<div className="space-y-2 mb-4">
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Duration:</span>
								<span className="font-medium">{template.estimatedDuration}</span>
							</div>
							<div className="text-sm">
								<span className="text-slate-600">Requirements:</span>
								<ul className="mt-1 space-y-1">
									{template.requirements.map((req, idx) => (
										<li key={idx} className="text-xs text-slate-600 ml-2">• {req}</li>
									))}
								</ul>
							</div>
						</div>

						<button
							onClick={() => startTrainingSession(template.id)}
							disabled={isCreatingSession}
							className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
						>
							{isCreatingSession ? 'Creating...' : 'Start Training'}
						</button>
					</div>
				))}
			</div>
		</div>
	)

	const renderCreateSession = () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold text-slate-900">Create Custom Training Session</h3>
			
			<div className="bg-white border border-slate-200 rounded-lg p-6">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Select Sidekick</label>
						<select
							value={selectedSidekick}
							onChange={(e) => setSelectedSidekick(e.target.value as AISidekickRole)}
							className="w-full px-3 py-2 border border-slate-300 rounded-lg"
						>
							<option value="agent">Agent Sidekick</option>
							<option value="marketing">Marketing Sidekick</option>
							<option value="listing">Listing Sidekick</option>
							<option value="sales">Sales Sidekick</option>
							<option value="helper">Helper Sidekick</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Training Name</label>
						<input
							type="text"
							placeholder="Enter training session name"
							className="w-full px-3 py-2 border border-slate-300 rounded-lg"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Training Type</label>
						<select className="w-full px-3 py-2 border border-slate-300 rounded-lg">
							<option value="conversation">Conversation Training</option>
							<option value="knowledge">Knowledge Enhancement</option>
							<option value="behavior">Behavior Optimization</option>
							<option value="performance">Performance Tuning</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Training Data</label>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<input type="checkbox" id="conversations" className="rounded" />
								<label htmlFor="conversations" className="text-sm text-slate-700">Use conversation history</label>
							</div>
							<div className="flex items-center gap-2">
								<input type="checkbox" id="feedback" className="rounded" />
								<label htmlFor="feedback" className="text-sm text-slate-700">Include user feedback</label>
							</div>
							<div className="flex items-center gap-2">
								<input type="checkbox" id="knowledge" className="rounded" />
								<label htmlFor="knowledge" className="text-sm text-slate-700">Knowledge base documents</label>
							</div>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">Training Goals</label>
						<textarea
							placeholder="Describe what you want to improve..."
							rows={3}
							className="w-full px-3 py-2 border border-slate-300 rounded-lg"
						></textarea>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							onClick={() => setActiveTab('sessions')}
							className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
						>
							Cancel
						</button>
						<button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
							Start Training
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900">AI Sidekick Training</h1>
				<p className="text-slate-600">Advanced training workflows to improve your AI assistants</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-slate-200 mb-6">
				<nav className="flex space-x-8">
					{TRAINING_TABS.map(tab => (
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
			{activeTab === 'sessions' && renderSessions()}
			{activeTab === 'templates' && renderTemplates()}
			{activeTab === 'create' && renderCreateSession()}
			{activeTab === 'analytics' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">analytics</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Training Analytics</h3>
					<p className="text-slate-600">Detailed training performance metrics coming soon</p>
				</div>
			)}
		</div>
	)
}

export default SidekickTrainingWorkflows
