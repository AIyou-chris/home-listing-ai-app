import React, { useState } from 'react';
import HelpSalesChatBotComponent from './HelpSalesChatBot';
import ChatBotFAB from './ChatBotFAB';
import { ChatBotContext, ChatBotMode } from '../services/helpSalesChatBot';

const HelpSalesChatBotTestPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [testMode, setTestMode] = useState<'embedded' | 'fab'>('embedded');
  const [userType, setUserType] = useState<'visitor' | 'prospect' | 'client' | 'agent'>('visitor');
  const [initialMode, setInitialMode] = useState<ChatBotMode>('general');

  const context: ChatBotContext = {
    userType,
    currentPage: 'test-page',
    previousInteractions: userType === 'visitor' ? 0 : Math.floor(Math.random() * 5) + 1,
    userInfo: {
      name: userType !== 'visitor' ? 'John Doe' : undefined,
      email: userType !== 'visitor' ? 'john@example.com' : undefined,
      company: userType === 'agent' ? 'ABC Realty' : undefined
    }
  };

  const handleLeadGenerated = (leadInfo: any) => {
    console.log('Lead generated:', leadInfo);
    setLeads(prev => [...prev, { ...leadInfo, id: Date.now() }]);
  };

  const handleSupportTicket = (ticketInfo: any) => {
    console.log('Support ticket created:', ticketInfo);
    setSupportTickets(prev => [...prev, { ...ticketInfo, id: Date.now() }]);
  };

  const clearData = () => {
    setLeads([]);
    setSupportTickets([]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Test Controls */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Help & Sales Chat Bot Test</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Test Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Mode</label>
              <select
                value={testMode}
                onChange={(e) => setTestMode(e.target.value as 'embedded' | 'fab')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="embedded">Embedded Chat</option>
                <option value="fab">Floating Action Button</option>
              </select>
            </div>

            {/* User Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="visitor">Visitor</option>
                <option value="prospect">Prospect</option>
                <option value="client">Client</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            {/* Initial Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Initial Mode</label>
              <select
                value={initialMode}
                onChange={(e) => setInitialMode(e.target.value as ChatBotMode)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="help">Help</option>
                <option value="sales">Sales</option>
              </select>
            </div>

            {/* Clear Data */}
            <div className="flex items-end">
              <button
                onClick={clearData}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {testMode === 'embedded' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <HelpSalesChatBotComponent
                context={context}
                onLeadGenerated={handleLeadGenerated}
                onSupportTicket={handleSupportTicket}
                initialMode={initialMode}
                className="h-[600px]"
              />
            </div>

            {/* Sidebar with data */}
            <div className="space-y-6">
              {/* Generated Leads */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Generated Leads ({leads.length})
                </h3>
                {leads.length === 0 ? (
                  <p className="text-gray-500 text-sm">No leads generated yet.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {leads.map((lead) => (
                      <div key={lead.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">Lead #{lead.id}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                            lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {lead.priority}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Category:</strong> {lead.category}</div>
                          <div><strong>Message:</strong> {lead.message.substring(0, 50)}...</div>
                          <div><strong>Time:</strong> {lead.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support Tickets */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Support Tickets ({supportTickets.length})
                </h3>
                {supportTickets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No support tickets created yet.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">Ticket #{ticket.id}</span>
                          <div className="flex space-x-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                              ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {ticket.priority}
                            </span>
                            {ticket.needsHandoff && (
                              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                                Handoff
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Category:</strong> {ticket.category}</div>
                          <div><strong>Message:</strong> {ticket.message.substring(0, 50)}...</div>
                          <div><strong>Time:</strong> {ticket.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* FAB Test Mode */
          <div className="space-y-6">
            {/* Mock Page Content */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Welcome to Our Real Estate AI Platform</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Features</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• AI-powered property listings</li>
                    <li>• Lead qualification and management</li>
                    <li>• Automated marketing campaigns</li>
                    <li>• Advanced analytics and reporting</li>
                    <li>• CRM integration</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Benefits</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Save 10+ hours per week</li>
                    <li>• Increase lead conversion by 40%</li>
                    <li>• Generate better property descriptions</li>
                    <li>• Automate follow-up sequences</li>
                    <li>• Track performance metrics</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">Test the Chat Bot</h4>
                <p className="text-blue-700 mb-4">
                  The floating chat button is in the bottom-right corner. Try asking questions like:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">Sales Questions:</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li>• "What are your pricing plans?"</li>
                      <li>• "Can I see a demo?"</li>
                      <li>• "How does this compare to competitors?"</li>
                      <li>• "What's the ROI?"</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">Support Questions:</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li>• "How do I set up my account?"</li>
                      <li>• "I'm having trouble logging in"</li>
                      <li>• "How do I integrate with my CRM?"</li>
                      <li>• "Where can I find tutorials?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leads */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Generated Leads ({leads.length})
                </h3>
                {leads.length === 0 ? (
                  <p className="text-gray-500 text-sm">No leads generated yet. Try asking sales questions!</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {leads.map((lead) => (
                      <div key={lead.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600">
                          <div><strong>Priority:</strong> {lead.priority}</div>
                          <div><strong>Category:</strong> {lead.category}</div>
                          <div><strong>Time:</strong> {lead.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support Tickets */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Support Tickets ({supportTickets.length})
                </h3>
                {supportTickets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No support tickets yet. Try asking help questions!</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600">
                          <div><strong>Priority:</strong> {ticket.priority}</div>
                          <div><strong>Category:</strong> {ticket.category}</div>
                          <div><strong>Handoff:</strong> {ticket.needsHandoff ? 'Yes' : 'No'}</div>
                          <div><strong>Time:</strong> {ticket.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FAB Component */}
        {testMode === 'fab' && (
          <ChatBotFAB
            context={context}
            onLeadGenerated={handleLeadGenerated}
            onSupportTicket={handleSupportTicket}
            position="bottom-right"
          />
        )}
      </div>
    </div>
  );
};

export default HelpSalesChatBotTestPage;