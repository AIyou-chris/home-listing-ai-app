import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
// FileUploadService removed - using Supabase alternatives

interface AIAgent {
	id: string
	name: string
	isActive: boolean
	voice: 'female-1' | 'female-2' | 'male-1' | 'male-2'
	persona: string
	icon?: string
	personaTitle?: string
	personaDescription?: string
	knowledge: { id: string; title: string; createdAt: string }[]
}

const defaultAgents = (): AIAgent[] => [
	{
		id: crypto.randomUUID(),
		name: 'New Agent',
		isActive: true,
		voice: 'female-1',
		icon: 'smart_toy',
		persona:
			'Describe how this agent speaks, acts, and helps clients.',
		personaTitle: 'Custom Personality',
		personaDescription:
			'Describe who you are, your expertise, and how you help clients.',
		knowledge: []
	}
]

const keyFor = (userId: string) => `hlai_agents_${userId || 'local'}`

const AdminAgentsPage: React.FC = () => {
	const [userId, setUserId] = useState<string>('local')
	const [agents, setAgents] = useState<AIAgent[]>([])
	const [query, setQuery] = useState('')
	const [addingTextFor, setAddingTextFor] = useState<string | null>(null)
	const [addingForAgentId, setAddingForAgentId] = useState<string | null>(null)
	const [personaForAgentId, setPersonaForAgentId] = useState<string | null>(null)
	const [actionMenuFor, setActionMenuFor] = useState<string | null>(null)
	const [activeAddTab, setActiveAddTab] = useState<'quick' | 'file' | 'url'>('quick')
	const [textTitle, setTextTitle] = useState('')
	const [textContent, setTextContent] = useState('')
	const [uploadingFor, setUploadingFor] = useState<string | null>(null)
	const [urlInput, setUrlInput] = useState('')
	const [urlFreq, setUrlFreq] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once')
	const [showPersonaModal, setShowPersonaModal] = useState(false)
	const [showIconModal, setShowIconModal] = useState(false)
	// Curated icon set: bot, megaphone, support, home/listing, handshake, ideas, chat
	const iconChoices = ['smart_toy','campaign','support_agent','home','apartment','handshake','lightbulb','chat']
	// Voice preview state
	const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
	const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

	const currentAgent: AIAgent | null = agents[0] || null

	const updateCurrent = (updates: Partial<AIAgent>) => {
		if (!currentAgent) return
		const next = agents.map(a => a.id === currentAgent.id ? { ...a, ...updates } : a)
		saveAgents(next)
	}

	useEffect(() => {
		const init = async () => {
			try {
				const { data: { user } } = await supabase.auth.getUser()
				const uid = user?.id || 'local'
				setUserId(uid)
				const raw = localStorage.getItem(keyFor(uid))
				if (raw) {
					setAgents(JSON.parse(raw))
				} else {
					const seeded = defaultAgents()
					localStorage.setItem(keyFor(uid), JSON.stringify(seeded))
					setAgents(seeded)
				}
			} catch {
				const seeded = defaultAgents()
				localStorage.setItem(keyFor('local'), JSON.stringify(seeded))
				setAgents(seeded)
			}
		}
		init()
	}, [])

	// Load speech synthesis voices for previews
	useEffect(() => {
		const synth = window.speechSynthesis
		const loadVoices = () => {
			const vs = synth.getVoices()
			if (vs && vs.length) setAvailableVoices(vs)
		}
		loadVoices()
		synth.onvoiceschanged = () => loadVoices()
		return () => {
			(synth as any).onvoiceschanged = null
		}
	}, [])

	const saveAgents = (next: AIAgent[]) => {
		localStorage.setItem(keyFor(userId), JSON.stringify(next))
		setAgents(next)
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return agents
		return agents.filter(a => a.name.toLowerCase().includes(q))
	}, [agents, query])

	const handleToggle = (id: string) => {
		const next = agents.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a)
		saveAgents(next)
	}

	const handleVoice = (id: string, voice: AIAgent['voice']) => {
		const next = agents.map(a => a.id === id ? { ...a, voice } : a)
		saveAgents(next)
	}

	const handlePersona = (id: string, persona: string) => {
		const next = agents.map(a => a.id === id ? { ...a, persona } : a)
		saveAgents(next)
	}

	const handleAddText = async (agent: AIAgent) => {
		if (!textTitle.trim() || !textContent.trim()) return
		setAddingTextFor(agent.id)
		try {
			const blob = new Blob([textContent], { type: 'text/plain' })
			const file = new File([blob], `${textTitle}.txt`, { type: 'text/plain' })
			// FileUploadService removed - using Supabase alternatives
			const item = { id: crypto.randomUUID(), title: textTitle.trim(), createdAt: new Date().toISOString() }
			const next = agents.map(a => a.id === agent.id ? { ...a, knowledge: [item, ...a.knowledge] } : a)
			saveAgents(next)
			setTextTitle('')
			setTextContent('')
		} finally {
			setAddingTextFor(null)
		}
	}

	const handleUploadFile = async (agent: AIAgent, file: File) => {
		setUploadingFor(agent.id)
		try {
			// FileUploadService removed - using Supabase alternatives
			const item = { id: crypto.randomUUID(), title: file.name, createdAt: new Date().toISOString() }
			const next = agents.map(a => a.id === agent.id ? { ...a, knowledge: [item, ...a.knowledge] } : a)
			saveAgents(next)
		} finally {
			setUploadingFor(null)
		}
	}

	const handleAddAgent = () => {
		const next: AIAgent = {
			id: crypto.randomUUID(),
			name: 'New Agent',
			isActive: true,
			voice: 'female-1',
			persona: 'Describe how this agent speaks, acts, and helps clients.',
			knowledge: []
		}
		saveAgents([next, ...agents])
	}

	// Voice presets and preview helpers
	const voicePresets: Array<{
		id: AIAgent['voice']
		title: string
		description: string
		sample: string
		gender: 'female' | 'male'
	}> = [
		{ id: 'female-1', title: 'Warm Female', description: 'Friendly, upbeat, and engaging for introductions.', sample: `Hi, I'm your AI assistant. Let’s get started!`, gender: 'female' },
		{ id: 'female-2', title: 'Calm Female', description: 'Clear and relaxed tone for informative guidance.', sample: 'Hello, I’m here to help you with your next steps.', gender: 'female' },
		{ id: 'male-1', title: 'Confident Male', description: 'Professional and assured, great for walkthroughs.', sample: 'Welcome back. Here’s what I can do for you today.', gender: 'male' },
		{ id: 'male-2', title: 'Approachable Male', description: 'Friendly conversational style for casual help.', sample: 'Hi there! Ready when you are.', gender: 'male' }
	]

	const pickVoiceForGender = (gender: 'female' | 'male'): SpeechSynthesisVoice | undefined => {
		if (!availableVoices.length) return undefined
		const byName = availableVoices.find(v =>
			gender === 'female'
				? /female|samantha|victoria|karen|serena|susan/i.test(v.name)
				: /male|daniel|michael|alex|fred|arthur|oliver/i.test(v.name)
		)
		return byName || availableVoices[0]
	}

	const handlePlayPreview = (presetId: AIAgent['voice']) => {
		const preset = voicePresets.find(p => p.id === presetId)
		if (!preset) return
		const synth = window.speechSynthesis
		synth.cancel()
		const utter = new SpeechSynthesisUtterance(preset.sample)
		const v = pickVoiceForGender(preset.gender)
		if (v) utter.voice = v
		setPlayingVoiceId(presetId)
		utter.onend = () => setPlayingVoiceId(null)
		utter.onerror = () => setPlayingVoiceId(null)
		synth.speak(utter)
	}

	return (
		<div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">AI Sidekicks</h1>
					<p className="text-slate-600">Each agent bundles personality, voice, and knowledge.</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="relative">
						<span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<span className="material-symbols-outlined text-slate-400">search</span>
						</span>
						<input
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder="Search agents..."
							className="block w-64 pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
						/>
					</div>
					<button onClick={handleAddAgent} className="px-5 py-2.5 bg-primary-600 text-white rounded-full font-semibold hover:bg-primary-700 transition">
						<span className="material-symbols-outlined text-sm">add</span>
						New Agent
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left column */}
				<div className="lg:col-span-8 space-y-6">
					{/* Header: icon + name */}
					<div className="bg-white border border-slate-200 rounded-xl p-4">
						<div className="flex items-center flex-wrap gap-3">
							<button onClick={() => setShowIconModal(true)} aria-label="Choose agent icon" className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl">
								<span className="material-symbols-outlined">{currentAgent?.icon || 'smart_toy'}</span>
							</button>
							<input value={currentAgent?.name || ''} onChange={e => updateCurrent({ name: e.target.value })} placeholder="AI agent name" className="px-3 py-2 rounded-full border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-500" />
							<div className="ml-auto flex items-center gap-2">
								<button onClick={() => currentAgent && handleToggle(currentAgent.id)} className="px-3 py-1.5 rounded-full text-xs bg-slate-100 text-slate-700 hover:bg-slate-200">{currentAgent?.isActive ? 'Disable' : 'Enable'}</button>
							</div>
						</div>
					</div>

					{/* AI Personality full-width button */}
					<div className="bg-white border border-slate-200 rounded-xl p-4">
						<button onClick={() => setShowPersonaModal(true)} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition">
							<span className="material-symbols-outlined">auto_awesome</span>
							AI Personality
						</button>
					</div>

					{/* Add Knowledge full-width */}
					<div className="bg-white border border-slate-200 rounded-xl p-4">
						<button onClick={() => currentAgent && setAddingForAgentId(currentAgent.id)} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-full font-semibold hover:bg-primary-700 transition">
							<span className="material-symbols-outlined">add</span>
							Add Knowledge
						</button>
					</div>

					{/* Knowledge list */}
					<div className="bg-white border border-slate-200 rounded-xl p-4">
						<h4 className="text-sm font-semibold text-slate-900 mb-3">Knowledge Entries</h4>
						{(currentAgent?.knowledge.length || 0) === 0 ? (
							<div className="text-sm text-slate-500">No knowledge yet.</div>
						) : (
							<ul className="grid sm:grid-cols-2 gap-3">
								{(currentAgent?.knowledge || []).map(k => (
									<li key={k.id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="font-medium text-sm text-slate-900 truncate">{k.title}</div>
											<div className="text-xs text-slate-500">{new Date(k.createdAt).toLocaleDateString()}</div>
										</div>
										<button aria-label="Delete entry" className="p-1.5 rounded-md text-red-600 hover:bg-red-50">
											<span className="material-symbols-outlined text-base">delete</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					{/* Voice tiles */}
					<div className="bg-white border border-slate-200 rounded-xl p-4">
						<h4 className="text-sm font-semibold text-slate-900 mb-3">Voices</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{voicePresets.map(preset => (
								<div key={preset.id} className={`rounded-2xl p-4 text-white ${preset.gender === 'female' ? (currentAgent?.voice === preset.id ? 'bg-purple-700' : 'bg-purple-600') : (currentAgent?.voice === preset.id ? 'bg-primary-700' : 'bg-primary-600')} flex flex-col items-stretch gap-3`}>
									<div className="font-semibold text-sm">{preset.title}</div>
									<div className="text-xs opacity-90">{preset.description}</div>
									<div className="mt-auto flex items-center justify-between gap-2">
										<button onClick={() => handlePlayPreview(preset.id)} aria-label={`Play ${preset.title}`} className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs">Play</button>
										<button onClick={() => currentAgent && handleVoice(currentAgent.id, preset.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${currentAgent?.voice === preset.id ? 'bg-white text-slate-800' : 'bg-white/20 text-white hover:bg-white/30'}`}>Select</button>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right column */}
				<div className="lg:col-span-4 space-y-6">
					<div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
						<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentAgent?.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{currentAgent?.isActive ? 'Active' : 'Inactive'}</span>
						<span className="text-xs text-slate-500">{currentAgent?.knowledge.length || 0} entries</span>
					</div>
				</div>
			</div>
			{/* Add Knowledge Modal (center) */}
			{addingForAgentId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/40" onClick={() => setAddingForAgentId(null)} />
					<div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col">
						<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 rounded-t-xl">
							<h3 className="text-base font-semibold text-slate-900">Add Knowledge</h3>
							<button onClick={() => setAddingForAgentId(null)} className="p-1 rounded-md hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
						</div>
						<div className="px-4 pt-3">
							<div className="flex items-center gap-2 mb-3">
								{(['quick','file','url'] as const).map(tab => (
									<button key={tab} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${activeAddTab === tab ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveAddTab(tab)}>
										{tab === 'quick' ? 'Quick Add' : tab === 'file' ? 'Upload File' : 'URL Scanner'}
									</button>
								))}
							</div>
						</div>
						<div className="flex-1 overflow-auto px-4 pb-4">
							{activeAddTab === 'quick' && (
								<div className="space-y-3">
									<div>
										<label className="block text-xs text-slate-500 mb-1">Title</label>
										<input value={textTitle} onChange={e => setTextTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Short title" />
									</div>
									<div>
										<label className="block text-xs text-slate-500 mb-1">Content</label>
										<textarea rows={8} value={textContent} onChange={e => setTextContent(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Paste text..." />
									</div>
									<button onClick={() => {
										const ag = agents.find(a => a.id === addingForAgentId)
										if (ag) handleAddText(ag)
									}} className="w-full px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Add</button>
								</div>
							)}
							{activeAddTab === 'file' && (
								<div className="space-y-3">
									<label className="block text-xs text-slate-500 mb-1">Choose file</label>
									<input type="file" className="block w-full text-sm" onChange={e => {
										const f = e.target.files?.[0]
										const ag = agents.find(a => a.id === addingForAgentId)
										if (f && ag) handleUploadFile(ag, f)
									}} disabled={uploadingFor === addingForAgentId} />
									{uploadingFor === addingForAgentId && <div className="text-xs text-slate-500">Uploading...</div>}
								</div>
							)}
							{activeAddTab === 'url' && (
								<div className="space-y-3">
									<div>
										<label className="block text-xs text-slate-500 mb-1">Website URL</label>
										<input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/article" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
									</div>
									<div>
										<label className="block text-xs text-slate-500 mb-1">Frequency</label>
										<select value={urlFreq} onChange={e => setUrlFreq(e.target.value as any)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
											<option value="once">Once (Manual)</option>
											<option value="daily">Daily</option>
											<option value="weekly">Weekly</option>
											<option value="monthly">Monthly</option>
										</select>
									</div>
									<button onClick={() => {
										if (!urlInput.trim()) return
										const ag = agents.find(a => a.id === addingForAgentId)
										if (!ag) return
										const item = { id: crypto.randomUUID(), title: `URL: ${urlInput}`, createdAt: new Date().toISOString() }
										const next = agents.map(a => a.id === ag.id ? { ...a, knowledge: [item, ...a.knowledge] } : a)
										saveAgents(next)
										setUrlInput('')
									}} className="w-full px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Add URL</button>
								</div>
							)}
						</div>
						<div className="border-t border-slate-200 p-3 bg-white flex items-center justify-end rounded-b-2xl">
							<button onClick={() => setAddingForAgentId(null)} className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm">Close</button>
						</div>
					</div>
				</div>
			)}

			{/* Persona Modal (center) */}
			{showPersonaModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/40" onClick={() => setShowPersonaModal(false)} />
					<div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">
						<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 rounded-t-xl">
							<h3 className="text-base font-semibold text-slate-900">AI Personality Editor</h3>
							<button onClick={() => setShowPersonaModal(false)} className="p-1 rounded-md hover:bg-slate-100"><span className="material-symbols-outlined">close</span></button>
						</div>
						<div className="p-4 space-y-4">
							<label className="block text-xs text-slate-500 mb-1">Who You Are</label>
							<select defaultValue={currentAgent?.personaTitle || 'Custom Personality'} onChange={e => updateCurrent({ personaTitle: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
								<option>Sales Expert</option>
								<option>Friendly Guide</option>
								<option>Professional Advisor</option>
								<option>Custom Personality</option>
							</select>
							<div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-sm text-slate-700">
								{currentAgent?.personaTitle || 'Custom Personality'}
							</div>
							<div>
								<label className="block text-xs text-slate-500 mb-1">Personality Description</label>
								<textarea rows={6} defaultValue={currentAgent?.persona} onBlur={e => updateCurrent({ persona: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
							</div>
						</div>
						<div className="border-t border-slate-200 p-3 bg-white flex items-center justify-end rounded-b-2xl">
							<button onClick={() => setShowPersonaModal(false)} className="px-4 py-2 rounded-full bg-primary-600 text-white text-sm">Done</button>
						</div>
					</div>
				</div>
			)}

			{/* Icon Picker Modal */}
			{showIconModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/40" onClick={() => setShowIconModal(false)} />
					<div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
						<h3 className="text-base font-semibold text-slate-900 mb-3">Choose Agent Icon</h3>
						<div className="grid grid-cols-4 gap-3">
							{iconChoices.map(ic => (
								<button key={ic} onClick={() => { updateCurrent({ icon: ic }); setShowIconModal(false); }} className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
									<span className="material-symbols-outlined">{ic}</span>
								</button>
							))}
						</div>
						<div className="mt-4 flex justify-end">
							<button onClick={() => setShowIconModal(false)} className="px-3 py-2 rounded-md bg-slate-100 text-slate-700 text-sm">Close</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default AdminAgentsPage


