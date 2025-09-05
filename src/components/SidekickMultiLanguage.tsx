import React, { useState, useEffect } from 'react'
import { AISidekickRole } from '../context/AISidekickContext'

interface LanguageConfig {
	code: string
	name: string
	nativeName: string
	flag: string
	enabled: boolean
	confidence: number
	trainingStatus: 'not_trained' | 'training' | 'trained' | 'needs_update'
}

interface SidekickLanguageSettings {
	sidekickId: AISidekickRole
	primaryLanguage: string
	supportedLanguages: string[]
	autoDetect: boolean
	fallbackLanguage: string
	translationQuality: 'basic' | 'professional' | 'native'
	culturalAdaptation: boolean
}

interface TranslationMemory {
	id: string
	sourceText: string
	targetText: string
	sourceLanguage: string
	targetLanguage: string
	context: string
	quality: number
	verified: boolean
	lastUsed: string
}

const SidekickMultiLanguage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'overview' | 'configure' | 'translations' | 'training'>('overview')
	const [selectedSidekick, setSelectedSidekick] = useState<AISidekickRole>('agent')
	const [languages, setLanguages] = useState<LanguageConfig[]>([])
	const [sidekickSettings, setSidekickSettings] = useState<SidekickLanguageSettings[]>([])
	const [translationMemory, setTranslationMemory] = useState<TranslationMemory[]>([])
	const [isLoading, setIsLoading] = useState(true)

	// Initialize with demo data
	useEffect(() => {
		const demoLanguages: LanguageConfig[] = [
			{ code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', enabled: true, confidence: 95, trainingStatus: 'trained' },
			{ code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', enabled: true, confidence: 88, trainingStatus: 'trained' },
			{ code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', enabled: true, confidence: 82, trainingStatus: 'training' },
			{ code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', enabled: false, confidence: 75, trainingStatus: 'not_trained' },
			{ code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', enabled: false, confidence: 70, trainingStatus: 'not_trained' },
			{ code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', enabled: true, confidence: 85, trainingStatus: 'trained' },
			{ code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', enabled: false, confidence: 60, trainingStatus: 'needs_update' },
			{ code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', enabled: false, confidence: 55, trainingStatus: 'not_trained' },
			{ code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', enabled: false, confidence: 50, trainingStatus: 'not_trained' },
			{ code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', enabled: false, confidence: 45, trainingStatus: 'not_trained' }
		]

		const demoSettings: SidekickLanguageSettings[] = [
			{
				sidekickId: 'agent',
				primaryLanguage: 'en',
				supportedLanguages: ['en', 'es', 'fr', 'pt'],
				autoDetect: true,
				fallbackLanguage: 'en',
				translationQuality: 'professional',
				culturalAdaptation: true
			},
			{
				sidekickId: 'marketing',
				primaryLanguage: 'en',
				supportedLanguages: ['en', 'es'],
				autoDetect: true,
				fallbackLanguage: 'en',
				translationQuality: 'native',
				culturalAdaptation: true
			},
			{
				sidekickId: 'listing',
				primaryLanguage: 'en',
				supportedLanguages: ['en', 'es', 'fr'],
				autoDetect: false,
				fallbackLanguage: 'en',
				translationQuality: 'professional',
				culturalAdaptation: false
			}
		]

		const demoTranslations: TranslationMemory[] = [
			{
				id: 'tm-1',
				sourceText: 'Hello! How can I help you today?',
				targetText: '¡Hola! ¿Cómo puedo ayudarte hoy?',
				sourceLanguage: 'en',
				targetLanguage: 'es',
				context: 'greeting',
				quality: 95,
				verified: true,
				lastUsed: '2024-01-16T10:30:00Z'
			},
			{
				id: 'tm-2',
				sourceText: 'This property features 3 bedrooms and 2 bathrooms.',
				targetText: 'Cette propriété dispose de 3 chambres et 2 salles de bain.',
				sourceLanguage: 'en',
				targetLanguage: 'fr',
				context: 'property_description',
				quality: 92,
				verified: true,
				lastUsed: '2024-01-15T14:20:00Z'
			},
			{
				id: 'tm-3',
				sourceText: 'Would you like to schedule a viewing?',
				targetText: 'Gostaria de agendar uma visita?',
				sourceLanguage: 'en',
				targetLanguage: 'pt',
				context: 'scheduling',
				quality: 88,
				verified: false,
				lastUsed: '2024-01-14T16:45:00Z'
			}
		]

		setLanguages(demoLanguages)
		setSidekickSettings(demoSettings)
		setTranslationMemory(demoTranslations)
		setIsLoading(false)
	}, [])

	const getStatusColor = (status: LanguageConfig['trainingStatus']) => {
		switch (status) {
			case 'trained': return 'bg-green-100 text-green-800'
			case 'training': return 'bg-blue-100 text-blue-800'
			case 'needs_update': return 'bg-yellow-100 text-yellow-800'
			case 'not_trained': return 'bg-slate-100 text-slate-800'
			default: return 'bg-slate-100 text-slate-800'
		}
	}

	const getConfidenceColor = (confidence: number) => {
		if (confidence >= 90) return 'text-green-600'
		if (confidence >= 80) return 'text-blue-600'
		if (confidence >= 70) return 'text-yellow-600'
		return 'text-red-600'
	}

	const currentSettings = sidekickSettings.find(s => s.sidekickId === selectedSidekick)

	const toggleLanguage = (languageCode: string) => {
		setLanguages(prev => prev.map(lang => 
			lang.code === languageCode 
				? { ...lang, enabled: !lang.enabled }
				: lang
		))
	}

	const updateSidekickLanguages = (languageCode: string, action: 'add' | 'remove') => {
		setSidekickSettings(prev => prev.map(setting => {
			if (setting.sidekickId === selectedSidekick) {
				const supportedLanguages = action === 'add'
					? [...setting.supportedLanguages, languageCode]
					: setting.supportedLanguages.filter(lang => lang !== languageCode)
				return { ...setting, supportedLanguages }
			}
			return setting
		}))
	}

	const renderOverview = () => (
		<div className="space-y-6">
			{/* Global Language Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Supported Languages</p>
							<p className="text-2xl font-bold text-slate-900">{languages.filter(l => l.enabled).length}</p>
						</div>
						<span className="material-symbols-outlined text-blue-500">language</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Avg Confidence</p>
							<p className="text-2xl font-bold text-slate-900">
								{Math.round(languages.filter(l => l.enabled).reduce((sum, l) => sum + l.confidence, 0) / languages.filter(l => l.enabled).length)}%
							</p>
						</div>
						<span className="material-symbols-outlined text-green-500">verified</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Translation Memory</p>
							<p className="text-2xl font-bold text-slate-900">{translationMemory.length}</p>
						</div>
						<span className="material-symbols-outlined text-purple-500">translate</span>
					</div>
				</div>
				<div className="bg-white p-4 rounded-lg border border-slate-200">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Active Sidekicks</p>
							<p className="text-2xl font-bold text-slate-900">{sidekickSettings.length}</p>
						</div>
						<span className="material-symbols-outlined text-amber-500">smart_toy</span>
					</div>
				</div>
			</div>

			{/* Language Status Grid */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Language Status</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{languages.map(language => (
						<div key={language.code} className="border border-slate-200 rounded-lg p-4">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-3">
									<span className="text-2xl">{language.flag}</span>
									<div>
										<h4 className="font-medium text-slate-900">{language.name}</h4>
										<p className="text-sm text-slate-600">{language.nativeName}</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(language.trainingStatus)}`}>
										{language.trainingStatus.replace('_', ' ')}
									</span>
									{language.enabled && (
										<span className="w-2 h-2 bg-green-500 rounded-full"></span>
									)}
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-slate-600">Confidence</span>
									<span className={`font-medium ${getConfidenceColor(language.confidence)}`}>
										{language.confidence}%
									</span>
								</div>
								<div className="w-full bg-slate-200 rounded-full h-2">
									<div 
										className={`h-2 rounded-full ${language.confidence >= 80 ? 'bg-green-500' : language.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
										style={{ width: `${language.confidence}%` }}
									></div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Sidekick Language Summary */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Sidekick Language Configuration</h3>
				<div className="space-y-4">
					{sidekickSettings.map(setting => (
						<div key={setting.sidekickId} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
							<div>
								<h4 className="font-medium text-slate-900 capitalize">{setting.sidekickId} Sidekick</h4>
								<p className="text-sm text-slate-600">
									{setting.supportedLanguages.length} languages • 
									{setting.autoDetect ? ' Auto-detect enabled' : ' Manual selection'} • 
					 				{setting.translationQuality} quality
								</p>
							</div>
							<div className="flex items-center gap-2">
								{setting.supportedLanguages.slice(0, 3).map(langCode => {
									const lang = languages.find(l => l.code === langCode)
									return lang ? <span key={langCode} className="text-lg">{lang.flag}</span> : null
								})}
								{setting.supportedLanguages.length > 3 && (
									<span className="text-sm text-slate-500">+{setting.supportedLanguages.length - 3}</span>
								)}
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
				<h3 className="text-lg font-semibold text-slate-900">Configure Languages</h3>
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

			{currentSettings && (
				<div className="bg-white rounded-lg border border-slate-200 p-6">
					<h4 className="font-medium text-slate-900 mb-4 capitalize">{selectedSidekick} Sidekick Settings</h4>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Primary Language</label>
								<select 
									value={currentSettings.primaryLanguage}
									className="w-full px-3 py-2 border border-slate-300 rounded-lg"
								>
									{languages.filter(l => l.enabled).map(lang => (
										<option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Fallback Language</label>
								<select 
									value={currentSettings.fallbackLanguage}
									className="w-full px-3 py-2 border border-slate-300 rounded-lg"
								>
									{languages.filter(l => l.enabled).map(lang => (
										<option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 mb-2">Translation Quality</label>
								<select 
									value={currentSettings.translationQuality}
									className="w-full px-3 py-2 border border-slate-300 rounded-lg"
								>
									<option value="basic">Basic (Fast)</option>
									<option value="professional">Professional (Balanced)</option>
									<option value="native">Native (Highest Quality)</option>
								</select>
							</div>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<input 
									type="checkbox" 
									id="autoDetect"
									checked={currentSettings.autoDetect}
									className="rounded"
								/>
								<label htmlFor="autoDetect" className="text-sm text-slate-700">
									Auto-detect user language
								</label>
							</div>

							<div className="flex items-center gap-2">
								<input 
									type="checkbox" 
									id="culturalAdaptation"
									checked={currentSettings.culturalAdaptation}
									className="rounded"
								/>
								<label htmlFor="culturalAdaptation" className="text-sm text-slate-700">
									Enable cultural adaptation
								</label>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Supported Languages */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h4 className="font-medium text-slate-900 mb-4">Supported Languages</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{languages.map(language => (
						<div key={language.code} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
							<div className="flex items-center gap-3">
								<span className="text-xl">{language.flag}</span>
								<div>
									<p className="font-medium text-slate-900">{language.name}</p>
									<p className="text-xs text-slate-600">{language.confidence}% confidence</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								{currentSettings?.supportedLanguages.includes(language.code) ? (
									<button
										onClick={() => updateSidekickLanguages(language.code, 'remove')}
										className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
									>
										Remove
									</button>
								) : (
									<button
										onClick={() => updateSidekickLanguages(language.code, 'add')}
										disabled={!language.enabled}
										className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs disabled:opacity-50"
									>
										Add
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
					<span className="ml-3 text-slate-600">Loading language settings...</span>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900">Multi-Language Support</h1>
				<p className="text-slate-600">Configure international language support for your AI sidekicks</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-slate-200 mb-6">
				<nav className="flex space-x-8">
					{[
						{ id: 'overview', label: 'Overview', icon: 'dashboard' },
						{ id: 'configure', label: 'Configure', icon: 'settings' },
						{ id: 'translations', label: 'Translation Memory', icon: 'translate' },
						{ id: 'training', label: 'Language Training', icon: 'school' }
					].map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
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
			{activeTab === 'overview' && renderOverview()}
			{activeTab === 'configure' && renderConfigure()}
			{activeTab === 'translations' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">translate</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Translation Memory</h3>
					<p className="text-slate-600">Manage translation cache and improve accuracy</p>
				</div>
			)}
			{activeTab === 'training' && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-4xl text-slate-400 mb-4">school</span>
					<h3 className="text-lg font-medium text-slate-900 mb-2">Language Training</h3>
					<p className="text-slate-600">Train sidekicks for better multilingual performance</p>
				</div>
			)}
		</div>
	)
}

export default SidekickMultiLanguage
