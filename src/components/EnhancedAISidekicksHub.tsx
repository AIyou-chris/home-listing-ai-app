import React, { useState } from 'react'
import AIAgentHub from './AIAgentHub'
import AIInteractiveTraining from './AIInteractiveTraining'

type TabType = 'overview' | 'training'

const EnhancedAISidekicksHub: React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabType>('overview')

	const tabs = [
		{
			id: 'overview' as TabType,
			label: 'AI Sidekicks',
			icon: 'smart_toy',
			description: 'Manage AI personalities and knowledge bases'
		},
		{
			id: 'training' as TabType,
			label: 'Interactive Training',
			icon: 'chat',
			description: 'Chat with sidekicks and train with feedback'
		}
	]

	const renderContent = () => {
		switch (activeTab) {
			case 'overview':
				return <AIAgentHub />
			case 'training':
				return <AIInteractiveTraining />
			default:
				return <AIAgentHub />
		}
	}

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Enhanced Header */}
			<div className="bg-white border-b border-slate-200">
				<div className="px-6 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
								<span className="material-symbols-outlined text-primary-600">smart_toy</span>
								Enhanced AI Sidekicks
							</h1>
							<p className="text-slate-600 mt-1">
								Advanced AI assistant management with analytics, training, and automation
							</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg">
								<span className="w-2 h-2 bg-green-500 rounded-full"></span>
								<span className="text-sm font-medium">All Systems Active</span>
							</div>
						</div>
					</div>
				</div>

				{/* Enhanced Navigation Tabs */}
				<div className="px-6">
					<nav className="flex space-x-1 overflow-x-auto">
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
									activeTab === tab.id
										? 'border-primary-500 text-primary-600 bg-primary-50'
										: 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
								}`}
							>
								<span className="material-symbols-outlined text-lg">{tab.icon}</span>
								<div className="text-left">
									<div className="font-medium">{tab.label}</div>
									<div className="text-xs opacity-75">{tab.description}</div>
								</div>
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Content Area */}
			<div className="flex-1">
				{renderContent()}
			</div>

		</div>
	)
}

export default EnhancedAISidekicksHub
