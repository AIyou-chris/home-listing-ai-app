import React, { useState, useEffect } from 'react'

interface BrandVoice {
	id: string
	name: string
	description: string
	example: string
	tone: 'professional' | 'friendly' | 'luxury' | 'casual' | 'expert'
	salesStyle: 'consultative' | 'direct' | 'relationship' | 'educational'
}

interface CustomAdjustments {
	warmth: number // 1-5 scale
	directness: number // 1-5 scale
	expertise: number // 1-5 scale
	urgency: number // 1-5 scale
}

const adjustmentLabels: Record<keyof CustomAdjustments, string> = {
    warmth: '🤝 Warmth',
    directness: '🎯 Directness',
    expertise: '🧠 Expertise Level',
    urgency: '⚡ Urgency'
}

const SimplifiedSidekickSetup: React.FC = () => {
	const [currentStep, setCurrentStep] = useState(1)
	const [selectedPreset, setSelectedPreset] = useState<string>('')
	const [customAdjustments, setCustomAdjustments] = useState<CustomAdjustments>({
		warmth: 3,
		directness: 3,
		expertise: 3,
		urgency: 2
	})
	const [agentName, setAgentName] = useState('')
	const [brandFocus, setBrandFocus] = useState('')
	const [timeSpent, setTimeSpent] = useState(0)

	// Timer to track setup time
	useEffect(() => {
		const timer = setInterval(() => {
			setTimeSpent(prev => prev + 1)
		}, 1000)
		return () => clearInterval(timer)
	}, [])

	const brandPresets: BrandVoice[] = [
		{
			id: 'luxury-consultant',
			name: 'Luxury Consultant',
			description: 'Sophisticated, knowledgeable, premium service focused',
			example: "I'd be delighted to show you this exceptional property. The attention to detail in the master suite is truly remarkable...",
			tone: 'luxury',
			salesStyle: 'consultative'
		},
		{
			id: 'friendly-neighbor',
			name: 'Friendly Neighbor',
			description: 'Warm, approachable, relationship-building',
			example: "Hi there! I'm so excited to help you find your perfect home. This property has such a welcoming feel...",
			tone: 'friendly',
			salesStyle: 'relationship'
		},
		{
			id: 'market-expert',
			name: 'Market Expert',
			description: 'Data-driven, analytical, educational approach',
			example: "Based on current market trends, this property offers excellent value. Let me share the comparable sales data...",
			tone: 'expert',
			salesStyle: 'educational'
		},
		{
			id: 'results-focused',
			name: 'Results-Focused',
			description: 'Direct, efficient, action-oriented',
			example: "This property won't last long at this price. I can schedule a showing today and we can move quickly...",
			tone: 'professional',
			salesStyle: 'direct'
		},
		{
			id: 'trusted-advisor',
			name: 'Trusted Advisor',
			description: 'Professional yet personal, guidance-focused',
			example: "I understand this is a big decision. Let me walk you through everything so you feel confident...",
			tone: 'professional',
			salesStyle: 'consultative'
		}
	]

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const getSliderColor = (value: number) => {
		if (value <= 2) return 'bg-blue-500'
		if (value <= 3) return 'bg-green-500'
		if (value <= 4) return 'bg-amber-500'
		return 'bg-red-500'
	}

	const getSliderLabel = (type: keyof CustomAdjustments, value: number) => {
		const labels = {
			warmth: ['Very Professional', 'Professional', 'Balanced', 'Warm', 'Very Warm'],
			directness: ['Very Gentle', 'Gentle', 'Balanced', 'Direct', 'Very Direct'],
			expertise: ['Simple Terms', 'Easy', 'Balanced', 'Detailed', 'Very Technical'],
			urgency: ['No Pressure', 'Light', 'Balanced', 'Motivated', 'High Urgency']
		}
		return labels[type][value - 1]
	}

	const renderStep1 = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-slate-900 mb-2">Quick Setup - Step 1 of 3</h2>
				<p className="text-slate-600">Tell us about your brand (2 minutes)</p>
			</div>

			<div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
					<input
						type="text"
						value={agentName}
						onChange={(e) => setAgentName(e.target.value)}
						placeholder="e.g., Sarah Johnson"
						className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">What's your brand focus?</label>
					<select
						value={brandFocus}
						onChange={(e) => setBrandFocus(e.target.value)}
						className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="">Select your focus...</option>
						<option value="luxury">Luxury Properties ($1M+)</option>
						<option value="first-time">First-Time Buyers</option>
						<option value="investment">Investment Properties</option>
						<option value="family">Family Homes</option>
						<option value="commercial">Commercial Real Estate</option>
						<option value="general">General Residential</option>
					</select>
				</div>

				<div className="pt-4">
					<button
						onClick={() => setCurrentStep(2)}
						disabled={!agentName || !brandFocus}
						className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Next: Choose Your Voice →
					</button>
				</div>
			</div>
		</div>
	)

	const renderStep2 = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-slate-900 mb-2">Step 2 of 3 - Choose Your Voice</h2>
				<p className="text-slate-600">Pick how your AI sidekick represents your brand (5 minutes)</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{brandPresets.map(preset => (
					<div
						key={preset.id}
						onClick={() => setSelectedPreset(preset.id)}
						className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
							selectedPreset === preset.id
								? 'border-blue-500 bg-blue-50 shadow-md'
								: 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
						}`}
					>
						<div className="flex items-start justify-between mb-2">
							<h3 className="font-semibold text-slate-900">{preset.name}</h3>
							{selectedPreset === preset.id && (
								<span className="material-symbols-outlined text-blue-600">check_circle</span>
							)}
						</div>
						<p className="text-sm text-slate-600 mb-3">{preset.description}</p>
						<div className="bg-slate-50 p-3 rounded text-xs text-slate-700 italic">
							"{preset.example}"
						</div>
						<div className="flex gap-2 mt-2">
							<span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">
								{preset.tone}
							</span>
							<span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs capitalize">
								{preset.salesStyle}
							</span>
						</div>
					</div>
				))}
			</div>

			<div className="flex gap-3">
				<button
					onClick={() => setCurrentStep(1)}
					className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
				>
					← Back
				</button>
				<button
					onClick={() => setCurrentStep(3)}
					disabled={!selectedPreset}
					className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Next: Fine-Tune →
				</button>
			</div>
		</div>
	)

	const renderStep3 = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-slate-900 mb-2">Step 3 of 3 - Fine-Tune</h2>
				<p className="text-slate-600">Light customization for your perfect sidekick (3 minutes)</p>
			</div>

			<div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
				{Object.entries(customAdjustments).map(([key, value]) => (
					<div key={key}>
						<div className="flex justify-between items-center mb-2">
							<label className="text-sm font-medium text-slate-700 capitalize">
								{adjustmentLabels[key as keyof CustomAdjustments]}
							</label>
							<span className="text-sm font-semibold text-slate-900">
								{getSliderLabel(key as keyof CustomAdjustments, value)}
							</span>
						</div>
						<div className="relative">
							<input
								type="range"
								min="1"
								max="5"
								value={value}
								onChange={(e) => setCustomAdjustments(prev => ({
									...prev,
									[key]: parseInt(e.target.value)
								}))}
								className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
								style={{
									background: `linear-gradient(to right, ${getSliderColor(value)} 0%, ${getSliderColor(value)} ${(value-1)*25}%, #e2e8f0 ${(value-1)*25}%, #e2e8f0 100%)`
								}}
							/>
							<div className="flex justify-between text-xs text-slate-400 mt-1">
								<span>Low</span>
								<span>Medium</span>
								<span>High</span>
							</div>
						</div>
					</div>
				))}

				{/* Preview */}
				<div className="bg-slate-50 p-4 rounded-lg">
					<h4 className="font-medium text-slate-900 mb-2">Preview Response:</h4>
					<div className="text-sm text-slate-700 italic">
						{customAdjustments.warmth >= 4 ? "Hi there! I'm so excited to help you" : "Hello, I'd be happy to assist you"} 
						{customAdjustments.directness >= 4 ? " find the perfect property quickly." : " explore your options."} 
						{customAdjustments.expertise >= 4 ? " Based on current market analytics and comparable sales data," : " This property"} 
						{customAdjustments.urgency >= 4 ? " I recommend we schedule a viewing today as it won't last long!" : " might be worth considering for your needs."}
					</div>
				</div>
			</div>

			<div className="flex gap-3">
				<button
					onClick={() => setCurrentStep(2)}
					className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
				>
					← Back
				</button>
				<button
					onClick={() => {
						// Save settings and complete setup
						console.log('Saving sidekick settings:', {
							agentName,
							brandFocus,
							selectedPreset,
							customAdjustments,
							timeSpent
						})
						alert('🎉 Your AI Sidekick is ready! Setup completed in ' + formatTime(timeSpent))
					}}
					className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
				>
					🎉 Complete Setup
				</button>
			</div>
		</div>
	)

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="flex items-center justify-center gap-4 mb-4">
						<div className="p-3 bg-blue-600 rounded-full">
							<span className="material-symbols-outlined text-2xl text-white">smart_toy</span>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-slate-900">AI Sidekick Setup</h1>
							<p className="text-slate-600">Get your perfect AI assistant in 10 minutes</p>
						</div>
					</div>
					
					{/* Progress */}
					<div className="flex items-center justify-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
								currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
							}`}>1</div>
							<span className="text-sm text-slate-600">Brand</span>
						</div>
						<div className={`w-12 h-1 rounded ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
						<div className="flex items-center gap-2">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
								currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
							}`}>2</div>
							<span className="text-sm text-slate-600">Voice</span>
						</div>
						<div className={`w-12 h-1 rounded ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
						<div className="flex items-center gap-2">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
								currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
							}`}>3</div>
							<span className="text-sm text-slate-600">Tune</span>
						</div>
					</div>

					{/* Timer */}
					<div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200">
						<span className="material-symbols-outlined text-sm text-slate-500">schedule</span>
						<span className="text-sm font-medium text-slate-700">{formatTime(timeSpent)}</span>
					</div>
				</div>

				{/* Steps */}
				{currentStep === 1 && renderStep1()}
				{currentStep === 2 && renderStep2()}
				{currentStep === 3 && renderStep3()}

				{/* Advanced Option */}
				<div className="text-center mt-8 p-4 bg-white rounded-lg border border-slate-200">
					<p className="text-sm text-slate-600 mb-2">Need more control?</p>
					<button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
						Upgrade to Advanced Training →
					</button>
				</div>
			</div>
		</div>
	)
}

export default SimplifiedSidekickSetup
