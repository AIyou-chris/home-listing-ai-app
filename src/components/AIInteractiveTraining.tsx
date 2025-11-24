import React, { useState, useRef, useEffect } from 'react'
import { continueConversation } from '../services/openaiService'

interface TrainingStatsProps {
	sidekick: string
	currentSessionStats: {
		conversations: number
		positiveCount: number
		improvementCount: number
	}
}

interface TrainingStatsResponse {
	totalFeedback?: number
	positiveCount?: number
	improvementCount?: number
}

const TrainingStats: React.FC<TrainingStatsProps> = ({ sidekick, currentSessionStats }) => {
	const [backendStats, setBackendStats] = useState<TrainingStatsResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pendingFetch = useRef<AbortController | null>(null)

	useEffect(() => {
		setIsLoading(true)
		if (refreshTimer.current) {
			clearTimeout(refreshTimer.current)
		}

		refreshTimer.current = setTimeout(async () => {
			pendingFetch.current?.abort()
			const controller = new AbortController()
			pendingFetch.current = controller
			try {
				const response = await fetch(`/api/training/feedback/${sidekick}`, {
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
				pendingFetch.current = null
			}
		}, 250)

		return () => {
			if (refreshTimer.current) {
				clearTimeout(refreshTimer.current)
			}
			pendingFetch.current?.abort()
		}
	}, [sidekick])

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
	name: string
	icon: string
	description: string
	systemPrompt: string
	color: string
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
	const [selectedSidekick, setSelectedSidekick] = useState<string>('marketing')
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
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const sidekicks: SidekickOption[] = [
		{
			id: 'marketing',
			name: 'Marketing Sidekick',
			icon: 'campaign',
			description: 'Social media, content creation, marketing campaigns',
			systemPrompt: 'You are a Marketing Sidekick for a real estate agent. Create engaging, conversion-focused marketing content. Be creative, on-brand, and results-oriented. Help with social media posts, email campaigns, property descriptions, and marketing strategies.',
			color: 'bg-amber-100 text-amber-800 border-amber-200'
		},
		{
			id: 'agent',
			name: 'Agent Sidekick',
			icon: 'person',
			description: 'Client communication, scheduling, general assistance',
			systemPrompt: 'You are an Agent Sidekick for a real estate professional. Help with client communication, appointment scheduling, follow-ups, and general real estate tasks. Be professional, helpful, and client-focused.',
			color: 'bg-blue-100 text-blue-800 border-blue-200'
		},
		{
			id: 'listing',
			name: 'Listing Sidekick',
			icon: 'home',
			description: 'Property descriptions, listing details, market analysis',
			systemPrompt: 'You are a Listing Sidekick specializing in property descriptions and listing content. Create compelling, accurate property descriptions that highlight key features and benefits. Be detailed, persuasive, and market-aware.',
			color: 'bg-green-100 text-green-800 border-green-200'
		},
		{
			id: 'sales',
			name: 'Sales Sidekick',
			icon: 'trending_up',
			description: 'Lead qualification, objection handling, closing strategies',
			systemPrompt: 'You are a Sales Sidekick focused on lead qualification and conversion. Help with objection handling, closing strategies, and sales conversations. Be persuasive, confident, and results-driven.',
			color: 'bg-red-100 text-red-800 border-red-200'
		}
	]

	const currentSidekick = sidekicks.find(s => s.id === selectedSidekick) || sidekicks[0]

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

			const response = await continueConversation([
				{ sender: 'system', text: TRAINING_ARCHITECT_PROMPT },
				{ sender: 'system', text: currentSidekick.systemPrompt },
				...conversationHistory,
				{ sender: 'user', text: inputMessage.trim() }
			], selectedSidekick)

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
		try {
			const message = messages.find(m => m.id === messageId)
			const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1]
			
			await fetch('/api/training/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId,
					sidekick: selectedSidekick,
					feedback,
					userMessage: userMessage?.content || '',
					assistantMessage: message?.content || ''
				})
			})
			
			console.log('✅ Training feedback sent:', { messageId, feedback, sidekick: selectedSidekick })
			setTrainingNotification('Training feedback saved.')
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

		setMessages(prev => prev.map(msg => 
			msg.id === messageId ? { ...msg, improvement: improvementText.trim() } : msg
		))

		// Send improvement to backend training system
		try {
			const message = messages.find(m => m.id === messageId)
			const userMessage = messages[messages.findIndex(m => m.id === messageId) - 1]
			
			await fetch('/api/training/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId,
					sidekick: selectedSidekick,
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
								className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
									selectedSidekick === sidekick.id
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

					{/* Training Stats */}
					<TrainingStats sidekick={selectedSidekick} currentSessionStats={{
						conversations: messages.filter(m => m.role === 'user').length,
						positiveCount: messages.filter(m => m.feedback === 'thumbs_up').length,
						improvementCount: messages.filter(m => m.improvement).length
					}} />
				</div>

				{/* Chat Interface */}
				<div className="lg:col-span-3">
					<div className="bg-white rounded-lg border border-slate-200 h-[600px] flex flex-col">
						{/* Chat Header */}
						<div className={`p-4 border-b border-slate-200 ${currentSidekick.color} rounded-t-lg`}>
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
										{selectedSidekick === 'listing' && (
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
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'agent' && (
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
															setInputMessage(prompt)
															setTimeout(() => handleSendMessage(), 100)
														}}
														className="block w-full text-left px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
													>
														{prompt}
													</button>
												))}
											</div>
										)}
										{selectedSidekick === 'sales' && (
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
									placeholder={`Ask your ${currentSidekick.name.toLowerCase()} for help...`}
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
