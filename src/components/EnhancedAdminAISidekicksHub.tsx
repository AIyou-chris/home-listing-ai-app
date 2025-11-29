import React, { useState } from 'react'
import SidekickTrainingWorkflows from './SidekickTrainingWorkflows'
import SidekickMultiLanguage from './SidekickMultiLanguage'
import SidekickLeadScoring from './SidekickLeadScoring'
import SidekickAutoAssignment from './SidekickAutoAssignment'
import AdminKnowledgeBasePage from './AdminKnowledgeBasePage'
import { AgentProfile } from '../types'
const AnalyticsPlaceholder = () => (
	<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<h2 className="text-xl font-semibold text-slate-800">Analytics Dashboard Coming Soon</h2>
		<p className="mt-3 text-sm text-slate-600">
			Performance analytics is being rebuilt around the new routing system. Once ready, you&lsquo;ll see live sidekick insights here.
		</p>
	</div>
)

type AdminTabType = 'overview' | 'analytics' | 'training' | 'multilang' | 'leadscoring' | 'autoassign' | 'management'

interface EnhancedAdminAISidekicksHubProps {
	agentProfile: AgentProfile
}

const EnhancedAdminAISidekicksHub: React.FC<EnhancedAdminAISidekicksHubProps> = ({ agentProfile }) => {
	const [activeTab, setActiveTab] = useState<AdminTabType>('overview')

	const tabs = [
		{
			id: 'overview' as AdminTabType,
			label: 'Knowledge Base',
			icon: 'school',
			description: 'Manage knowledge bases and personalities',
			color: 'bg-blue-50 text-blue-700 border-blue-200'
		},
		{
			id: 'analytics' as AdminTabType,
			label: 'Performance Analytics',
			icon: 'analytics',
			description: 'Enterprise-grade performance tracking',
			color: 'bg-green-50 text-green-700 border-green-200'
		},
		{
			id: 'training' as AdminTabType,
			label: 'Training Workflows',
			icon: 'school',
			description: 'Advanced AI training and optimization',
			color: 'bg-purple-50 text-purple-700 border-purple-200'
		},
		{
			id: 'multilang' as AdminTabType,
			label: 'Multi-Language',
			icon: 'language',
			description: 'Global language configuration',
			color: 'bg-amber-50 text-amber-700 border-amber-200'
		},
		{
			id: 'leadscoring' as AdminTabType,
			label: 'Lead Integration',
			icon: 'trending_up',
			description: 'Advanced lead scoring integration',
			color: 'bg-red-50 text-red-700 border-red-200'
		},
		{
			id: 'autoassign' as AdminTabType,
			label: 'Auto Assignment',
			icon: 'assignment',
			description: 'Intelligent sidekick assignment',
			color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
		},
		{
			id: 'management' as AdminTabType,
			label: 'System Management',
			icon: 'settings',
			description: 'Enterprise system controls',
			color: 'bg-slate-50 text-slate-700 border-slate-200'
		}
	]

	const renderContent = () => {
		switch (activeTab) {
			case 'overview':
				return <AdminKnowledgeBasePage agentProfile={agentProfile} />
			case 'analytics':
				return <AnalyticsPlaceholder />
			case 'training':
				return <SidekickTrainingWorkflows />
			case 'multilang':
				return <SidekickMultiLanguage />
			case 'leadscoring':
				return <SidekickLeadScoring />
			case 'autoassign':
				return <SidekickAutoAssignment />
			case 'management':
				return <SystemManagementPanel />
			default:
				return <AdminKnowledgeBasePage agentProfile={agentProfile} />
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
			{/* Enhanced Admin Header */}
			<div className="bg-white border-b border-slate-200 shadow-sm">
				<div className="px-6 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-slate-900 flex items-center gap-4">
								<div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
									<span className="material-symbols-outlined text-2xl text-white">admin_panel_settings</span>
								</div>
								<div>
									<div>Enhanced AI Sidekicks</div>
									<div className="text-lg font-normal text-slate-600">Enterprise Administration</div>
								</div>
							</h1>
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
								<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
								<span className="text-sm font-medium">All Systems Operational</span>
							</div>
							<div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
								<span className="material-symbols-outlined text-sm">admin_panel_settings</span>
								<span className="text-sm font-medium">Admin Mode</span>
							</div>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
						<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-blue-100 text-sm">Active Sidekicks</p>
									<p className="text-2xl font-bold">5</p>
								</div>
								<span className="material-symbols-outlined text-3xl text-blue-200">smart_toy</span>
							</div>
						</div>
						<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-green-100 text-sm">Performance Score</p>
									<p className="text-2xl font-bold">94%</p>
								</div>
								<span className="material-symbols-outlined text-3xl text-green-200">trending_up</span>
							</div>
						</div>
						<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-purple-100 text-sm">Languages</p>
									<p className="text-2xl font-bold">12</p>
								</div>
								<span className="material-symbols-outlined text-3xl text-purple-200">language</span>
							</div>
						</div>
						<div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-amber-100 text-sm">Training Sessions</p>
									<p className="text-2xl font-bold">8</p>
								</div>
								<span className="material-symbols-outlined text-3xl text-amber-200">school</span>
							</div>
						</div>
					</div>
				</div>

				{/* Enhanced Navigation Tabs */}
				<div className="px-6">
					<nav className="flex space-x-1 overflow-x-auto pb-2">
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-3 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-3 transition-all duration-200 ${
									activeTab === tab.id
										? `border-blue-500 ${tab.color} shadow-sm`
										: 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
								}`}
							>
								<span className="material-symbols-outlined text-lg">{tab.icon}</span>
								<div className="text-left">
									<div className="font-semibold">{tab.label}</div>
									<div className="text-xs opacity-75">{tab.description}</div>
								</div>
								{activeTab === tab.id && (
									<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
								)}
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* Content Area */}
			<div className="flex-1">
				{renderContent()}
			</div>

			{/* Admin Quick Actions Panel */}
			<div className="fixed bottom-6 right-6 z-50">
				<div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[200px]">
					<h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
						<span className="material-symbols-outlined text-sm">admin_panel_settings</span>
						Admin Actions
					</h3>
					<div className="space-y-2">
						<button
							onClick={() => setActiveTab('training')}
							className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 rounded-lg transition-colors"
						>
							<span className="material-symbols-outlined text-sm">school</span>
							Bulk Training
						</button>
						<button
							onClick={() => setActiveTab('analytics')}
							className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-green-50 rounded-lg transition-colors"
						>
							<span className="material-symbols-outlined text-sm">analytics</span>
							System Analytics
						</button>
						<button
							onClick={() => setActiveTab('autoassign')}
							className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"
						>
							<span className="material-symbols-outlined text-sm">assignment</span>
							Create Rule
						</button>
						<button
							onClick={() => setActiveTab('management')}
							className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-red-50 rounded-lg transition-colors"
						>
							<span className="material-symbols-outlined text-sm">settings</span>
							System Control
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

// System Management Panel Component
const SystemManagementPanel: React.FC = () => {
	return (
		<div className="p-6 space-y-6">
			<div className="bg-white rounded-lg border border-slate-200 p-6">
				<h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
					<span className="material-symbols-outlined">settings</span>
					Enterprise System Management
				</h2>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* System Health */}
					<div className="border border-slate-200 rounded-lg p-4">
						<h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
							<span className="material-symbols-outlined text-green-600">health_and_safety</span>
							System Health
						</h3>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">AI Response Time</span>
								<span className="text-green-600 font-medium">1.2s avg</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Uptime</span>
								<span className="text-green-600 font-medium">99.9%</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Error Rate</span>
								<span className="text-green-600 font-medium">0.1%</span>
							</div>
						</div>
					</div>

					{/* Resource Usage */}
					<div className="border border-slate-200 rounded-lg p-4">
						<h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
							<span className="material-symbols-outlined text-blue-600">memory</span>
							Resource Usage
						</h3>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">CPU Usage</span>
								<span className="text-blue-600 font-medium">45%</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Memory</span>
								<span className="text-blue-600 font-medium">2.1GB</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Storage</span>
								<span className="text-blue-600 font-medium">15.2GB</span>
							</div>
						</div>
					</div>

					{/* Security Status */}
					<div className="border border-slate-200 rounded-lg p-4">
						<h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
							<span className="material-symbols-outlined text-purple-600">security</span>
							Security Status
						</h3>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">SSL Status</span>
								<span className="text-green-600 font-medium">Active</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Firewall</span>
								<span className="text-green-600 font-medium">Protected</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-slate-600">Last Scan</span>
								<span className="text-green-600 font-medium">2h ago</span>
							</div>
						</div>
					</div>
				</div>

				{/* System Controls */}
				<div className="mt-6 pt-6 border-t border-slate-200">
					<h3 className="font-medium text-slate-900 mb-4">System Controls</h3>
					<div className="flex flex-wrap gap-3">
						<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							Restart All Sidekicks
						</button>
						<button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
							Backup System
						</button>
						<button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
							Update Models
						</button>
						<button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
							Clear Cache
						</button>
						<button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
							Emergency Stop
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default EnhancedAdminAISidekicksHub
