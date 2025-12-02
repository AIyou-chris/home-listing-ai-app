import React, { useState, useRef, useEffect, useCallback } from 'react'

interface TrainingStatsProps {
	sidekick: string
	currentSessionStats: {
		conversations: number
		positiveCount: number
		improvementCount: number
	}
	demoMode?: boolean
	blueprintMode?: boolean
}

interface TrainingStatsResponse {
	totalFeedback?: number
	positiveCount?: number
	improvementCount?: number
}

const TrainingStats: React.FC<TrainingStatsProps> = ({ sidekick, currentSessionStats, demoMode = false, blueprintMode = false }) => {
	const [backendStats, setBackendStats] = useState<TrainingStatsResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pendingFetch = useRef<AbortController | null>(null)

	useEffect(() => {
		if (demoMode) {
			setBackendStats(null)
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		if (refreshTimer.current) {
			clearTimeout(refreshTimer.current)
		}

		refreshTimer.current = setTimeout(async () => {
			pendingFetch.current?.abort()
			const controller = new AbortController()
			pendingFetch.current = controller
			try {
				const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
				const response = await fetch(`${base}/${sidekick}/stats`, {
					signal: controller.signal
				})
				if (!response.ok) {
					throw new Error(`Status ${response.status}`)
				}
				const stats = await response.json()
				setBackendStats(stats)
			} catch (error) {
				if ((error as Error).name !== 'AbortError') {
					console.error('Failed to fetch training stats:', error)
				}
			} finally {
				setIsLoading(false)
				if (pendingFetch.current?.signal === controller.signal) {
					pendingFetch.current = null
				}
			}
		}, 250)

		return () => {
			if (refreshTimer.current) {
				clearTimeout(refreshTimer.current)
			}
			pendingFetch.current?.abort()
		}
	}, [sidekick, demoMode, blueprintMode])

	return (
		<div className="mt-6 p-4 bg-white rounded-lg border border-slate-200">
			<h4 className="font-medium text-slate-900 mb-3">Training Progress</h4>
			{isLoading ? (
				<div className="text-center py-4">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
				</div>
			) : (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Total Training</span>
						<span className="font-medium">{backendStats?.totalFeedback || 0}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Positive Feedback</span>
						<span className="font-medium text-green-600">
							{(backendStats?.positiveCount || 0) + currentSessionStats.positiveCount}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Improvements</span>
						<span className="font-medium text-amber-600">
							{(backendStats?.improvementCount || 0) + currentSessionStats.improvementCount}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">This Session</span>
						<span className="font-medium text-blue-600">
							{currentSessionStats.conversations}
						</span>
					</div>
					{backendStats?.positiveCount > 0 && (
						<div className="pt-2 border-t border-slate-100">
							<div className="flex justify-between text-xs">
								<span className="text-slate-500">Success Rate</span>
								<span className="font-medium text-green-600">
									{Math.round((backendStats.positiveCount / backendStats.totalFeedback) * 100)}%
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: string
	feedback?: 'thumbs_up' | 'thumbs_down' | null
	improvement?: string
}

export interface SidekickOption {
	id: string
	name: string
	icon: string
	description: string
	systemPrompt: string
	color: string
}

export const TRAINING_ARCHITECT_PROMPT = `You are the AI Trainer and System Architect for our project.
Your job is to:
1. Audit the current training setup. Check for missing data, context, tone, or instructions that might limit the AI’s understanding of our brand, services, or client interactions.
2. Identify improvement opportunities. Recommend what data, examples, or structured prompts should be added to improve personalization, accuracy, and context retention.
3. Wire up training flow. Ensure the process connects correctly between input data (documents, chat scripts, email templates, FAQs, follow-up sequences, etc.) and the model’s fine-tuning or retrieval layers.
4. Simulate learning. Show how the AI would respond before and after training to verify real improvement.
5. Report and fix. If you find missing context, unclear labeling, or inconsistent tone, propose fixes automatically — show your reasoning and results.

Core objective:
Deliver a complete, ready-to-train AI system that learns like a real assistant — not just from text, but from behavior, tone, and intent. Detect what we’re missing, make recommendations, and confirm when the AI is truly “trained to perform.”`

export const ADMIN_SIDEKICKS: SidekickOption[] = [
	{
		id: 'god',
		name: 'God (Ops Overseer)',
		icon: 'security',
		description: 'App-wide overseer for admin intelligence and decisions',
		systemPrompt:
			'You are the omniscient admin AI. Calm, precise, and directive. Provide short, actionable guidance with safety in mind. Protect admin data, avoid agent/demo data, and keep responses scoped to admin workflows.',
		color: 'bg-sky-100 text-sky-800 border-sky-200'
	},
	{
		id: 'sales',
		name: 'Sales',
		icon: 'trending_up',
		description: 'CTA-focused sidekick for lead conversion and bookings',
		systemPrompt:
			'You are the Sales AI. Persuasive, concise, and CTA-driven. Qualify fast, handle objections, and drive to calls, tours, or signups. Use admin-owned data only.',
		color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
	},
	{
		id: 'support',
		name: 'Support',
		icon: 'handyman',
		description: 'Issue resolution, triage, and workflow debugging',
		systemPrompt:
			'You are the Support AI. Empathetic, clear, and step-by-step. Triage issues, guide remediation, and keep scope to admin systems only.',
		color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
	},
	{
		id: 'marketing',
		name: 'Marketing',
		icon: 'campaign',
		description: 'Content, campaigns, and admin-focused promotion',
		systemPrompt:
			'You are the Marketing AI. Creative, on-brand, and conversion-focused. Ship concise copy, hooks, and campaigns for the platform.',
		color: 'bg-amber-100 text-amber-800 border-amber-200'
	}
]

interface TrainingProps {
	demoMode?: boolean;
	blueprintMode?: boolean;
	sidekickTemplatesOverride?: Array<{ id: string; name: string; icon: string; description: string; systemPrompt: string }>;
}

const AIInteractiveTraining: React.FC<TrainingProps> = ({ demoMode = false, blueprintMode = false, sidekickTemplatesOverride }) => {
	const defaultSidekickId =
		(sidekickTemplatesOverride && sidekickTemplatesOverride[0]?.id) || ADMIN_SIDEKICKS[0].id
	const [selectedSidekick, setSelectedSidekick] = useState<string>(defaultSidekickId)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [inputMessage, setInputMessage] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [improvementText, setImprovementText] = useState('')
	const [showImprovementInput, setShowImprovementInput] = useState<string | null>(null)
	const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
	const [feedbackInFlight, setFeedbackInFlight] = useState<string | null>(null)
	const [improvementLoadingId, setImprovementLoadingId] = useState<string | null>(null)
	const [trainingNotification, setTrainingNotification] = useState<string | null>(null)
	const [trainingError, setTrainingError] = useState<string | null>(null)
	const initialPrompts = sidekickTemplatesOverride && sidekickTemplatesOverride.length
		? sidekickTemplatesOverride.reduce<Record<string, string>>((acc, sk) => {
			acc[sk.id] = sk.systemPrompt
			return acc
		}, {})
		: ADMIN_SIDEKICKS.reduce<Record<string, string>>((acc, sk) => {
			acc[sk.id] = sk.systemPrompt
			return acc
		}, {})
	const [systemPrompts, setSystemPrompts] = useState<Record<string, string>>(initialPrompts)
	const [savingPrompt, setSavingPrompt] = useState(false)
	const [memoryItems, setMemoryItems] = useState<Record<string, Array<{ id: string; title: string; type: 'file' | 'text' | 'url'; createdAt: string }>>>({})
	const [memoryLoading, setMemoryLoading] = useState(false)
	const [memoryError, setMemoryError] = useState<string | null>(null)
	const [memoryUrl, setMemoryUrl] = useState('')
	const [memoryNote, setMemoryNote] = useState('')
	const [trainLoading, setTrainLoading] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const effectiveSidekicks = sidekickTemplatesOverride && sidekickTemplatesOverride.length
		? sidekickTemplatesOverride.map(s => ({
			id: s.id,
			name: s.label || s.name || s.defaultName || s.id,
			icon: s.icon || 'psychology',
			description: s.description || s.personality?.description || 'AI sidekick',
			systemPrompt: s.systemPrompt || s.personality?.description || '',
			color: 'bg-blue-100 text-blue-800 border-blue-200'
		}))
		: ADMIN_SIDEKICKS
	const sidekicks = effectiveSidekicks
	const currentSidekick = effectiveSidekicks.find(s => s.id === selectedSidekick) || effectiveSidekicks[0] || ADMIN_SIDEKICKS[0]
	const currentSidekickColor = currentSidekick?.color || 'bg-slate-100 text-slate-800 border-slate-200'
	const currentSidekickName = currentSidekick?.name || 'Sidekick'

	const loadMemory = useCallback(async (sidekickId: string) => {
		if (demoMode) {
			setMemoryItems(prev => ({ ...prev, [sidekickId]: prev[sidekickId] || [] }))
			return
		}
		setMemoryLoading(true)
		setMemoryError(null)
		try {
			const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
			const res = await fetch(`${base} /${sidekickId}/memory`)
			if (!res.ok) throw new Error(`Status ${res.status} `)
			const data = await res.json()
			const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
			setMemoryItems(prev => ({
				...prev, [sidekickId]: list.map((item: Record<string, unknown>) => ({
					id: (item.id as string) || `${sidekickId} -${Date.now()} `,
					title: (item.title as string) || (item.name as string) || 'Memory item',
					type: (item.type === 'url' || item.type === 'file' || item.type === 'text') ? item.type : 'text',
					createdAt: (item.createdAt as string) || (item.created_at as string) || new Date().toISOString()
				}))
			}))
		} catch (error) {
			console.warn('Failed to load admin sidekick memory', error)
			setMemoryError('Unable to load memory right now.')
		} finally {
			setMemoryLoading(false)
		}
	}, [demoMode, blueprintMode])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	useEffect(() => {
		if (!trainingNotification && !trainingError) return
		const timer = setTimeout(() => {
			setTrainingNotification(null)
			setTrainingError(null)
		}, 4000)

		return () => clearTimeout(timer)
	}, [trainingNotification, trainingError])

	useEffect(() => {
		const loadPrompt = async (sidekickId: string) => {
			if (demoMode) return
			try {
				const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
				const res = await fetch(`${base}/${sidekickId}`)
				if (!res.ok) return
				const data = await res.json()
				if (typeof data?.systemPrompt === 'string') {
					setSystemPrompts(prev => ({ ...prev, [sidekickId]: data.systemPrompt }))
				}
			} catch (error) {
				console.warn('Failed to load system prompt', error)
			}
		}
		void loadPrompt(selectedSidekick)
		void loadMemory(selectedSidekick)
	}, [selectedSidekick, loadMemory, demoMode, blueprintMode])

	const sendChat = useCallback(async (payload: { message: string; history: Array<{ sender: 'user' | 'assistant'; text: string }> }) => {
		if (demoMode) {
			return `(${selectedSidekick} sidekick) ${payload.message}`
		}
		if (blueprintMode) {
			const res = await fetch(`/api/blueprint/ai-sidekicks/${selectedSidekick}/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: payload.message, history: payload.history })
			}).catch(() => null)
			if (res && res.ok) {
				const data = await res.json()
				return (data?.response || 'I am still thinking about that.').toString()
			}
			return 'I am ready.'
		}
		const res = await fetch('/api/admin/ai-chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sidekickId: selectedSidekick,
				sidekickType: selectedSidekick,
				message: payload.message,
				history: payload.history
			})
		})
		if (!res.ok) throw new Error(`Status ${res.status}`)
		const data = await res.json()
		return (data?.response || data?.reply || 'I am still thinking about that.').toString()
	}, [demoMode, blueprintMode, selectedSidekick])

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || isLoading) return

		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content: inputMessage.trim(),
			timestamp: new Date().toISOString()
		}

		setMessages(prev => [...prev, userMessage])
		setInputMessage('')
		setIsLoading(true)

		try {
			const conversationHistory = messages.map(msg => ({
				sender: msg.role === 'assistant' ? 'assistant' : 'user',
				text: msg.content
			}))

			const response = await sendChat({
				message: inputMessage.trim(),
				history: [
					{ sender: 'assistant', text: TRAINING_ARCHITECT_PROMPT },
					{ sender: 'assistant', text: systemPrompts[selectedSidekick] || currentSidekick.systemPrompt },
					...conversationHistory
				]
			})

			const assistantMessage: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: response,
				timestamp: new Date().toISOString(),
				feedback: null
			}

			setMessages(prev => [...prev, assistantMessage])
		} catch (error) {
			console.error('Error getting AI response:', error)
			const errorMessage: ChatMessage = {
				id: `error-${Date.now()}`,
				role: 'assistant',
				content: 'Sorry, I encountered an error. Please try again.',
				timestamp: new Date().toISOString(),
				feedback: null
			}
			setMessages(prev => [...prev, errorMessage])
		} finally {
			setIsLoading(false)
		}
	}

	const handleFeedback = async (messageId: string, feedback: 'thumbs_up' | 'thumbs_down') => {
		setMessages(prev => prev.map(msg =>
			msg.id === messageId ? { ...msg, feedback } : msg
		))

		if (feedbackInFlight === messageId) {
			return
		}
		setFeedbackInFlight(messageId)
		setTrainingNotification(null)
		setTrainingError(null)

		// Send feedback to backend training system
		if (demoMode) {
			console.log('Demo mode – training feedback skipped')
			setTrainingNotification('Demo mode: feedback is not saved.')
			setFeedbackInFlight(null)
			return
		}
		try {
			const message = messages.find(m => m.id === messageId)
			const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1]

			if (!blueprintMode) {
				await fetch(`/api/admin/ai-sidekicks/${selectedSidekick}/feedback`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messageId,
						feedback,
						userMessage: userMessage?.content || '',
						assistantMessage: message?.content || ''
					})
				})

				console.log('✅ Training feedback sent:', { messageId, feedback, sidekick: selectedSidekick })
				setTrainingNotification('Training feedback saved.')
			} else {
				setTrainingNotification('Feedback saved (blueprint).')
			}
		} catch (error) {
			console.error('❌ Failed to send training feedback:', error)
			setTrainingError('Unable to send training feedback. Please try again.')
		} finally {
			setFeedbackInFlight(null)
		}

		// If thumbs down, show improvement input
		if (feedback === 'thumbs_down') {
			setShowImprovementInput(messageId)
		}
	}

	const handleImprovement = async (messageId: string) => {
		if (!improvementText.trim() || improvementLoadingId === messageId) return

		setImprovementLoadingId(messageId)
		setTrainingNotification(null)
		setTrainingError(null)

		if (demoMode) {
			console.log('Demo mode – training improvements skipped')
			setTrainingNotification('Demo mode: improvements are not saved.')
			setImprovementText('')
			setShowImprovementInput(null)
			setImprovementLoadingId(null)
			return
		}

		setMessages(prev => prev.map(msg =>
			msg.id === messageId ? { ...msg, improvement: improvementText.trim() } : msg
		))

		// Send improvement to backend training system
		try {
			const message = messages.find(m => m.id === messageId)
			const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1]

			if (!blueprintMode) {
				await fetch(`/api/admin/ai-sidekicks/${selectedSidekick}/feedback`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messageId,
						feedback: 'thumbs_down', // Already set, but include for context
						improvement: improvementText.trim(),
						userMessage: userMessage?.content || '',
						assistantMessage: message?.content || ''
					})
				})

				console.log('✅ Training improvement sent:', {
					messageId,
					improvement: improvementText.trim(),
					sidekick: selectedSidekick
				})
				setTrainingNotification('Improvement saved.')
			} else {
				setTrainingNotification('Improvement saved (blueprint).')
			}
		} catch (error) {
			console.error('❌ Failed to send training improvement:', error)
			setTrainingError('Unable to save improvement. Please try again.')
		}

		setImprovementText('')
		setShowImprovementInput(null)
		setImprovementLoadingId(null)
	}

	const clearChat = () => {
		setMessages([])
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSendMessage()
		}
	}

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900 mb-2">Train Your AI</h1>
				<p className="text-slate-600">Chat with your AI sidekicks and train them with feedback</p>
			</div>

			<div className="mb-6">
				<button
					type="button"
					onClick={() => setIsHelpPanelOpen(prev => !prev)}
					className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
					aria-expanded={isHelpPanelOpen}
				>
					<span className="material-symbols-outlined text-xl">{isHelpPanelOpen ? 'psychiatry' : 'help'}</span>
					{isHelpPanelOpen ? 'Hide Training Tips' : 'Show Training Tips'}
					<span className="material-symbols-outlined text-base ml-auto">{isHelpPanelOpen ? 'expand_less' : 'expand_more'}</span>
				</button>
				{isHelpPanelOpen && (
					<div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
						<div>
							<h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
								<span className="material-symbols-outlined text-lg">psychology</span>
								Coaching Your Sidekicks
							</h2>
							<ul className="space-y-1.5 list-disc list-inside">
								<li><strong>Pick a persona first:</strong> Select the sidekick closest to the workflow you want to improve (marketing, listing, sales, etc.).</li>
								<li><strong>Drive the conversation:</strong> Ask real questions you hear from clients and let the sidekick respond so you can give targeted feedback.</li>
								<li><strong>Use thumbs + improvements:</strong> Mark great answers with 👍 and give quick notes for fixes with 👎 so the training dataset stays clean.</li>
							</ul>
						</div>
						<div>
							<h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
								<span className="material-symbols-outlined text-lg">tips_and_updates</span>
								Power Training Tips
							</h2>
							<ul className="space-y-1.5 list-disc list-inside">
								<li><strong>Save common prompts:</strong> The quick prompts area is perfect for FAQs—keep adding the phrases you want every agent to handle identically.</li>
								<li><strong>Review the stats:</strong> The progress widget shows total feedback and improvement streaks so you know when a sidekick is production-ready.</li>
								<li><strong>Pro tip:</strong> After training, jump back to AI Sidekicks or the live chat to feel the difference right away—your feedback is live as soon as you submit it.</li>
							</ul>
						</div>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Sidekick Selection */}
				<div className="lg:col-span-1">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Choose Sidekick</h3>
					<div className="space-y-3">
						{sidekicks.map(sidekick => (
							<button
								key={sidekick.id}
								onClick={() => {
									setSelectedSidekick(sidekick.id)
									clearChat()
								}}
								className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedSidekick === sidekick.id
									? `${sidekick.color} border-current shadow-md`
									: 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
									}`}
							>
								<div className="flex items-center gap-3 mb-2">
									<span className="material-symbols-outlined">{sidekick.icon}</span>
									<h4 className="font-semibold">{sidekick.name}</h4>
								</div>
								<p className="text-sm opacity-75">{sidekick.description}</p>
							</button>
						))}
					</div>

					{/* System prompt editor */}
					<div className="mt-5 p-4 bg-white rounded-lg border border-slate-200">
						<div className="flex items-center justify-between mb-2">
							<h4 className="font-medium text-slate-900 text-sm">System Prompt</h4>
							<button
								onClick={async () => {
									if (savingPrompt) return
									setSavingPrompt(true)
									setTrainingNotification(null)
									setTrainingError(null)
									try {
										const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
										if (!demoMode) {
											await fetch(`${base}/${selectedSidekick}/system-prompt`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ systemPrompt: systemPrompts[selectedSidekick] || '' })
											})
										}
										setTrainingNotification('System prompt saved.')
									} catch (error) {
										console.error('Failed to save system prompt', error)
										setTrainingError('Could not save system prompt.')
									} finally {
										setSavingPrompt(false)
									}
								}}
								className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
								disabled={savingPrompt}
							>
								{savingPrompt ? 'Saving...' : 'Save'}
							</button>
						</div>
						<textarea
							value={systemPrompts[selectedSidekick] || ''}
							onChange={e => setSystemPrompts(prev => ({ ...prev, [selectedSidekick]: e.target.value }))}
							className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
							rows={4}
						/>
					</div>

					{/* Memory / uploads */}
					<div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="font-medium text-slate-900 text-sm">Memory</h4>
							{memoryLoading && <span className="text-xs text-slate-500">Loading…</span>}
						</div>
						{memoryError && <p className="text-xs text-rose-600">{memoryError}</p>}
						<div className="space-y-2">
							<label className="text-xs text-slate-600">Add URL</label>
							<div className="flex gap-2">
								<input
									value={memoryUrl}
									onChange={e => setMemoryUrl(e.target.value)}
									className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm"
									placeholder="https://example.com"
								/>
								<button
									onClick={async () => {
										if (!memoryUrl.trim()) return
										setMemoryLoading(true)
										setMemoryError(null)
										try {
											const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
											if (!demoMode) {
												await fetch(`${base}/${selectedSidekick}/memory/upload`, {
													method: 'POST',
													headers: { 'Content-Type': 'application/json' },
													body: JSON.stringify({ type: 'url', content: memoryUrl.trim() })
												})
											}
											setMemoryItems(prev => {
												const list = prev[selectedSidekick] || []
												return {
													...prev,
													[selectedSidekick]: [
														{ id: `${Date.now()}`, title: memoryUrl.trim(), type: 'url', createdAt: new Date().toISOString() },
														...list
													]
												}
											})
											setMemoryUrl('')
										} catch (error) {
											console.error('Failed to save URL memory', error)
											setMemoryError('Could not save URL.')
										} finally {
											setMemoryLoading(false)
										}
									}}
									className="px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
								>
									Save
								</button>
							</div>
						</div>
						<div className="space-y-2">
							<label className="text-xs text-slate-600">Add Note</label>
							<textarea
								value={memoryNote}
								onChange={e => setMemoryNote(e.target.value)}
								className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
								rows={2}
								placeholder="Paste quick instructions or FAQs"
							/>
							<button
								onClick={async () => {
									if (!memoryNote.trim()) return
									setMemoryLoading(true)
									setMemoryError(null)
									try {
										const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
										if (!demoMode) {
											await fetch(`${base}/${selectedSidekick}/memory/upload`, {
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ type: 'text', content: memoryNote.trim() })
											})
										}
										setMemoryItems(prev => {
											const list = prev[selectedSidekick] || []
											return {
												...prev,
												[selectedSidekick]: [
													{ id: `${Date.now()}`, title: memoryNote.trim().slice(0, 60) || 'Note', type: 'text', createdAt: new Date().toISOString() },
													...list
												]
											}
										})
										setMemoryNote('')
									} catch (error) {
										console.error('Failed to save note memory', error)
										setMemoryError('Could not save note.')
									} finally {
										setMemoryLoading(false)
									}
								}}
								className="w-full px-3 py-2 text-xs rounded bg-slate-900 text-white hover:bg-slate-800"
							>
								Save Note
							</button>
						</div>
						<div className="space-y-2">
							<label className="text-xs text-slate-600">Upload Files</label>
							<input
								type="file"
								multiple
								onChange={async e => {
									const files = Array.from(e.target.files || [])
									if (!files.length) return
									setMemoryLoading(true)
									setMemoryError(null)
									try {
										const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
										for (const file of files) {
											if (!demoMode) {
												const fd = new FormData()
												fd.append('file', file)
												await fetch(`${base}/${selectedSidekick}/memory/upload`, { method: 'POST', body: fd })
											}
											setMemoryItems(prev => {
												const list = prev[selectedSidekick] || []
												return {
													...prev,
													[selectedSidekick]: [
														{ id: `${Date.now()}-${file.name}`, title: file.name, type: 'file', createdAt: new Date().toISOString() },
														...list
													]
												}
											})
										}
									} catch (error) {
										console.error('Failed to upload files', error)
										setMemoryError('Could not upload files.')
									} finally {
										setMemoryLoading(false)
									}
								}}
								className="w-full text-sm"
							/>
						</div>
						<div className="pt-2 border-t border-slate-200 space-y-2">
							<h5 className="text-xs font-semibold text-slate-700">Recent memory</h5>
							{(memoryItems[selectedSidekick]?.length || 0) === 0 && (
								<p className="text-xs text-slate-500">No memory added yet.</p>
							)}
							<ul className="space-y-1">
								{(memoryItems[selectedSidekick] || []).slice(0, 4).map(item => (
									<li key={item.id} className="text-xs text-slate-700 flex items-center justify-between">
										<span className="truncate">{item.title}</span>
										<span className="text-[10px] text-slate-400 uppercase">{item.type}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Train action */}
					<div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
						<div className="flex items-center justify-between mb-2">
							<h4 className="font-medium text-slate-900 text-sm">Train & Sync</h4>
							<button
								onClick={async () => {
									setTrainLoading(true)
									setTrainingNotification(null)
									setTrainingError(null)
									try {
										const base = blueprintMode ? '/api/blueprint/ai-sidekicks' : '/api/admin/ai-sidekicks'
										if (!demoMode) {
											await fetch(`${base}/${selectedSidekick}/train`, { method: 'POST' })
										}
										setTrainingNotification('Training job triggered.')
									} catch (error) {
										console.error('Failed to trigger training', error)
										setTrainingError('Could not start training.')
									} finally {
										setTrainLoading(false)
									}
								}}
								className="px-3 py-2 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-50"
								disabled={trainLoading}
							>
								{trainLoading ? 'Triggering…' : 'Trigger Training'}
							</button>
						</div>
						<p className="text-xs text-slate-600">Sync new memory, prompt updates, and feedback to the admin sidekick.</p>
					</div>

					{/* Training Stats */}
					<TrainingStats sidekick={selectedSidekick} currentSessionStats={{
						conversations: messages.filter(m => m.role === 'user').length,
						positiveCount: messages.filter(m => m.feedback === 'thumbs_up').length,
						improvementCount: messages.filter(m => m.improvement).length
					}} demoMode={demoMode} blueprintMode={blueprintMode} />
				</div>

				{/* Chat Interface */}
				<div className="lg:col-span-3">
					<div className="bg-white rounded-lg border border-slate-200 h-[600px] flex flex-col">
						{/* Chat Header */}
						<div className={`p-4 border-b border-slate-200 ${currentSidekickColor} rounded-t-lg`}>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<span className="material-symbols-outlined text-2xl">{currentSidekick.icon}</span>
									<div>
										<h3 className="font-semibold">{currentSidekickName}</h3>
										<p className="text-sm opacity-75">Ready to help and learn</p>
									</div>
								</div>
								<button
									onClick={clearChat}
									className="px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors text-sm"
								>
									Clear Chat
								</button>
							</div>
						</div>

						{/* Messages */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{messages.length === 0 && (
								<div className="text-center py-12">
									<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">chat</span>
									<h3 className="text-lg font-medium text-slate-900 mb-2">Start Training Conversation</h3>
									<p className="text-slate-600">Ask your {currentSidekickName.toLowerCase()} for help with something specific</p>
									<div className="mt-4 space-y-3">
										<p className="text-sm text-slate-500">Try these examples:</p>
										{selectedSidekick === 'marketing' && (
											<div className="space-y-2">
												{[
													"Create a social media post for a luxury condo",
													"Write an email campaign for first-time buyers",
													"Make an Instagram story for an open house",
													"Draft a Facebook ad for a family home"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{(selectedSidekick === 'sales' || selectedSidekick === 'sales_marketing') && (
											<div className="space-y-2">
												{[
													"Help me handle a price objection from a buyer",
													"Create a closing script for motivated sellers",
													"Draft a response to 'I need to think about it'",
													"Help me ask for referrals after a successful sale"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'support' && (
											<div className="space-y-2">
												{[
													"Help triage an outage affecting admin listing uploads",
													"Draft a status update for a calendar sync issue",
													"List steps to debug a failed AI chat response",
													"Create a checklist to verify permissions for a new admin"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'god' && (
											<div className="space-y-2">
												{[
													"Summarize today’s admin risk areas across leads, listings, and sidekicks",
													"Give me the top 3 actions to improve conversion this week",
													"How should I harden AI chat for admin-only data?",
													"Outline a rollout plan for a new sidekick prompt update"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'agent' && (
											<div className="space-y-2">
												{[
													"Summarize today’s lead notes and suggest next steps",
													"Draft a reply that matches my brand voice for a new buyer inquiry",
													"Summarize yesterday’s appointments into bullet points",
													"Give me a quick status on hot leads vs nurture leads"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'sales_marketing' && (
											<div className="space-y-2">
												{[
													"Write a follow-up email that drives a tour booking",
													"Create a 3-text drip to re-engage cold leads",
													"Draft a social post for a new listing launch",
													"Give me CTA ideas to boost conversions this week"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'listing_agent' && (
											<div className="space-y-2">
												{[
													"Write a listing description for a 3 bed / 2 bath craftsman",
													"Suggest pricing strategy for a new listing in a cooling market",
													"Answer a buyer question about HOA fees clearly and concisely",
													"Draft an open-house follow-up message for interested buyers"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							)}
							{trainingNotification && (
								<div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
									{trainingNotification}
								</div>
							)}
							{trainingError && (
								<div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
									{trainingError}
								</div>
							)}

							{messages.map(message => (
								<div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
									<div className={`max-w-[80%] ${message.role === 'user'
										? 'bg-blue-600 text-white'
										: 'bg-slate-100 text-slate-900'
										} rounded-lg p-3`}>
										<p className="whitespace-pre-wrap">{message.content}</p>

										{/* Feedback buttons for assistant messages */}
										{message.role === 'assistant' && (
											<div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
												<button
													onClick={() => handleFeedback(message.id, 'thumbs_up')}
													className={`p-1 rounded hover:bg-slate-200 transition-colors ${message.feedback === 'thumbs_up' ? 'bg-green-100 text-green-600' : 'text-slate-500'
														}`}
												>
													<span className="material-symbols-outlined text-sm">thumb_up</span>
												</button>
												<button
													onClick={() => handleFeedback(message.id, 'thumbs_down')}
													className={`p-1 rounded hover:bg-slate-200 transition-colors ${message.feedback === 'thumbs_down' ? 'bg-red-100 text-red-600' : 'text-slate-500'
														}`}
												>
													<span className="material-symbols-outlined text-sm">thumb_down</span>
												</button>

												{message.feedback && (
													<span className="text-xs text-slate-500 ml-2">
														{message.feedback === 'thumbs_up' ? 'Marked as good' : 'Needs improvement'}
													</span>
												)}
											</div>
										)}

										{/* Improvement input */}
										{showImprovementInput === message.id && (
											<div className="mt-3 pt-3 border-t border-slate-200">
												<textarea
													value={improvementText}
													onChange={(e) => setImprovementText(e.target.value)}
													placeholder="How should this response be improved?"
													rows={2}
													className="w-full px-2 py-1 text-sm border border-slate-300 rounded text-slate-900"
												/>
												<div className="flex gap-2 mt-2">
													<button
														onClick={() => handleImprovement(message.id)}
														disabled={!improvementText.trim() || improvementLoadingId === message.id}
														className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
													>
														{improvementLoadingId === message.id ? 'Saving...' : 'Save Improvement'}
													</button>
													<button
														onClick={() => {
															setShowImprovementInput(null)
															setImprovementText('')
														}}
														className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-xs hover:bg-slate-400"
													>
														Cancel
													</button>
												</div>
											</div>
										)}

										{/* Show improvement if provided */}
										{message.improvement && (
											<div className="mt-3 pt-3 border-t border-slate-200">
												<p className="text-xs text-blue-600">
													<span className="material-symbols-outlined text-xs mr-1">lightbulb</span>
													Improvement: {message.improvement}
												</p>
											</div>
										)}
									</div>
								</div>
							))}

							{isLoading && (
								<div className="flex justify-start">
									<div className="bg-slate-100 rounded-lg p-3">
										<div className="flex items-center gap-2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
											<span className="text-sm text-slate-600">Thinking...</span>
										</div>
									</div>
								</div>
							)}

							<div ref={messagesEndRef} />
						</div>

						{/* Input */}
						<div className="p-4 border-t border-slate-200">
							<div className="flex gap-3">
								<textarea
									value={inputMessage}
									onChange={(e) => setInputMessage(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder={`Ask your ${currentSidekickName.toLowerCase()} for help...`}
									rows={2}
									className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
								/>
								<button
									onClick={handleSendMessage}
									disabled={!inputMessage.trim() || isLoading}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									<span className="material-symbols-outlined">send</span>
									Send
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AIInteractiveTraining
