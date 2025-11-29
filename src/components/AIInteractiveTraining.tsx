import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { continueConversation } from '../services/openaiService'
import {
	chatWithSidekick,
	getSidekicks,
	trainSidekick,
	type AISidekick,
	type ChatHistoryEntry
} from '../services/aiSidekicksService'
import { SIDEKICK_TEMPLATES } from '../constants/sidekickTemplates'

interface TrainingStatsProps {
	sidekickName: string
	isLoading?: boolean
	backendStats?: {
		totalTraining?: number
		positiveFeedback?: number
		improvements?: number
	}
	currentSessionStats: {
		conversations: number
		positiveCount: number
		improvementCount: number
	}
}

const TrainingStats: React.FC<TrainingStatsProps> = ({
	sidekickName,
	isLoading,
	backendStats,
	currentSessionStats
}) => {
	const persistedTotal = backendStats?.totalTraining ?? 0
	const persistedPositive = backendStats?.positiveFeedback ?? 0
	const persistedImprovements = backendStats?.improvements ?? 0

	const combinedTotal = persistedTotal + currentSessionStats.conversations
	const combinedPositive = persistedPositive + currentSessionStats.positiveCount
	const combinedImprovements = persistedImprovements + currentSessionStats.improvementCount

	const successRate = combinedTotal > 0 ? Math.round((combinedPositive / combinedTotal) * 100) : 0

	return (
		<div className="mt-6 p-4 bg-white rounded-lg border border-slate-200">
			<h4 className="font-medium text-slate-900 mb-3">Training Progress — {sidekickName}</h4>
			{isLoading ? (
				<div className="text-center py-4">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
				</div>
			) : (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Total Training</span>
						<span className="font-medium">{combinedTotal}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Positive Feedback</span>
						<span className="font-medium text-green-600">
							{combinedPositive}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Improvements</span>
						<span className="font-medium text-amber-600">
							{combinedImprovements}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">This Session</span>
						<span className="font-medium text-blue-600">
							{currentSessionStats.conversations}
						</span>
					</div>
					{combinedTotal > 0 && (
						<div className="pt-2 border-t border-slate-100">
							<div className="flex justify-between text-xs">
								<span className="text-slate-500">Success Rate</span>
								<span className="font-medium text-green-600">{successRate}%</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: string
	feedback?: 'thumbs_up' | 'thumbs_down' | null
	improvement?: string
}

interface SidekickOption {
	id: string
	scope: string
	name: string
	icon: string
	description: string
	systemPrompt: string
	color: string
	source: 'remote' | 'demo'
	stats?: {
		totalTraining: number
		positiveFeedback: number
		improvements: number
	}
}

const TRAINING_ARCHITECT_PROMPT = `You are the AI Trainer and System Architect for our project.
Your job is to:
1. Audit the current training setup. Check for missing data, context, tone, or instructions that might limit the AI’s understanding of our brand, services, or client interactions.
2. Identify improvement opportunities. Recommend what data, examples, or structured prompts should be added to improve personalization, accuracy, and context retention.
3. Wire up training flow. Ensure the process connects correctly between input data (documents, chat scripts, email templates, FAQs, follow-up sequences, etc.) and the model’s fine-tuning or retrieval layers.
4. Simulate learning. Show how the AI would respond before and after training to verify real improvement.
5. Report and fix. If you find missing context, unclear labeling, or inconsistent tone, propose fixes automatically — show your reasoning and results.

Core objective:
Deliver a complete, ready-to-train AI system that learns like a real assistant — not just from text, but from behavior, tone, and intent. Detect what we’re missing, make recommendations, and confirm when the AI is truly “trained to perform.”`

const AIInteractiveTraining: React.FC = () => {
	const [selectedSidekick, setSelectedSidekick] = useState<string>('')
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [inputMessage, setInputMessage] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [improvementText, setImprovementText] = useState('')
	const [showImprovementInput, setShowImprovementInput] = useState<string | null>(null)
	const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
	const [sidekickOptions, setSidekickOptions] = useState<SidekickOption[]>([])
	const [isLoadingSidekicks, setIsLoadingSidekicks] = useState(false)
	const [sidekickError, setSidekickError] = useState<string | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const hexToRgba = useCallback((hex: string, alpha: number) => {
		const sanitized = hex.replace('#', '')
		if (!sanitized) {
			return `rgba(99, 102, 241, ${alpha})`
		}
		const normalized =
			sanitized.length === 3
				? sanitized
						.split('')
						.map((char) => `${char}${char}`)
						.join('')
				: sanitized.padEnd(6, '0').slice(0, 6)
		const bigint = Number.parseInt(normalized, 16)
		const r = (bigint >> 16) & 255
		const g = (bigint >> 8) & 255
		const b = bigint & 255
		return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}, [])

	const buildRemoteSidekickOption = useCallback((sidekick: AISidekick): SidekickOption => {
		const metadata = sidekick.metadata as Record<string, unknown> | undefined
		const iconCandidate = metadata?.icon
		const colorCandidate = metadata?.color
		const knowledgePreview = Array.isArray(sidekick.knowledgeBase) && sidekick.knowledgeBase.length > 0
			? `Key knowledge:\n${sidekick.knowledgeBase.slice(0, 3).join('\n')}`
			: ''

		return {
			id: sidekick.id,
		scope: typeof sidekick.type === 'string' && sidekick.type.trim().length > 0 ? sidekick.type : 'agent',
			name: sidekick.name || 'AI Sidekick',
			icon:
				typeof iconCandidate === 'string' && iconCandidate.trim().length > 0
					? iconCandidate
					: 'smart_toy',
			description: sidekick.description || 'AI assistant',
			systemPrompt: [
				sidekick.personality?.description,
				knowledgePreview
			]
				.filter(Boolean)
				.join('\n\n'),
			color:
				typeof colorCandidate === 'string' && colorCandidate.trim().length > 0
					? colorCandidate
					: '#6366F1',
			source: 'remote',
			stats: sidekick.stats
		}
	}, [])

	const buildTemplateOptions = useCallback((): SidekickOption[] => {
		return SIDEKICK_TEMPLATES.map((template) => ({
			id: template.id,
		scope: template.type,
			name: template.label,
			icon: template.icon,
			description: template.description,
			systemPrompt: template.personality.description,
			color: template.color,
			source: 'demo'
		}))
	}, [])

	const loadSidekicks = useCallback(async () => {
		setIsLoadingSidekicks(true)
		setSidekickError(null)
		try {
			const data = await getSidekicks()
			if (data.sidekicks.length > 0) {
				const options = data.sidekicks.map(buildRemoteSidekickOption)
				setSidekickOptions(options)
				return
			}
			const fallbackOptions = buildTemplateOptions()
			setSidekickOptions(fallbackOptions)
		} catch (error) {
			console.error('Failed to load AI sidekicks for training:', error)
			setSidekickError('Could not load AI sidekicks. Showing training templates.')
			setSidekickOptions(buildTemplateOptions())
		} finally {
			setIsLoadingSidekicks(false)
		}
	}, [buildRemoteSidekickOption, buildTemplateOptions])

	useEffect(() => {
		void loadSidekicks()
	}, [loadSidekicks])

	useEffect(() => {
		if (sidekickOptions.length === 0) return
		setSelectedSidekick((prev) => {
			if (prev && sidekickOptions.some((option) => option.id === prev)) {
				return prev
			}
			return sidekickOptions[0]?.id ?? prev
		})
	}, [sidekickOptions])

	const currentSidekick = useMemo(
		() => sidekickOptions.find((option) => option.id === selectedSidekick) ?? sidekickOptions[0],
		[sidekickOptions, selectedSidekick]
	)

	const activeScope = currentSidekick?.scope ?? ''
	const knowledgePreview = useMemo(() => {
		const prompt = currentSidekick?.systemPrompt
		if (!prompt) return ''
		const lines = prompt
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0)
		return lines.slice(0, 6).join('\n')
	}, [currentSidekick?.systemPrompt])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	if (!currentSidekick) {
		return (
			<div className="p-6 max-w-6xl mx-auto">
				<div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
					Loading sidekicks…
				</div>
			</div>
		)
	}

	const sendMessage = async (overrideText?: string) => {
		const text = (overrideText ?? inputMessage).trim()
		if (!text || isLoading) return
		if (!currentSidekick) {
			alert('No AI sidekick available right now. Please try again in a moment.')
			return
		}

		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content: text,
			timestamp: new Date().toISOString()
		}

		setMessages(prev => [...prev, userMessage])
		setInputMessage('')
		setIsLoading(true)

		try {
			const priorMessages: ChatHistoryEntry[] = messages.map(msg => ({
				role: msg.role === 'assistant' ? 'assistant' : 'user',
				content: msg.content
			}))
			let assistantText = ''

			if (currentSidekick.source === 'remote' && currentSidekick.id) {
				try {
					const { response } = await chatWithSidekick(currentSidekick.id, text, priorMessages)
					assistantText = response
				} catch (chatError) {
					console.error('Remote sidekick chat failed, falling back to training prompt flow:', chatError)
				}
			}

			if (!assistantText) {
				const conversationHistory = [...messages, userMessage].map(msg => ({
					sender: msg.role === 'assistant' ? 'assistant' : 'user',
					text: msg.content
				}))

				const response = await continueConversation(
					[
						{ sender: 'system', text: TRAINING_ARCHITECT_PROMPT },
						...(currentSidekick.systemPrompt ? [{ sender: 'system', text: currentSidekick.systemPrompt }] : []),
						...conversationHistory,
						{ sender: 'user', text }
					],
					currentSidekick.scope
				)
				assistantText = response
			}

			const assistantMessage: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: assistantText,
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
		const message = messages.find(m => m.id === messageId)
		const previousMessageIndex = messages.findIndex(m => m.id === messageId) - 1
		const userMessage = previousMessageIndex >= 0 ? messages[previousMessageIndex] : undefined

		setMessages(prev => prev.map(msg =>
			msg.id === messageId ? { ...msg, feedback } : msg
		))

		const activeSidekick = sidekickOptions.find(option => option.id === selectedSidekick)
		if (activeSidekick?.source === 'remote' && activeSidekick.id) {
			try {
				const updated = await trainSidekick(activeSidekick.id, {
					userMessage: userMessage?.content ?? '',
					assistantMessage: message?.content ?? '',
					feedback: feedback === 'thumbs_up' ? 'positive' : 'negative',
					messageId
				})
				if (updated) {
					setSidekickOptions(prev =>
						prev.map(option =>
							option.id === updated.id
								? {
										...option,
										stats: updated.stats
									}
								: option
						)
					)
				}
			} catch (error) {
				console.error('❌ Failed to record training feedback:', error)
			}
		}

		// If thumbs down, show improvement input
		if (feedback === 'thumbs_down') {
			setShowImprovementInput(messageId)
		}
	}

	const handleImprovement = async (messageId: string) => {
		if (!improvementText.trim()) return

		const trimmed = improvementText.trim()
		const message = messages.find(m => m.id === messageId)
		const previousMessageIndex = messages.findIndex(m => m.id === messageId) - 1
		const userMessage = previousMessageIndex >= 0 ? messages[previousMessageIndex] : undefined

		setMessages(prev => prev.map(msg => 
			msg.id === messageId ? { ...msg, improvement: trimmed } : msg
		))

		const activeSidekick = sidekickOptions.find(option => option.id === selectedSidekick)
		if (activeSidekick?.source === 'remote' && activeSidekick.id) {
			try {
				const updated = await trainSidekick(activeSidekick.id, {
					userMessage: userMessage?.content ?? '',
					assistantMessage: message?.content ?? '',
					feedback: 'negative',
					improvement: trimmed,
					messageId
				})
				if (updated) {
					setSidekickOptions(prev =>
						prev.map(option =>
							option.id === updated.id
								? {
										...option,
										stats: updated.stats
									}
								: option
						)
					)
				}
			} catch (error) {
				console.error('❌ Failed to send training improvement:', error)
			}
		}

		setImprovementText('')
		setShowImprovementInput(null)
	}

	const clearChat = () => {
		setMessages([])
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			void sendMessage()
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
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
								<span className="material-symbols-outlined text-base">translate</span>
								Multilingual replies (keep default English)
							</h3>
							<ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
								<li>Ask ad‑hoc in chat: “Answer in Spanish” or “Answer in Mandarin”.</li>
								<li>Translate your draft: “Translate this to Spanish: &lt;your English reply&gt;”.</li>
								<li>We auto‑translate back to English for analytics/search when needed.</li>
							</ul>
						</div>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Sidekick Selection */}
				<div className="lg:col-span-1">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">Choose Sidekick</h3>
					{sidekickError && (
						<div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							{sidekickError}
						</div>
					)}
					<div className="space-y-3">
						{isLoadingSidekicks && sidekickOptions.length === 0 ? (
							<div className="text-sm text-slate-500">Loading sidekicks…</div>
						) : (
							sidekickOptions.map(sidekick => {
								const isSelected = selectedSidekick === sidekick.id
								const style: React.CSSProperties = sidekick.color
									? {
											borderColor: sidekick.color,
											backgroundColor: isSelected ? hexToRgba(sidekick.color, 0.12) : undefined
										}
									: {}
								return (
									<button
										key={sidekick.id}
										onClick={() => {
											setSelectedSidekick(sidekick.id)
											clearChat()
										}}
										className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
											isSelected ? 'shadow-md ring-2 ring-offset-1 ring-primary-200' : 'hover:border-slate-300 hover:shadow-sm'
										}`}
										style={style}
									>
										<div className="flex items-center gap-3 mb-2">
											<span className="material-symbols-outlined">{sidekick.icon}</span>
											<div>
												<h4 className="font-semibold">{sidekick.name}</h4>
												<p className="text-[11px] uppercase tracking-wide text-slate-400">{sidekick.source === 'remote' ? 'Linked Sidekick' : 'Demo Template'}</p>
											</div>
										</div>
										<p className="text-sm opacity-75">{sidekick.description}</p>
									</button>
								)
							})
						)}
					</div>

					{/* Training Stats */}
					<TrainingStats
						sidekickName={currentSidekick?.name ?? 'AI Sidekick'}
						isLoading={isLoadingSidekicks}
						backendStats={currentSidekick?.stats}
						currentSessionStats={{
							conversations: messages.filter(m => m.role === 'user').length,
							positiveCount: messages.filter(m => m.feedback === 'thumbs_up').length,
							improvementCount: messages.filter(m => m.improvement).length
						}}
					/>

					{currentSidekick?.source === 'remote' && knowledgePreview && (
						<div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
							<h4 className="font-medium text-slate-900 mb-2">Knowledge highlights</h4>
							<p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{knowledgePreview}</p>
						</div>
					)}
				</div>

				{/* Chat Interface */}
				<div className="lg:col-span-3">
					<div className="bg-white rounded-lg border border-slate-200 h-[600px] flex flex-col">
						{/* Chat Header */}
						<div
							className="p-4 border-b border-slate-200 rounded-t-lg"
							style={
								currentSidekick?.color
									? {
											backgroundColor: hexToRgba(currentSidekick.color, 0.12),
											borderColor: currentSidekick.color
										}
									: undefined
							}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<span className="material-symbols-outlined text-2xl">{currentSidekick.icon}</span>
									<div>
										<h3 className="font-semibold">{currentSidekick.name}</h3>
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
									<p className="text-slate-600">Ask your {currentSidekick.name.toLowerCase()} for help with something specific</p>
									<div className="mt-4 space-y-3">
										<p className="text-sm text-slate-500">Try these examples:</p>
										{activeScope === 'marketing' && (
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
															void sendMessage(prompt)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{activeScope === 'listing' && (
											<div className="space-y-2">
												{[
													"Write a description for a 3BR family home",
													"Create listing highlights for a downtown condo",
													"Describe the kitchen features in this property",
													"Write about the neighborhood amenities"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															void sendMessage(prompt)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{activeScope === 'agent' && (
											<div className="space-y-2">
												{[
													"Help me respond to a client asking about mortgage rates",
													"Draft a follow-up email after a showing",
													"Write a message to schedule a property viewing",
													"Help me explain the buying process to first-timers"
												].map((prompt, idx) => (
													<button
														key={idx}
														onClick={() => {
															void sendMessage(prompt)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{activeScope === 'sales' && (
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
															void sendMessage(prompt)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{messages.map(message => (
								<div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
									<div className={`max-w-[80%] ${
										message.role === 'user' 
											? 'bg-blue-600 text-white' 
											: 'bg-slate-100 text-slate-900'
									} rounded-lg p-3`}>
										<p className="whitespace-pre-wrap">{message.content}</p>
										
										{/* Feedback buttons for assistant messages */}
										{message.role === 'assistant' && (
											<div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
												<button
													onClick={() => handleFeedback(message.id, 'thumbs_up')}
													className={`p-1 rounded hover:bg-slate-200 transition-colors ${
														message.feedback === 'thumbs_up' ? 'bg-green-100 text-green-600' : 'text-slate-500'
													}`}
												>
													<span className="material-symbols-outlined text-sm">thumb_up</span>
												</button>
												<button
													onClick={() => handleFeedback(message.id, 'thumbs_down')}
													className={`p-1 rounded hover:bg-slate-200 transition-colors ${
														message.feedback === 'thumbs_down' ? 'bg-red-100 text-red-600' : 'text-slate-500'
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
														disabled={!improvementText.trim()}
														className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
													>
														Save Improvement
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
									placeholder={`Ask your ${currentSidekick.name.toLowerCase()} for help...`}
									rows={2}
									className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
								/>
								<button
									onClick={() => { void sendMessage() }}
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
