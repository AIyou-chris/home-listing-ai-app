import React, { useState } from 'react';
import AILeadQualificationChat from './AILeadQualificationChat';
import { LeadQualificationData } from '../services/leadQualificationAI';

const AILeadQualificationTestPage: React.FC = () => {
  const [qualifiedLeads, setQualifiedLeads] = useState<Partial<LeadQualificationData>[]>([]);
  const [currentScore, setCurrentScore] = useState(0);

  const handleLeadQualified = (leadData: Partial<LeadQualificationData>) => {
    console.log('Lead qualified:', leadData);
    setQualifiedLeads(prev => [...prev, { ...leadData, qualificationScore: currentScore }]);
  };

  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Lead Qualification System</h1>
          <p className="text-gray-600">
            Test the AI-powered lead qualification chat system. The AI will naturally extract lead information
            while providing helpful real estate guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <AILeadQualificationChat
              onLeadQualified={handleLeadQualified}
              onScoreUpdate={handleScoreUpdate}
              className="h-[600px]"
            />
          </div>

          {/* Sidebar with qualified leads and stats */}
          <div className="space-y-6">
            {/* Current Score Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Lead Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={currentScore >= 60 ? "#10b981" : currentScore >= 40 ? "#f59e0b" : "#6b7280"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${currentScore * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-800">{currentScore}</span>
                  </div>
                </div>
              </div>
              <div className="text-center mt-2">
                <span className={`text-sm font-medium ${
                  currentScore >= 80 ? 'text-green-600' :
                  currentScore >= 60 ? 'text-blue-600' :
                  currentScore >= 40 ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {currentScore >= 80 ? 'Highly Qualified' :
                   currentScore >= 60 ? 'Qualified' :
                   currentScore >= 40 ? 'Potential' : 'Qualifying'}
                </span>
              </div>
            </div>

            {/* Qualification Criteria */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Qualification Criteria</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Contact Info</span>
                  <span className="font-medium">20 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Budget/Financing</span>
                  <span className="font-medium">25 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline</span>
                  <span className="font-medium">20 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Property Preferences</span>
                  <span className="font-medium">15 pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Situation</span>
                  <span className="font-medium">20 pts</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total Possible</span>
                  <span>100 pts</span>
                </div>
              </div>
            </div>

            {/* Qualified Leads */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Qualified Leads ({qualifiedLeads.length})
              </h3>
              {qualifiedLeads.length === 0 ? (
                <p className="text-gray-500 text-sm">No qualified leads yet. Keep chatting!</p>
              ) : (
                <div className="space-y-3">
                  {qualifiedLeads.map((lead, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">Lead #{index + 1}</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Score: {lead.qualificationScore}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {lead.budget && <div>Budget: {lead.budget}</div>}
                        {lead.timeline && <div>Timeline: {lead.timeline}</div>}
                        {lead.location && <div>Location: {lead.location}</div>}
                        {lead.email && <div>Email: {lead.email}</div>}
                        {lead.phone && <div>Phone: {lead.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">Sample Conversation Starters:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>"I'm looking to buy my first home"</li>
                <li>"We need to sell our house and buy a bigger one"</li>
                <li>"I'm interested in investment properties"</li>
                <li>"What's the market like in [your area]?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Information to Share:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Budget range or financing status</li>
                <li>Timeline for buying/selling</li>
                <li>Preferred locations or neighborhoods</li>
                <li>Property type and size preferences</li>
                <li>Contact information (email/phone)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILeadQualificationTestPage;