import React, { useState } from 'react'

interface SidekickPerformance {
  responseQuality: number
  clientSatisfaction: number
  conversionRate: number
  responseTime: number
}

interface QuickFeedback {
  id: string
  type: 'thumbs_up' | 'thumbs_down' | 'correction'
  message: string
  suggestion?: string
  timestamp: string
}

const QuickSidekickControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'control' | 'feedback' | 'performance'>('control')
  const [sidekickSettings, setSidekickSettings] = useState({
    warmth: 3,
    directness: 3,
    expertise: 3,
    urgency: 2
  })
  const [recentFeedback, setRecentFeedback] = useState<QuickFeedback[]>([
    {
      id: '1',
      type: 'thumbs_up',
      message: 'Great response about the property amenities',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'correction',
      message: 'Too technical about mortgage rates',
      suggestion: 'Explain in simpler terms for first-time buyers',
      timestamp: '1 day ago'
    }
  ])
  const [performance] = useState<SidekickPerformance>({
    responseQuality: 94,
    clientSatisfaction: 89,
    conversionRate: 23,
    responseTime: 1.2
  })

  const [feedbackText, setFeedbackText] = useState('')
  const [correctionText, setCorrectionText] = useState('')

  const handleQuickAdjustment = (setting: string, change: number) => {
    setSidekickSettings(prev => ({
      ...prev,
      [setting]: Math.max(1, Math.min(5, prev[setting as keyof typeof prev] + change))
    }))
  }

  const submitFeedback = (type: 'thumbs_up' | 'thumbs_down') => {
    const newFeedback: QuickFeedback = {
      id: Date.now().toString(),
      type,
      message: feedbackText,
      timestamp: 'Just now'
    }
    setRecentFeedback(prev => [newFeedback, ...prev])
    setFeedbackText('')
  }

  const submitCorrection = () => {
    const newFeedback: QuickFeedback = {
      id: Date.now().toString(),
      type: 'correction',
      message: feedbackText,
      suggestion: correctionText,
      timestamp: 'Just now'
    }
    setRecentFeedback(prev => [newFeedback, ...prev])
    setFeedbackText('')
    setCorrectionText('')
  }

  const getPerformanceColor = (value: number, type: 'percentage' | 'time') => {
    if (type === 'time') {
      if (value <= 1.5) return 'text-green-600'
      if (value <= 2.5) return 'text-yellow-600'
      return 'text-red-600'
    }
    if (value >= 90) return 'text-green-600'
    if (value >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const renderControlPanel = () => (
    <div className="space-y-6">
      {/* Quick Adjustments */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Adjustments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(sidekickSettings).map(([key, value]) => (
            <div key={key} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 capitalize">
                  {key === 'warmth' ? '🤝 Warmth' : 
                   key === 'directness' ? '🎯 Directness' :
                   key === 'expertise' ? '🧠 Expertise' : '⚡ Urgency'}
                </label>
                <span className="text-sm font-semibold text-slate-900">{value}/5</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuickAdjustment(key, -1)}
                  disabled={value <= 1}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(value / 5) * 100}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => handleQuickAdjustment(key, 1)}
                  disabled={value >= 5}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Feedback */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Feedback</h3>
        <div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							How did your sidekick do?
						</label>
						<textarea
							value={feedbackText}
							onChange={(e) => setFeedbackText(e.target.value)}
							placeholder="e.g., Great response about pricing, but too technical for this client"
							rows={2}
							className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div className="flex gap-3">
						<button
							onClick={() => submitFeedback('thumbs_up')}
							disabled={!feedbackText.trim()}
							className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="material-symbols-outlined">thumb_up</span>
							Good Response
						</button>
						<button
							onClick={() => submitFeedback('thumbs_down')}
							disabled={!feedbackText.trim()}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="material-symbols-outlined">thumb_down</span>
							Needs Work
						</button>
					</div>
				</div>
			</div>

			{/* Quick Correction */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h3 className="text-lg font-semibold text-slate-900 mb-4">Teach Your Sidekick</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							What did the sidekick say?
						</label>
						<input
							type="text"
							value={feedbackText}
							onChange={(e) => setFeedbackText(e.target.value)}
							placeholder="e.g., The mortgage rate is currently 7.25% APR..."
							className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-2">
							How should it say it instead?
						</label>
						<input
							type="text"
							value={correctionText}
							onChange={(e) => setCorrectionText(e.target.value)}
							placeholder="e.g., Interest rates are around 7% right now, which is pretty good for today's market"
							className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<button
						onClick={submitCorrection}
						disabled={!feedbackText.trim() || !correctionText.trim()}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span className="material-symbols-outlined">school</span>
						Teach This Way
					</button>
				</div>
			</div>
		</div>
	)

	const renderFeedbackHistory = () => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-slate-900">Recent Feedback</h3>
			{recentFeedback.map(feedback => (
				<div key={feedback.id} className="bg-white rounded-lg border border-slate-200 p-4">
					<div className="flex items-start gap-3">
						<div
							className={`p-2 rounded-full ${
								feedback.type === 'thumbs_up'
									? 'bg-green-100'
									: feedback.type === 'thumbs_down'
										? 'bg-red-100'
										: 'bg-blue-100'
							}`}
						>
							<span
								className={`material-symbols-outlined text-sm ${
									feedback.type === 'thumbs_up'
										? 'text-green-600'
										: feedback.type === 'thumbs_down'
											? 'text-red-600'
											: 'text-blue-600'
								}`}
							>
								{feedback.type === 'thumbs_up'
									? 'thumb_up'
									: feedback.type === 'thumbs_down'
										? 'thumb_down'
										: 'school'}
							</span>
						</div>
						<div className="flex-1">
							<p className="text-sm text-slate-700 mb-1">{feedback.message}</p>
							{feedback.suggestion && (
								<p className="text-sm text-blue-600 italic">→ {feedback.suggestion}</p>
							)}
							<p className="text-xs text-slate-500 mt-2">{feedback.timestamp}</p>
						</div>
					</div>
				</div>
			))}
		</div>
	)

	const renderPerformance = () => (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold text-slate-900">Sidekick Performance</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Response Quality</p>
							<p className={`text-2xl font-bold ${getPerformanceColor(performance.responseQuality, 'percentage')}`}>
								{performance.responseQuality}%
							</p>
						</div>
						<span className="material-symbols-outlined text-blue-500">star</span>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Client Satisfaction</p>
							<p className={`text-2xl font-bold ${getPerformanceColor(performance.clientSatisfaction, 'percentage')}`}>
								{performance.clientSatisfaction}%
							</p>
						</div>
						<span className="material-symbols-outlined text-green-500">sentiment_satisfied</span>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Conversion Rate</p>
							<p className={`text-2xl font-bold ${getPerformanceColor(performance.conversionRate, 'percentage')}`}>
								{performance.conversionRate}%
							</p>
						</div>
						<span className="material-symbols-outlined text-amber-500">trending_up</span>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-600">Response Time</p>
							<p className={`text-2xl font-bold ${getPerformanceColor(performance.responseTime, 'time')}`}>
								{performance.responseTime}s
							</p>
						</div>
						<span className="material-symbols-outlined text-purple-500">speed</span>
					</div>
				</div>
			</div>

			{/* Improvement Suggestions */}
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h4 className="font-medium text-slate-900 mb-4">🎯 Suggested Improvements</h4>
				<div className="space-y-3">
					<div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
						<span className="material-symbols-outlined text-blue-600 mt-0.5">lightbulb</span>
						<div>
							<p className="text-sm font-medium text-blue-900">Increase warmth for better client connection</p>
							<p className="text-xs text-blue-700">Your conversion rate could improve with more personal responses</p>
						</div>
						<button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
							Apply
						</button>
					</div>

					<div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
						<span className="material-symbols-outlined text-green-600 mt-0.5">trending_up</span>
						<div>
							<p className="text-sm font-medium text-green-900">Great job on response quality!</p>
							<p className="text-xs text-green-700">Your sidekick is performing above average</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)

	return (
		<div className="p-6 max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
					<span className="material-symbols-outlined text-blue-600">smart_toy</span>
					My AI Sidekick
				</h1>
				<p className="text-slate-600">Quick controls for your AI assistant</p>
			</div>

			{/* Tabs */}
			<div className="border-b border-slate-200 mb-6">
				<nav className="flex space-x-8">
					{[
						{ id: 'control', label: 'Quick Control', icon: 'tune' },
						{ id: 'feedback', label: 'Feedback History', icon: 'feedback' },
						{ id: 'performance', label: 'Performance', icon: 'analytics' }
					].map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as typeof activeTab)}
							className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
								activeTab === tab.id
									? 'border-blue-500 text-blue-600'
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
			{activeTab === 'control' && renderControlPanel()}
			{activeTab === 'feedback' && renderFeedbackHistory()}
			{activeTab === 'performance' && renderPerformance()}
		</div>
	)
}

export default QuickSidekickControl
