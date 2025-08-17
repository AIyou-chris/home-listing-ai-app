import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ProposalBuilderProps {
  onBackToDashboard: () => void;
}

interface ProposalData {
  clientName: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  programType: 'white-label' | 'team' | 'broker' | 'office';
  teamSize: string;
  currentChallenges: string;
  goals: string;
  timeline: string;
  budget: string;
  customFeatures: string;
  additionalNotes: string;
}

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ onBackToDashboard }) => {
  const [proposalData, setProposalData] = useState<ProposalData>({
    clientName: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    programType: 'white-label',
    teamSize: '',
    currentChallenges: '',
    goals: '',
    timeline: '',
    budget: '',
    customFeatures: '',
    additionalNotes: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (field: keyof ProposalData, value: string) => {
    setProposalData(prev => ({ ...prev, [field]: value }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('proposal-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`HomeListingAI_Proposal_${proposalData.companyName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Client Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Client Name *</label>
          <input
            type="text"
            value={proposalData.clientName}
            onChange={(e) => handleInputChange('clientName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter client name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
          <input
            type="text"
            value={proposalData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter company name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person *</label>
          <input
            type="text"
            value={proposalData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter contact person name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
          <input
            type="email"
            value={proposalData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter email address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
          <input
            type="tel"
            value={proposalData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Program Type *</label>
          <select
            value={proposalData.programType}
            onChange={(e) => handleInputChange('programType', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="white-label">White Label Solution</option>
            <option value="team">Team Program</option>
            <option value="broker">Broker Program</option>
            <option value="office">Office Program</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Program Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Team Size</label>
          <input
            type="text"
            value={proposalData.teamSize}
            onChange={(e) => handleInputChange('teamSize', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., 5 agents, 50+ agents"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Timeline</label>
          <input
            type="text"
            value={proposalData.timeline}
            onChange={(e) => handleInputChange('timeline', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., 30 days, Q1 2024"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Budget Range</label>
          <input
            type="text"
            value={proposalData.budget}
            onChange={(e) => handleInputChange('budget', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., $5,000-$10,000, $10,000+"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Current Challenges</label>
        <textarea
          value={proposalData.currentChallenges}
          onChange={(e) => handleInputChange('currentChallenges', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          placeholder="Describe current challenges with lead generation, listing management, team coordination, etc."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Goals & Objectives</label>
        <textarea
          value={proposalData.goals}
          onChange={(e) => handleInputChange('goals', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          placeholder="What are your main goals? Increased leads, better team coordination, market expansion, etc."
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Custom Requirements</h3>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Custom Features Needed</label>
        <textarea
          value={proposalData.customFeatures}
          onChange={(e) => handleInputChange('customFeatures', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          placeholder="Any specific features, integrations, or customizations needed?"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
        <textarea
          value={proposalData.additionalNotes}
          onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          placeholder="Any other important information or special requirements?"
        />
      </div>
    </div>
  );

  const renderProposal = () => (
    <div id="proposal-content" className="bg-white p-8 max-w-4xl mx-auto">
      {/* Front Page */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-orange-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold border-4 border-blue-800">
            AI
          </div>
        </div>
        <h1 className="text-4xl font-bold text-blue-800 mb-4">HomeListingAI</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-2">Custom Proposal</h2>
        <p className="text-slate-600">AI-Powered Real Estate Solutions</p>
      </div>

      {/* Client Info */}
      <div className="bg-slate-50 p-6 rounded-lg mb-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Proposal For:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-slate-600">Client:</span> {proposalData.clientName}
          </div>
          <div>
            <span className="font-medium text-slate-600">Company:</span> {proposalData.companyName}
          </div>
          <div>
            <span className="font-medium text-slate-600">Contact:</span> {proposalData.contactPerson}
          </div>
          <div>
            <span className="font-medium text-slate-600">Email:</span> {proposalData.email}
          </div>
          {proposalData.phone && (
            <div>
              <span className="font-medium text-slate-600">Phone:</span> {proposalData.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-slate-600">Program:</span> {proposalData.programType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Introduction</h3>
        <p className="text-slate-700 leading-relaxed">
          Thank you for your interest in HomeListingAI's {proposalData.programType.replace('-', ' ')} solution. 
          We're excited to present a customized proposal that addresses your specific needs and goals.
        </p>
        <p className="text-slate-700 leading-relaxed mt-4">
          HomeListingAI is the leading AI-powered platform designed to transform how real estate professionals 
          generate leads, manage listings, and grow their business. Our comprehensive suite of tools leverages 
          cutting-edge artificial intelligence to automate tasks, enhance productivity, and drive results.
        </p>
      </div>

      {/* Current Situation */}
      {proposalData.currentChallenges && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-800 mb-4">Current Challenges</h3>
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
            <p className="text-slate-700">{proposalData.currentChallenges}</p>
          </div>
        </div>
      )}

      {/* Goals */}
      {proposalData.goals && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-800 mb-4">Your Goals</h3>
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-slate-700">{proposalData.goals}</p>
          </div>
        </div>
      )}

      {/* Solution Overview */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Our Solution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">AI-Powered Lead Generation</h4>
            <p className="text-sm text-slate-700">Advanced lead capture and qualification using intelligent chatbots and automated follow-up sequences.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Smart Listing Management</h4>
            <p className="text-sm text-slate-700">Automated listing creation, optimization, and distribution across multiple platforms.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Team Coordination Tools</h4>
            <p className="text-sm text-slate-700">Centralized dashboard for team management, lead assignment, and performance tracking.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Analytics & Reporting</h4>
            <p className="text-sm text-slate-700">Comprehensive analytics to track performance, identify opportunities, and optimize strategies.</p>
          </div>
        </div>
      </div>

      {/* Custom Features */}
      {proposalData.customFeatures && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-800 mb-4">Custom Features</h3>
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
            <p className="text-slate-700">{proposalData.customFeatures}</p>
          </div>
        </div>
      )}

      {/* Implementation Details */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Implementation Plan</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
            <div>
              <h4 className="font-semibold text-slate-800">Discovery & Setup</h4>
              <p className="text-sm text-slate-600">Initial consultation, requirements gathering, and platform configuration</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
            <div>
              <h4 className="font-semibold text-slate-800">Custom Development</h4>
              <p className="text-sm text-slate-600">Implementation of custom features and integrations</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
            <div>
              <h4 className="font-semibold text-slate-800">Training & Onboarding</h4>
              <p className="text-sm text-slate-600">Comprehensive training for your team on platform usage</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
            <div>
              <h4 className="font-semibold text-slate-800">Launch & Support</h4>
              <p className="text-sm text-slate-600">Go-live support and ongoing maintenance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline & Budget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {proposalData.timeline && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold text-slate-800 mb-2">Timeline</h4>
            <p className="text-slate-700">{proposalData.timeline}</p>
          </div>
        )}
        {proposalData.budget && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-semibold text-slate-800 mb-2">Budget Range</h4>
            <p className="text-slate-700">{proposalData.budget}</p>
          </div>
        )}
      </div>

      {/* Outro */}
      <div className="bg-gradient-to-r from-blue-800 to-orange-500 text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Ready to Transform Your Real Estate Business?</h3>
        <p className="mb-4">
          Let's discuss how HomeListingAI can help you achieve your goals and overcome your current challenges. 
          Our team is ready to create a customized solution that fits your specific needs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Contact:</span> support@homelistingai.com
          </div>
          <div>
            <span className="font-semibold">Phone:</span> (555) 123-4567
          </div>
          <div>
            <span className="font-semibold">Website:</span> homelistingai.com
          </div>
          <div>
            <span className="font-semibold">Next Steps:</span> Schedule a consultation call
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Proposal Builder</h1>
            <p className="text-slate-500 mt-1">Create professional proposals for white-label and team programs</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 transition-all duration-300"
            >
              <span className="material-symbols-outlined h-5 w-5">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep >= step 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-orange-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-500">
              Step {currentStep} of 3
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-4">
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">download</span>
                    Generate PDF Proposal
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        {currentStep === 3 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Proposal Preview</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {renderProposal()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalBuilder;
