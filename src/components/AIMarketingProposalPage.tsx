import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
// Firebase removed
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

interface AIQuestion {
	id: string;
	question: string;
	type: 'text' | 'select' | 'textarea' | 'multi-select';
	options?: string[];
	required: boolean;
	placeholder?: string;
}

const AIMarketingProposalPage: React.FC = () => {
	const [user, setUser] = useState<any>(null);
	const [proposals, setProposals] = useState<MarketingProposal[]>([]);
	const [loading, setLoading] = useState(false);
	const [showShareModal, setShowShareModal] = useState(false);
	const [shareContent, setShareContent] = useState<any>(null);

	// AI Questionnaire State
	const [currentStep, setCurrentStep] = useState<'intro' | 'questions' | 'generating' | 'complete'>('intro');
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [questions, setQuestions] = useState<AIQuestion[]>([]);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
	const [generatedProposal, setGeneratedProposal] = useState<MarketingProposal | null>(null);

	// functions removed; Supabase used for auth only

	useEffect(() => {
		let mounted = true
		supabase.auth.getUser().then(({ data }) => {
			if (!mounted) return
			setUser(data.user || null)
			if (data.user) loadProposals()
		})
		const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
			setUser(session?.user || null)
			if (session?.user) loadProposals()
		})
		return () => {
			mounted = false
			sub.subscription.unsubscribe()
		}
	}, [])

	const loadProposals = async () => {
		// In a real app, you'd fetch from Firestore
		setProposals([]);
	};

	const startAIQuestionnaire = async () => {
		if (!user) return;

		setIsGeneratingQuestions(true);
		setCurrentStep('questions');

		try {
			// Generate AI questions based on context
			const generateQuestions = httpsCallable(functions, 'generateAIQuestions');
			const result = { data: { success: true, questions: getDefaultQuestions() } } as any

			if (result.data.success) {
				setQuestions(result.data.questions);
				setCurrentQuestionIndex(0);
			} else {
				// Fallback questions if AI fails
				setQuestions(getDefaultQuestions());
			}
		} catch (error) {
			console.error('Error generating questions:', error);
			setQuestions(getDefaultQuestions());
		} finally {
			setIsGeneratingQuestions(false);
		}
	};

	const getDefaultQuestions = (): AIQuestion[] => [
		{
			id: 'property_address',
			question: 'What is the property address?',
			type: 'text',
			required: true,
			placeholder: 'e.g., 123 Main Street, City, State'
		},
		{
			id: 'property_type',
			question: 'What type of property is this?',
			type: 'select',
			options: ['Residential Home', 'Condo/Apartment', 'Townhouse', 'Luxury Home', 'Investment Property', 'Land', 'Commercial'],
			required: true
		},
		{
			id: 'property_price',
			question: 'What is the asking price or price range?',
			type: 'text',
			required: true,
			placeholder: 'e.g., $450,000 or $400,000 - $500,000'
		},
		{
			id: 'special_features',
			question: 'What special features or unique selling points should we highlight?',
			type: 'textarea',
			required: false,
			placeholder: 'e.g., Recently renovated kitchen, large backyard, great schools nearby, etc.'
		},
		{
			id: 'target_market',
			question: 'Who is your target market for this property?',
			type: 'multi-select',
			options: ['First-time buyers', 'Families', 'Professionals', 'Investors', 'Luxury buyers', 'Downsizers', 'All buyers'],
			required: true
		},
		{
			id: 'agent_name',
			question: 'What is your name?',
			type: 'text',
			required: true,
			placeholder: 'Your full name'
		},
		{
			id: 'agent_experience',
			question: 'How many years of real estate experience do you have?',
			type: 'select',
			options: ['1-3 years', '3-5 years', '5-10 years', '10+ years'],
			required: true
		},
		{
			id: 'custom_requirements',
			question: 'Any specific requirements or preferences for the marketing proposal?',
			type: 'textarea',
			required: false,
			placeholder: 'e.g., Focus on digital marketing, emphasize luxury features, target specific neighborhood, etc.'
		}
	];

	const handleAnswer = (answer: string) => {
		const currentQuestion = questions[currentQuestionIndex];
		setAnswers(prev => ({
			...prev,
			[currentQuestion.id]: answer
		}));

		// Move to next question or generate proposal
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(prev => prev + 1);
		} else {
			generateProposalFromAnswers();
		}
	};

	const generateProposalFromAnswers = async () => {
		if (!user) return;

		setCurrentStep('generating');
		setLoading(true);

		try {
			const generateMarketingProposal = httpsCallable(functions, 'generateMarketingProposal');
			
			const result = { data: { success: true, proposal: {
				id: 'demo',
				propertyAddress: '123 Main St',
				agentInfo: { name: 'Agent', email: 'agent@example.com', phone: '', experience: '3-5 years' },
				executiveSummary: 'Demo', marketAnalysis: 'Demo', pricingStrategy: 'Demo', marketingPlan: 'Demo', timeline: '2 weeks', createdAt: new Date()
			} } } as any

			if (result.data.success) {
				setGeneratedProposal(result.data.proposal);
				setCurrentStep('complete');
				loadProposals(); // Reload proposals list
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

	const resetQuestionnaire = () => {
		setCurrentStep('intro');
		setCurrentQuestionIndex(0);
		setAnswers({});
		setGeneratedProposal(null);
	};

	const renderQuestion = () => {
		if (currentQuestionIndex >= questions.length) return null;

		const question = questions[currentQuestionIndex];
		const currentAnswer = answers[question.id] || '';

		return (
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<span className="text-sm text-gray-500">
							Question {currentQuestionIndex + 1} of {questions.length}
						</span>
						<div className="w-32 bg-gray-200 rounded-full h-2">
							<div 
								className="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
							></div>
						</div>
					</div>
					
					<h3 className="text-2xl font-bold text-gray-900 mb-4">
						{question.question}
					</h3>

					{question.type === 'text' && (
						<input
							type="text"
							value={currentAnswer}
							onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
							placeholder={question.placeholder}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					)}

					{question.type === 'textarea' && (
						<textarea
							value={currentAnswer}
							onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
							placeholder={question.placeholder}
							rows={4}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					)}

					{question.type === 'select' && question.options && (
						<select
							value={currentAnswer}
							onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select an option...</option>
							{question.options.map((option) => (
								<option key={option} value={option}>{option}</option>
							))}
						</select>
					)}

					{question.type === 'multi-select' && question.options && (
						<div className="space-y-2">
							{question.options.map((option) => (
								<label key={option} className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={currentAnswer.includes(option)}
										onChange={(e) => {
											const currentValues = currentAnswer ? currentAnswer.split(', ') : [];
											const newValues = e.target.checked
												? [...currentValues, option]
												: currentValues.filter(v => v !== option);
											setAnswers(prev => ({ ...prev, [question.id]: newValues.join(', ') }));
										}}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<span className="ml-3 text-gray-700">{option}</span>
								</label>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-between">
					<button
						onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
						disabled={currentQuestionIndex === 0}
						className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						← Previous
					</button>
					
					<button
						onClick={() => handleAnswer(currentAnswer)}
						disabled={question.required && !currentAnswer.trim()}
						className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{currentQuestionIndex === questions.length - 1 ? 'Generate Proposal' : 'Next →'}
					</button>
				</div>
			</div>
		);
	};

	if (loading || isGeneratingQuestions) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">
						{isGeneratingQuestions ? 'AI is preparing questions...' : 'Generating Marketing Proposal...'}
					</p>
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
					<p className="text-gray-600 mt-2">Generate professional marketing proposals with AI assistance</p>
				</div>

				{/* Main Content */}
				{currentStep === 'intro' && (
					<div className="max-w-2xl mx-auto text-center">
						<div className="bg-white rounded-lg shadow p-8">
							<div className="mb-6">
								<span className="material-symbols-outlined text-4xl text-blue-600 mb-4">smart_toy</span>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Marketing Proposal Generator</h2>
								<p className="text-gray-600">
									Our AI will ask you a few targeted questions to create a personalized marketing proposal for your property.
								</p>
							</div>
							
							<div className="bg-blue-50 rounded-lg p-4 mb-6">
								<h3 className="font-semibold text-blue-900 mb-2">What you'll get:</h3>
								<ul className="text-sm text-blue-800 space-y-1">
									<li>• Executive Summary tailored to your property</li>
									<li>• Market Analysis with current trends</li>
									<li>• Pricing Strategy recommendations</li>
									<li>• Comprehensive Marketing Plan</li>
									<li>• Timeline and next steps</li>
								</ul>
							</div>

							<button
								onClick={startAIQuestionnaire}
								className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Start AI Questionnaire
							</button>
						</div>
					</div>
				)}

				{currentStep === 'questions' && (
					<div className="bg-white rounded-lg shadow p-8">
						{renderQuestion()}
					</div>
				)}

				{currentStep === 'complete' && generatedProposal && (
					<div className="max-w-4xl mx-auto">
						<div className="bg-white rounded-lg shadow p-6 mb-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h2 className="text-2xl font-bold text-gray-900">✅ Proposal Generated!</h2>
									<p className="text-gray-600">Your marketing proposal is ready</p>
								</div>
								<div className="flex space-x-2">
									<button
										onClick={() => handleShare(generatedProposal)}
										className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
									>
										Share
									</button>
									<button
										onClick={resetQuestionnaire}
										className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
									>
										Create Another
									</button>
								</div>
							</div>

							<div className="grid md:grid-cols-2 gap-6">
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Executive Summary</h4>
									<p className="text-gray-600 text-sm">{generatedProposal.executiveSummary}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Market Analysis</h4>
									<p className="text-gray-600 text-sm">{generatedProposal.marketAnalysis}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Pricing Strategy</h4>
									<p className="text-gray-600 text-sm">{generatedProposal.pricingStrategy}</p>
								</div>
								<div>
									<h4 className="font-semibold text-gray-900 mb-2">Marketing Plan</h4>
									<p className="text-gray-600 text-sm">{generatedProposal.marketingPlan}</p>
								</div>
							</div>

							<div className="mt-4 pt-4 border-t border-gray-200">
								<h4 className="font-semibold text-gray-900 mb-2">Timeline</h4>
								<p className="text-gray-600 text-sm">{generatedProposal.timeline}</p>
							</div>
						</div>
					</div>
				)}

				{/* Previous Proposals */}
				{proposals.length > 0 && currentStep === 'intro' && (
					<div className="mt-12">
						<h2 className="text-2xl font-bold text-gray-900 mb-6">Previous Proposals</h2>
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
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

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
