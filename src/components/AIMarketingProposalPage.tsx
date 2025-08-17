import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ShareModal from './ShareModal';
import ShareService from '../services/shareService';

interface MarketingProposal {
	id: string;
	propertyAddress: string;
	agentInfo: {
		name: string;
		email: string;
		phone: string;
		experience: string;
	};
	executiveSummary: string;
	marketAnalysis: string;
	pricingStrategy: string;
	marketingPlan: string;
	timeline: string;
	createdAt: Date;
}

const AIMarketingProposalPage: React.FC = () => {
	const [user] = useAuthState(auth);
	const [proposals, setProposals] = useState<MarketingProposal[]>([]);
	const [loading, setLoading] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showShareModal, setShowShareModal] = useState(false);
	const [selectedProposal, setSelectedProposal] = useState<MarketingProposal | null>(null);
	const [shareContent, setShareContent] = useState<any>(null);

	const [formData, setFormData] = useState({
		propertyAddress: '',
		propertyPrice: '',
		propertyType: 'residential',
		agentName: '',
		agentEmail: '',
		agentPhone: '',
		agentExperience: '1-3 years',
		customRequirements: ''
	});

	const functions = getFunctions();

	useEffect(() => {
		if (user) {
			loadProposals();
		}
	}, [user]);

	const loadProposals = async () => {
		// In a real app, you'd fetch from Firestore
		// For now, we'll use mock data
		setProposals([
			{
				id: '1',
				propertyAddress: '123 Main St, City, State',
				agentInfo: {
					name: 'John Doe',
					email: 'john@example.com',
					phone: '(555) 123-4567',
					experience: '5+ years'
				},
				executiveSummary: 'This stunning 3-bedroom home offers modern amenities and prime location.',
				marketAnalysis: 'Current market shows strong demand with 15% appreciation year-over-year.',
				pricingStrategy: 'Competitive pricing strategy targeting $450,000 with room for negotiation.',
				marketingPlan: 'Multi-channel approach including digital marketing, open houses, and MLS listing.',
				timeline: '30-day marketing campaign with weekly progress reviews.',
				createdAt: new Date()
			}
		]);
	};

	const generateProposal = async () => {
		if (!user || !formData.propertyAddress || !formData.agentName) return;

		setLoading(true);
		try {
			const generateMarketingProposal = httpsCallable(functions, 'generateMarketingProposal');
			
			const result = await generateMarketingProposal({
				propertyAddress: formData.propertyAddress,
				propertyPrice: formData.propertyPrice,
				propertyType: formData.propertyType,
				agentInfo: {
					name: formData.agentName,
					email: formData.agentEmail,
					phone: formData.agentPhone,
					experience: formData.agentExperience
				},
				customRequirements: formData.customRequirements,
				userId: user.uid
			});

			if (result.data.success) {
				setShowCreateModal(false);
				setFormData({
					propertyAddress: '',
					propertyPrice: '',
					propertyType: 'residential',
					agentName: '',
					agentEmail: '',
					agentPhone: '',
					agentExperience: '1-3 years',
					customRequirements: ''
				});
				loadProposals(); // Reload proposals
			}
		} catch (error) {
			console.error('Error generating proposal:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleShare = (proposal: MarketingProposal) => {
		const content = ShareService.generateMarketingProposalShareContent(proposal);
		setShareContent(content);
		setShowShareModal(true);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Generating Marketing Proposal...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">AI Marketing Proposals</h1>
					<p className="text-gray-600 mt-2">Generate professional marketing proposals with AI</p>
				</div>

				{/* Create Button */}
				<div className="mb-6">
					<button
						onClick={() => setShowCreateModal(true)}
						className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
					>
						+ Create New Proposal
					</button>
				</div>

				{/* Proposals List */}
				<div className="grid gap-6">
					{proposals.map((proposal) => (
						<div key={proposal.id} className="bg-white rounded-lg shadow p-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-xl font-semibold text-gray-900">
										{proposal.propertyAddress}
									</h3>
									<p className="text-gray-500 text-sm">
										Created {proposal.createdAt.toLocaleDateString()}
									</p>
								</div>
								<button
									onClick={() => handleShare(proposal)}
									className="text-blue-600 hover:text-blue-800 text-sm font-medium"
								>
									Share
								</button>
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Executive Summary</h4>
									<p className="text-gray-600 text-sm">{proposal.executiveSummary}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Market Analysis</h4>
									<p className="text-gray-600 text-sm">{proposal.marketAnalysis}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Pricing Strategy</h4>
									<p className="text-gray-600 text-sm">{proposal.pricingStrategy}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Marketing Plan</h4>
									<p className="text-gray-600 text-sm">{proposal.marketingPlan}</p>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t border-gray-200">
								<h4 className="font-semibold text-gray-900 mb-2">Timeline</h4>
								<p className="text-gray-600 text-sm">{proposal.timeline}</p>
							</div>
						</div>
					))}
				</div>

				{proposals.length === 0 && (
					<div className="text-center py-12">
						<p className="text-gray-500">No proposals created yet. Create your first one!</p>
					</div>
				)}
			</div>

			{/* Create Proposal Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
						<h2 className="text-xl font-semibold mb-4">Create Marketing Proposal</h2>
						
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Property Address *
								</label>
								<input
									type="text"
									value={formData.propertyAddress}
									onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="123 Main St, City, State"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Property Price
								</label>
								<input
									type="text"
									value={formData.propertyPrice}
									onChange={(e) => setFormData({ ...formData, propertyPrice: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="$450,000"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Property Type
								</label>
								<select
									value={formData.propertyType}
									onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="residential">Residential</option>
									<option value="commercial">Commercial</option>
									<option value="land">Land</option>
									<option value="investment">Investment</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Agent Name *
								</label>
								<input
									type="text"
									value={formData.agentName}
									onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="John Doe"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Agent Email
								</label>
								<input
									type="email"
									value={formData.agentEmail}
									onChange={(e) => setFormData({ ...formData, agentEmail: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="john@example.com"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Agent Phone
								</label>
								<input
									type="tel"
									value={formData.agentPhone}
									onChange={(e) => setFormData({ ...formData, agentPhone: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="(555) 123-4567"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Experience Level
								</label>
								<select
									value={formData.agentExperience}
									onChange={(e) => setFormData({ ...formData, agentExperience: e.target.value })}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="1-3 years">1-3 years</option>
									<option value="3-5 years">3-5 years</option>
									<option value="5-10 years">5-10 years</option>
									<option value="10+ years">10+ years</option>
								</select>
							</div>
						</div>

						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Custom Requirements (Optional)
							</label>
							<textarea
								value={formData.customRequirements}
								onChange={(e) => setFormData({ ...formData, customRequirements: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								rows={3}
								placeholder="Any specific requirements or preferences for the proposal..."
							/>
						</div>

						<div className="flex justify-end space-x-3 mt-6">
							<button
								onClick={() => setShowCreateModal(false)}
								className="px-4 py-2 text-gray-600 hover:text-gray-800"
							>
								Cancel
							</button>
							<button
								onClick={generateProposal}
								disabled={loading || !formData.propertyAddress || !formData.agentName}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
							>
								{loading ? 'Generating...' : 'Generate Proposal'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Share Modal */}
			{showShareModal && shareContent && (
				<ShareModal
					isOpen={showShareModal}
					onClose={() => setShowShareModal(false)}
					content={shareContent}
				/>
			)}
		</div>
	);
};

export default AIMarketingProposalPage;
