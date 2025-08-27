import React from 'react';

interface AITestNavigationProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const AITestNavigation: React.FC<AITestNavigationProps> = ({ onNavigate, currentView }) => {
  const testPages = [
    { id: 'ai-lead-test', name: 'Lead Qualification AI', description: 'Test the AI lead qualification system' },
    { id: 'help-sales-chat-test', name: 'Help & Sales Chat Bot', description: 'Test the help and sales chat bot system' },
    { id: 'dashboard', name: 'Back to Dashboard', description: 'Return to main dashboard' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI System Test Center</h1>
          <p className="text-gray-600 mb-8">
            Test and explore the AI-powered features of your real estate platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testPages.map((page) => (
              <div
                key={page.id}
                className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  currentView === page.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onNavigate(page.id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{page.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{page.description}</p>
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  <span>Launch Test</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">🚀 AI Features Available</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Lead Qualification AI:</h5>
                <ul className="space-y-1 text-blue-600">
                  <li>• Natural conversation flow</li>
                  <li>• Real-time lead scoring (0-100)</li>
                  <li>• Automatic data extraction</li>
                  <li>• Real estate expertise</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Help & Sales Chat Bot:</h5>
                <ul className="space-y-1 text-blue-600">
                  <li>• Multi-mode operation (Help/Sales/General)</li>
                  <li>• Intent detection and routing</li>
                  <li>• Floating action button (FAB)</li>
                  <li>• Lead generation and support tickets</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h5 className="font-medium text-yellow-800">Note:</h5>
                <p className="text-yellow-700 text-sm mt-1">
                  Make sure your OpenAI API key is configured in the Firebase Functions environment. 
                  The AI features require a valid API key to function properly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestNavigation;