import React from 'react'
import { useFunnelEditorStore } from '../../state/useFunnelEditorStore'

interface AISuggestionsPanelProps {
  onApplySuggestion: (index: number) => void
}

export const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({ onApplySuggestion }) => {
  const suggestions = useFunnelEditorStore((state) => state.aiSuggestions)

  if (suggestions.length === 0) {
    return (
      <div className="px-6 py-4 border-b border-slate-200">
        <p className="text-sm text-slate-500">No AI suggestions yet. Run “AI Improve Funnel” to get recommendations.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-b border-slate-200 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">AI Suggestions</h3>
      <ul className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="p-3 border border-slate-200 rounded-lg bg-slate-50 shadow-sm">
            <p className="text-sm text-slate-700">{suggestion.message}</p>
            <button
              type="button"
              onClick={() => onApplySuggestion(index)}
              className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Apply suggestion
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

