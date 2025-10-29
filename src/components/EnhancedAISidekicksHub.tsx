import React, { useState } from 'react'
import AISidekicks from './AISidekicks'

const EnhancedAISidekicksHub: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false)

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
      </div>

      <div className="px-6 lg:px-10 py-6">
        <button
          type="button"
          onClick={() => setIsHelpOpen(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
          aria-expanded={isHelpOpen}
        >
          <span className="material-symbols-outlined text-xl">{isHelpOpen ? 'psychiatry' : 'help'}</span>
          {isHelpOpen ? 'Hide Sidekick Tips' : 'Show Sidekick Tips'}
          <span className="material-symbols-outlined text-base ml-auto">{isHelpOpen ? 'expand_less' : 'expand_more'}</span>
        </button>
        {isHelpOpen && (
          <div className="mt-4 bg-white border border-primary-100 rounded-xl shadow-sm p-5 text-sm text-slate-600 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">smart_toy</span>
                Building Elite Sidekicks
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Start with the persona:</strong> Define tone, voice, and quick traits before layering knowledge.</li>
                <li><strong>Centralize knowledge:</strong> Upload scripts, FAQs, and market reports so every sidekick shares the same brain.</li>
                <li><strong>Test before launch:</strong> Use the “Test Personality” box to ensure responses match your brand voice.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary-700 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">qr_code_2</span>
                Deployment Ideas
              </h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Listing Sidekick:</strong> Embed on property pages, QR flyers, and open-house tablets for instant answers.</li>
                <li><strong>Sales & Marketing:</strong> Route site chat, email nurtures, and social DMs to the right specialist.</li>
                <li><strong>Pro tip:</strong> Pair sidekick links with the Rebrandly short URLs so you can track adoption and share effortlessly.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <AISidekicks />
      </div>

    </div>
  )
}

export default EnhancedAISidekicksHub
